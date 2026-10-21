import fs from 'node:fs/promises';
import {createReadStream, createWriteStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import yazl from 'yazl';
import yauzl from 'yauzl';

const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REQUIRED=['java21','java25','lwjgl333','lwjgl341','mesa','openal','libsync','jna5140','jna5170','freetype'];
const TOOLS=['hxzup','direct-lobby','authlib-injector','runtime-build'];
const SHA=/^[a-f0-9]{64}$/;
const MAX_TOTAL=1024*1024*1024, MAX_ZIP=768*1024*1024;
const ZIP_DATE=new Date('1980-01-01T00:00:00Z');
const PLATFORM_LIBRARIES=new Set(['libc.so','libm.so','libdl.so','liblog.so','libz.so','libstdc++.so','libandroid.so','libEGL.so','libGLESv1_CM.so','libGLESv2.so','libGLESv3.so','libOpenSLES.so','libaaudio.so','libvulkan.so','libjnigraphics.so','libnativewindow.so','libmediandk.so','libcamera2ndk.so','libbinder_ndk.so','libneuralnetworks.so']);
const CORE_UNSAFE={path:'lwjgl/3.4.1/java/lwjgl-3.4.1-unsafe.jar',sha1:'129e06a04f93992cb2a45172435b21fc4b60dd7d',size:1062128};
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const slash=value=>value.split(path.sep).join('/');
const ordered=(a,b)=>a<b?-1:a>b?1:0;
function safePath(value) {
  if(typeof value!=='string'||value.length>240||! /^[A-Za-z0-9_./+-]+$/.test(value)||value.startsWith('/')||value.split('/').some(x=>!x||x==='.'||x==='..'))throw Error(`Unsafe module path: ${value}`);
  return value;
}
function inside(root,file) {const rel=path.relative(root,file);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));}
async function noLinks(file) {
  let current=path.resolve(file);for(;;) {try {if((await fs.lstat(current)).isSymbolicLink())throw Error(`Symlink forbidden: ${current}`);}catch(error){if(error.code!=='ENOENT')throw error;}
    const parent=path.dirname(current);if(parent===current)return;current=parent;}
}
async function regular(file) {await noLinks(file);const stat=await fs.stat(file);if(!stat.isFile())throw Error(`Not a regular file: ${file}`);return stat;}
async function digest(file,algorithm='sha256') {const h=createHash(algorithm);for await(const part of createReadStream(file))h.update(part);return h.digest('hex');}
function local(repo,value) {safePath(value);const file=path.resolve(repo,...value.split('/'));if(!inside(repo,file))throw Error('Source path outside repository');return file;}
async function walk(root) {
  await noLinks(root);const result=[];
  async function visit(directory,prefix) {for(const entry of await fs.readdir(directory,{withFileTypes:true})) {
    const relative=prefix+entry.name,file=path.join(directory,entry.name);safePath('app_runtime/'+relative);
    if(entry.isSymbolicLink())throw Error(`Symlink forbidden: ${file}`);
    if(entry.isDirectory())await visit(file,relative+'/');else if(entry.isFile())result.push(relative);else throw Error(`Special file forbidden: ${file}`);
  }}
  await visit(root,'');return result.sort(ordered);
}
async function readLock(file) {await regular(file);const bytes=await fs.readFile(file);if(bytes.length>4*1024*1024)throw Error('Source lock too large');const lock=JSON.parse(bytes);
  if(lock.schemaVersion!==1||!Array.isArray(lock.requiredComponents)||!Array.isArray(lock.artifacts)||!Array.isArray(lock.stagedFiles))throw Error(`Invalid source lock: ${file}`);return {lock,bytes};}
function componentStates(lock,ids,blockers) {
  const states=new Map();for(const item of lock.requiredComponents) {if(!item||typeof item.id!=='string'||states.has(item.id))throw Error('Duplicate/invalid required component');states.set(item.id,item);}
  for(const id of ids) {if(!states.has(id))throw Error(`Missing required component: ${id}`);const item=states.get(id);if(item.status!=='ready')blockers.push(`${id}: ${item.status}: ${item.reason||'no readiness evidence'}`);}
  return states;
}
async function inspectJar(file) {
  return new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true},(error,zip)=>{
    if(error)return reject(error);let count=0;const seen=new Set();const fail=error=>{zip.close();reject(error);};
    zip.on('error',fail);zip.on('end',()=>resolve());zip.on('entry',entry=>{
      if(++count>50000)return fail(Error(`JAR entry limit: ${file}`));
      const name=entry.fileName;if(name.includes('\\')||name.startsWith('/')||name.split('/').some(x=>x==='..')||seen.has(name))return fail(Error(`Unsafe JAR entry: ${name}`));seen.add(name);
      if(/^(?:com\/tungsten\/|net\/kdt\/pojavlaunch\/|com\/movtery\/zalithlauncher\/)/i.test(name)||/\.apk$/i.test(name))return fail(Error(`Forbidden launcher code in ${file}: ${name}`));
      zip.readEntry();
    });zip.readEntry();
  }));
}
async function inspectElf(file) {
  const handle=await fs.open(file,'r');try {
    const size=(await handle.stat()).size;
    const read=async(length,position)=>{if(!Number.isSafeInteger(position)||position<0||length<0||length>1024*1024||position+length>size)throw Error('Invalid ELF range: '+file);const buffer=Buffer.alloc(length);if((await handle.read(buffer,0,length,position)).bytesRead!==length)throw Error('Truncated ELF: '+file);return buffer;};
    const bytes=await read(64,0);
    if(bytes.toString('hex',0,4)!=='7f454c46'||bytes[4]!==2||bytes[5]!==1||bytes.readUInt16LE(18)!==183)throw Error(`Expected ARM64 little-endian ELF: ${file}`);
    const count=bytes.readUInt16LE(56),stride=bytes.readUInt16LE(54);if(!count)return [];
    if(count>1024||stride<56||stride>256)throw Error('Invalid ELF program header count');
    const headers=await read(count*stride,Number(bytes.readBigUInt64LE(32))),loads=[];let dynamic;
    for(let i=0;i<count;i++){const offset=i*stride,type=headers.readUInt32LE(offset);const segment={offset:Number(headers.readBigUInt64LE(offset+8)),address:Number(headers.readBigUInt64LE(offset+16)),size:Number(headers.readBigUInt64LE(offset+32))};if(type===1)loads.push(segment);if(type===2)dynamic=segment;}
    if(!dynamic)return [];const data=await read(dynamic.size,dynamic.offset),offsets=[];let address=0,stringSize=0;
    for(let i=0;i+16<=data.length;i+=16){const tag=data.readBigUInt64LE(i),value=Number(data.readBigUInt64LE(i+8));if(tag===0n)break;if(tag===1n)offsets.push(value);if(tag===5n)address=value;if(tag===10n)stringSize=value;}
    if(!offsets.length)return [];const load=loads.find(x=>address>=x.address&&address+stringSize<=x.address+x.size);if(!load||!stringSize)throw Error('Invalid ELF dynamic string table');
    const strings=await read(stringSize,load.offset+address-load.address);
    return offsets.map(offset=>{const end=strings.indexOf(0,offset);if(!Number.isSafeInteger(offset)||offset<0||offset>=strings.length||end<offset)throw Error('Invalid ELF dependency name');const name=strings.toString('ascii',offset,end);if(!/^[A-Za-z0-9_.+-]+$/.test(name))throw Error('Unsafe ELF dependency name');return name;});
  }finally {await handle.close();}
}
function shapeChecks(entries,blockers) {
  const names=new Set(entries.map(x=>x.path));const require=name=>{if(!names.has(name))blockers.push('Missing required file: '+name);};
  for(const major of ['21','25']) {for(const name of ['release','lib/server/libjvm.so','lib/libjli.so','lib/libjava.so'])require(`java/${major}/${name}`);
    if(![...names].some(x=>x.startsWith(`java/${major}/legal/`)))blockers.push(`Missing Java ${major} legal tree`);}
  for(const version of ['3.3.3','3.4.1']) {for(const name of ['lwjgl','lwjgl_opengl','lwjgl_stb','lwjgl_tinyfd','openal'])require(`lwjgl/${version}/lib${name}.so`);
    for(const module of ['','-glfw','-opengl','-stb','-openal','-jemalloc','-tinyfd'])require(`lwjgl/${version}/java/lwjgl${module}-${version}.jar`);}
  require('renderers/osmesa/libOSMesa.so');require('renderers/osmesa/libsync.so');require('audio/libopenal.so');
  for(const version of ['5.14.0','5.17.0'])require(`jna/${version}/libjnidispatch.so`);
  require(CORE_UNSAFE.path);require('lwjgl/3.4.1/libfreetype.so');
  for(const module of ['freetype','shaderc','spvc','vma','vulkan'])require(`lwjgl/3.4.1/java/lwjgl-${module}-3.4.1.jar`);
  for(const name of ['updater-launcher','direct-lobby','authlib-injector'])require(`tools/${name}.jar`);
  for(const component of TOOLS)for(const prefix of ['licenses','sources'])if(!entries.some(x=>x.path.startsWith(`${prefix}/${component}/`)))throw Error(`Missing ${component} ${prefix}`);
  for(const id of REQUIRED.filter(x=>x!=='java21'&&x!=='java25'))if(!entries.some(x=>x.path.startsWith(`licenses/${id}/`)))blockers.push(`Missing ${id} license tree`);
}
async function writeZip(file,entries,moduleBytes) {
  const zip=new yazl.ZipFile();zip.addBuffer(moduleBytes,'module.json',{mtime:ZIP_DATE,mode:0o100644});
  for(const row of entries) {const options={mtime:ZIP_DATE,mode:0o100644};if(row.bytes)zip.addBuffer(row.bytes,'app_runtime/'+row.path,options);else zip.addFile(row.file,'app_runtime/'+row.path,options);}
  const output=createWriteStream(file,{flags:'wx'});zip.on('error',error=>output.destroy(error));zip.end();await pipeline(zip.outputStream,output);
}
async function verifyZip(file,expected) {
  return new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true},(error,zip)=>{
    if(error)return reject(error);const remaining=new Map(expected);let failed=false;
    const fail=error=>{if(!failed){failed=true;zip.close();reject(error);}};zip.on('error',fail);
    zip.on('end',()=>remaining.size?fail(Error('ZIP omitted expected files')):resolve());
    zip.on('entry',entry=>{const row=remaining.get(entry.fileName);if(!row||entry.uncompressedSize!==row.size)return fail(Error('Unexpected ZIP entry or size: '+entry.fileName));remaining.delete(entry.fileName);
      zip.openReadStream(entry,(error,stream)=>{if(error)return fail(error);const h=createHash('sha256');let size=0;
        stream.on('data',part=>{size+=part.length;h.update(part);if(size>row.size)stream.destroy(Error('ZIP size mismatch'));});stream.on('error',fail);
        stream.on('end',()=>{if(size!==row.size||h.digest('hex')!==row.sha256)return fail(Error(`ZIP content changed after source validation: ${entry.fileName}`));zip.readEntry();});});
    });zip.readEntry();
  }));
}

/** Produce only an unsigned, reviewable payload. No update feed or signature is written. */
export async function packageRuntimeModule(options={}) {
  const repo=path.resolve(options.repo||REPO),candidate=options.candidate===true,review=path.join(repo,'.runtime/review084');
  const versionCode=options.versionCode??80400,version=options.version||'0.8.4-dev';
  if(!Number.isSafeInteger(versionCode)||versionCode<80400||! /^[A-Za-z0-9._-]+$/.test(version))throw Error('Invalid runtime version');
  const output=path.resolve(options.output||path.join(review,`HXZ-Runtime-${version}${candidate?'-candidate':''}.zip`));
  if(!/^HXZ-Runtime-[A-Za-z0-9._-]+\.zip$/.test(path.basename(output)))throw Error('Runtime ZIP filename must match updater contract');
  if(candidate&&!inside(review,output))throw Error('Candidate output must stay inside .runtime/review084');
  await noLinks(output);if(!candidate&&!/^https:\/\/github\.com\/0xiaoyun0\/HXZ_LAUNCHER\/releases\/download\/[A-Za-z0-9._-]+\/HXZ-Runtime-[A-Za-z0-9._-]+\.zip$/.test(options.url||''))throw Error('Formal unsigned payload requires an explicit official release URL');
  if(!candidate&&path.basename(new URL(options.url).pathname)!==path.basename(output))throw Error('Release URL filename must match output ZIP');
  if(options.candidateRenderer&&!candidate)throw Error('--candidate-renderer requires --candidate');
  const dependencyPath=path.resolve(options.lock||path.join(repo,'mobile/runtime/dependencies.lock.json'));
  const toolsPath=path.resolve(options.toolsLock||path.join(repo,'mobile/runtime/tools.lock.json'));
  const deps=await readLock(dependencyPath),tools=await readLock(toolsPath),blockers=[];
  const states=componentStates(deps.lock,REQUIRED,blockers);componentStates(tools.lock,TOOLS,blockers);
  let stage=path.resolve(options.stage||local(repo,deps.lock.stageRoot||'.runtime/hxz-runtime-upstream/input/app_runtime'));
  // Accept either app_runtime itself or its enclosing input/stage directory.
  if(options.stage) {try {if((await fs.stat(path.join(stage,'app_runtime'))).isDirectory())stage=path.join(stage,'app_runtime');}catch(error){if(error.code!=='ENOENT')throw error;}}
  const entries=[],names=new Set();let total=0;
  async function add(row,file,bytes) {
    safePath('app_runtime/'+row.path);const folded=row.path.toLowerCase();if(names.has(folded))throw Error(`Duplicate module path: ${row.path}`);names.add(folded);
    if(!SHA.test(row.sha256))throw Error('Missing source hash: '+row.path);
    const size=bytes?bytes.length:(await regular(file)).size;if(size<=0||size>MAX_TOTAL)throw Error('Invalid file size: '+row.path);
    if(row.size!==undefined&&row.size!==size)throw Error('Locked file size changed: '+row.path);
    if((bytes?hash(bytes):await digest(file))!==row.sha256)throw Error('Locked SHA256 mismatch: '+row.path);
    if(!bytes&&row.path.endsWith('.jar'))await inspectJar(file);const needed=!bytes&&row.path.endsWith('.so')?await inspectElf(file):[];
    if(row.path===CORE_UNSAFE.path&&(size!==CORE_UNSAFE.size||await digest(file,'sha1')!==CORE_UNSAFE.sha1))throw Error('Core LWJGL unsafe differs from official Mojang 26.2 metadata');
    if(/\.(?:apk|dex)$/i.test(row.path))throw Error('Application code is not allowed in runtime assets');
    total+=size;if(total>MAX_TOTAL||entries.length>=1999)throw Error('Runtime extraction limits exceeded');
    if(row.status!=='ready')blockers.push(`${row.path}: ${row.status}`);
    entries.push({path:row.path,file,bytes,size,sha256:row.sha256,needed});
  }
  // Validate all source archives too, so a lock with absent corresponding source cannot authorize release.
  for(const artifact of deps.lock.artifacts) {
    if(!artifact.id||!artifact.file||!SHA.test(artifact.sha256)||!artifact.license||!artifact.url)throw Error('Incomplete dependency artifact provenance');
    const file=local(repo,artifact.file);const stat=await regular(file);if(artifact.size!==undefined&&stat.size!==artifact.size)throw Error('Artifact size changed: '+artifact.id);
    if(await digest(file)!==artifact.sha256)throw Error('Artifact SHA256 mismatch: '+artifact.id);
  }
  for(const id of REQUIRED)if(states.get(id).status==='ready') {
    if(!deps.lock.artifacts.some(x=>x.component===id&&x.kind==='source'&&x.status==='ready'))throw Error('Missing pinned corresponding source artifact: '+id);
    if(!deps.lock.artifacts.some(x=>x.component===id&&x.kind!=='source'&&x.status==='ready'&&!x.excludedFromStage))throw Error('Missing pinned runtime/build artifact: '+id);
  }
  const staged=new Map();for(const row of deps.lock.stagedFiles) {safePath('app_runtime/'+row.path);if(staged.has(row.path)||!states.has(row.component))throw Error('Invalid dependency staged row: '+row.path);staged.set(row.path,row);}
  const actual=await walk(stage);if(actual.length!==staged.size)throw Error('Dependency stage differs from source lock (missing or unlocked files)');
  for(const relative of actual) {const row=staged.get(relative);if(!row)throw Error('Unlocked stage file: '+relative);await add(row,path.join(stage,...relative.split('/')));}
  for(const row of tools.lock.stagedFiles) {
    if(!TOOLS.includes(row.component)||!row.role||!row.origin)throw Error('Incomplete tool source provenance');
    const file=local(repo,row.file);await add(row,file);
    if(!/^https:\/\//.test(row.origin)&&!row.origin.includes('#')) {const origin=local(repo,row.origin);await regular(origin);if(await digest(origin)!==row.sha256)throw Error('Project tool/source changed; refresh tools lock: '+row.origin);}
  }
  // The fixed official agent is never silently replaced by a different version or local agent.
  const auth=tools.lock.artifacts.find(x=>x.id==='authlib-injector-1.2.8');
  if(!auth||auth.version!=='1.2.8'||auth.sourceCommit!=='5437f5b465ee3f5be0a1e5e1ae3c50978114f6fb'||auth.checksums?.sha256!=='9c7f4343e6c82034958ffb48c14a2cb0c85928be7283103ce17da00c6d5a7b10'||auth.source_sha256!=='be3c56d65dcb51c75662ef3fc68c9daf5bc19f2354b76a3d76ab7ddfc6ad60ba')throw Error('Official authlib-injector 1.2.8 authority pin missing');
  if(entries.find(x=>x.path==='tools/authlib-injector.jar')?.sha256!==auth.checksums.sha256||entries.find(x=>x.path==='sources/authlib-injector/authlib-injector-1.2.8-source.zip')?.sha256!==auth.source_sha256)throw Error('Authlib binary/source differs from official pins');
  if(options.candidateRenderer) {
    const file=path.resolve(options.candidateRenderer);const artifact=deps.lock.artifacts.find(x=>x.component==='mesa'&&x.excludedFromStage===true&&path.resolve(local(repo,x.file))===file);
    if(!artifact)throw Error('Candidate renderer must exactly match an excluded Mesa artifact in dependency lock');
    await add({path:'renderers/osmesa/libOSMesa.so',sha256:artifact.sha256,size:artifact.size,status:artifact.status},file);
  }
  for(const [name,bytes] of [['dependencies.lock.json',deps.bytes],['tools.lock.json',tools.bytes]])await add({path:'provenance/'+name,sha256:hash(bytes),status:'ready'},null,bytes);
  const renderer=entries.find(x=>x.path==='renderers/osmesa/libOSMesa.so');
  const rendererArtifact=renderer&&deps.lock.artifacts.find(x=>x.component==='mesa'&&x.sha256===renderer.sha256&&x.status==='ready'&&x.capabilities?.driversVerified===true);
  const drivers=rendererArtifact?.capabilities?.drivers||[];
  if(!Array.isArray(drivers)||drivers.some(x=>!['llvmpipe','softpipe','zink','freedreno'].includes(x)))throw Error('Invalid renderer driver capabilities');
  const renderers=drivers.filter(x=>x!=='freedreno').map(driver=>({id:driver,label:driver==='zink'?'Vulkan 转译渲染':'软件兼容渲染',kind:'osmesa',library:'app_runtime/renderers/osmesa/libOSMesa.so',driver,requiresVulkan:driver==='zink'}));
  if(!renderers.length)blockers.push('No verified OSMesa driver capabilities');
  const capabilities={vulkanGameBackend:false,preferredGraphicsBackend:'opengl'};
  if(deps.lock.capabilities?.vulkanGameBackend!==false||deps.lock.capabilities?.preferredGraphicsBackend!=='opengl')throw Error('Source lock must explicitly require the implemented Minecraft OpenGL backend');
  const lwjglCapabilities=deps.lock.lwjgl341Capabilities;
  if(lwjglCapabilities?.coreClassifier!=='unsafe'||!Number.isSafeInteger(lwjglCapabilities.coreJniMethodsVerified)||lwjglCapabilities.coreJniMethodsVerified<1||!Array.isArray(lwjglCapabilities.requiredNativeLibraries)||!Array.isArray(lwjglCapabilities.officialModuleJars))throw Error('Missing verified LWJGL 3.4.1 unsafe ABI/module requirements');
  for(const library of lwjglCapabilities.requiredNativeLibraries) {safePath(library);if(library.includes('/'))throw Error('Expected a native library basename');if(!entries.some(x=>x.path==='lwjgl/3.4.1/'+library))blockers.push('Missing required LWJGL native: '+library);}
  for(const library of lwjglCapabilities.officialModuleJars) {safePath(library);if(library.includes('/'))throw Error('Expected a Java library basename');if(!entries.some(x=>x.path==='lwjgl/3.4.1/java/'+library))blockers.push('Missing required LWJGL Java module: '+library);}
  for(const row of entries)for(const needed of row.needed) {
    if(PLATFORM_LIBRARIES.has(needed))continue;
    const javaPrefix=/^java\/(21|25)\//.exec(row.path),lwjglPrefix=/^lwjgl\/[^/]+\//.exec(row.path);
    const compatible=entries.some(x=>path.posix.basename(x.path)===needed&&(javaPrefix?x.path.startsWith(javaPrefix[0]):!x.path.startsWith('java/'))&&(!lwjglPrefix||!x.path.startsWith('lwjgl/')||x.path.startsWith(lwjglPrefix[0])));
    if(!compatible)blockers.push(`Missing ELF dependency: ${row.path} -> ${needed}`);
  }
  shapeChecks(entries,blockers);entries.sort((a,b)=>ordered(a.path,b.path));
  const uniqueBlockers=[...new Set(blockers)];if(!candidate&&uniqueBlockers.length)throw Error('Runtime is not release ready:\n'+uniqueBlockers.join('\n'));
  const constraints={androidAbi:'arm64-v8a',pageSize:4096,minimumAndroidApi:29,deviceTested:false};
  const module={schema:1,kind:'hxz-runtime-assets',interfaceVersion:1,abi:'arm64-v8a',version,versionCode,candidate,releaseReady:!candidate&&uniqueBlockers.length===0,
    constraints,renderers,capabilities,blockers:uniqueBlockers,files:entries.map(({path,size,sha256})=>({path:'app_runtime/'+path,size,sha256}))};
  const moduleBytes=json(module);if(moduleBytes.length>1024*1024)throw Error('Module manifest exceeds consumer limit');
  await fs.mkdir(path.dirname(output),{recursive:true});await noLinks(output);
  const temporary=output+`.${process.pid}.tmp`;await noLinks(temporary);
  try {await writeZip(temporary,entries,moduleBytes);const stat=await regular(temporary);if(stat.size>MAX_ZIP)throw Error('ZIP exceeds updater size limit');
    await verifyZip(temporary,new Map([['module.json',{size:moduleBytes.length,sha256:hash(moduleBytes)}],...module.files.map(x=>[x.path,x])]));
    const sha256=await digest(temporary);
    const provenance={schema:1,kind:'hxz-runtime-build-provenance',interfaceVersion:1,version,versionCode,candidate,releaseReady:module.releaseReady,deviceTested:false,
      archive:{file:path.basename(output),size:stat.size,sha256,moduleSha256:hash(moduleBytes)},constraints,renderers,capabilities,
      dependencyLock:{file:slash(path.relative(repo,dependencyPath)),sha256:hash(deps.bytes)},toolsLock:{file:slash(path.relative(repo,toolsPath)),sha256:hash(tools.bytes)},
      dependencies:deps.lock,tools:tools.lock};
    const provenanceBytes=json(provenance);
    const payload={kind:candidate?'android-runtime-candidate':'android-runtime-module',package:'top.hxzmc.community',interfaceVersion:1,abi:'arm64-v8a',minSdk:29,
      minimumAppVersionCode:80400,versionCode,version,versionName:version,url:candidate?'https://local-candidate.invalid/'+path.basename(output):options.url,size:stat.size,sha256,
      moduleSha256:hash(moduleBytes),provenanceSha256:hash(provenanceBytes),candidate,releaseReady:module.releaseReady,constraints,renderers,capabilities,blockers:uniqueBlockers};
    const payloadFile=output.replace(/\.zip$/,'.payload.json'),provenanceFile=output.replace(/\.zip$/,'.provenance.json');await noLinks(payloadFile);await noLinks(provenanceFile);
    await fs.rename(temporary,output);await fs.writeFile(provenanceFile,provenanceBytes);await fs.writeFile(payloadFile,json(payload));
    return {zip:output,payload:payloadFile,provenance:provenanceFile,files:entries.length,uncompressedSize:total,size:stat.size,sha256,moduleSha256:payload.moduleSha256,provenanceSha256:payload.provenanceSha256,candidate,releaseReady:module.releaseReady,blockers:uniqueBlockers};
  }finally {try {await fs.unlink(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const options={};const keys={'--stage':'stage','--lock':'lock','--tools-lock':'toolsLock','--output':'output','--url':'url','--version':'version','--version-code':'versionCode','--candidate-renderer':'candidateRenderer'};
  for(let i=2;i<process.argv.length;i++) {const arg=process.argv[i];if(arg==='--candidate')options.candidate=true;else if(keys[arg]&&process.argv[i+1]&&!process.argv[i+1].startsWith('--'))options[keys[arg]]=arg==='--version-code'?Number(process.argv[++i]):process.argv[++i];else throw Error('Unknown/missing option: '+arg);}
  console.log(JSON.stringify(await packageRuntimeModule(options),null,2));
}

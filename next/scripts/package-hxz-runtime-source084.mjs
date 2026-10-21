import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import yazl from 'yazl';
import yauzl from 'yauzl';

const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
const fixedDate=new Date('1980-01-01T00:00:00Z');
const SHA=/^[a-f0-9]{64}$/;
const ordered=(a,b)=>a<b?-1:a>b?1:0;
function safe(relative) {
  if(typeof relative!=='string'||relative.length>240||!relative.match(/^[A-Za-z0-9_./+-]+$/)||relative.startsWith('/')||relative.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Unsafe source path: '+relative);
  return relative;
}
function local(repo,relative) {return path.resolve(repo,...safe(relative).split('/'));}
async function noLinks(file,allowMissing=false) {
  let current=path.resolve(file);for(;;) {try{if((await fs.lstat(current)).isSymbolicLink())throw Error('Source/output symlink forbidden: '+current);}catch(error){if(!allowMissing||error.code!=='ENOENT')throw error;}const parent=path.dirname(current);if(parent===current)break;current=parent;}
}
async function regular(file) {
  await noLinks(file);
  const stat=await fs.stat(file);if(!stat.isFile())throw Error('Not a regular file: '+file);return stat;
}
async function digest(file) {const h=createHash('sha256');for await(const part of createReadStream(file))h.update(part);return h.digest('hex');}
async function zipMetadata(file) {
  return new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true},(error,zip)=>{
    if(error)return reject(error);let found=false;zip.on('error',reject);
    zip.on('entry',entry=>{if(entry.fileName!=='module.json')return zip.readEntry();found=true;if(entry.uncompressedSize>1024*1024){zip.close();return reject(Error('Oversized runtime metadata'));}
      zip.openReadStream(entry,(error,stream)=>{if(error){zip.close();return reject(error);}const parts=[];stream.on('data',part=>parts.push(part));stream.on('error',reject);stream.on('end',()=>{zip.close();resolve(Buffer.concat(parts));});});});
    zip.on('end',()=>{if(!found)reject(Error('Missing runtime module.json'));});zip.readEntry();
  }));
}
async function verifyArchive(file,expected) {
  return new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true,validateEntrySizes:true},(error,zip)=>{
    if(error)return reject(error);const seen=new Set();zip.on('error',reject);
    zip.on('entry',entry=>{try {safe(entry.fileName);const row=expected.get(entry.fileName);if(!row||seen.has(entry.fileName)||entry.uncompressedSize!==row.size)throw Error('Unexpected source ZIP entry: '+entry.fileName);seen.add(entry.fileName);
      zip.openReadStream(entry,(error,stream)=>{if(error)return reject(error);const h=createHash('sha256');let count=0;stream.on('data',part=>{count+=part.length;h.update(part);});stream.on('error',reject);stream.on('end',()=>{if(count!==row.size||h.digest('hex')!==row.sha256){zip.close();return reject(Error('Source ZIP content changed: '+entry.fileName));}zip.readEntry();});});
    }catch(error){zip.close();reject(error);}});
    zip.on('end',()=>seen.size===expected.size?resolve():reject(Error('Missing source ZIP entries')));zip.readEntry();
  }));
}

export async function packageRuntimeSources(options={}) {
  const repo=path.resolve(options.repo||REPO),runtime=path.resolve(options.runtime||path.join(repo,'release/0.8.4/android/HXZ-Runtime-0.8.4.zip'));
  const stem=runtime.replace(/\.zip$/,''),output=path.resolve(options.output||stem+'-source-licenses.zip');
  if(runtime===output||!output.endsWith('.zip')||!runtime.endsWith('.zip'))throw Error('Distinct runtime and source ZIP paths required');
  await regular(runtime);const payloadBytes=await fs.readFile(stem+'.payload.json'),payload=JSON.parse(payloadBytes),provenanceBytes=await fs.readFile(stem+'.provenance.json'),provenance=JSON.parse(provenanceBytes);
  const moduleBytes=await zipMetadata(runtime),module=JSON.parse(moduleBytes);
  if(payload.candidate!==false||payload.releaseReady!==true||payload.kind!=='android-runtime-module'||payload.size!==(await fs.stat(runtime)).size||payload.sha256!==await digest(runtime)||payload.moduleSha256!==hash(moduleBytes)||payload.provenanceSha256!==hash(provenanceBytes))throw Error('Formal runtime and provenance must verify before source packaging');
  if(provenance.archive.sha256!==payload.sha256||provenance.archive.moduleSha256!==payload.moduleSha256)throw Error('Provenance/runtime binding mismatch');
  const deps=provenance.dependencies,tools=provenance.tools;
  if(deps.requiredComponents.some(x=>x.status!=='ready')||tools.requiredComponents.some(x=>x.status!=='ready'))throw Error('Required component is not ready');
  // Use the immutable verified extraction as a source/license snapshot when supplied.
  const installed=options.installed?path.resolve(options.installed):null,stage=local(repo,deps.stageRoot);
  const rows=[],names=new Set();let total=0;
  async function add(relative,file,expected,metadata={},bytes=null) {
    safe(relative);if(names.has(relative.toLowerCase()))throw Error('Duplicate source path: '+relative);names.add(relative.toLowerCase());
    const size=bytes?bytes.length:(await regular(file)).size,sha256=bytes?hash(bytes):await digest(file);
    if(!SHA.test(expected.sha256)||sha256!==expected.sha256||(expected.size!==undefined&&size!==expected.size))throw Error('Source/notice differs from frozen lock: '+relative);
    total+=size;if(total>2*1024*1024*1024||rows.length>5000)throw Error('Source bundle exceeds explicit budget');
    rows.push({path:relative,file,bytes,size,sha256,...metadata});
  }
  const sourceArtifacts=deps.artifacts.filter(x=>x.kind==='source'&&x.status==='ready'&&!x.excludedFromStage);
  for(const id of deps.requiredComponents.map(x=>x.id))if(!sourceArtifacts.some(x=>x.component===id))throw Error('Missing corresponding source: '+id);
  for(const artifact of sourceArtifacts)await add('inputs/'+artifact.file,local(repo,artifact.file),artifact,{role:'source-archive',component:artifact.component,origin:artifact.url,sourceCommit:artifact.sourceCommit,artifactId:artifact.id,license:artifact.license});
  const runtimeFiles=new Map(module.files.map(row=>[row.path,row]));
  for(const row of deps.stagedFiles.filter(row=>row.path.startsWith('licenses/')||/^java\/(21|25)\/legal\//.test(row.path))) {
    const runtimePath='app_runtime/'+row.path,locked=runtimeFiles.get(runtimePath);if(!locked||locked.sha256!==row.sha256)throw Error('License absent from formal runtime: '+runtimePath);
    await add('runtime-content/'+runtimePath,installed?path.join(installed,...runtimePath.split('/')):path.join(stage,...row.path.split('/')),locked,{role:'runtime-license',component:row.component,origin:row.path,runtimePath});
  }
  for(const row of tools.stagedFiles.filter(x=>x.role==='source'||x.role==='license'||x.component==='runtime-build')) {
    if(row.role!=='source'&&row.role!=='license')throw Error('Build recipe must be marked source/license');
    const runtimePath='app_runtime/'+row.path,locked=runtimeFiles.get(runtimePath);if(!locked||locked.sha256!==row.sha256)throw Error('Tool source absent from formal runtime');
    const file=installed?path.join(installed,...runtimePath.split('/')):local(repo,row.file);
    await add('runtime-content/'+runtimePath,file,locked,{role:row.role==='source'?'runtime-source':'runtime-license',component:row.component,origin:row.origin,runtimePath});
    if(row.role==='source'&&!/^https:\/\//.test(row.origin)&&!row.origin.includes('#')) {
      const publicOrigin=row.origin.replace(/^mobile\/game-engine\/updater-base\//,'mobile/runtime/updater-base/');
      await add('inputs/'+publicOrigin,file,locked,{role:'recipe-source',component:row.component,origin:row.origin,runtimePath});
    }
  }
  const hxzupSnapshotBytes=await fs.readFile(path.join(repo,'.runtime/hxz-runtime-upstream/hxzup-source-snapshot.lock.json')),hxzupSnapshot=JSON.parse(hxzupSnapshotBytes);
  if(hxzupSnapshot.schemaVersion!==1||hxzupSnapshot.kind!=='hxzup-project-source-snapshot'||!Array.isArray(hxzupSnapshot.files)||!hxzupSnapshot.files.some(x=>x.sourcePath==='client/src/launcher/java/up/hxz/launcher/Launcher.java')||!hxzupSnapshot.files.some(x=>x.sourcePath==='client/src/main/java/up/hxz/Updater.java'))throw Error('Missing full available project HXZUP bootstrap/updater source snapshot');
  for(const row of hxzupSnapshot.files) {
    if(row.component!=='hxzup'||!['recipe-source','runtime-license'].includes(row.role)||!row.archivePath.startsWith('inputs/hxzup-own-source/'))throw Error('Invalid HXZUP source snapshot row');
    await add(row.archivePath,local(repo,row.file),row,{role:row.role,component:'hxzup',origin:row.origin});
  }
  // Exact NDK support-runtime corresponding source is supplied independently; the signed runtime lock stays frozen.
  const supplementalPath=path.resolve(options.supplementalLock||path.join(repo,'.runtime/hxz-runtime-upstream/source-bundle-supplemental.lock.json'));
  const supplementalBytes=await fs.readFile(supplementalPath),supplemental=JSON.parse(supplementalBytes);
  if(supplemental.schemaVersion!==1||!Array.isArray(supplemental.artifacts))throw Error('Invalid supplemental source lock');
  const support=deps.artifacts.find(x=>x.id==='java25-libcxx-shared');
  for(const id of ['ndk-libcxx-source','ndk-libcxxabi-source','ndk-libunwind-source','ndk-llvm-android-build-source']) {
    const artifact=supplemental.artifacts.find(x=>x.id===id);
    if(!artifact||artifact.kind!=='source'||artifact.status!=='ready'||artifact.component!=='java25'||artifact.sourceCommit!==(id==='ndk-llvm-android-build-source'?support.buildSourceCommit:support.sourceCommit))throw Error('Missing exact NDK runtime/build source: '+id);
  }
  for(const artifact of supplemental.artifacts) {
    if(artifact.kind!=='source'||artifact.status!=='ready'||!artifact.url||!artifact.license)throw Error('Unapproved supplemental artifact');
    await add('inputs/'+artifact.file,local(repo,artifact.file),artifact,{role:'source-archive',component:artifact.component,origin:artifact.url,sourceCommit:artifact.sourceCommit,artifactId:artifact.id,license:artifact.license});
  }
  const embeddedLocks=[['dependencies.lock.json',provenance.dependencyLock],['tools.lock.json',provenance.toolsLock]];
  for(const [name,binding] of embeddedLocks) {
    const runtimePath='app_runtime/provenance/'+name,locked=runtimeFiles.get(runtimePath);if(!locked||locked.sha256!==binding.sha256)throw Error('Frozen provenance lock mismatch');
    const bytes=installed?await fs.readFile(path.join(installed,...runtimePath.split('/'))):await fs.readFile(local(repo,binding.file));
    await add('inputs/'+binding.file,null,locked,{role:'provenance',origin:binding.file,runtimePath},bytes);
  }
  for(const [relative,bytes] of [['provenance/runtime.module.json',moduleBytes],['provenance/runtime.payload.json',payloadBytes],['provenance/runtime.provenance.json',provenanceBytes],['provenance/source-bundle-supplemental.lock.json',supplementalBytes],['provenance/hxzup-source-snapshot.lock.json',hxzupSnapshotBytes]])await add(relative,null,{sha256:hash(bytes)},{role:'provenance',origin:relative},bytes);
  const readme=Buffer.from('HXZ Runtime 0.8.4 corresponding sources and licenses\n\nThis sidecar corresponds only to the runtime ZIP and module hashes in source-license-link.json.\ninputs/ preserves repository-relative locked input paths. Recreate those paths under a clean repository root (strip inputs/); build recipes are under mobile/runtime/upstream-build and upstream build-source archives. Runtime legal/source notices are copied verbatim under runtime-content/. Each source archive retains complete upstream file headers and notices. Upstream JRE/JNA binaries are pinned publisher artifacts; the archive does not claim they were rebuilt locally.\n\nOnly status=ready source artifacts used by the formal module, exact NDK support runtime sources, locked self-owned recipes, licenses and provenance are included. Research-only publisher Mesa overlays and candidate binaries are excluded. No account data, credentials, private signing material or build cache is collected. Runtime native execution/device behavior remains untested.\n\nSee provenance/runtime.provenance.json for source URLs, commits, binary hashes and build capabilities; source-license-link.json lists every sidecar file except itself. SHA256 is over original file bytes.\n');
  await add('README.txt',null,{sha256:hash(readme)},{role:'instructions',origin:'generated source bundle instructions'},readme);
  const notes=Buffer.from('Reproduction and source coverage notes\n\n1. Preserve this archive and its original locks. Reconstruct only inputs/ into a separate clean build directory. For the temporary build copy of mobile/runtime/dependencies.lock.json, filter artifacts to status=ready and excludedFromStage!=true before running prepare-sources.py: its historical source map still contains an unused research-only Mesa overlay. That overlay is deliberately absent here and is not used by the formal Mesa recipe. This filtering changes only the temporary build-input list, never the archived provenance or corresponding source bytes.\n2. Run Python prepare-sources.py for LWJGL/libffi/OpenAL/libsync and prepare-mesa.py for the independent Mesa tree. The latter imports only the separately pinned official Mesa24 OSMesa files and applies the included self-owned minimal API/Meson edits. NDK r30, CMake/Ninja, Python/Meson/Mako/PyYAML/packaging and flex/bison are external build tools; toolchain version/revision manifests and exact source revisions are included under runtime-content licenses and the supplemental source lock. Edit local tool executable paths in an explicit local build configuration. No device or bit-identical rebuild is claimed.\n3. Project-tool source coverage declarations from the immutable runtime tool lock:\n'+tools.artifacts.filter(x=>x.sourceCoverage).map(x=>x.id+': '+x.sourceCoverage).join('\n')+'\nThis bundle does not invent missing pre-existing bootstrap sources or claim they were rebuilt.\n');
  const sourceCoverage=Buffer.concat([notes,Buffer.from('\n4. Additional project source snapshot: '+hxzupSnapshot.sourceCoverage+'\nSee inputs/hxzup-own-source and provenance/hxzup-source-snapshot.lock.json. The complete available original bootstrap is supplied there in addition to the frozen lock sources; no byte-identical bootstrap rebuild is claimed. The self-owned IO/Rules frozen bytes are mapped to inputs/mobile/runtime/updater-base, leaving the retired game-engine directory out of this archive. Gson 2.13.2 source JAR is pinned to its official Maven SHA1; the original build script can fetch the corresponding binary dependency separately and verify client/lib/gson-2.13.2.jar.sha256.\n')]);
  await add('REBUILD-NOTES.txt',null,{sha256:hash(sourceCoverage)},{role:'instructions',origin:'generated source coverage and reproduction notes'},sourceCoverage);
  rows.sort((a,b)=>ordered(a.path,b.path));
  const link={schema:1,kind:'hxz-runtime-source-license-link',runtime:path.basename(runtime),runtimeSha256:payload.sha256,moduleSha256:payload.moduleSha256,version:payload.version,excludedResearchArtifacts:deps.artifacts.filter(x=>x.status!=='ready').map(x=>x.id),entries:rows.map(({file,bytes,...row})=>row)};
  const linkBytes=json(link);const expected=new Map(rows.map(row=>[row.path,row]));expected.set('source-license-link.json',{size:linkBytes.length,sha256:hash(linkBytes)});
  await fs.mkdir(path.dirname(output),{recursive:true});
  // Validate output ancestors without following links, including when the target does not exist yet.
  await noLinks(output,true);
  await noLinks(output.replace(/\.zip$/,'.sources.json'),true);await noLinks(output.replace(/\.zip$/,'.sha256'),true);
  const temporary=output+`.${process.pid}.tmp`;
  try {
    const zip=new yazl.ZipFile();zip.addBuffer(linkBytes,'source-license-link.json',{mtime:fixedDate,mode:0o100644});
    for(const row of rows) {const opts={mtime:fixedDate,mode:0o100644,compress:! /\.(?:gz|xz|zip|bz2|zst)$/.test(row.path)};if(row.bytes)zip.addBuffer(row.bytes,row.path,opts);else zip.addFile(row.file,row.path,opts);}
    const write=pipeline(zip.outputStream,createWriteStream(temporary,{flags:'wx'}));zip.end();await write;
    await verifyArchive(temporary,expected);const size=(await regular(temporary)).size,sha256=await digest(temporary);await fs.rename(temporary,output);
    await fs.writeFile(output.replace(/\.zip$/,'.sources.json'),linkBytes);
    await fs.writeFile(output.replace(/\.zip$/,'.sha256'),sha256+'  '+path.basename(output)+'\n');
    return {zip:output,size,sha256,files:expected.size,sourceArtifacts:sourceArtifacts.length+supplemental.artifacts.length,runtimeSha256:payload.sha256,moduleSha256:payload.moduleSha256,sourceManifestSha256:hash(linkBytes),allEntriesReadBackVerified:true};
  }finally {try{await fs.unlink(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const options={},keys={'--runtime':'runtime','--output':'output','--installed':'installed','--supplemental-lock':'supplementalLock'};
  for(let i=2;i<process.argv.length;i++){if(!keys[process.argv[i]]||!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw Error('Unknown/missing source bundle argument');options[keys[process.argv[i]]]=process.argv[++i];}
  console.log(JSON.stringify(await packageRuntimeSources(options),null,2));
}

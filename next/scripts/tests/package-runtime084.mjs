import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import yazl from 'yazl';
import yauzl from 'yauzl';
import {packageRuntimeModule} from '../package-hxz-runtime084.mjs';

// Synthetic ELF/JAR metadata fixtures exercise packaging only; they are never executable runtimes.
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=await fs.mkdtemp(path.join(repo,'.runtime/review084/packager-test-'));
const stage=path.join(base,'app_runtime'),lockFile=path.join(base,'dependencies.lock.json');
const hash=x=>createHash('sha256').update(x).digest('hex');
const rel=x=>path.relative(repo,x).split(path.sep).join('/');
const ids=['java21','java25','lwjgl333','lwjgl341','mesa','openal','libsync','jna5140','jna5170','freetype'];
const elf=Buffer.alloc(64);elf.writeUInt32BE(0x7f454c46);elf[4]=2;elf[5]=1;elf.writeUInt16LE(183,18);
async function archive(name) {const zip=new yazl.ZipFile();zip.addBuffer(Buffer.from('fixture'),name,{mtime:new Date('1980-01-01T00:00:00Z')});zip.end();const parts=[];for await(const part of zip.outputStream)parts.push(part);return Buffer.concat(parts);}
const jar=await archive('org/lwjgl/Fixture.class');
let rows=[];
async function put(name,component,bytes) {const file=path.join(stage,...name.split('/'));await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);rows.push({path:name,component,status:'ready',sha256:hash(bytes)});}
for(const major of ['21','25']) {for(const file of ['lib/server/libjvm.so','lib/libjli.so','lib/libjava.so'])await put(`java/${major}/${file}`,'java'+major,elf);
  await put(`java/${major}/release`,'java'+major,Buffer.from('JAVA_VERSION="'+major+'"'));
  await put(`java/${major}/legal/java.base/LICENSE`,'java'+major,Buffer.from('fixture license'));}
for(const version of ['3.3.3','3.4.1']) {const id=version==='3.3.3'?'lwjgl333':'lwjgl341';
  for(const name of ['lwjgl','lwjgl_opengl','lwjgl_stb','lwjgl_tinyfd','openal'])await put(`lwjgl/${version}/lib${name}.so`,name==='openal'?'openal':id,elf);
  for(const suffix of ['','-glfw','-opengl','-stb','-openal','-jemalloc','-tinyfd'])await put(`lwjgl/${version}/java/lwjgl${suffix}-${version}.jar`,id,jar);}
await put('renderers/osmesa/libOSMesa.so','mesa',elf);await put('renderers/osmesa/libsync.so','libsync',elf);await put('audio/libopenal.so','openal',elf);
for(const version of ['5.14.0','5.17.0'])await put(`jna/${version}/libjnidispatch.so`,version==='5.14.0'?'jna5140':'jna5170',elf);
await put('lwjgl/3.4.1/libfreetype.so','freetype',elf);
for(const module of ['freetype','shaderc','spvc','vma','vulkan'])await put(`lwjgl/3.4.1/java/lwjgl-${module}-3.4.1.jar`,'lwjgl341',jar);
const unsafe=await fs.readFile(path.join(repo,'.runtime/hxz-runtime-upstream/downloads/lwjgl-3.4.1-unsafe.jar'));
await put('lwjgl/3.4.1/java/lwjgl-3.4.1-unsafe.jar','lwjgl341',unsafe);
for(const id of ids)await put('licenses/'+id+'/LICENSE',id,Buffer.from('fixture license'));
const artifact=path.join(base,'source.fixture');await fs.writeFile(artifact,'fixture source');const sourceHash=hash(Buffer.from('fixture source'));
const lock={schemaVersion:1,stageRoot:rel(stage),capabilities:{vulkanGameBackend:false,preferredGraphicsBackend:'opengl'},requiredComponents:ids.map(id=>({id,status:'ready'})),
  lwjgl341Capabilities:{coreClassifier:'unsafe',coreJniMethodsVerified:2142,requiredNativeLibraries:['liblwjgl.so','libfreetype.so'],officialModuleJars:['lwjgl-3.4.1-unsafe.jar','lwjgl-freetype-3.4.1.jar']},
  artifacts:ids.flatMap(id=>[{id:id+'-source',component:id,kind:'source',file:rel(artifact),sha256:sourceHash,url:'https://example.invalid/source',license:'fixture',status:'ready'},
    {id:id+'-build',component:id,kind:'local-build',file:rel(id==='mesa'?path.join(stage,'renderers/osmesa/libOSMesa.so'):artifact),sha256:id==='mesa'?hash(elf):sourceHash,url:'https://example.invalid/build',license:'fixture',status:'ready',...(id==='mesa'?{capabilities:{drivers:['softpipe','zink'],driversVerified:true}}:{})}]),stagedFiles:rows};
const save=()=>fs.writeFile(lockFile,JSON.stringify(lock));
await save();
const options={repo,lock:lockFile,stage,candidate:true,output:path.join(base,'HXZ-Runtime-fixture.zip')};
let checks=0;
async function rejects(fn,pattern) {await assert.rejects(fn,pattern);checks++;}
async function readEntry(file,name) {return new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true},(error,zip)=>{if(error)return reject(error);zip.on('error',reject);zip.on('entry',entry=>{if(entry.fileName!==name)return zip.readEntry();zip.openReadStream(entry,(error,stream)=>{if(error)return reject(error);const parts=[];stream.on('data',x=>parts.push(x));stream.on('error',reject);stream.on('end',()=>{zip.close();resolve(Buffer.concat(parts));});});});zip.on('end',()=>reject(Error('Missing ZIP entry')));zip.readEntry();}));}

await rejects(()=>packageRuntimeModule({...options,output:path.join(repo,'release/HXZ-Runtime-fixture.zip')}),/Candidate output/);
await rejects(()=>packageRuntimeModule({...options,candidate:false}),/explicit official release URL/);
await rejects(()=>packageRuntimeModule({...options,candidate:false,url:'https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/test/HXZ-Runtime-wrong-name.zip'}),/filename must match/);
await rejects(()=>packageRuntimeModule({...options,candidate:false,candidateRenderer:artifact,url:'https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/test/HXZ-Runtime-fixture.zip'}),/requires --candidate/);
const success=await packageRuntimeModule(options);const firstHash=success.sha256;
const manifest=JSON.parse(await readEntry(success.zip,'module.json'));assert.equal(manifest.schema,1);assert.equal(manifest.kind,'hxz-runtime-assets');assert.equal(manifest.constraints.pageSize,4096);assert.equal(manifest.candidate,true);assert.equal(manifest.releaseReady,false);assert.deepEqual(manifest.renderers.map(x=>x.id),['softpipe','zink']);checks+=6;
const payload=JSON.parse(await fs.readFile(success.payload));assert.equal(payload.kind,'android-runtime-candidate');assert.equal(payload.releaseReady,false);assert.equal(payload.signature,undefined);assert.match(payload.url,/local-candidate.invalid/);checks+=4;
assert.equal(payload.moduleSha256,hash(await readEntry(success.zip,'module.json')));assert.equal(success.moduleSha256,payload.moduleSha256);checks+=2;
assert.deepEqual(payload.renderers,manifest.renderers);assert.deepEqual(payload.capabilities,{vulkanGameBackend:false,preferredGraphicsBackend:'opengl'});assert.deepEqual(payload.constraints,manifest.constraints);assert.equal(payload.provenanceSha256,hash(await fs.readFile(success.provenance)));checks+=4;
assert.equal((await packageRuntimeModule(options)).sha256,firstHash);checks++;
const formal=await packageRuntimeModule({...options,candidate:false,output:path.join(base,'HXZ-Runtime-formal-fixture.zip'),url:'https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/test/HXZ-Runtime-formal-fixture.zip'});
const formalPayload=JSON.parse(await fs.readFile(formal.payload));assert.equal(formalPayload.kind,'android-runtime-module');assert.equal(formalPayload.releaseReady,true);assert.equal(formalPayload.signature,undefined);checks+=3;
assert.equal(formalPayload.moduleSha256,hash(await readEntry(formal.zip,'module.json')));checks++;
lock.requiredComponents.find(x=>x.id==='mesa').status='blocked-source-correspondence';await save();
await rejects(()=>packageRuntimeModule({...options,candidate:false,url:'https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/test/HXZ-Runtime-fixture.zip'}),/not release ready/);
const blocked=await packageRuntimeModule(options);assert.ok(blocked.blockers.some(x=>x.startsWith('mesa: blocked')));checks++;
lock.requiredComponents.find(x=>x.id==='mesa').status='ready';
const removed=lock.requiredComponents.pop();await save();await rejects(()=>packageRuntimeModule(options),/Missing required component/);lock.requiredComponents.push(removed);
const originalRow=rows[0].sha256;rows[0].sha256='0'.repeat(64);await save();await rejects(()=>packageRuntimeModule(options),/SHA256 mismatch/);rows[0].sha256=originalRow;await save();
await fs.writeFile(path.join(stage,'unlocked.txt'),'extra');await rejects(()=>packageRuntimeModule(options),/differs from source lock/);await fs.unlink(path.join(stage,'unlocked.txt'));
const originalSource=lock.artifacts[0].sha256;lock.artifacts[0].sha256='0'.repeat(64);await save();await rejects(()=>packageRuntimeModule(options),/Artifact SHA256 mismatch/);lock.artifacts[0].sha256=originalSource;await save();
const sources=lock.artifacts;lock.artifacts=sources.filter(x=>!(x.component==='java21'&&x.kind==='source'));await save();await rejects(()=>packageRuntimeModule(options),/corresponding source artifact/);lock.artifacts=sources;await save();
const unsafeRow=rows.find(x=>x.path==='lwjgl/3.4.1/java/lwjgl-3.4.1-unsafe.jar'),unsafeHash=unsafeRow.sha256;
await fs.writeFile(path.join(stage,unsafeRow.path),jar);unsafeRow.sha256=hash(jar);await save();await rejects(()=>packageRuntimeModule(options),/Core LWJGL unsafe differs/);await fs.writeFile(path.join(stage,unsafeRow.path),unsafe);unsafeRow.sha256=unsafeHash;await save();
const policy=lock.capabilities;lock.capabilities={vulkanGameBackend:true,preferredGraphicsBackend:'vulkan'};await save();await rejects(()=>packageRuntimeModule(options),/implemented Minecraft OpenGL backend/);lock.capabilities=policy;await save();
const verifiedMethods=lock.lwjgl341Capabilities.coreJniMethodsVerified;lock.lwjgl341Capabilities.coreJniMethodsVerified=0;await save();await rejects(()=>packageRuntimeModule(options),/unsafe ABI\/module requirements/);lock.lwjgl341Capabilities.coreJniMethodsVerified=verifiedMethods;await save();
const jnaIndex=rows.findIndex(x=>x.path==='jna/5.17.0/libjnidispatch.so'),jnaRow=rows.splice(jnaIndex,1)[0];await fs.unlink(path.join(stage,jnaRow.path));await save();
await rejects(()=>packageRuntimeModule({...options,candidate:false,url:'https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/test/HXZ-Runtime-fixture.zip'}),/jna\/5.17.0\/libjnidispatch.so/);rows.splice(jnaIndex,0,jnaRow);await fs.writeFile(path.join(stage,jnaRow.path),elf);await save();
const missingName=Buffer.from('libprivate_fixture.so\0'),dynamicElf=Buffer.alloc(240+missingName.length);elf.copy(dynamicElf);dynamicElf.writeBigUInt64LE(64n,32);dynamicElf.writeUInt16LE(56,54);dynamicElf.writeUInt16LE(2,56);
dynamicElf.writeUInt32LE(1,64);dynamicElf.writeBigUInt64LE(BigInt(dynamicElf.length),96);dynamicElf.writeUInt32LE(2,120);dynamicElf.writeBigUInt64LE(176n,128);dynamicElf.writeBigUInt64LE(176n,136);dynamicElf.writeBigUInt64LE(64n,152);
dynamicElf.writeBigUInt64LE(1n,176);dynamicElf.writeBigUInt64LE(5n,192);dynamicElf.writeBigUInt64LE(240n,200);dynamicElf.writeBigUInt64LE(10n,208);dynamicElf.writeBigUInt64LE(BigInt(missingName.length),216);missingName.copy(dynamicElf,240);
await fs.writeFile(path.join(stage,rows[0].path),dynamicElf);rows[0].sha256=hash(dynamicElf);await save();
const unresolved=await packageRuntimeModule(options);assert.ok(unresolved.blockers.some(x=>x.includes('Missing ELF dependency:')&&x.includes('libprivate_fixture.so')));checks++;
await rejects(()=>packageRuntimeModule({...options,candidate:false,url:'https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/test/HXZ-Runtime-fixture.zip'}),/Missing ELF dependency/);
await fs.writeFile(path.join(stage,rows[0].path),elf);rows[0].sha256=originalRow;await save();
const invalidElf=Buffer.from(elf);invalidElf.writeUInt16LE(62,18);await fs.writeFile(path.join(stage,rows[0].path),invalidElf);rows[0].sha256=hash(invalidElf);await save();await rejects(()=>packageRuntimeModule(options),/ARM64/);await fs.writeFile(path.join(stage,rows[0].path),elf);rows[0].sha256=originalRow;await save();
const target=rows.find(x=>x.path==='lwjgl/3.3.3/java/lwjgl-3.3.3.jar');const oldJarHash=target.sha256;const badJar=await archive('com/tungsten/launcher/Forbidden.class');await fs.writeFile(path.join(stage,target.path),badJar);target.sha256=hash(badJar);await save();await rejects(()=>packageRuntimeModule(options),/Forbidden launcher code/);await fs.writeFile(path.join(stage,target.path),jar);target.sha256=oldJarHash;await save();
await rejects(()=>packageRuntimeModule({...options,candidateRenderer:artifact}),/exactly match an excluded Mesa artifact/);
const result={checks,fixtureDirectory:base,candidateSha256:firstHash,realRuntimeExecuted:false,deviceTested:false};await fs.writeFile(path.join(base,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

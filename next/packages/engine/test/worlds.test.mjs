import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createWriteStream} from 'node:fs';import {pipeline} from 'node:stream/promises';import yazl from 'yazl';
import {inspectWorldArchive,extractWorldArchive,exportWorld} from '../core/worlds.mjs';import {hash} from '../core/io.mjs';import {cloneInstance} from '../core/instance-maintenance.mjs';
async function fixture(t){const parent=path.resolve('.runtime/review080/engine');await fs.mkdir(parent,{recursive:true});const root=await fs.mkdtemp(path.join(parent,'world-'));t.after(async()=>{assert.ok(root.startsWith(parent+path.sep));await fs.rm(root,{recursive:true,force:true,maxRetries:3});});return root;}
async function zip(root,files,name='map.zip'){const file=path.join(root,name),archive=new yazl.ZipFile();for(const [key,value]of Object.entries(files))archive.addBuffer(Buffer.from(value),key);archive.end();await pipeline(archive.outputStream,createWriteStream(file));return file;}
test('world import verifies bytes, strips one wrapping folder, resumes safely and exports usable snapshots',async t=>{
 const root=await fixture(t),file=await zip(root,{'我的世界/level.dat':'level','我的世界/region/r.0.0.mca':'region','我的世界/session.lock':'old-lock'}),sum=await hash(file,'sha256'),dest=path.join(root,'saves/独立世界'),events=[];
 assert.equal((await inspectWorldArchive(file)).prefix,'我的世界/');await extractWorldArchive(file,dest,{expectedHash:sum,progress:v=>events.push(v)});assert.equal(await fs.readFile(path.join(dest,'level.dat'),'utf8'),'level');await assert.rejects(fs.access(path.join(dest,'session.lock')));assert.equal((await extractWorldArchive(file,dest,{expectedHash:sum})).resumed,true);assert.equal(events.at(-1).completed,events.at(-1).total);
 const exported=await exportWorld(dest,path.join(root,'交接快照.zip'));assert.equal(exported.sha256,await hash(exported.file,'sha256'));assert.equal((await inspectWorldArchive(exported.file)).prefix,'');
 const second=path.join(root,'second');await extractWorldArchive(exported.file,second);assert.equal(await fs.readFile(path.join(second,'region/r.0.0.mca'),'utf8'),'region');await assert.rejects(fs.access(path.join(second,'.hxzl-world-source.json')));
});
test('bad hashes, ambiguous worlds, traversal and case collisions never touch an existing save',async t=>{
 const root=await fixture(t),file=await zip(root,{'level.dat':'world'}),target=path.join(root,'existing');await fs.mkdir(target);await fs.writeFile(path.join(target,'level.dat'),'original');await assert.rejects(extractWorldArchive(file,target,{expectedHash:'0'.repeat(64)}),/校验/);await assert.rejects(extractWorldArchive(file,target),/已存在/);assert.equal(await fs.readFile(path.join(target,'level.dat'),'utf8'),'original');
 await assert.rejects(inspectWorldArchive(await zip(root,{'one/level.dat':'one','two/level.dat':'two'},'two.zip')),/唯一/);
 await assert.rejects(inspectWorldArchive(await zip(root,{'level.dat':'one','LEVEL.DAT':'two'},'case.zip')),/重复/);
 const malicious=await zip(root,{'level.dat':'one','safe.txt':'bad'},'traversal.zip'),bytes=await fs.readFile(malicious);await fs.writeFile(malicious,Buffer.from(bytes.toString('latin1').replaceAll('safe.txt','../x.txt'),'latin1'));await assert.rejects(inspectWorldArchive(malicious),/path|不安全/i);await assert.rejects(fs.access(path.join(root,'x.txt')));
});
test('cancelled imports and failed template preparation cannot publish incomplete instances',async t=>{
 const root=await fixture(t),file=await zip(root,{'level.dat':'world'}),controller=new AbortController();controller.abort();await assert.rejects(extractWorldArchive(file,path.join(root,'cancelled'),{signal:controller.signal}));await assert.rejects(fs.access(path.join(root,'cancelled')));
 const target=path.join(root,'versions/模板');await fs.mkdir(path.join(target,'saves/private'),{recursive:true});await fs.mkdir(path.join(target,'mods'));await fs.writeFile(path.join(target,'模板.json'),JSON.stringify({id:'模板',minecraftVersion:'1.21.1'}));await fs.writeFile(path.join(target,'saves/private/level.dat'),'private');await fs.writeFile(path.join(target,'mods/example.jar'),'mod');
 await assert.rejects(cloneInstance(root,'模板','失败模板',{template:true,prepare:async()=>{throw Error('failed');}}),/failed/);await assert.rejects(fs.access(path.join(root,'versions/失败模板')));
 await cloneInstance(root,'模板','体验世界',{template:true,prepare:stage=>extractWorldArchive(file,path.join(stage,'saves/社区世界'))});await assert.rejects(fs.access(path.join(root,'versions/体验世界/saves/private')));assert.equal(await fs.readFile(path.join(root,'versions/体验世界/mods/example.jar'),'utf8'),'mod');assert.equal(await fs.readFile(path.join(target,'saves/private/level.dat'),'utf8'),'private');
});
test('mid-stream cancellation closes the ZIP writer before removing its staging directory',async t=>{
 const root=await fixture(t),file=await zip(root,{'level.dat':Buffer.alloc(16*1024*1024,17)}),controller=new AbortController(),dest=path.join(root,'cancel-midstream');let aborted=false;
 await assert.rejects(extractWorldArchive(file,dest,{signal:controller.signal,progress:value=>{if(value.completed>0&&!aborted){aborted=true;controller.abort();}}}));
 assert.equal(aborted,true);assert.ok(!(await fs.readdir(root)).some(v=>v.startsWith('.hxzl-world-')),'No stage remains after cancellation returns');await assert.rejects(fs.access(dest));
});

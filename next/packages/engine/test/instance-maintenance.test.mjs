import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {inspectInstance,createSnapshot,restoreSnapshot,deleteSnapshot,cloneInstance} from '../core/instance-maintenance.mjs';

async function fixture(t){
 const parent=path.resolve('.runtime/review080/engine');await fs.mkdir(parent,{recursive:true});
 const root=await fs.mkdtemp(path.join(parent,'maintenance-')),id='中文实验实例',target=path.join(root,'versions',id),home=path.join(root,'.hxzl-maintenance',id);
 t.after(async()=>{assert.ok(root.startsWith(parent+path.sep));await fs.rm(root,{recursive:true,force:true});});
 const put=async(relative,value)=>{const file=path.join(target,relative);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,value);};
 await put(id+'.json',JSON.stringify({id,inheritsFrom:'1.21.1',mainClass:'test.Main'}));await put(id+'.jar','game');await put('mods/机械.jar','first mod');await put('saves/世界/level.dat','world one');await put('logs/latest.log','log');
 return {root,id,target,home,put};
}
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));

test('snapshots restore exact bytes, preserve the replaced instance, and report real space/progress',async t=>{
 const f=await fixture(t),events=[];
 const before=await inspectInstance(f.root,f.id);assert.equal(before.files,5);assert.ok(before.groups.find(g=>g.name==='mods'));
 const saved=await createSnapshot(f.root,f.id,{label:'改模组之前',progress:v=>events.push(v)});
 assert.ok(events.length);assert.equal(events.at(-1).completed,events.at(-1).total);
 await f.put('mods/机械.jar','changed mod');await f.put('new.txt','only in new');
 await restoreSnapshot(f.root,f.id,saved.key);
 assert.equal(await fs.readFile(path.join(f.target,'mods/机械.jar'),'utf8'),'first mod');
 await assert.rejects(fs.access(path.join(f.target,'new.txt')));await assert.rejects(fs.access(path.join(f.target,'logs/latest.log')));
 const view=await inspectInstance(f.root,f.id);assert.equal(view.snapshots.length,2);
 const previous=view.snapshots.find(s=>s.key!==saved.key);assert.equal(previous.label,'还原前自动保留');
 await restoreSnapshot(f.root,f.id,previous.key);assert.equal(await fs.readFile(path.join(f.target,'new.txt'),'utf8'),'only in new');
 await deleteSnapshot(f.root,f.id,saved.key);assert.ok(!(await inspectInstance(f.root,f.id)).snapshots.find(s=>s.key===saved.key));
});

test('a corrupt recovery file cannot replace the installed game',async t=>{
 const f=await fixture(t),saved=await createSnapshot(f.root,f.id);
 await fs.writeFile(path.join(f.home,saved.key,'files/mods/机械.jar'),'wrong mod');
 await assert.rejects(restoreSnapshot(f.root,f.id,saved.key),/校验/);
 assert.equal(await fs.readFile(path.join(f.target,'mods/机械.jar'),'utf8'),'first mod');
 assert.ok(!(await fs.readdir(f.home)).some(n=>n.startsWith('stage-')));
});

test('cancellation cleans staging and keeps the original',async t=>{
 const f=await fixture(t);await f.put('large.bin',Buffer.alloc(1024*1024));const controller=new AbortController();
 await assert.rejects(createSnapshot(f.root,f.id,{signal:controller.signal,progress:()=>controller.abort()}));
 assert.deepEqual(await fs.readdir(f.home),[]);assert.equal((await fs.stat(path.join(f.target,'large.bin'))).size,1024*1024);
});

test('an interrupted directory replacement recovers the original on the next visit',async t=>{
 const f=await fixture(t),operation=randomUUID();await fs.mkdir(f.home,{recursive:true});
 await fs.rename(f.target,path.join(f.home,'rollback-'+operation));await fs.mkdir(path.join(f.home,'stage-'+operation));
 await fs.writeFile(path.join(f.home,'restore.json'),JSON.stringify({operation,instance:f.id,created:Date.now()}));
 const view=await inspectInstance(f.root,f.id);assert.equal(view.files,5);assert.deepEqual(await fs.readdir(f.home),[]);
});

test('interruption while archiving the replaced version resumes its manifest',async t=>{
 const f=await fixture(t),operation=randomUUID(),previous=path.join(f.home,operation);await fs.mkdir(previous,{recursive:true});
 await fs.cp(f.target,path.join(previous,'files'),{recursive:true});await f.put('mods/机械.jar','new value');
 await fs.writeFile(path.join(f.home,'restore.json'),JSON.stringify({operation,instance:f.id,created:Date.now()}));
 const view=await inspectInstance(f.root,f.id);assert.equal(view.snapshots.length,1);
 assert.equal((await read(path.join(previous,'manifest.json'))).files.length,5);
 assert.equal(await fs.readFile(path.join(f.target,'mods/机械.jar'),'utf8'),'new value');
});

test('Windows-style file locking while publishing rolls back without losing either copy',async t=>{
 const f=await fixture(t),saved=await createSnapshot(f.root,f.id),rename=fs.rename;
 await f.put('mods/机械.jar','new value');
 t.mock.method(fs,'rename',async(from,to)=>{if(path.basename(from).startsWith('stage-')&&to===f.target)throw Object.assign(Error('locked'),{code:'EPERM'});return rename(from,to);});
 await assert.rejects(restoreSnapshot(f.root,f.id,saved.key),/locked/);t.mock.restoreAll();
 await inspectInstance(f.root,f.id);assert.equal(await fs.readFile(path.join(f.target,'mods/机械.jar'),'utf8'),'new value');
});

test('experimental copy adjusts its version identity and cannot overwrite another instance',async t=>{
 const f=await fixture(t),name='独立测试';await f.put('.hxzl/install-request.json','{}');
 await cloneInstance(f.root,f.id,name);const folder=path.join(f.root,'versions',name),meta=await read(path.join(folder,name+'.json'));
 assert.equal(meta.id,name);assert.equal(meta.inheritsFrom,'1.21.1');assert.equal(await fs.readFile(path.join(folder,name+'.jar'),'utf8'),'game');
 await assert.rejects(fs.access(path.join(folder,'.hxzl/install-request.json')));await assert.rejects(fs.access(path.join(folder,f.id+'.json')));
 await assert.rejects(cloneInstance(f.root,f.id,name),/已存在/);assert.equal((await read(path.join(f.target,f.id+'.json'))).id,f.id);
});

test('unsafe IDs, manifest traversal and linked directories never reach external files',async t=>{
 const f=await fixture(t),saved=await createSnapshot(f.root,f.id),manifest=path.join(f.home,saved.key,'manifest.json'),entry=await read(manifest);
 for(const id of ['../outside','CON','..','bad/id','a:b','trailing.'])await assert.rejects(inspectInstance(f.root,id));
 entry.files[0].path='../outside';await fs.writeFile(manifest,JSON.stringify(entry));await assert.rejects(restoreSnapshot(f.root,f.id,saved.key),/越界/);
 const outside=path.join(f.root,'outside');await fs.mkdir(outside);await fs.writeFile(path.join(outside,'keep.txt'),'keep');
 await fs.symlink(outside,path.join(f.target,'linked'),process.platform==='win32'?'junction':'dir');
 await assert.rejects(createSnapshot(f.root,f.id),/链接/);assert.equal(await fs.readFile(path.join(outside,'keep.txt'),'utf8'),'keep');
 await fs.unlink(path.join(f.target,'linked'));
});

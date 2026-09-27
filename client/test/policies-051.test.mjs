import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import os from 'node:os';
import yazl from 'yazl';
import {createInstances,importBlueprint} from '../src-electron/core/blueprint-import.mjs';
import {automaticMemory,javaHeapLimit} from '../src-electron/core/memory-policy.mjs';

test('automatic memory reserves OS capacity and follows Java architecture',()=>{
 assert.equal(automaticMemory(16384,11000),8704);assert.equal(automaticMemory(8192,6000),4864);
 assert.equal(javaHeapLimit(automaticMemory(16384,11000),16384,'ia32'),1280);
 assert.equal(javaHeapLimit(automaticMemory(16384,11000),16384,'x64'),8704);
 assert.ok(automaticMemory(65536,60000)<=16384);
});
test('blueprint destinations require Create metadata and never overwrite a player file',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-blueprint-051-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const settings={gameRoot:root,instanceSettings:{}},instances=[{id:'中文实例'},{id:'only-addon'}];
 for(const item of instances){const dir=path.join(root,'versions',item.id);await fs.mkdir(path.join(dir,'mods'),{recursive:true});await fs.writeFile(path.join(dir,item.id+'.json'),'{}');const zip=new yazl.ZipFile();zip.addBuffer(Buffer.from(JSON.stringify({id:item.id==='中文实例'?'create':'createaddition'})),'fabric.mod.json');zip.end();await pipeline(zip.outputStream,createWriteStream(path.join(dir,'mods','renamed.jar')));}
 assert.deepEqual(await createInstances(settings,instances),[{id:'中文实例',name:'中文实例'}]);
 const source=path.join(root,'source.nbt');await fs.writeFile(source,'fixture');const first=await importBlueprint(settings,'中文实例',source,'bridge.nbt');const second=await importBlueprint(settings,'中文实例',source,'bridge.nbt');assert.notEqual(first,second);assert.equal(await fs.readFile(first,'utf8'),'fixture');assert.ok(first.includes('schematics'));
 await assert.rejects(importBlueprint(settings,'only-addon',source,'bridge.nbt'),/Create/);
});

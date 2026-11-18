import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {listInstanceFiles,toggleInstanceFile,importInstanceFiles,removeInstanceFile} from '../core/instance-files.mjs';
import {gameEventDelivery} from '../../../apps/desktop/electron/game-events.mjs';

test('Chinese instance paths: import, disable, restart and enable all four file kinds',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-files-081-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const gameRoot=path.join(root,'中文目录/.minecraft'),id='幻想镇',base=path.join(gameRoot,'versions',id),source=path.join(root,'导入');
 await fs.mkdir(base,{recursive:true});await fs.mkdir(source);await fs.writeFile(path.join(base,id+'.json'),'{}');
 const settings={gameRoot,instanceSettings:{[id]:{isolated:true}}};
 for(const [kind,extension,folder]of [['mods','jar','mods'],['resources','zip','resourcepacks'],['shaders','zip','shaderpacks'],['schematics','nbt','schematics']]){
  const name='测试-'+kind+'.'+extension,file=path.join(source,name);await fs.writeFile(file,'fixture-'+kind);
  await importInstanceFiles(settings,id,kind,[file]);let list=await listInstanceFiles(settings,id,kind);assert.equal(list.items.length,1);assert.equal(list.items[0].name,name);
  await toggleInstanceFile(settings,id,kind,list.items[0].key);assert.equal(await fs.stat(path.join(base,folder,name)).catch(()=>null),null);
  list=await listInstanceFiles(structuredClone(settings),id,kind);assert.equal(list.items[0].enabled,false);
  await assert.rejects(importInstanceFiles(settings,id,kind,[file]),/同名/);assert.equal(await fs.readFile(path.join(base,'.hxz-disabled',folder,name),'utf8'),'fixture-'+kind);
  await toggleInstanceFile(settings,id,kind,list.items[0].key);assert.equal(await fs.readFile(path.join(base,folder,name),'utf8'),'fixture-'+kind);
  let trashed;await removeInstanceFile(settings,id,kind,(await listInstanceFiles(settings,id,kind)).items[0].key,async file=>{trashed=file;});assert.equal(trashed,path.join(base,folder,name));
 }
 await fs.writeFile(path.join(base,'mods/旧文件.jar.disabled'),'legacy');const old=(await listInstanceFiles(settings,id,'mods')).items.find(v=>v.name==='旧文件.jar');assert.equal(old.enabled,false);await toggleInstanceFile(settings,id,'mods',old.key);assert.equal(await fs.readFile(path.join(base,'mods/旧文件.jar'),'utf8'),'legacy');
 await assert.rejects(toggleInstanceFile(settings,id,'mods','active/../outside.jar'),/无效/);
 await assert.rejects(listInstanceFiles(settings,'../escape','mods'),/无效/);
 await assert.rejects(importInstanceFiles(settings,id,'mods',[path.join(source,'测试-resources.zip')]),/jar/);
 settings.instanceSettings[id].isolated=false;await importInstanceFiles(settings,id,'mods',[path.join(source,'测试-mods.jar')]);assert.equal((await listInstanceFiles(settings,id,'mods')).shared,true);assert.equal(await fs.readFile(path.join(gameRoot,'mods/测试-mods.jar'),'utf8'),'fixture-mods');
});

test('exit notification wakes and reaches renderer even when window restore throws',()=>{
 const calls=[];
 const deliver=gameEventDelivery({mainWindow:()=>({isDestroyed:()=>false,webContents:{isDestroyed:()=>false,send:()=>calls.push('notify')}}),wake:()=>calls.push('wake'),companion:()=>({game:()=>{calls.push('restore');throw Error('Object has been destroyed');}}),diagnostic:()=>calls.push('record')});
 assert.doesNotThrow(()=>deliver({type:'task',running:false}));assert.deepEqual(calls,['wake','notify','restore','record']);
});

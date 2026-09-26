import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {verify} from 'node:crypto';
import yauzl from 'yauzl';
import {exportPack} from '../src-electron/core/export-pack.mjs';
import {inspectPack} from '../src-electron/core/packs.mjs';
import {startOfflineSkin} from '../src-electron/core/offline-skin.mjs';
import {diagnoseServer} from '../src-electron/core/server-diagnostics.mjs';

test('exported pack is importable with HXZUP and excludes player saves and credentials',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxzl-export-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const instance=path.join(root,'versions','测试实例');await fs.mkdir(instance,{recursive:true});
 await fs.writeFile(path.join(instance,'测试实例.json'),JSON.stringify({id:'测试实例',minecraftVersion:'1.20.1',mainClass:'net.minecraft.Main',libraries:[{name:'net.fabricmc:fabric-loader:0.16.0'}]}));
 for(const name of ['mods/a.jar','config/client.json','config/accounts.json','saves/private.txt','logs/latest.log']){const file=path.join(instance,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,'fixture');}
 const destination=path.join(root,'export.mrpack');
 await exportPack({settings:{gameRoot:root,downloadConcurrency:64,instanceSettings:{}},id:'测试实例',destination,resources:path.resolve('client/resources'),urls:['https://hxzup.1szt.com/modv2']});
 const pack=await inspectPack(destination);assert.ok(pack);
 const zip=await new Promise((resolve,reject)=>yauzl.open(destination,{lazyEntries:true},(e,z)=>e?reject(e):resolve(z)));const names=[];
 await new Promise((resolve,reject)=>{zip.on('entry',e=>{names.push(e.fileName);zip.readEntry();});zip.on('end',resolve);zip.on('error',reject);zip.readEntry();});
 assert.ok(names.includes('overrides/updater/config.json'));assert.ok(names.includes('overrides/mods/a.jar'));assert.ok(names.includes('overrides/HXZUP-update.cmd'));
 assert.ok(!names.some(n=>/accounts|saves|logs/.test(n)));
});

test('cached skin serves signed local textures without authentication or join bypass, diagnosis checks actual TCP',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxzl-offline-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const account={uuid:'a'.repeat(32),name:'Player'},dir=path.join(root,'skin-cache',account.uuid);await fs.mkdir(dir,{recursive:true});
 const file='b'.repeat(64)+'.png';await fs.writeFile(path.join(dir,file),'fixture texture');await fs.writeFile(path.join(dir,'profile.json'),JSON.stringify({id:account.uuid,name:account.name,textures:{SKIN:{file}}}));
 const cache=await startOfflineSkin(root,account);t.after(()=>cache.close());
 const profile=await (await fetch(cache.base+'sessionserver/session/minecraft/profile/'+account.uuid)).json();const property=profile.properties[0];
 assert.ok(verify('RSA-SHA1',Buffer.from(property.value),cache.metadata.signaturePublickey,Buffer.from(property.signature,'base64')));
 const textures=JSON.parse(Buffer.from(property.value,'base64'));assert.equal(await (await fetch(textures.textures.SKIN.url)).text(),'fixture texture');
 assert.equal((await fetch(cache.base+'sessionserver/session/minecraft/join',{method:'POST'})).status,503);
 assert.equal((await fetch(cache.base+'sessionserver/session/minecraft/hasJoined')).status,204);
 const server=net.createServer(socket=>socket.end());await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 const result=await diagnoseServer('127.0.0.1:'+server.address().port);assert.ok(result.steps.some(s=>s.ok&&s.detail.includes('TCP')));assert.ok(result.steps.some(s=>s.ok===null));
});

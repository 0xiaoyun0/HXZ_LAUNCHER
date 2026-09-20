import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {crashReport,diagnosticText} from '../src-electron/core/diagnostics.mjs';
import {verifyRelease} from '../src-electron/core/update-sources.mjs';
import {createServices} from '../src-electron/core/services.mjs';
test('cover placement updates only crop fields and persists fractional positions',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-cover-'));
 let service;
 try{
  await fs.writeFile(path.join(root,'settings.json'),JSON.stringify({instanceSettings:{fixture:{memoryMB:2048,memoryMode:'manual',favorite:true,autoUpdate:true}}}));
  service=await createServices({data:root,resources:root,safeStorage:{isEncryptionAvailable:()=>false},emit:()=>{}});
  await service.invoke('instance.cover-placement',{id:'fixture',x:17.25,y:81,zoom:1.6});
  const saved=JSON.parse(await fs.readFile(path.join(root,'settings.json'),'utf8')).instanceSettings.fixture;
  assert.equal(saved.memoryMB,2048);assert.equal(saved.autoUpdate,true);assert.equal(saved.favorite,true);assert.equal(saved.coverPositionX,17.25);assert.equal(saved.coverZoom,1.6);
 }finally{service?.dispose();await fs.rm(root,{recursive:true,force:true})}
});
test('crash report includes current game evidence and redacts credentials',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-diagnostic-'));
 try{
  await fs.mkdir(path.join(root,'crash-reports'));
  await fs.writeFile(path.join(root,'crash-reports/crash-current.txt'),'java.lang.OutOfMemoryError\naccessToken: private-token\nhttps://test/?token=url-token');
  const result=await crashReport({cwd:root,id:'fixture',started:Date.now()-1000,code:1,logs:['Authorization: Bearer bearer-token'],secrets:['private-token'],java:'java8'});
  assert.equal(result.reports.length,1);assert.ok(result.hints.some(x=>x.includes('内存')));
  const exported=diagnosticText(result);assert.doesNotMatch(exported,/private-token|url-token|bearer-token/);assert.match(exported,/OutOfMemoryError/);
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
test('favorite can be removed independently of legacy instance settings and survives reload',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-favorite-'));
 let service;
 const previous={favorite:true,memoryMB:256,width:480,height:320,autoUpdate:true,updateUrls:['old invalid address'],coverPositionX:24};
 try{
  await fs.writeFile(path.join(root,'settings.json'),JSON.stringify({instanceSettings:{fixture:previous}}));
  const options={data:root,resources:root,safeStorage:{isEncryptionAvailable:()=>false},emit:()=>{}};
  service=await createServices(options);
  await service.invoke('instance.favorite',{id:'fixture',favorite:false});
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,'settings.json'),'utf8')).instanceSettings.fixture,{...previous,favorite:false});
  service.dispose();service=await createServices(options);
  assert.equal((await service.invoke('state')).settings.instanceSettings.fixture.favorite,false);
  await service.invoke('instance.favorite',{id:'fixture',favorite:true});
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'settings.json'),'utf8')).instanceSettings.fixture.favorite,true);
 }finally{service?.dispose();await fs.rm(root,{recursive:true,force:true})}
});
test('signed update cannot install another architecture',()=>{
 const keys=generateKeyPairSync('ed25519');const raw=Buffer.from(JSON.stringify({version:'0.4.3',files:[{url:'HXZ-Launcher-0.4.3-ia32.exe',sha512:Buffer.alloc(64).toString('base64'),size:123}],releaseDate:new Date().toISOString(),releaseNotes:'fix'}));
 const envelope={payload:raw.toString('base64'),signature:sign(null,raw,keys.privateKey).toString('base64')};
 assert.equal(verifyRelease(envelope,keys.publicKey,'ia32').version,'0.4.3');assert.throws(()=>verifyRelease(envelope,keys.publicKey,'x64'));
});

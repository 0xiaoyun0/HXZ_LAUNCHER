import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as wait} from 'node:timers/promises';
import {gamePlaytime} from '../packages/engine/core/game-playtime.mjs';
import {createServices} from '../packages/engine/core/services.mjs';
import {importPreferences} from '../engine/profile-import.mjs';

const tmp=async t=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-player-'));t.after(()=>fs.rm(dir,{recursive:true,force:true,maxRetries:6,retryDelay:100}));return dir;};
const defaults={selectedAccount:'first',communityUrl:'http://127.0.0.1:8201',autoReportErrors:false};
const player={id:'first',name:'Test',username:'Test',uuid:'a'.repeat(32),accessToken:'test-only-a',clientToken:'test-only-c',profiles:[]};
async function serviceAt(dir){
 return createServices({data:dir,resources:dir,safeStorage:{isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()},emit:()=>{},window:()=>null,initialRoot:async()=>''});
}
test('an incomplete skin refresh leaves the saved role usable on retry and after restart',async t=>{
 const root=await tmp(t),stored=JSON.stringify([player]),file=path.join(root,'accounts.bin');
 await fs.writeFile(path.join(root,'settings.json'),JSON.stringify(defaults));await fs.writeFile(file,stored);
 const original=globalThis.fetch;let incomplete=true;
 globalThis.fetch=async(url,init)=>{
   if(String(url).endsWith('/authserver/refresh'))return Response.json(incomplete?{}:{accessToken:'renewed',clientToken:player.clientToken});
   if(String(url).endsWith('/authserver/validate'))return JSON.parse(init.body).accessToken==='renewed'?new Response(null,{status:204}):Response.json({error:'invalid token'},{status:403});
   throw Error('unexpected request');
 };
 let service=await serviceAt(root);
 try{
   await assert.rejects(service.invoke('skin.status',{}),/皮肤站/);
   assert.equal(await fs.readFile(file,'utf8'),stored);
   incomplete=false;
   assert.equal((await service.invoke('skin.status',{})).authenticated,true);
   await service.dispose();service=await serviceAt(root);
   assert.equal((await service.invoke('skin.status',{})).authenticated,true);
 }finally{globalThis.fetch=original;await service.dispose();}
});
test('a slow dropped skin validation is retried without refreshing the account',async t=>{
 const root=await tmp(t);await fs.writeFile(path.join(root,'settings.json'),JSON.stringify(defaults));
 await fs.writeFile(path.join(root,'accounts.bin'),JSON.stringify([player]));
 const original=globalThis.fetch;let attempts=0;
 globalThis.fetch=async url=>{
   assert.ok(String(url).endsWith('/authserver/validate'));
   if(++attempts===1){await wait(1900);throw new TypeError('fetch failed');}
   return new Response(null,{status:204});
 };
 const service=await serviceAt(root);
 try{assert.equal((await service.invoke('skin.status',{})).authenticated,true);assert.equal(attempts,2);}
 finally{globalThis.fetch=original;await service.dispose();}
});
test('simultaneous lobby requests exchange one skin session and preserve cached identity across a temporary outage',async t=>{
 const root=await tmp(t);await fs.writeFile(path.join(root,'settings.json'),JSON.stringify(defaults));await fs.writeFile(path.join(root,'accounts.bin'),JSON.stringify([player]));
 const original=globalThis.fetch;let offline=false,exchanges=0;
 globalThis.fetch=async(url,init)=>{if(offline)return Response.json({error:'service unavailable'},{status:503});
  if(String(url).endsWith('/validate'))return new Response(null,{status:204});
  if(String(url).endsWith('/api/session')){exchanges++;await wait(20);return Response.json({token:'local-session',user:{name:'Test',uid:player.uuid},credentials:{accessToken:'test-rotated',clientToken:player.clientToken}});}
  return Response.json({});};
 const service=await serviceAt(root);
 try{const first=await Promise.allSettled(Array.from({length:5},()=>service.invoke('community.connect',{})));
  assert.equal(exchanges,1);assert.ok(first.every(item=>item.status==='fulfilled'));
  offline=true;await assert.rejects(service.invoke('community.connect',{refresh:true}));assert.equal(service.hasAuthenticatedAccount(),true);
  offline=false;assert.equal((await service.invoke('community.connect',{refresh:true})).user.uid,player.uuid);
  const second=await service.invoke('state',{localOnly:true});assert.equal(second.accounts[0].authenticated,true);
 }finally{await service.dispose();globalThis.fetch=original;}
});
test('playtime includes the running session and the last seconds of a normal exit; lifetime survives the calendar window',async t=>{
 const root=await tmp(t);let wall=Date.parse('2026-01-01T03:00:00Z'),mono=0;
 const open=()=>gamePlaytime(root,{wall:()=>wall,mono:()=>mono,schedule:()=>1,cancel:()=>{}});
 const tick=n=>{wall+=n;mono+=n;};const first=open();await first.start('game');
 tick(12500);assert.equal((await first.snapshot()).totalSeconds,12);tick(7500);await first.dispose();
 const next=open();assert.equal((await next.snapshot()).totalSeconds,20);tick(366*86400000);
 assert.equal((await next.snapshot()).totalSeconds,20);assert.equal((await next.snapshot()).days.length,0);await next.dispose();
});
test('migration imports recorded days once, preserves per-instance memory and the old files',async t=>{
 const root=await tmp(t),src=path.join(root,'old'),dest=path.join(root,'third');await fs.mkdir(src);await fs.mkdir(dest);
 const file=path.join(src,'settings.json'),date=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const old={theme:'dark',defaultMemoryMB:3072,memoryMode:'manual',gameWindowAction:'keep',instanceSettings:{alpha:{memoryMode:'manual',memoryMB:1792,customFuture:'saved'}}};
 await fs.writeFile(file,JSON.stringify(old));const calendar=JSON.stringify({version:1,days:{[date]:90000},through:Date.now()-1000,updated:Date.now()-1000,x:'preserve'});
 await fs.writeFile(path.join(src,'game-playtime.json'),calendar);const svc=await serviceAt(dest);
 try{const pick=async()=>({filePaths:[file],canceled:false});await importPreferences(dest,pick,svc);await importPreferences(dest,pick,svc);
 const s=(await svc.invoke('state',{localOnly:true})).settings;assert.equal(s.instanceSettings.alpha?.memoryMB,1792);assert.equal(s.instanceSettings.alpha?.customFuture,'saved');assert.equal(s.gameWindowAction,'keep');assert.equal((await svc.invoke('game.playtime',{})).totalSeconds,90);
 assert.equal(await fs.readFile(path.join(src,'game-playtime.json'),'utf8'),calendar);
 }finally{await svc.dispose();}
});

test('a saved inherited instance value and old JVM flags cannot override global memory',async()=>{
 const {requestedHeap,controlledHeapArgs}=await import('../packages/engine/core/memory-policy.mjs');
 const global={memoryMode:'manual',defaultMemoryMB:3072};
 assert.equal(requestedHeap(global,{memoryMode:'inherit',memoryMB:4096},16384,8192),3072);
 assert.equal(requestedHeap(global,{memoryMode:'manual',memoryMB:1536},16384,8192),1536);
 assert.deepEqual(controlledHeapArgs(['-Xmx8G','-XX:MaxHeapSize=4096m','-Xms6G','-Dfile.encoding=UTF-8'],3072),['-Xms3072M','-Dfile.encoding=UTF-8']);
});

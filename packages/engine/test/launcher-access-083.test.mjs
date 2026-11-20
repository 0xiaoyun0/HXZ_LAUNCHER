import test from 'node:test';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {createServices} from '../core/services.mjs';
import {checkAccess} from '../../../engine/access.mjs';
test('cached skin identity survives network failures; native IPC blocks guests without disabling recovery', async()=>{
const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-auth-audit-'));const originalFetch=globalThis.fetch;const calls=[];let service;
try{
 await fs.writeFile(path.join(root,'settings.json'),JSON.stringify({selectedAccount:'old-cache',gameRoot:path.join(root,'game'),communityUrl:'https://offline.invalid'}));
 await fs.writeFile(path.join(root,'accounts.bin'),JSON.stringify([{id:'old-cache',username:'fixture',name:'旧缓存角色',uuid:'a'.repeat(32),accessToken:'fake-test-token',clientToken:'fake-client',profiles:[{id:'a'.repeat(32),name:'旧缓存角色'}]},{id:'no-role',username:'fixture-empty',name:'',uuid:'',accessToken:'fake-empty-profile-token',profiles:[]}]));
 globalThis.fetch=async(url)=>{calls.push(String(url));throw TypeError('fetch failed');};
 service=await createServices({data:root,resources:root,safeStorage:{isEncryptionAvailable:()=>true,decryptString:buffer=>buffer.toString(),encryptString:text=>Buffer.from(text)},emit:()=>{},window:()=>null,skinPanel:{remove:async()=>{}}});
 assert.equal(service.hasAuthenticatedAccount(),true);const first=await service.invoke('state');assert.equal(first.accounts[0].authenticated,true);assert.equal(calls.some(u=>u.includes('skin.hxzmc.top')),false,'boot must not depend on skin server');
 await assert.rejects(service.invoke('community.connect'),/网络|连接|fetch/i);assert.equal(service.hasAuthenticatedAccount(),true);assert.equal((await service.invoke('state')).accounts[0].authenticated,true);
 await service.invoke('settings.save',{selectedAccount:'no-role'});assert.equal(service.hasAuthenticatedAccount(),true);assert.equal((await service.invoke('state')).accounts[1].authenticated,true);await assert.rejects(service.invoke('community.connect'),/选择游戏角色/);assert.equal(service.hasAuthenticatedAccount(),true);
 await service.invoke('account.remove',{id:'no-role'});assert.equal(service.hasAuthenticatedAccount(),true);await service.invoke('account.remove',{id:'old-cache'});assert.equal(service.hasAuthenticatedAccount(),false);assert.equal((await service.invoke('state')).accounts.length,0);
 for(const action of ['state','account.login','settings.save','music.list','mods.list','window.control','app-update.check'])assert.doesNotThrow(()=>checkAccess(action,false));
 for(const action of ['game.launch','community.connect','lobby.host','music.account.login','companion.chat','vault.open'])assert.throws(()=>checkAccess(action,false),/请先登录/);
 assert.doesNotThrow(()=>checkAccess('game.launch',true));
}finally{service?.dispose();globalThis.fetch=originalFetch;assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('hxz-auth-audit-'));await fs.rm(root,{recursive:true,force:true});}


});

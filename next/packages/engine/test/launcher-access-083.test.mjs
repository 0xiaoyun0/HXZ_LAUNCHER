import test from 'node:test';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {createServices} from '../core/services.mjs';
import {requireLauncherAccount} from '../core/launcher-access.mjs';
import vm from 'node:vm';
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
 for(const action of ['state','account.login','window.control','window.sleep','external.open','skin.open','app-update.status','app-update.check','app-update.download','app-update.install'])assert.doesNotThrow(()=>requireLauncherAccount(action,false));
 for(const action of ['settings.save','game.launch','game.install','pack.download','community.connect','music.list','lobby.host','screen.sources','companion.chat','lyrics.configure'])assert.throws(()=>requireLauncherAccount(action,false),/请先登录/);
 assert.doesNotThrow(()=>requireLauncherAccount('game.launch',true));
 // Execute the unchanged Electron IPC callback with isolated native collaborators.
 const main=await fs.readFile('apps/desktop/electron/main.mjs','utf8'),nativeCalls=[];
 const nativeService={hasAuthenticatedAccount:()=>false,invoke:async(action,input)=>{nativeCalls.push(action);return {action};}};
 const callback=vm.runInNewContext('('+main.match(/ipcMain\.handle\('next:invoke',(.+)\);\r?\n/)[1]+')',{requireLauncherAccount,installed:true,trusted:()=>true,services:nativeService,URL,JSON,shell:{openExternal:async url=>nativeCalls.push(url)},updater:Object.fromEntries(['status','check','download','install'].map(action=>[action,async()=>{nativeCalls.push('update.'+action);return {phase:'fixture'};}]))});
 for(const action of ['game.launch','community.connect','music.list','screen.sources','companion.chat']){const result=await callback({senderFrame:{}},action,{});assert.equal(result.ok,false);assert.match(result.error,/请先登录/);}
 assert.equal(nativeCalls.length,0,'Rejected requests must never reach native collaborators');
 for(const action of ['window.control','app-update.status','app-update.check','app-update.download','app-update.install'])assert.equal((await callback({senderFrame:{}},action,{action:'close'})).ok,true);
 assert.equal((await callback({senderFrame:{}},'external.open',{url:'javascript:alert(1)'})).ok,false);assert.equal((await callback({senderFrame:{}},'external.open',{url:'https://user:password@example.invalid'})).ok,false);assert.equal((await callback({senderFrame:{}},'external.open',{url:'https://skin.hxzmc.top/auth/register'})).ok,true);
 const result={passed:true,checks:['Real services loads old encrypted account format without skin-server requests','Skin network failure and community disconnect preserve cached credentials','No-role account remains authenticated; role-dependent community request is rejected','Removing selected account falls back to remaining cached account; last logout gates services','Guest window/update actions allowed; game/music/community/companion business denied','Actual Electron IPC callback rejects business before collaborators and routes all four updater actions and window close','External register URL allowed; javascript and credential-bearing URLs rejected'],requests:calls.map(u=>new URL(u).pathname)};

}finally{service?.dispose();globalThis.fetch=originalFetch;assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('hxz-auth-audit-'));await fs.rm(root,{recursive:true,force:true});}


});

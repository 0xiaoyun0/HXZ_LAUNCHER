import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createCommunity} from '../src/server.mjs';
test('independent web admin: local origin, login, protected CRUD and password rotation',async t=>{
 const data=await mkdtemp(path.join(tmpdir(),'hxz-admin-'));
 const service=createCommunity({data});service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
 t.after(async()=>{await service.close();assert.ok(path.resolve(data).startsWith(path.resolve(tmpdir())+path.sep));await rm(data,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+service.server.address().port;let token='';
 async function api(route,input,auth=true){const r=await fetch(base+route,{method:input?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{})},body:input?JSON.stringify(input):undefined});return {status:r.status,value:await r.json()};}
 const html=await fetch(base+'/admin/');assert.equal(html.status,200);assert.match(await html.text(),/管理/);
 assert.equal((await api('/api/admin/overview')).status,400);
 const password=(await readFile(path.join(data,'初始管理员密码.txt'),'utf8')).match(/初始密码：([^\n]+)/)[1];
 const login=await api('/api/admin/login',{username:'admin',password},false);assert.equal(login.status,200);token=login.value.token;
 assert.equal((await api('/api/admin/overview')).value.version,'0.3.3');
 assert.equal((await api('/api/notices',{groupId:'mod-1',title:'Test',body:'Admin publish'})).status,201);
 assert.equal((await api('/api/admin/settings',{adminIDs:['test-uuid'],turnUrl:''})).status,200);
 assert.deepEqual((await api('/api/admin/overview')).value.adminIDs,['test-uuid']);
 assert.equal((await api('/api/admin/password',{password:'changed-long-password'})).status,200);
 assert.equal((await api('/api/admin/login',{username:'admin',password},false)).status,400);
 assert.equal((await api('/api/admin/login',{username:'admin',password:'changed-long-password'},false)).status,200);
 const foreign=await fetch(base+'/api/admin/overview',{headers:{Origin:'https://foreign.example',Authorization:'Bearer '+token}});assert.equal(foreign.status,403);
});

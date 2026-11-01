import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const root=await fs.realpath('release/0.9.2/server/幻想镇社区服务端'),data=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-packaged092-'));
const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const target=path.join(data,'.updates/releases/0.9.1');await fs.mkdir(path.join(target,'src'),{recursive:true});
await fs.writeFile(path.join(target,'package.json'),JSON.stringify({version:'0.9.1'}));await fs.writeFile(path.join(target,'src/server.mjs'),'throw Error("old active release must not run")');
const envelope=JSON.parse(await fs.readFile('apps/community-server/test/fixtures/community-update-091.json','utf8'));await fs.writeFile(path.join(data,'.updates/active.json'),JSON.stringify({target,envelope}));
const proc=spawn(path.join(root,'node.exe'),[path.join(root,'supervisor.mjs')],{cwd:root,env:{...process.env,HXZ_DATA:data,HOST:'127.0.0.1',PORT:String(port),HXZ_FEC_AUTO:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});let logs='',childPid;
proc.stdout.on('data',b=>logs+=b);proc.stderr.on('data',b=>logs+=b);
const base='http://127.0.0.1:'+port,request=(route,options)=>fetch(base+route,{...options,signal:AbortSignal.timeout(1000)});
try{
 let health;for(let i=0;i<100;i++){try{health=await(await request('/health')).json();break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.equal(health?.version,'0.9.2',logs);
 const password=(await fs.readFile(path.join(data,'初始管理员密码.txt'),'utf8')).match(/初始密码：([^\n]+)/)[1];
 const login=await(await request('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password})})).json();
 const runtime=await(await request('/api/admin/runtime',{headers:{Authorization:'Bearer '+login.token}})).json();childPid=runtime.pid;assert.equal(runtime.supervised,true);assert.equal(runtime.version,'0.9.2');assert.equal(path.resolve(runtime.programDirectory),root);
 assert.match(logs,/覆盖旧更新指针/);
 const exit=once(proc,'exit');proc.kill();await exit;
 let stopped=false;for(let i=0;i<50;i++){try{await request('/health');}catch{stopped=true;break;}await new Promise(r=>setTimeout(r,100));}assert.equal(stopped,true,'child must stop when Windows supervisor exits');
 console.log('PASS packaged node.exe + supervisor: ignores stale 0.9.1 pointer, authenticates admin, reports actual 0.9.2 directory and shuts child down');
}finally{
 if(proc.exitCode===null&&proc.signalCode===null)proc.kill();if(childPid)try{process.kill(childPid);}catch{}
 await new Promise(r=>setTimeout(r,150));assert.ok(data.startsWith(path.join(os.tmpdir(),'hxz-packaged092-')));await fs.rm(data,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}

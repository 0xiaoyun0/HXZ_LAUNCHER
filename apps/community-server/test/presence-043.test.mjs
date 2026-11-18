import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createCommunity} from '../src/server.mjs';
test('presence combines devices and removes disconnected device without losing user',async t=>{
 const data=await mkdtemp(path.join(tmpdir(),'hxz-presence-')),service=createCommunity({data,exchange:async()=>({selectedProfile:{id:'tester',name:'tester'}})}),clients=[];
 service.server.listen(0,'127.0.0.1');await once(service.server,'listening');const base='http://127.0.0.1:'+service.server.address().port;
 t.after(async()=>{for(const c of clients)c.ws.terminate();await service.close();await rm(data,{recursive:true,force:true})});
 async function until(fn){const deadline=Date.now()+3000;while(!fn()){if(Date.now()>deadline)throw Error('event timeout');await new Promise(r=>setTimeout(r,10))}}
 const session=await fetch(base+'/api/session',{method:'POST',body:'{}'}).then(r=>r.json());
 for(const platform of ['desktop','android']){const ws=new WebSocket(base.replace('http','ws')+'/ws',{origin:'null'}),c={ws,users:[]};clients.push(c);ws.on('message',b=>{const p=JSON.parse(b);if(p.type==='presence')c.users=p.users});await once(ws,'open');ws.send(JSON.stringify({type:'auth',token:session.token,platform}));await until(()=>c.users.length>0)}
 await until(()=>clients[0].users.length===2);assert.deepEqual([...clients[0].users[0].devices].sort(),['android','desktop']);
 clients[1].ws.close();await until(()=>clients[0].users.length===1);assert.deepEqual(clients[0].users[0].devices,['desktop']);
});

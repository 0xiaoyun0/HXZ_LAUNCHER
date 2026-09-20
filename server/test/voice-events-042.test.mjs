import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createCommunity} from '../src/server.mjs';
test('voice join and leave notify self and channel members only',async t=>{
 const data=await mkdtemp(path.join(tmpdir(),'hxz-events-')),service=createCommunity({data,exchange:async i=>({selectedProfile:{id:i.id,name:i.id}})});
 service.server.listen(0,'127.0.0.1');await once(service.server,'listening');const base='http://127.0.0.1:'+service.server.address().port,clients=[];
 t.after(async()=>{for(const c of clients)c.ws.terminate();await service.close();await rm(data,{recursive:true,force:true});});
 async function until(fn){const deadline=Date.now()+2000;while(!fn()){if(Date.now()>deadline)throw Error('event timeout');await new Promise(r=>setTimeout(r,10));}}
 for(const id of ['alice','bob','outside']){
  const session=await fetch(base+'/api/session',{method:'POST',body:JSON.stringify({id})}).then(r=>r.json());
  const ws=new WebSocket(base.replace('http','ws')+'/ws',{origin:'null'}),client={ws,packets:[]};clients.push(client);
  ws.on('message',b=>client.packets.push(JSON.parse(b)));await once(ws,'open');ws.send(JSON.stringify({type:'auth',token:session.token}));await until(()=>client.packets.some(p=>p.type==='ready'));
 }
 const [alice,bob,outside]=clients;
 alice.ws.send(JSON.stringify({type:'voice-join',room:'lobby',transport:'ws-opus-v1'}));await until(()=>alice.packets.some(p=>p.type==='voice-event'));
 bob.ws.send(JSON.stringify({type:'voice-join',room:'lobby',transport:'ws-opus-v1'}));await until(()=>alice.packets.some(p=>p.type==='voice-event'&&p.voiceUser.uid==='bob'));
 await until(()=>bob.packets.some(p=>p.type==='voice-event'&&p.action==='join'));
 bob.ws.send(JSON.stringify({type:'voice-leave'}));await until(()=>alice.packets.some(p=>p.type==='voice-event'&&p.action==='leave'));
 await until(()=>bob.packets.some(p=>p.type==='voice-event'&&p.action==='leave'));
 assert.equal(outside.packets.some(p=>p.type==='voice-event'),false);
});

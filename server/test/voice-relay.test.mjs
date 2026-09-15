import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {once} from 'node:events';import {WebSocket} from 'ws';import {createCommunity} from '../src/server.mjs';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
test('twenty room members receive authenticated voice only within room, mute and deafen apply',async t=>{
 const data=await mkdtemp(path.join(tmpdir(),'hxz-relay-')),s=createCommunity({data,origins:['null'],exchange:async i=>({selectedProfile:{id:i.accessToken,name:i.accessToken}})});s.server.listen(0,'127.0.0.1');await once(s.server,'listening');const base='http://127.0.0.1:'+s.server.address().port,clients=[];
 t.after(async()=>{for(const c of clients)c.ws.terminate();await s.close();await rm(data,{recursive:true,force:true});});
 for(let user=0;user<11;user++){const session=await fetch(base+'/api/session',{method:'POST',body:JSON.stringify({accessToken:'user'+user})}).then(r=>r.json());for(let tab=0;tab<2;tab++){const ws=new WebSocket(base.replace('http','ws')+'/ws',{origin:'null'}),c={ws,packets:[],audio:[]};clients.push(c);ws.on('message',(b,binary)=>binary?c.audio.push(b):c.packets.push(JSON.parse(b)));await once(ws,'open');ws.send(JSON.stringify({type:'auth',token:session.token}));}}
 await pause(80);
 for(const c of clients.slice(0,20))c.ws.send(JSON.stringify({type:'voice-join',room:'lobby',transport:'ws-opus-v1'}));
 await pause(80);
 clients[20].ws.send(JSON.stringify({type:'voice-join',room:'lobby',transport:'ws-opus-v1'}));clients[21].ws.send(JSON.stringify({type:'voice-join',room:'mod-1',transport:'ws-opus-v1'}));await pause(80);
 assert.ok(clients[20].packets.some(p=>p.type==='error'&&/已满/.test(p.error)));
 const frame=Buffer.alloc(12);frame[0]=1;frame.writeUInt32BE(1,1);frame.writeUInt32BE(1,5);frame.set([0xf8,0xff,0xfe],9);clients[0].ws.send(frame);await pause(80);
 for(const c of clients.slice(1,20))assert.equal(c.audio.length,1);
 assert.equal(clients[0].audio.length,0);assert.equal(clients[20].audio.length,0);assert.equal(clients[21].audio.length,0);
 assert.equal(clients[1].audio[0].subarray(1,37).toString(),clients[0].packets.find(p=>p.type==='ready').id);
 clients[0].ws.send(JSON.stringify({type:'voice-mute',muted:true}));await pause(30);frame.writeUInt32BE(2,5);clients[0].ws.send(frame);await pause(30);assert.equal(clients[1].audio.length,1);
 clients[0].ws.send(JSON.stringify({type:'voice-mute',muted:false}));clients[1].ws.send(JSON.stringify({type:'voice-deafen',deafened:true}));await pause(30);frame.writeUInt32BE(3,5);clients[0].ws.send(frame);await pause(30);assert.equal(clients[1].audio.length,1);assert.equal(clients[2].audio.length,2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {createCommunity} from '../src/server.mjs';

test('ordinary users can run the authenticated local P2P self-test without a host grant', async t => {
 const data=await mkdtemp(path.join(os.tmpdir(),'hxz-signal091-'));
 const service=createCommunity({data,adminIDs:['admin'],fecAuto:false,exchange:async input=>({selectedProfile:{id:String(input.uid),name:String(input.uid)}})});
 service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
 const base='http://127.0.0.1:'+service.server.address().port,sockets=[];
 t.after(async()=>{for(const socket of sockets)socket.terminate();await service.close();await rm(data,{recursive:true,force:true});});
 const request=async(uid)=>{const response=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid})});assert.equal(response.status,200);return (await response.json()).token;};
 const hostToken=await request('ordinary_host'),guestToken=await request('ordinary_guest');
 const room='p2p-test-0123456789abcdef01234567',proof='a'.repeat(64);
 async function connect(token,type){
  const socket=new WebSocket(base.replace('http:','ws:')+'/lobby-signal');sockets.push(socket);socket.on('error',()=>{});
  const messages=[];socket.on('message',raw=>messages.push(JSON.parse(raw)));await once(socket,'open');
  socket.send(JSON.stringify({type,room,proof,token,test:true}));
  const next=async predicate=>{const until=Date.now()+2000;while(Date.now()<until){const index=messages.findIndex(predicate);if(index>=0)return messages.splice(index,1)[0];await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Missing signal');};
  return {socket,next};
 }
 const host=await connect(hostToken,'host');assert.equal((await host.next(message=>message.type==='registered')).type,'registered');
 const guest=await connect(guestToken,'join');const ready=await guest.next(message=>message.type==='ready');assert.match(ready.pair,/^[0-9a-f-]{36}$/);
 host.socket.send(JSON.stringify({type:'done',pair:ready.pair,token:hostToken}));assert.equal((await host.next(message=>message.type==='complete')).type,'complete');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createCommunity } from '../src/server.mjs';

test('skin identity, administration, chat persistence and room-scoped signaling', async t => {
  const data=await mkdtemp(path.join(os.tmpdir(),'hxz-community-'));
  const service=createCommunity({data,origins:['null','http://localhost:9000'],adminIDs:['admin'],exchange:async input=>{
    if(!['admin','player'].includes(input.accessToken))throw Error('invalid upstream credentials');
    return {accessToken:'rotated-'+input.accessToken,clientToken:'client',selectedProfile:{id:input.accessToken,name:input.accessToken}};
  }});
  service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
  const base='http://127.0.0.1:'+service.server.address().port, sockets=[];
  t.after(async()=>{for(const ws of sockets)ws.terminate();await service.close();await rm(data,{recursive:true,force:true});});
  const request=async(route,method='GET',body,token)=>{const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
  const admin=(await request('/api/session','POST',{accessToken:'admin',uid:'forged'})).body;
  const player=(await request('/api/session','POST',{accessToken:'player',uid:'admin',admin:true})).body;
  assert.equal(player.user.uid,'player');assert.equal(player.user.admin,false);assert.equal(admin.user.admin,true);
  assert.equal((await request('/api/session','POST',{accessToken:'unknown'})).status,400);
  const avatar='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9sAAAAASUVORK5CYII=';
  assert.equal((await request('/api/profile/avatar','POST',{avatar,uid:'admin'},player.token)).status,200);
  assert.equal((await fetch(base+'/api/avatars/player')).status,200);
  assert.equal((await fetch(base+'/api/avatars/admin')).status,404,'caller cannot replace another identity avatar');
  assert.equal((await request('/api/profile/avatar','POST',{avatar:'data:image/svg+xml;base64,AAAA'},player.token)).status,400);
  const notice={groupId:'survival',title:'Maintenance',body:'Updates at 18:00'};
  assert.equal((await request('/api/notices','POST',notice,player.token)).status,400);
  const published=await request('/api/notices','POST',notice,admin.token);assert.equal(published.status,201);
  assert.equal((await request('/api/notices')).body[0].title,notice.title);
  async function client(token){const ws=new WebSocket(base.replace('http','ws')+'/ws',{origin:'file://'});sockets.push(ws);const packets=[];ws.on('message',raw=>packets.push(JSON.parse(raw)));await once(ws,'open');ws.send(JSON.stringify({type:'auth',token}));const wait=async type=>{for(let i=0;i<100;i++){const index=packets.findIndex(p=>p.type===type);if(index>=0)return packets.splice(index,1)[0];await new Promise(r=>setTimeout(r,20));}throw Error('Missing '+type);};return {ws,wait,send:value=>ws.send(JSON.stringify(value))};}
  const a=await client(admin.token),b=await client(player.token);const readyA=await a.wait('ready'),readyB=await b.wait('ready');
  b.send({type:'chat',body:'Hello fantasy town',name:'forged admin',uid:'admin'});const chat=await a.wait('chat');assert.equal(chat.message.uid,'player');assert.equal(chat.message.name,'player');
  b.send({type:'signal',to:readyA.id,data:{description:'outside-room'}});assert.match((await b.wait('error')).error,/同一房间/);
  a.send({type:'voice-join',room:'lobby',transport:'ws-opus-v1'});b.send({type:'voice-join',room:'lobby',transport:'ws-opus-v1'});await new Promise(r=>setTimeout(r,60));
  a.send({type:'signal',to:readyB.id,data:{candidate:{candidate:'test'}}});const signal=await b.wait('signal');assert.equal(signal.from,readyA.id);
  b.send({type:'voice-leave'});await new Promise(r=>setTimeout(r,40));a.send({type:'signal',to:readyB.id,data:{candidate:{candidate:'test'}}});assert.match((await a.wait('error')).error,/同一房间/);
  const c=await client(player.token);assert.equal((await c.wait('ready')).messages.at(-1).body,'Hello fantasy town');
  assert.equal((await request('/api/moderation','POST',{uid:'player',banned:true},admin.token)).status,200);
  assert.equal((await request('/api/voice-config','GET',null,player.token)).status,400);
  assert.equal((await request('/api/notices/'+published.body.id,'DELETE',null,admin.token)).status,200);
  assert.deepEqual((await request('/api/notices')).body,[]);
  const blocked=new WebSocket(base.replace('http','ws')+'/ws',{origin:'https://untrusted.example'});
  sockets.push(blocked);
  const rejection=await new Promise(resolve=>{blocked.on('open',()=>resolve(false));blocked.on('error',()=>resolve(true));});
  assert.equal(rejection,true,'untrusted website must remain blocked');
});

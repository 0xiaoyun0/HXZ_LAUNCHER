import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createDirectLobby} from '../core/direct-lobby.mjs';
import {dialRoom,parseInvitation} from '../core/direct-wire.mjs';

test('an expired lease refuses new direct connections before the renewal timer fires',async()=>{
 let expiresAt=Date.now()+5000;
 const lobby=createDirectLobby({
  request:async path=>{assert.equal(path,'/api/lobby/lease');return {allowed:true,uid:'host',expiresAt};},
  networkInterfaces:()=>[{name:'loopback fixture',address:'127.0.0.1',family:4}]
 });
 try{
  const hosted=await lobby.host({scope:'lan',public:false,instance:'fixture'});
  const room=parseInvitation(hosted.room.invite);
  const initial=await dialRoom(room,'127.0.0.1');initial.socket.destroy();
  await delay(Math.max(0,expiresAt-Date.now()+30));
  await assert.rejects(dialRoom(room,'127.0.0.1'),/房间邀请已失效|已断开|ECONNRESET/);
  assert.equal(lobby.status().mode,'idle');
 }finally{await lobby.close();}
});

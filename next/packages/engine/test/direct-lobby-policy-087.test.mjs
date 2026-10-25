import test from 'node:test';
import assert from 'node:assert/strict';
import {createDirectLobby} from '../core/direct-lobby.mjs';

test('host applies the community connection cap when the policy endpoint is available',async()=>{
 const lobby=createDirectLobby({
  request:async path=>{
   if(path==='/api/lobby/lease')return {allowed:true,uid:'host',expiresAt:Date.now()+60_000};
   if(path==='/api/lobby/access')return {settings:{maxConnections:2}};
   if(path==='/api/lobby/rooms')return {};
   throw Error('unexpected request '+path);
  },
  networkInterfaces:()=>[{name:'loopback fixture',address:'127.0.0.1',family:4}]
 });
 try{
  const hosted=await lobby.host({scope:'lan',public:false,instance:'fixture'});
  assert.equal(hosted.maxConnections,2);
  assert.equal(lobby.status().maxConnections,2);
 }finally{await lobby.close();}
});

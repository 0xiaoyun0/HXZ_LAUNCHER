import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createCommunity} from '../src/server.mjs';
test('community chess tables authorize turns, resume, settle wins and run bot workers',async t=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'hxz-board-045-'));
 const service=createCommunity({data,exchange:async i=>({selectedProfile:{id:i.uid,name:i.uid}})});
 service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
 t.after(async()=>{await service.close();await rm(data,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+service.server.address().port;
 async function request(path,token,body){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const value=await response.json();return {status:response.status,...value};}
 const a=(await request('/api/session','',{uid:'playerA'})).token,b=(await request('/api/session','',{uid:'playerB'})).token,spy=(await request('/api/session','',{uid:'spectator'})).token;
 let m=await request('/api/boards',a,{game:'gomoku',mode:'online',level:1});assert.equal(m.status,201);
 m=await request('/api/boards/'+m.id,b,{action:'join'});assert.equal(m.b.uid,'playerB');
 assert.equal((await request('/api/boards/'+m.id,spy,{action:'move',ply:0,move:{to:0}})).status,400);
 const moves=[112,0,113,1,114,2,115,3,116];
 for(const [ply,to] of moves.entries()){m=await request('/api/boards/'+m.id,ply%2?b:a,{action:'move',ply,move:{to}});assert.equal(m.status,200);}
 assert.equal(m.state.winner,'a');assert.equal((await request('/api/points',a)).balance,'1');
 assert.equal((await request('/api/boards/'+m.id,a)).state.winner,'a');assert.equal((await request('/api/points',a)).balance,'1');
 let bot=await request('/api/boards',a,{game:'chess',mode:'bot',level:2});
 bot=await request('/api/boards/'+bot.id,a,{action:'move',ply:0,move:{from:52,to:36}});
 assert.equal(bot.status,200);assert.equal(bot.state.ply,2);assert.equal(bot.state.turn,'a');
});

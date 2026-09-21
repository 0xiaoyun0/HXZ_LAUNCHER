import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createCommunity} from '../src/server.mjs';
import {createGame,step,replay,GAMES} from '../shared/arcade-engine.mjs';
test('three games replay the same inputs deterministically',()=>{
  for(const game of GAMES){const s=createGame(game.id,2345),inputs=[];while(!s.over&&s.tick<1000){const actions=s.tick%7===0?[game.id==='runner'?'jump':game.id==='blocks'?'drop':'left']:[];for(const a of actions)inputs.push([s.tick+1,a]);step(s,actions);}assert.deepEqual(replay(game.id,2345,s.tick,inputs),s);}
  assert.throws(()=>replay('runner',1,18001,[]));
  assert.throws(()=>replay('breakout',1,1,[[1,{x:100000}]]));
});
test('presets require admin; score is replayed, retryable without double credit and persisted',async()=>{
  const data=await mkdtemp(path.join(os.tmpdir(),'hxz044-'));
  const service=createCommunity({data,adminIDs:['admin'],exchange:async input=>({selectedProfile:{id:input.accessToken,name:input.accessToken}})});
  service.server.listen(0,'127.0.0.1');await once(service.server,'listening');const base='http://127.0.0.1:'+service.server.address().port;
  const req=async(p,method='GET',body,token)=>{const r=await fetch(base+p,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
  try{
    const admin=(await req('/api/session','POST',{accessToken:'admin'})).data.token,player=(await req('/api/session','POST',{accessToken:'player'})).data.token;
    const presets=(await req('/api/server-presets')).data;assert.equal(presets.servers.length,3);assert.equal(presets.servers[0].loader,'fabric');
    presets.servers[1].address='s2.example.com';presets.servers[1].updateUrls=['http://updates.example.com:8088/modv1','https://updates.example.com:8443/modv1'];assert.equal((await req('/api/admin/server-presets','PUT',presets,player)).status,400);
    assert.equal((await req('/api/admin/server-presets','PUT',presets,admin)).status,200);assert.equal((await req('/api/server-presets')).data.servers[1].address,'s2.example.com');
    assert.deepEqual((await req('/api/server-presets')).data.servers[1].updateUrls,presets.servers[1].updateUrls);
    const run=(await req('/api/arcade/runner/start','POST',{},player)).data;
    const result=await req('/api/arcade/runner/finish','POST',{id:run.id,ticks:30,inputs:[],score:999999},player);assert.equal(result.status,200);assert.equal(result.data.score,5);
    assert.equal((await req('/api/arcade/runner/finish','POST',{id:run.id,ticks:30,inputs:[]},player)).data.score,5,'lost response can be retried without crediting twice');
    assert.equal((await req('/api/arcade/runner')).data.items[0].score,5);
    assert.equal((await req('/api/admin/arcade/runner','DELETE',{uid:'player'},player)).status,400);
    assert.equal((await req('/api/admin/arcade/runner','DELETE',{uid:'player'},admin)).status,200);
    assert.deepEqual((await req('/api/arcade/runner')).data.items,[]);
  }finally{await service.close();await rm(data,{recursive:true,force:true});}
});

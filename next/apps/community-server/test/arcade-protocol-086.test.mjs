import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {createArcade} from '../src/arcade.mjs';
import {createPoints} from '../src/points.mjs';
import * as current from '../shared/arcade-engine.mjs';
import * as v8 from '../shared/arcade-engine-v8.mjs';

function winMines(engine,seed){
 const s=engine.createGame('mines',seed),inputs=[];
 const advance=actions=>{for(const action of actions)inputs.push([s.tick+1,action]);engine.step(s,actions);};
 advance(['reveal:54']);
 // This HTTP test deliberately knows the layout to finish both legacy and new
 // boards; the separate fairness tests use only visible clues.
 while(!s.over){const cells=s.open.flatMap((open,i)=>!open&&s.cells[i]>=0?[i]:[]).slice(0,4);assert(cells.length);advance(cells.map(i=>'reveal:'+i));}
 assert(s.won);return {s,inputs};
}

test('mixed clients: v8/v9 mines retain old generator, v10 uses certified generator through checkpoint and finish',async()=>{
 const db=new DatabaseSync(':memory:'),user={uid:'protocol-player',name:'兼容测试'};
 const deps={db,randomSeed:()=>2,auth:req=>{if(req.headers.authorization!=='Bearer local-test')throw Error('请登录');return user;},admin:()=>user,
  body:async req=>{let value='';for await(const b of req)value+=b;return JSON.parse(value||'{}');},send:(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));},limit(){},broadcast(){}};
 const points=createPoints(deps),route=createArcade({...deps,points});
 const server=createServer(async(req,res)=>{try{if(!await route(req,res,new URL(req.url,'http://test')))deps.send(res,404,{error:'Not found'});}catch(e){deps.send(res,400,{error:e.message});}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const call=async(path,body)=>{const res=await fetch('http://127.0.0.1:'+server.address().port+path,{method:'POST',headers:{Authorization:'Bearer local-test','Content-Type':'application/json'},body:JSON.stringify(body)});const value=await res.json();assert.equal(res.status,200,JSON.stringify(value));return value;};
 try{
  const old=winMines(v8,2),modern=winMines(current,2);assert.notDeepEqual(old.s.cells,modern.s.cells,'fixture must distinguish generators');
  for(const version of [8,9,10]){
   const run=await call('/api/arcade/mines/start',{rulesVersion:version,seed:999});assert.equal(run.rulesVersion,version);assert.equal(run.seed,2);
   const {s,inputs}=version===10?modern:old,middle=Math.max(1,Math.floor(s.tick/2)),engine=version===10?current:v8;
   const prefix=inputs.filter(e=>e[0]<=middle),expected=engine.replay('mines',run.seed,middle,prefix);
   const checkpoint=await call('/api/arcade/mines/checkpoint',{id:run.id,from:0,ticks:middle,inputs:prefix,score:999999});assert.equal(checkpoint.score,expected.score);
   // Lost acknowledgements may resend the same verified prefix.
   assert.equal((await call('/api/arcade/mines/checkpoint',{id:run.id,from:0,ticks:middle,inputs:prefix})).score,expected.score);
   const finish=await call('/api/arcade/mines/finish',{id:run.id,from:middle,ticks:s.tick,inputs:inputs.filter(e=>e[0]>middle),score:999999});assert.equal(finish.score,s.score);
   assert.equal((await call('/api/arcade/mines/finish',{id:run.id,ticks:s.tick,inputs:[]})).score,s.score);
  }
  // Both versions retain current dice/voyage behavior and all other v9 games.
  for(const version of [9,10])for(const {id} of current.GAMES.filter(g=>g.id!=='mines')){
   const run=await call('/api/arcade/'+id+'/start',{rulesVersion:version});
   const inputs=id==='dice'?[[1,'endturn']]:id==='caravan'?[[1,'route:0']]:[];
   const finish=await call('/api/arcade/'+id+'/finish',{id:run.id,ticks:2,inputs,score:999999});
   assert.equal(finish.score,current.replay(id,run.seed,2,inputs).score,id+' v'+version);
  }
 }finally{await new Promise(resolve=>server.close(resolve));points.close();db.close();}
});

test('desktop and mobile negotiate rules10 and refuse ranking with an old response',async t=>{
 const previousDocument=globalThis.document;globalThis.document={hidden:false};
 t.after(()=>{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});
 for(const module of ['../../../packages/games/arcade-controller.mjs','../../../packages/mobile-ui/client/src/lib/arcade-controller.mjs']){
  const {createArcade:createClient}=await import(module);
  for(const responseVersion of [null,9,10]){
   let requested;const beforeRender=Error('stop before rendering');
   const client=createClient(async(path,method,body)=>{if(path.endsWith('/start')){requested=body;if(responseVersion===null)throw Error('小游戏规则版本不受支持，请更新社区服务端');return {id:'test',seed:2,rulesVersion:responseVersion};}return {items:[]};},{nextTick:async()=>{throw beforeRender;}});
   await client.select(client.GAMES.find(g=>g.id==='mines'));
   await assert.rejects(client.start(),e=>e===beforeRender);
   assert.equal(requested.rulesVersion,10);assert.equal(client.ranked.value,responseVersion===10);
   if(responseVersion!==10)assert.match(client.message.value,/练习模式/);
  }
 }
});

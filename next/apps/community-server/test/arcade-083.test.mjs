import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import * as current from '../../../server/shared/arcade-engine.mjs';
import * as v8 from '../../../server/shared/arcade-engine-v8.mjs';
import {createArcade} from '../src/arcade.mjs';
import {createPoints} from '../src/points.mjs';
import {voyageOptions} from '../../../server/shared/arcade-tactics.mjs';

test('published v8 uses its frozen engine and keeps the previous replay',()=>{
 assert.equal(v8.GAMES.length,16);
 const inputs=[[1,'die:0'],[1,'use:attack'],[2,'endturn']];
 const old=v8.replay('dice',1148,2,inputs);
 assert.deepEqual({seed:old.seed,score:old.score,hp:old.hp,enemy:old.enemy,dice:old.dice,turn:old.turn,tick:old.tick},{seed:2893819229,score:0,hp:31,enemy:{name:'镜甲傀儡',hp:22,max:25,boss:false,kind:2,shield:0,intent:'attack',amount:5},dice:[2,3,4,4],turn:2,tick:2});
 assert.equal(v8.createGame('dice',1148).enemy.charge,undefined);
 assert.equal(current.createGame('dice',1148).enemy.charge,0);
});

test('version 9 HTTP settlement ignores forged score, stays idempotent, and version 8 remains available',async()=>{
 const db=new DatabaseSync(':memory:'),user={uid:'v9-player',name:'探险者'};
 const deps={db,auth:req=>{if(req.headers.authorization!=='Bearer local-test')throw Error('请登录');return user;},admin:()=>user,body:async req=>{let value='';for await(const chunk of req)value+=chunk;return JSON.parse(value||'{}');},send:(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));},limit(){},broadcast(){}};
 const points=createPoints(deps),route=createArcade({...deps,points});
 const server=createServer(async(req,res)=>{try{if(!await route(req,res,new URL(req.url,'http://local')))deps.send(res,404,{error:'Not found'});}catch(e){deps.send(res,400,{error:e.message});}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(path,body)=>{const res=await fetch(base+path,{method:'POST',headers:{Authorization:'Bearer local-test','Content-Type':'application/json'},body:JSON.stringify(body)});return{status:res.status,value:await res.json()};};
 try{
  const run=await call('/api/arcade/dice/start',{rulesVersion:9});assert.equal(run.status,200);assert.equal(run.value.rulesVersion,9);
  const partial=await call('/api/arcade/dice/finish',{id:run.value.id,ticks:1,inputs:[],score:999999});assert.equal(partial.status,200);assert.equal(partial.value.score,current.replay('dice',run.value.seed,1,[]).score);
  const repeated=await call('/api/arcade/dice/finish',{id:run.value.id,ticks:1,inputs:[],score:999999});assert.equal(repeated.value.score,partial.value.score);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM arcade_scores WHERE uid=?').get(user.uid).n,1);
  const voyage=await call('/api/arcade/caravan/start',{rulesVersion:9});assert.equal(voyage.status,200);const state=current.createGame('caravan',voyage.value.seed),inputs=[];
  for(let i=0;i<100&&!state.over;i++){
   let action;
   if(state.choices.length)action='upgrade:'+(state.choices.find(id=>['t-garden','t-reserve','t-sails','t-hull'].includes(id))||state.choices[0]);
   else if(state.phase==='route')action='route:'+state.routes.map((route,index)=>({route,index})).sort((a,b)=>a.route.risk-b.route.risk)[0].index;
   else{const options=voyageOptions(state).map((o,index)=>({o,index})).filter(v=>state.coins>=(v.o.cost||0)&&state.food>=-(v.o.food||0));options.sort((a,b)=>{const value=v=>Math.min(state.maxHp-state.hp,v.o.hp||0)*3+Math.min(12-state.food,v.o.food||0)*2+Math.min(12-state.fuel,v.o.fuel||0)*2;return value(b)-value(a);});action='event:'+options[0].index;}
   inputs.push([state.tick+1,action]);current.step(state,[action]);
  }
  assert(state.over,'full v9 voyage should settle');const midpoint=Math.floor(state.tick/2);
  const checkpoint=await call('/api/arcade/caravan/checkpoint',{id:voyage.value.id,from:0,ticks:midpoint,inputs:inputs.filter(e=>e[0]<=midpoint),score:999999});assert.equal(checkpoint.status,200);
  const settlement=await call('/api/arcade/caravan/finish',{id:voyage.value.id,from:midpoint,ticks:state.tick,inputs:inputs.filter(e=>e[0]>midpoint),score:999999});assert.equal(settlement.status,200);assert.equal(settlement.value.score,state.score);
  const again=await call('/api/arcade/caravan/finish',{id:voyage.value.id,ticks:state.tick,inputs:[]});assert.equal(again.value.score,state.score);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM game_weekly WHERE game=? AND uid=?').get('caravan',user.uid).n,1);
  for(const version of [8,9])for(const game of current.GAMES){
   const started=await call('/api/arcade/'+game.id+'/start',{rulesVersion:version});assert.equal(started.status,200,game.id+' v'+version+' starts');
   const finished=await call('/api/arcade/'+game.id+'/finish',{id:started.value.id,ticks:1,inputs:[],score:999999});assert.equal(finished.status,200,game.id+' v'+version+' settles');
   assert.equal(finished.value.score,(version===8?v8:current).replay(game.id,started.value.seed,1,[]).score,game.id+' v'+version+' verified score');
  }
  const old=await call('/api/arcade/dice/start',{rulesVersion:8});assert.equal(old.status,200);assert.equal(old.value.rulesVersion,8);
 }finally{await new Promise(resolve=>server.close(resolve));points.close();db.close();}
});

test('new dice intentions introduce distinct responses, and actions replay identically',()=>{
 const intentions=new Set();
 for(let seed=1;seed<=100;seed++){const s=current.createGame('dice',seed);const actions=['die:0','use:attack'];const result=current.replay('dice',seed,1,actions.map(a=>[1,a]));current.step(s,actions);assert.deepEqual(result,s);s.level=5;current.step(s,['endturn']);intentions.add(s.enemy.intent);}
 assert(intentions.size>=4,'enemy intention variety');
 const charged=current.createGame('dice',49);charged.level=6;charged.enemy.intent='windup';charged.enemy.amount=6;charged.enemy.hp=100;charged.enemy.max=100;current.step(charged,['endturn']);assert.equal(charged.enemy.intent,'attack');assert(charged.enemy.amount>=6);const health=charged.hp;current.step(charged,['endturn']);assert(charged.hp<health);assert.equal(charged.enemy.charge,0);
 const siphon=current.createGame('dice',49);siphon.enemy.hp=10;siphon.enemy.max=30;siphon.enemy.intent='siphon';siphon.enemy.amount=5;current.step(siphon,['endturn']);assert.equal(siphon.enemy.hp,15);assert.equal(siphon.hp,31);
 const blocked=current.createGame('dice',49);blocked.enemy.hp=10;blocked.enemy.max=30;blocked.enemy.intent='siphon';blocked.enemy.amount=5;blocked.block=5;current.step(blocked,['endturn']);assert.equal(blocked.enemy.hp,10);assert.equal(blocked.hp,36);
 const echo=current.createGame('dice',49);echo.echo=1;echo.spark=1;echo.dice[0]=4;current.step(echo,['use:charge']);echo.dice[1]=4;current.step(echo,['die:1','use:attack']);assert.equal(echo.enemy.max-echo.enemy.hp,4+6+3+4);
});

test('a damaged expedition can choose a score-free recovery event',()=>{
 const s=current.createGame('caravan',7);s.hp=9;s.fuel=3;s.food=3;s.phase='event';s.activeRoute={id:'storm'};
 const recovery=voyageOptions(s)[2];assert.equal(recovery.title,'应急停泊');assert.equal(recovery.points,-100);
 const hp=s.hp,fuel=s.fuel,food=s.food;current.step(s,['event:2']);assert(s.hp>hp&&s.fuel>fuel&&s.food>food);assert.equal(s.score,0);
});

test('multiple complete-run policies finish, replay, and show meaningful decision tradeoffs',()=>{
 const results={};
 for(const game of ['dice','caravan'])for(const policy of ['careful','opportunist','reckless']){
  let wins=0,losses=0;
  for(let seed=1;seed<=24;seed++){
   const s=current.createGame(game,seed),inputs=[];
   for(let i=0;i<2500&&!s.over;i++){
    let actions=[];
    if(s.choices.length){const preferred=s.choices.find(v=>game==='dice'?v==='t-medic'||v==='t-heart':v==='t-garden'||v==='t-reserve');actions=['upgrade:'+(policy==='reckless'?s.choices[0]:preferred||s.choices[0])];}
    else if(game==='dice'){
     const open=s.dice.map((n,index)=>({n,index})).filter(v=>!s.used[v.index]);
     if(!open.length)actions=['endturn'];
     else{const die=policy==='reckless'?open[0]:[...open].sort((a,b)=>b.n-a.n)[0];let use='attack';if(policy!=='reckless'&&s.hp<=s.maxHp-(policy==='careful'?3:7)&&!s.repaired&&open.length>1)use='repair';else if(policy==='careful'&&open.length===1&&['attack','pierce','siphon'].includes(s.enemy.intent)&&s.block<s.enemy.amount)use='guard';actions=['die:'+die.index,'use:'+use];}
    }else if(s.phase==='route'){
     const routes=s.routes.map((route,index)=>({route,index})).sort((a,b)=>policy==='reckless'?b.route.risk-a.route.risk:policy==='opportunist'?(b.route.id==='ruins'?1:0)-(a.route.id==='ruins'?1:0):a.route.risk-b.route.risk);
     actions=['route:'+routes[0].index];
    }else{
     const options=voyageOptions(s).map((o,index)=>({o,index})).filter(v=>s.coins>=(v.o.cost||0)&&s.food>=-(v.o.food||0));
     options.sort((a,b)=>{const value=v=>policy==='reckless'?(v.o.points||0)+(v.o.coins||0):policy==='opportunist'?(v.o.points||0)+(v.o.coins||0)*2+(v.o.food||0)+(v.o.fuel||0):Math.min(s.maxHp-s.hp,v.o.hp||0)*3+Math.min(12-s.food,v.o.food||0)*2+Math.min(12-s.fuel,v.o.fuel||0)*2;return value(b)-value(a);});
     actions=['event:'+options[0].index];
    }
    for(const action of actions)inputs.push([s.tick+1,action]);current.step(s,actions);
   }
   assert(s.over,game+' '+policy+' seed '+seed+' unfinished');
   assert.deepEqual(current.replay(game,seed,s.tick,inputs),s);
   const middle=Math.floor(s.tick/2),checkpoint=current.replay(game,seed,middle,inputs.filter(e=>e[0]<=middle));
   assert.deepEqual(current.replaySegment(checkpoint,s.tick,inputs.filter(e=>e[0]>middle)),s);
   if(s.won)wins++;else losses++;
  }
  results[game+'-'+policy]={wins,losses};
 }
 assert(results['dice-careful'].wins>0);
 assert(results['caravan-careful'].wins>0);
 assert(results['dice-reckless'].losses>0);
 assert(results['caravan-reckless'].losses>0);
 console.log('0.8.3 automated policies',results);
});

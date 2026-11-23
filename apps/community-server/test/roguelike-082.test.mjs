import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {GAMES,createGame,step,replay,replaySegment} from '../../../server/shared/arcade-engine.mjs';
import * as old from '../../../server/shared/arcade-engine-v7.mjs';
import * as v8 from '../../../server/shared/arcade-engine-v8.mjs';
import {TACTICS_UPGRADES,voyageOptions,validTacticsAction} from '../../../server/shared/arcade-tactics.mjs';
import {CARDS,ROGUE_UPGRADES} from '../../../server/shared/arcade-rogue.mjs';
import {createArcade} from '../src/arcade.mjs';
import {createPoints} from '../src/points.mjs';

export function decide(s){
 if(s.choices.length){const preferred=s.game==='dice'?['t-edge','t-forge','t-heart','t-medic','t-echo','t-aegis','t-thorns','t-spark']:['t-garden','t-sails','t-shelter','t-reserve','t-hull','t-beacon','t-trade','t-compass'];return ['upgrade:'+(preferred.find(id=>s.choices.includes(id))||s.choices[0])];}
 if(s.game==='caravan'){if(s.phase==='route'){const rated=s.routes.map((r,i)=>({i,value:r.risk+(s.fuel<5?r.fuel:0)+(s.food<5?r.food:0)-(r.id==='port'&&s.coins>6?5:0)-(r.id==='ruins'?2:0)})).sort((a,b)=>a.value-b.value);return['route:'+rated[0].i];}const rated=voyageOptions(s).map((o,i)=>({i,o,value:Math.min(s.maxHp-s.hp,o.hp||0)*3+Math.min(Math.max(0,13-s.food),o.food||0)*2+Math.min(Math.max(0,13-s.fuel),o.fuel||0)*2+(o.coins||0)*.25+(o.points||0)*.01-(o.cost||0)*.3})).filter(v=>s.coins>=(v.o.cost||0)&&s.food>=-(v.o.food||0)).sort((a,b)=>b.value-a.value);return ['event:'+rated[0].i];}
 const available=s.dice.map((n,i)=>({n,i})).filter(v=>!s.used[v.i]);if(!available.length)return['endturn'];const strongest=[...available].sort((a,b)=>b.n-a.n)[0];let use='attack',die=strongest;
 const lethal=strongest.n+(s.edge||0)*2+s.charge>=s.enemy.hp+s.enemy.shield;
 if(!lethal&&s.hp<s.maxHp-3&&!s.repaired&&available.length>=2){use='repair';die=available.find(v=>v.n%2===1)||strongest;}
 else if(!lethal&&available.length===1&&s.enemy.intent!=='brace'&&s.block<s.enemy.amount){use='guard';}
 if(!s.rerolled&&die.n<=2)return ['die:'+die.i,'reroll'];return ['die:'+die.i,'use:'+use];
}
function play(id,seed,engine={createGame,step}){const s=engine.createGame(id,seed),inputs=[];for(let i=0;i<2500&&!s.over;i++){const actions=decide(s);for(const a of actions)inputs.push([s.tick+1,a]);engine.step(s,actions);}return{s,inputs};}
test('two distinct roguelikes finish real runs, replay exactly and start cleanly',()=>{
 for(const id of ['dice','caravan']){let wins=0;for(let seed=1;seed<=24;seed++){const {s,inputs}=play(id,seed);assert(s.over,id+' seed '+seed+' never ends');assert.equal(s.level<=12,true);assert(Number.isSafeInteger(s.score)&&s.score>=0);if(s.won)wins++;assert.deepEqual(replay(id,seed,s.tick,inputs),s);const midpoint=Math.floor(s.tick/2);const first=replay(id,seed,midpoint,inputs.filter(e=>e[0]<=midpoint));assert.deepEqual(replaySegment(first,s.tick,inputs.filter(e=>e[0]>midpoint)),s);assert.equal(createGame(id,seed).score,0);}assert(wins>0,id+' no completable seeds');console.log(id+' wins '+wins+'/24');}
});
test('actions cannot forge score, take unoffered relics, duplicate voyage events, or exceed dice resources',()=>{
 for(const id of ['dice','caravan']){assert.throws(()=>replay(id,1,1,[[1,'score:999999']]));assert.throws(()=>replay(id,1,1,[[1,'upgrade:__proto__']]));assert.equal(validTacticsAction(id,'upgrade:constructor'),false);const s=createGame(id,1);step(s,['upgrade:t-heart']);assert.equal(s.maxHp,id==='dice'?36:28);for(let i=0;i<90;i++)step(s);assert.equal(s.score,0);}
 const dice=createGame('dice',3);step(dice,['die:0','use:guard']);assert.equal(dice.used[0],true);dice.selectedDie=0;const block=dice.block;step(dice,['use:guard']);assert.equal(dice.block,block);step(dice,['die:1','reroll']);const seed=dice.seed;step(dice,['reroll']);assert.equal(dice.seed,seed);
 const boat=createGame('caravan',1);step(boat,['route:0']);step(boat,['event:2']);const score=boat.score;step(boat,['event:2','event:2']);assert.equal(boat.score,score);assert.equal(boat.level,2);
});
test('defense consumes absorbed shields and careless decisions can lose both expeditions',()=>{
 const defended=createGame('dice',1);defended.aegis=1;defended.block=5;defended.enemy.intent='attack';defended.enemy.amount=5;step(defended,['endturn']);assert.equal(defended.block,0);assert.equal(defended.hp,36);
 const pierced=createGame('dice',1);pierced.aegis=1;pierced.block=7;pierced.enemy.intent='pierce';pierced.enemy.amount=3;step(pierced,['endturn']);assert.equal(pierced.block,1);assert.equal(pierced.hp,36);
 for(const id of ['dice','caravan']){let losses=0;for(let seed=1;seed<=24;seed++){const s=createGame(id,seed);for(let i=0;i<2500&&!s.over;i++){let a;if(s.choices.length)a=['upgrade:'+s.choices[0]];else if(id==='dice'){const die=s.used.findIndex(v=>!v);a=die<0?['endturn']:['die:'+die,'use:attack'];}else if(s.phase==='route'){const risky=s.routes.map((r,i)=>({i,risk:r.risk})).sort((a,b)=>b.risk-a.risk)[0];a=['route:'+risky.i];}else{const options=voyageOptions(s).map((o,i)=>({i,o})).filter(({o})=>s.coins>=(o.cost||0)&&s.food>=-(o.food||0));const greedy=options.sort((a,b)=>((b.o.points||0)+(b.o.coins||0))-((a.o.points||0)+(a.o.coins||0)))[0];a=['event:'+greedy.i];}step(s,a);}assert(s.over);if(!s.won)losses++;}assert(losses>0,id+' reckless strategy cannot fail');console.log(id+' reckless losses '+losses+'/24');}
});
test('all new relics have effects and old clients retain version 7 deterministic rules',()=>{
 for(const [id,item] of Object.entries(TACTICS_UPGRADES)){const game=['edge','aegis','forge','echo','spark','medic','heart','thorns'].includes(item.stat)?'dice':'caravan',s=createGame(game,1);s.choices=[id];step(s,['upgrade:'+id]);assert.equal(s[item.stat],1,id);assert.equal(s.level,2);assert.equal(s.choices.length,0);assert(s.relics.includes(id));}
 assert(!old.GAMES.some(g=>g.id==='dice'));const oldS=old.createGame('swarm',42);for(let i=0;i<300;i++)old.step(oldS,['right']);assert.deepEqual(old.replay('swarm',42,oldS.tick,Array.from({length:oldS.tick},(_,i)=>[i+1,'right'])),oldS);
 assert.equal(Object.keys(CARDS).length,16);for(const id of ['r-frost','r-pierce','r-chain','r-retaliate','r-regen','r-execute'])assert(ROGUE_UPGRADES[id]);
 const s=createGame('deck',2);s.hand=['fortify','shieldbash','comet','venom','meditate','thorns'];s.energy=20;step(s,['card:0']);assert.equal(s.block,7);assert.equal(s.retain,6);const hp=s.enemies[0].hp;step(s,['card:0']);assert.equal(s.enemies[0].hp,hp-10);step(s,['card:0']);assert(s.played===3);step(s,['card:1']);assert.equal(s.battleFocus,2);step(s,['card:1']);assert.equal(s.thorns,5);
});
test('survivor and dungeon builds apply frost, chain, piercing, retaliation, regeneration and execution',()=>{
 const base=()=>{const s=createGame('swarm',1);s.nextSpawn=999;s.cool=999;s.enemies=[{id:1,x:190,y:280,hp:10,max:10,kind:0,cool:999,hit:0},{id:2,x:212,y:280,hp:10,max:10,kind:0,cool:999,hit:0}];return s;};
 const chain=base();chain.frost=1;chain.chain=1;chain.pierce=2;chain.shots=[{x:190,y:280,vx:0,vy:0,age:9,damage:2,enemy:false,pierce:2,hits:[]}];step(chain);assert(chain.enemies.every(e=>e.hp<10&&e.slow>0));assert.equal(chain.shots[0].pierce,1);assert.deepEqual(chain.shots[0].hits,[1]);
 const regenerate=base();regenerate.hp=3;regenerate.age=449;regenerate.regen=2;regenerate.enemies=[];step(regenerate);assert.equal(regenerate.hp,5);
 const retaliation=base();retaliation.retaliate=2;retaliation.enemies[0].x=180;step(retaliation);assert(retaliation.hp<8);assert(retaliation.enemies[0].hp<=4);
 const execute=base();execute.execute=2;execute.enemies[0].hp=2;execute.shots=[{x:190,y:280,vx:0,vy:0,age:9,damage:1,enemy:false,hits:[]}];step(execute);assert.equal(execute.kills,1);
 for(const id of ['swarm','deck','dungeon']){const s=createGame(id,17),inputs=[];for(let i=0;i<300&&!s.over;i++){const actions=s.choices.length?['upgrade:'+s.choices[0]]:id==='deck'?(i%3===0?['card:0']:['endturn']):i%4===0?['up','fire']:['right'];for(const a of actions)inputs.push([s.tick+1,a]);step(s,actions);}assert.deepEqual(replay(id,17,s.tick,inputs),s,id);}
});
test('real arcade endpoint uses server replay, authorizes runs, is idempotent and contributes existing weekly/alltime tables',async t=>{
 const db=new DatabaseSync(':memory:'),user={uid:'rogue-player',name:'玩家'},savedNow=Date.now;let now=1900000000000;Date.now=()=>now;t.after(()=>{Date.now=savedNow;db.close();});
 const deps={db,auth:req=>req.user||user,admin:()=>user,body:async req=>req.input||{},send:(res,status,value)=>Object.assign(res,{status,value}),limit(){},broadcast(){}};const points=createPoints(deps);t.after(()=>points.close());const route=createArcade({...deps,points});
 async function call(path,input={},who=user){const res={};await route({method:'POST',input,user:who},res,new URL('http://local'+path));return res.value;}
 for(const id of ['dice','caravan']){const run=await call('/api/arcade/'+id+'/start',{rulesVersion:8});assert.equal(run.rulesVersion,8);const {s,inputs}=play(id,run.seed,v8);now+=s.tick/30*1000+100;await assert.rejects(call('/api/arcade/'+id+'/finish',{id:run.id,ticks:s.tick,inputs,score:999999},{uid:'other',name:'别人'}));const result=await call('/api/arcade/'+id+'/finish',{id:run.id,ticks:s.tick,inputs,score:999999});assert.equal(result.score,s.score);assert.notEqual(result.score,999999);const duplicate=await call('/api/arcade/'+id+'/finish',{id:run.id,ticks:s.tick,inputs});assert.equal(duplicate.score,s.score);assert.equal(db.prepare('SELECT score FROM game_alltime WHERE game=? AND uid=?').get(id,user.uid).score,s.score);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM game_weekly WHERE game=? AND uid=?').get(id,user.uid).n,1);}
 const oldRun=await call('/api/arcade/deck/start',{rulesVersion:7});assert.equal(oldRun.rulesVersion,7);const catalog={};await route({method:'GET'},catalog,new URL('http://local/api/arcade/catalog'));assert.equal(catalog.value.items.filter(i=>i.id==='dice'||i.id==='caravan').length,2);
 const invalid=await call('/api/arcade/dice/start',{rulesVersion:8});now+=1000;await assert.rejects(call('/api/arcade/dice/finish',{id:invalid.id,ticks:1,inputs:[[1,'upgrade:constructor']]}));
});
test('HTTP start → checkpoint → finish validates a full voyage without trusting client score',async()=>{
 const db=new DatabaseSync(':memory:'),user={uid:'http-player',name:'航行者'};const deps={db,auth:req=>{if(req.headers.authorization!=='Bearer local-test')throw Error('请登录');return user;},admin:()=>user,body:async req=>{let text='';for await(const chunk of req)text+=chunk;return JSON.parse(text||'{}');},send:(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));},limit(){},broadcast(){}};
 const points=createPoints(deps),route=createArcade({...deps,points});const server=createServer(async(req,res)=>{try{if(!await route(req,res,new URL(req.url,'http://local')))deps.send(res,404,{error:'Not found'});}catch(e){deps.send(res,400,{error:e.message});}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const call=async(path,body)=>{const res=await fetch(base+path,{method:'POST',headers:{Authorization:'Bearer local-test','Content-Type':'application/json'},body:JSON.stringify(body)});return{status:res.status,value:await res.json()};};
 try{const run=(await call('/api/arcade/caravan/start',{rulesVersion:8})).value;const {s,inputs}=play('caravan',run.seed,v8),mid=Math.floor(s.tick/2);const checkpoint=await call('/api/arcade/caravan/checkpoint',{id:run.id,from:0,ticks:mid,inputs:inputs.filter(e=>e[0]<=mid),score:999999});assert.equal(checkpoint.status,200);const result=await call('/api/arcade/caravan/finish',{id:run.id,from:mid,ticks:s.tick,inputs:inputs.filter(e=>e[0]>mid),score:999999});assert.equal(result.status,200);assert.equal(result.value.score,s.score);assert.notEqual(result.value.score,999999);const noAuth=await fetch(base+'/api/arcade/dice/start',{method:'POST',body:'{}'});assert.equal(noAuth.status,400);assert.equal((await noAuth.json()).error,'请登录');}finally{await new Promise(resolve=>server.close(resolve));points.close();db.close();}
});

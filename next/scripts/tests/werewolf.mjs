import assert from 'node:assert/strict';import {createWerewolf} from '../../apps/community-server/src/werewolf.mjs';
let time=Date.now();const wins=[];const svc=createWerewolf({auth:r=>r.user,body:async r=>r.body,send:(r,c,v)=>r.value=v,limit(){},points:{win:(u,id)=>wins.push([u.uid,id])},now:()=>time});
const players=Array.from({length:6},(_,i)=>({uid:'person'+i,name:'测试旅人'+i}));
async function api(user,id='',data){const req={method:data?'POST':'GET',user,body:data},res={};await svc.route(req,res,new URL('http://test/api/werewolf'+(id?'/'+id:'')));return res.value;}
try{
 let room=await api(players[0],'',{title:'隔离测试'}),id=room.id;
 for(const p of players.slice(1)){await api(p,id,{action:'join'});await api(p,id,{action:'ready'});}
 room=await api(players[0],id,{action:'start'});assert.equal(room.players.length,6);assert(room.ranked);assert(room.players.every(p=>!('role' in p)),'private roles cannot leak');
 await assert.rejects(api({uid:'outsider'},id),/先加入/);await assert.rejects(api(players[0],id,{action:'act',turn:'old-turn'}),/切换/);
 const seen=new Map();for(const p of players){const v=await api(p,id);seen.set(p.uid,v.me.role);assert(!v.players.some(t=>t.checks||t.heal||t.poison));}
 for(let i=0;i<200;i++){
  room=await api(players[0],id);if(room.phase==='finished')break;
  if(room.phase==='discussion'){const speaker=players.find(p=>room.players.some(t=>t.uid===p.uid&&t.alive));await api(speaker,id,{action:'chat',text:'讨论测试 <img src=x>'});time+=91000;continue;}
  let acted=false;
  for(const p of players){const v=await api(p,id);if(v.phase==='finished')break;if(!v.me.canAct)continue;acted=true;const choice=v.me.action==='witch'?'skip':undefined;const target=v.me.action==='vote'?v.me.targets.find(uid=>seen.get(uid)==='狼人')||v.me.targets[0]:v.me.targets[0];await api(p,id,{action:'act',turn:v.turn,choice,target:choice?null:target});}
  if(!acted)time+=91000;
 }
 room=await api(players[0],id);assert.equal(room.phase,'finished');assert(room.players.every(p=>p.role));assert(wins.length>0);const n=wins.length;await api(players[0],id);assert.equal(wins.length,n);console.log('PASS six-player roles privacy, stale action, discussion, full game, one settlement');
 const practice=await api({uid:'solo',name:'独立练习'},'',{title:'练习'});const filled=await api({uid:'solo',name:'独立练习'},practice.id,{action:'start',fillBots:true});assert.equal(filled.players.length,6);assert.equal(filled.ranked,false);console.log('PASS bot fill is practice, no online points');
}finally{svc.close();}

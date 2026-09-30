import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {createCommunity} from '../src/server.mjs';
import {createPoints} from '../src/points.mjs';

test('feedback privacy, administrator handling and spectator-only comments',async t=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'hxz-community-050-'));
 const service=createCommunity({data,adminIDs:['admin'],exchange:async i=>({selectedProfile:{id:i.uid,name:i.uid}})});
 service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
 t.after(async()=>{await service.close();await rm(data,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+service.server.address().port;
 async function request(p,token,body){const r=await fetch(base+p,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,...await r.json()};}
 const tokens={};for(const uid of ['a','b','spy','admin'])tokens[uid]=(await request('/api/session','',{uid})).token;
 const feedback=await request('/api/feedback',tokens.a,{category:'launcher',title:'下载反馈',body:'请求恢复中断任务',report:'中文日志'.repeat(15000)});assert.equal(feedback.status,201);
 assert.equal((await request('/api/feedback/'+feedback.id,tokens.b)).status,400);
 assert.equal((await request('/api/feedback?scope=all',tokens.a)).status,400);
 assert.equal((await request('/api/feedback?scope=all',tokens.admin)).total,1);
 assert.equal((await request('/api/feedback/'+feedback.id,tokens.admin,{body:'已修复断点恢复',status:'resolved'})).status,200);
 const detail=await request('/api/feedback/'+feedback.id,tokens.a);assert.equal(detail.item.status,'resolved');assert.equal(detail.replies[0].manager,1);
 let match=await request('/api/boards',tokens.a,{game:'chess',mode:'online',level:1});await request('/api/boards/'+match.id,tokens.b,{action:'join'});
 const comment=await request('/api/boards/'+match.id,tokens.spy,{action:'comment',text:'期待这盘棋'});assert.equal(comment.comments.length,1);assert.deepEqual(comment.legal,[]);
 for(const player of ['a','b']){assert.equal((await request('/api/boards/'+match.id,tokens[player])).comments,undefined);assert.equal((await request('/api/boards/'+match.id,tokens[player],{action:'comment',text:'不可见'})).status,400);}
 const run=await request('/api/arcade/runner/start',tokens.a,{});
 const checkpoint={id:run.id,from:0,ticks:15,inputs:[]};assert.equal((await request('/api/arcade/runner/checkpoint',tokens.a,checkpoint)).ticks,15);
 assert.equal((await request('/api/arcade/runner/checkpoint',tokens.a,{...checkpoint,ticks:30})).ticks,30,'lost acknowledgement accepts verified prefix without applying it twice');
});

test('lifetime game scores survive weekly settlement without changing weekly points',t=>{
 const db=new DatabaseSync(':memory:');let now=Date.parse('2026-09-27T23:59:00+08:00');const user={uid:'a',name:'甲'};
 const points=createPoints({db,auth:()=>user,admin:()=>user,body:async r=>r.body,send(){},limit(){},now:()=>now});t.after(()=>{points.close();db.close();});
 points.recordScore('runner',user,600);now+=120000;points.settle();
 assert.equal(points.gameBoard('runner',user,'week').items.length,0);
 assert.equal(points.gameBoard('runner',user,'all').items[0].score,600);
 points.recordScore('runner',user,200);assert.equal(points.gameBoard('runner',user,'all').items[0].score,600);assert.equal(points.gameBoard('runner',user,'week').items[0].score,200);
});

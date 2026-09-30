import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {createCommunity} from '../src/server.mjs';
import {createGame,step,replay} from '../shared/arcade-engine.mjs';
import * as previous from '../shared/arcade-engine-v3.mjs';
import {createBoard,botMove,playMove} from '../shared/board-games.mjs';

test('new arcade rules replay deterministically, maze is connected, five-level tactics stay legal',()=>{
 for(const id of ['runner','maze','danmaku','fighter']){
  const s=createGame(id,194),inputs=[];
  while(s.tick<2400&&!s.over){const a=s.choices?.length?'upgrade:'+s.choices[0]:id==='maze'?['left','up','right','down'][Math.floor(s.tick/20)%4]:id==='runner'?'jump':{x:180+Math.round(Math.sin(s.tick/120)*120),y:410};inputs.push([s.tick+1,a]);step(s,[a]);}
  assert.deepEqual(replay(id,194,s.tick,inputs),s);assert.ok((s.bullets?.length||0)<=600);
 }
 for(let seed=0;seed<20;seed++){
  const s=createGame('maze',seed),seen=new Set([20]),q=[20];
  for(let i=0;i<q.length;i++)for(const j of [q[i]-19,q[i]+19,q[i]-1,q[i]+1])if(j>=0&&j<437&&!s.cells[j]&&!seen.has(j)){seen.add(j);q.push(j);}
  assert.equal(seen.size,s.cells.filter(x=>!x).length);
 }
 const bricks=createGame('breakout',1);bricks.level=5;bricks.lives=1;bricks.serve=0;bricks.bricks=[];step(bricks);assert.equal(bricks.lives,2);assert.equal(bricks.level,6);
 const g=createBoard('gomoku');for(const to of [112,0,113,1,114,2,115,3])Object.assign(g,playMove(g,{to}));
 for(let level=1;level<=5;level++){const move=botMove(g,level);assert.equal(playMove(g,move).winner,'a');}
});

test('public API hides private content, forum sorting works, rules versions stay compatible',async t=>{
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-public-051-')),app=createCommunity({data,exchange:async i=>({selectedProfile:{id:i.uid,name:i.uid}})});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(async()=>{await app.close();await fs.rm(data,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+app.server.address().port;
 async function request(p,body,token){const r=await fetch(base+p,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const v=await r.json();assert.equal(r.status,200,JSON.stringify(v));return v;}
 app.db.prepare('INSERT INTO forum_posts VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('old','secret-user','甲','早帖','公开正文','交流讨论',100,100,0,0,0);
 app.db.prepare('INSERT INTO forum_posts VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('new','secret-user','乙','新帖','公开正文','交流讨论',200,200,0,0,0);
 app.db.prepare('INSERT INTO forum_posts VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('hidden','private','私密','隐藏','不要公开','交流讨论',300,300,0,0,1);
 app.db.prepare('INSERT INTO forum_likes VALUES(?,?)').run('old','secret-user');
 assert.equal((await request('/api/forum/posts?sort=likes')).items[0].id,'old');assert.equal((await request('/api/forum/posts?sort=newest')).items[0].id,'new');
 for(const p of ['overview','notices','forum','forum/old','blueprints','shop','leaderboard','leaderboard?period=annual','leaderboard?game=runner']){const result=await request('/api/public/v1/'+p);assert.ok(!JSON.stringify(result).includes('secret-user'));assert.ok(!JSON.stringify(result).includes('不要公开'));}
 assert.equal((await request('/api/public/v1/forum')).total,2);
 const {token}=await request('/api/session',{uid:'fixture'});
 assert.equal((await request('/api/arcade/runner/start',{},token)).rulesVersion,2);
 assert.equal((await request('/api/arcade/runner/start',{rulesVersion:3},token)).rulesVersion,3);
 assert.equal((await request('/api/arcade/fighter/start',{rulesVersion:3},token)).rulesVersion,3);
 assert.equal((await request('/api/arcade/fighter/start',{rulesVersion:4},token)).rulesVersion,4);
});

test('new pointer positions follow input immediately while published rules remain unchanged',()=>{
 for(const id of ['danmaku','fighter']){
  const old=previous.createGame(id,1),current=createGame(id,1),target={x:300,y:220};
  previous.step(old,[target]);step(current,[target]);
  assert.equal(current.x,300);assert.equal(current.y,220);assert.ok(old.x<190);
  assert.deepEqual(replay(id,1,1,[[1,target]]),current);
 }
 const old=previous.createGame('runner',1),current=createGame('runner',1);
 for(const s of [old,current])s.obstacles=[{x:300,w:20,h:28}];
 previous.step(old);step(current);
 assert.ok(Math.abs(300-current.obstacles[0].x-7.2024)<.00001);
 assert.ok(300-old.obstacles[0].x>12);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createPoints,weekOf} from '../src/points.mjs';
import {createPlaytime,PLAYTIME_MAX_GAP} from '../src/playtime.mjs';
import {createInbox} from '../src/inbox.mjs';
const A={uid:'a'.repeat(32),name:'alice'},B={uid:'b'.repeat(32),name:'bob'};
const DAY=86400000;
function setup(t){
 const db=new DatabaseSync(':memory:');let stamp=Date.parse('2026-10-25T20:00:00+08:00'),service;
 db.exec('CREATE TABLE members(uid TEXT PRIMARY KEY,name TEXT,seen INTEGER)');
 for(const u of [A,B])db.prepare('INSERT INTO members VALUES(?,?,?)').run(u.uid,u.name,stamp);
 const points=createPoints({db,now:()=>stamp}),inbox=createInbox({db,broadcast(){},adminIDs:new Set()});
 const auth=req=>{if(!req.user)throw Error('请先登录');return req.user;},admin=req=>{const u=auth(req);if(u.uid!=='admin')throw Error('管理员');return u;};
 const options={db,points,inbox,auth,admin,body:async req=>req.input,send:(res,status,value)=>Object.assign(res,{status,value}),now:()=>stamp};
 const start=()=>service=createPlaytime(options);start();t.after(()=>{service.close();points.close();db.close();});
 return {db,points,inbox,get service(){return service;},get time(){return stamp;},set time(v){stamp=v;},restart(){service.close();start();},poll(players=[A],server='survival',delta=90000){stamp+=delta;service.observe(server,players);},async route(path,input,user=A){const res={};await service.route({method:input?'PUT':'GET',input,user},res,new URL(path,'http://local'));return res.value;}};
}
function play(f,milliseconds,players=[A]){f.poll(players,'survival',0);for(let elapsed=0;elapsed<milliseconds;){const delta=Math.min(PLAYTIME_MAX_GAP,milliseconds-elapsed);f.poll(players,'survival',delta);elapsed+=delta;}}
test('24h cumulative verified play crosses weeks and restarts, awards once per complete day',t=>{
 const f=setup(t);play(f,DAY-30000);assert.equal(f.points.wallet(A).balance,'0');
 assert.equal(f.service.calendar(A).rewardSummary.remainingSeconds,30);
 f.restart();f.poll([A],'survival',30000);assert.equal(f.points.wallet(A).balance,'0','first poll after restart attests no gap');
 f.poll([A],'survival',30000);assert.equal(f.points.wallet(A).balance,'5');
 f.service.settle();f.restart();assert.equal(f.points.wallet(A).balance,'5');
 play(f,DAY);assert.equal(f.points.wallet(A).balance,'10');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM inbox').get().n,2);
 const summary=f.service.calendar(A).rewardSummary;assert.equal(summary.earnedPoints,'10');assert.equal(summary.remainingSeconds,86400);assert.equal(summary.progressSeconds,0);
 assert.equal(f.service.leaderboard(A,weekOf(f.time)).self.reward,'0','weekly rank no longer pays');
});
test('reward transaction rolls back notification failure and retries exactly once',t=>{
 const f=setup(t);play(f,DAY-30000);const notify=f.inbox.notify;f.inbox.notify=()=>{throw Error('injected inbox failure');};
 assert.throws(()=>f.poll([A],'survival',30000),/injected/);assert.equal(f.points.wallet(A).balance,'0');
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM points_ledger').get().n,0);f.inbox.notify=notify;f.service.settle();f.service.settle();assert.equal(f.points.wallet(A).balance,'5');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM inbox').get().n,1);
});
test('enable toggle keeps progress and fixed rate rejects attempted customization',async t=>{
 const f=setup(t);await f.route('/api/admin/playtime/rules',{enabled:false},{uid:'admin'});play(f,DAY+30000);assert.equal(f.points.wallet(A).balance,'0');
 const disabled=f.service.calendar(A).rewardSummary;assert.equal(disabled.pendingIntervals,1);assert.equal(disabled.progressSeconds,30);
 await assert.rejects(f.route('/api/admin/playtime/rules',{enabled:true,pointsPerInterval:100},{uid:'admin'}),/固定/);
 await f.route('/api/admin/playtime/rules',{enabled:true},{uid:'admin'});assert.equal(f.points.wallet(A).balance,'5');assert.equal(f.service.calendar(A).rewardSummary.remainingSeconds,86370);
});

test('migration counts only unsettled verified periods and preserves old zero and paid settlements',t=>{
 const f=setup(t),week=weekOf(f.time)-14*DAY,oldBoard=[{...A,rank:1,seconds:90000,eligible:true,reward:'100'}],rules={enabled:true,minWeeklyMinutes:30,dailyCapMinutes:480,rewards:[100]};
 f.service.close();
 f.db.exec('DELETE FROM playtime_reward_config; DELETE FROM playtime_accounts;');
 f.db.prepare('INSERT INTO playtime_days VALUES(?,?,?,?)').run(A.uid,week,week,2*DAY);
 f.db.prepare('INSERT INTO playtime_days VALUES(?,?,?,?)').run(A.uid,week+7*DAY,week+7*DAY,DAY);
 f.db.prepare('INSERT INTO playtime_days VALUES(?,?,?,?)').run(A.uid,week+14*DAY,week+14*DAY,DAY+3600000);
 f.db.prepare('INSERT INTO playtime_settlements VALUES(?,?,?,?,?,?)').run(week,f.time,JSON.stringify(rules),JSON.stringify(oldBoard),1,'100');
 f.db.prepare('INSERT INTO playtime_settlements VALUES(?,?,?,?,?,?)').run(week+7*DAY,f.time,JSON.stringify({...rules,enabled:false}),JSON.stringify([{...oldBoard[0],reward:'0'}]),1,'0');
 f.points.transaction(()=>f.points.credit({id:`playtime:${week}:${A.uid}`,user:A,amount:100n,reason:'legacy award'}));
 f.restart();assert.equal(f.points.wallet(A).balance,'105');
 const summary=f.service.calendar(A).rewardSummary;assert.equal(summary.verifiedSeconds,90000);assert.equal(summary.progressSeconds,3600);assert.equal(summary.earnedPoints,'5');
 assert.equal(f.service.leaderboard(A,week).self.reward,'100');assert.equal(f.service.leaderboard(A,week).rewardScheme,'legacy-weekly');
 f.restart();assert.equal(f.points.wallet(A).balance,'105');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM playtime_awards').get().n,1);
});
test('ranking uses uncapped time, stable ties and wallet identity; unknown identities receive no award',t=>{
 const f=setup(t),variant={uid:'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',name:'forged name'},unknown={uid:'f'.repeat(32),name:'unknown'};
 play(f,DAY,[B,variant,unknown]);const board=f.service.leaderboard(A,weekOf(f.time));
 assert.equal(board.items.length,2);assert.deepEqual(board.items.map(v=>[v.uid,v.reward]),[[A.uid,'0'],[B.uid,'0']]);assert.equal(board.self.name,'alice');
 assert.equal(f.points.wallet(A).balance,'5');assert.equal(f.points.wallet(B).balance,'5');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM points_wallet').get().n,2);
});

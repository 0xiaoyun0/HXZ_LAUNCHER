import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createPoints,weekOf} from '../src/points.mjs';
import {createPlaytime,PLAYTIME_MAX_GAP} from '../src/playtime.mjs';
import {createInbox} from '../src/inbox.mjs';
import {fixture} from './helpers/hub.mjs';

const A={uid:'a'.repeat(32),name:'alice'},B={uid:'b'.repeat(32),name:'bob'},C={uid:'c'.repeat(32),name:'carol'};
const defaults={enabled:true,minWeeklyMinutes:30,dailyCapMinutes:480,rewards:[100,80,60,40,30,20,20,10,10,10]};
function setup(t,start='2026-10-20T12:00:00+08:00'){
 const db=new DatabaseSync(':memory:');let time=Date.parse(start),playtime;
 db.exec('CREATE TABLE members(uid TEXT PRIMARY KEY,name TEXT,seen INTEGER);');
 for(const u of [A,B,C])db.prepare('INSERT INTO members VALUES(?,?,?)').run(u.uid,u.name,time);
 const auth=req=>{if(!req.user)throw Object.assign(Error('请先登录'),{status:401});return req.user;},admin=req=>{const u=auth(req);if(u.uid!=='admin')throw Object.assign(Error('需要管理员权限'),{status:403});return u;};
 const points=createPoints({db,now:()=>time}),inbox=createInbox({db,broadcast(){},adminIDs:new Set()});
 const options={db,points,inbox,auth,admin,body:async req=>req.input,send:(res,status,value)=>Object.assign(res,{status,value}),now:()=>time};
 const startService=()=>playtime=createPlaytime(options);startService();
 t.after(()=>{playtime.close();points.close();db.close();});
 const route=async(path,{method='GET',user=A,input}={})=>{const res={};assert.equal(await playtime.route({method,user,input},res,new URL(path,'http://localhost')),true);return res.value;};
 return {db,points,inbox,get playtime(){return playtime;},set time(value){time=typeof value==='number'?value:Date.parse(value);},get time(){return time;},poll(players=[A],server='survival',after=0){time+=after;playtime.observe(server,players);},route,restart(){playtime.close();startService();},async nextRules(rules){return route('/api/admin/playtime/rules',{method:'PUT',user:{uid:'admin'},input:rules});}};
}

test('trusted polls union cross-server and repeated-device intervals, reject backwards time and discard long/offline gaps',t=>{
 const f=setup(t);f.poll([A,A]);f.poll([A],'mod-1',30000);f.poll([A],'survival',30000);f.poll([A],'mod-1',30000);
 assert.equal(f.playtime.calendar(A).summary.seconds,90,'overlap is counted once');
 const high=f.time;f.time=high-30000;f.poll([A],'survival');assert.equal(f.playtime.calendar(A).summary.seconds,90);
 f.time=high;f.poll([A],'survival');assert.equal(f.playtime.calendar(A).summary.seconds,90,'same timestamp does not double count');
 f.poll([A],'survival',PLAYTIME_MAX_GAP+1);assert.equal(f.playtime.calendar(A).summary.seconds,90,'long gap is discarded entirely');
 f.poll([],'survival',30000);f.poll([A],'survival',30000);assert.equal(f.playtime.calendar(A).summary.seconds,90,'offline gap is not backfilled');
 f.poll([A],'survival',30000);assert.equal(f.playtime.calendar(A).summary.seconds,120);
 f.restart();f.poll([A],'survival',30000);assert.equal(f.playtime.calendar(A).summary.seconds,120,'restart begins fresh verification');
 f.poll([A],'survival',30000);assert.equal(f.playtime.calendar(A).summary.seconds,150);
});

test('Beijing midnight and Monday split intervals before grace-window settlement',t=>{
 const f=setup(t,'2026-10-25T23:59:30+08:00'),previousWeek=weekOf(f.time);f.poll();f.poll([A],'survival',60000);
 const cal=f.playtime.calendar(A);assert.equal(cal.days.at(-2).date,'2026-10-25');assert.equal(cal.days.at(-2).seconds,30);assert.equal(cal.days.at(-1).seconds,30);
 assert.equal(f.playtime.leaderboard(A,previousWeek).self.seconds,30);assert.equal(f.playtime.leaderboard(A,weekOf(f.time)).self.seconds,30);
 assert.equal(f.playtime.leaderboard(A,previousWeek).settled,false,'wait for crossing heartbeat');
 f.time+=60000;f.playtime.settle();assert.equal(f.playtime.leaderboard(A,previousWeek).settled,true);
 assert.equal(f.playtime.calendar(A).summary.streak,2);
});

test('weekly frozen rules, daily cap, stable ties, eligibility and exactly-once wallet/inbox/points settlement',async t=>{
 const f=setup(t,'2026-10-19T00:00:00+08:00');
 const result=await f.nextRules({...defaults,minWeeklyMinutes:1,dailyCapMinutes:1,rewards:[11,7]});assert.equal(result.effectiveWeek,weekOf(f.time)+7*86400000);
 assert.equal(f.playtime.ruleFor(weekOf(f.time)).dailyCapMinutes,480,'current week remains frozen');
 f.time='2026-10-26T12:00:00+08:00';const week=weekOf(f.time);f.poll([B,A,C]);f.poll([B,A,C],'survival',30000);f.poll([B,A],'survival',30000);f.poll([B,A],'survival',60000);
 const current=f.playtime.leaderboard(A,week);assert.deepEqual(current.items.map(p=>[p.uid,p.seconds,p.reward,p.eligible]),[[A.uid,60,'11',true],[B.uid,60,'7',true],[C.uid,30,'0',false]]);
 assert.equal(f.playtime.calendar(A).summary.seconds,120);assert.equal(f.playtime.calendar(A).summary.eligibleSeconds,60);
 f.time='2026-11-02T00:02:00+08:00';f.playtime.settle();f.playtime.settle();
 assert.equal(f.points.wallet(A).balance,'11');assert.equal(f.points.wallet(B).balance,'7');assert.equal(f.points.wallet(C).balance,'0');
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM points_ledger WHERE id LIKE ?').get('playtime:%').n,2);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM inbox').get().n,2);
 assert.deepEqual(f.points.weeklyBoard(weekOf(f.time),false).map(p=>[p.uid,p.points]),[[A.uid,'11'],[B.uid,'7']]);
 const historical=f.playtime.leaderboard(A,week);assert.equal(historical.settled,true);assert.equal(historical.self.reward,'11');
 f.restart();f.playtime.settle();assert.equal(f.points.wallet(A).balance,'11');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM inbox').get().n,2);
 f.time='2026-11-09T00:02:00+08:00';f.points.settle();assert.equal(f.db.prepare('SELECT points FROM points_annual WHERE year=2026 AND uid=?').get(A.uid).points,'14','playtime credit participates in the normal current-week rollup');
});

test('restart catches up missed weeks and an inbox failure rolls back the entire settlement',async t=>{
 const f=setup(t);await f.nextRules({...defaults,minWeeklyMinutes:1,rewards:[13]});f.time='2026-10-26T12:00:00+08:00';const week=weekOf(f.time);f.poll();f.poll([A],'survival',60000);
 const notify=f.inbox.notify;f.inbox.notify=()=>{throw Error('injected inbox failure');};f.time='2026-11-09T00:02:00+08:00';
 assert.throws(()=>f.playtime.settle(),/injected/);assert.equal(f.points.wallet(A).balance,'0');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM points_ledger').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM playtime_settlements').get().n,0);
 f.inbox.notify=notify;f.restart();assert.equal(f.playtime.leaderboard(A,week).settled,true);assert.equal(f.points.wallet(A).balance,'13');
 f.restart();assert.equal(f.points.wallet(A).balance,'13');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM inbox').get().n,1);
});

test('calendar is owner-only and bounded to one year, routes require auth/admin and validate configuration',async t=>{
 const f=setup(t);f.poll();f.poll([A],'survival',60000);
 const cal=await f.route('/api/playtime/calendar?uid='+B.uid);assert.equal(cal.summary.seconds,60);assert.equal(cal.days.length,365);assert.equal((await f.route('/api/playtime/calendar',{user:B})).summary.seconds,0);
 await assert.rejects(f.route('/api/playtime/calendar',{user:null}),/登录/);await assert.rejects(f.route('/api/playtime/leaderboard',{user:null}),/登录/);await assert.rejects(f.nextRules({...defaults,enabled:'true'}),/请选择/);
 await assert.rejects(f.route('/api/admin/playtime/rules',{method:'PUT',input:defaults}),/管理员/);
 await assert.rejects(f.nextRules({...defaults,rewards:[-1]}),/排名积分/);await assert.rejects(f.nextRules({...defaults,dailyCapMinutes:0}),/上限/);
 await assert.rejects(f.route('/api/playtime/report',{method:'POST',input:{seconds:999999}}),/不支持/);
 await assert.rejects(f.route('/api/playtime/leaderboard?week=123'),/有效/);
 f.time+=366*86400000;assert.equal(f.playtime.calendar(A).summary.seconds,0);
});

test('daily detail exposes only the owner union sessions and validates strict dates and the complete 365-day window',async t=>{
 const f=setup(t,'2026-10-19T00:00:00+08:00');await f.nextRules({...defaults,minWeeklyMinutes:1,dailyCapMinutes:1});f.time='2026-10-26T12:00:00+08:00';const start=f.time;
 f.poll();f.poll([A],'mod-1',30000);f.poll([A],'survival',30000);f.poll([A],'mod-1',30000);f.poll([],'survival',10000);f.poll([A],'survival',10000);const resumed=f.time;f.poll([A],'survival',30000);
 const detail=await f.route('/api/playtime/detail?date=2026-10-26&uid='+B.uid);assert.equal(detail.seconds,120);assert.equal(detail.eligibleSeconds,60);assert.equal(detail.timezone,'Asia/Shanghai');assert.equal(detail.dailyCapMinutes,1);assert.deepEqual(detail.sessions,[{start,end:start+90000,seconds:90},{start:resumed,end:resumed+30000,seconds:30}]);assert.ok(detail.sessions.every(s=>!('server' in s)));
 assert.deepEqual((await f.route('/api/playtime/detail?date=2026-10-26&uid='+A.uid,{user:B})).sessions,[]);await assert.rejects(f.route('/api/playtime/detail?date=2026-10-26',{user:null}),/登录/);
 for(const date of ['', '2026-02-30','2026-13-01','2026-1-01','2026-10-27','2025-10-26','bad','2026-10-26T12:00:00Z'])await assert.rejects(f.route('/api/playtime/detail?date='+date),/有效日期/);
 const oldest=new Date(start-364*86400000+8*3600000).toISOString().slice(0,10);assert.deepEqual((await f.route('/api/playtime/detail?date='+oldest)).sessions,[]);
 f.time='2026-10-27T12:00:00+08:00';f.restart();assert.equal((await f.route('/api/playtime/detail?date=2026-10-26')).seconds,120,'restart retains interval detail');
});

test('daily detail splits a verified session at Beijing midnight without inventing source server labels',async t=>{
 const f=setup(t,'2026-10-25T23:59:30+08:00'),start=f.time;f.poll();f.poll([A],'survival',60000);
 assert.deepEqual((await f.route('/api/playtime/detail?date=2026-10-25')).sessions,[{start,end:start+30000,seconds:30}]);assert.deepEqual((await f.route('/api/playtime/detail?date=2026-10-26')).sessions,[{start:start+30000,end:start+60000,seconds:30}]);
});

test('disabled rewards retain confirmed records and snapshot zero awards',async t=>{
 const f=setup(t);await f.nextRules({...defaults,enabled:false,minWeeklyMinutes:1});f.time='2026-10-26T12:00:00+08:00';const week=weekOf(f.time);f.poll();f.poll([A],'survival',60000);f.time='2026-11-02T00:02:00+08:00';f.playtime.settle();
 assert.equal(f.playtime.leaderboard(A,week).self.seconds,60);assert.equal(f.playtime.leaderboard(A,week).self.reward,'0');assert.equal(f.points.wallet(A).balance,'0');
});

test('UUID variants resolve the verified community wallet and an unknown game identity cannot receive rewards',async t=>{
 const f=setup(t);await f.nextRules({...defaults,minWeeklyMinutes:1,rewards:[17,9]});f.time='2026-10-26T12:00:00+08:00';const week=weekOf(f.time),variant={uid:'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',name:'forged-display-name'},unknown={uid:'f'.repeat(32),name:'unknown'};
 f.poll([variant,unknown]);f.poll([variant,unknown],'survival',60000);assert.equal(f.playtime.leaderboard(A,week).self.name,'alice');assert.equal(f.playtime.leaderboard(A,week).total,1);
 f.time='2026-11-02T00:02:00+08:00';f.playtime.settle();assert.equal(f.points.wallet(A).balance,'17');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM points_wallet').get().n,1);
});

test('HTTP permissions exclude client claims, telemetry totals and unauthorized server polls',async t=>{
 const f=await fixture(t,{alice:A.uid,bob:B.uid}),{req}=f;
 await req('alice','/api/admin/playtime/rules','PUT',defaults,403);await req('eve','/api/playtime/report','POST',{uid:A.uid,seconds:999999},405);
 await req('anonymous','/api/playtime/calendar','GET',undefined,400);await req('anonymous','/api/playtime/leaderboard','GET',undefined,400);
 await req('anonymous','/api/playtime/detail?date=2026-10-22','GET',undefined,400);await req('alice','/api/playtime/detail?date=2026-02-30','GET',undefined,400);
 const {token}=await req('admin','/api/admin/game-bridges','POST',{server:'survival',rotate:true});
 const report=async(path,body,tokenValue=token,server='survival',expected=200)=>{const r=await fetch(f.base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokenValue,'X-HXZ-Server':server},body:JSON.stringify(body)});assert.equal(r.status,expected,await r.text());};
 const poll={status:{version:'1.21.1',loader:'fabric',online:1,max:20,players:[A,A],capabilities:['status']},seconds:999999,observed:Date.now()-999999};
 await report('/api/game-bridge/poll',poll,'0'.repeat(64),'survival',403);await report('/api/game-bridge/poll',poll,token,'mod-1',403);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM playtime_polls').get().n,0);
 await report('/api/game-stats/report',{id:'fake-playtime-event-0001',observed:Date.now(),players:[{uid:A.uid,stats:{'minecraft:custom/minecraft:play_time':999999999}}]});
 assert.equal((await req('alice','/api/playtime/calendar')).summary.seconds,0,'cumulative telemetry is never a source');
 await report('/api/game-bridge/poll',poll);assert.equal((await req('alice','/api/playtime/calendar')).summary.seconds,0,'first poll cannot claim elapsed duration');
 assert.equal((await req('bob','/api/playtime/calendar?uid='+A.uid)).summary.seconds,0);
 const admin=await req('admin','/api/admin/playtime/rules');assert.deepEqual(admin.rules,defaults);assert.ok(admin.verification.includes('无法识别全部挂机'));
 await f.restart();assert.equal(f.db.prepare('SELECT COUNT(*) n FROM playtime_polls').get().n,0);
});

test('closing and reopening the SQLite service catches up once and preserves frozen historical payouts',async t=>{
 const f=await fixture(t,{alice:A.uid,bob:B.uid}),{req}=f,week=weekOf(Date.now())-7*86400000,day=week+86400000;
 // Seed an old, already confirmed daily aggregate to simulate a service that
 // stayed down across Monday. HTTP clients have no mutation path to this table.
 f.db.prepare('INSERT INTO playtime_days VALUES(?,?,?,?)').run(A.uid,day,week,31*60000);
 await f.restart();const first=await req('alice','/api/playtime/leaderboard?week='+week);assert.equal(first.settled,true);assert.equal(first.self.reward,'100');assert.equal((await req('alice','/api/points')).balance,'100');
 const ledger=f.db.prepare('SELECT amount,earned,week FROM points_ledger WHERE id=?').get(`playtime:${week}:${A.uid}`);assert.deepEqual({...ledger},{amount:'100',earned:'100',week:weekOf(Date.now())});
 await f.restart();assert.equal((await req('alice','/api/points')).balance,'100');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM inbox WHERE dedupe=?').get(`playtime:${week}:${A.uid}`).n,1);
 await req('admin','/api/admin/playtime/rules','PUT',{...defaults,enabled:false,rewards:[1]});assert.equal((await req('alice','/api/playtime/leaderboard?week='+week)).self.reward,'100');
});

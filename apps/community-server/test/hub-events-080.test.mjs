import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/hub.mjs';
const input=(format,title='活动')=>({kind:'event',title,revision:0,status:'review',data:{format,starts:Date.now()-60000,ends:Date.now()+3600000,capacity:20}});

test('tournaments persist, advance byes and winners, lock participants and reject stale or unauthorized results',async t=>{
 const f=await fixture(t),{req}=f;let e=await req('admin','/api/hub/records','POST',input('tournament')),p='/api/hub/records/'+e.id;
 for(const who of ['alice','bob','eve'])await req(who,p+'/join','POST',{});
 await req('alice',p+'/event-bracket','POST',{},403);e=await req('admin',p+'/event-bracket','POST',{});
 assert.equal(e.activity.tournament.matches.length,3);assert.equal(e.activity.tournament.matches.filter(m=>m.bye).length,1);
 await req('admin',p+'/join','POST',{},409);await req('alice',p+'/leave','POST',{},409);await req('admin',p+'/members','POST',{uid:'alice',action:'remove'},409);
 await req('admin',p+'/result','POST',{uid:'alice',score:999},409);await req('admin',p+'/event-bracket','POST',{},409);
 const first=e.activity.tournament.matches.find(m=>m.status==='ready'),next={match:first.id,winner:first.a,revision:1};
 await req('bob',p+'/event-match','POST',next,403);await req('admin',p+'/event-match','POST',{...next,winner:'admin'},400);
 e=await req('admin',p+'/event-match','POST',next);await req('admin',p+'/event-match','POST',next,409);
 const final=e.activity.tournament.matches.at(-1);assert.equal(final.status,'ready');e=await req('admin',p+'/event-match','POST',{match:final.id,winner:final.a,revision:2,note:'决赛 2:1'});
 assert.equal(e.activity.tournament.status,'complete');assert.equal(e.results.find(r=>r.note==='冠军').uid,final.a);
 await f.restart();assert.equal((await req('alice',p)).activity.tournament.champion,final.a);
});

test('hunt progress enforces prerequisites, redacts codes, checks trusted recent statistics, reviews proof and persists passport',async t=>{
 const f=await fixture(t),{req,db}=f;let e=await req('admin','/api/hub/records','POST',input('hunt')),p='/api/hub/records/'+e.id;
 const add=async(id,kind,extra={})=>{e=await req('admin',p+'/event-checkpoint','POST',{id,revision:0,title:id,kind,...extra});};
 await add('gate','code',{code:'森林钥匙'});await add('river','manual',{prerequisite:'gate'});await add('mine','metric',{prerequisite:'river',server:'mod-2',metric:'minecraft:mined/minecraft:stone',threshold:10});
 await req('alice',p+'/event-checkpoint','POST',{revision:0,title:'私改',kind:'code',code:'123'},403);
 const another=await req('admin','/api/hub/records','POST',input('hunt','另一活动'));await req('admin','/api/hub/records/'+another.id+'/event-checkpoint','POST',{id:'gate',revision:0,title:'覆盖',kind:'code',code:'123'},409);
 assert.ok(!JSON.stringify(await req('alice',p)).includes('森林钥匙'));assert.ok(!JSON.stringify(await req('admin',p)).includes('secret'));
 await req('alice',p+'/event-claim','POST',{checkpoint:'gate',code:'森林钥匙'},403);await req('alice',p+'/join','POST',{});
 await req('alice',p+'/event-claim','POST',{checkpoint:'river',note:'到达'},409);await req('alice',p+'/event-claim','POST',{checkpoint:'gate',code:'错误'},400);
 e=await req('alice',p+'/event-claim','POST',{checkpoint:'gate',code:'森林钥匙'});await req('alice',p+'/event-claim','POST',{checkpoint:'gate',code:'森林钥匙'});assert.equal(e.activity.checkpoints[0].progress.attempt,1);
 await req('admin',p+'/event-checkpoint','POST',{id:'gate',revision:1,title:'更改',kind:'code',code:'换口令'},409);
 await req('alice',p+'/event-claim','POST',{checkpoint:'river',note:'北岸车站水边'});await req('bob',p+'/event-review','POST',{checkpoint:'river',uid:'alice',attempt:1,accept:true},403);
 e=await req('admin',p);assert.equal(e.activity.pending.length,1);await req('admin',p+'/event-review','POST',{checkpoint:'river',uid:'alice',attempt:1,accept:false,reason:'请补充坐标'});
 await req('alice',p+'/event-claim','POST',{checkpoint:'river',note:'北岸 x120 z340'});await req('admin',p+'/event-review','POST',{checkpoint:'river',uid:'alice',attempt:1,accept:true},409);await req('admin',p+'/event-review','POST',{checkpoint:'river',uid:'alice',attempt:2,accept:true});
 await req('alice',p+'/event-claim','POST',{checkpoint:'mine'},409);
 db.prepare('INSERT OR REPLACE INTO game_bridges VALUES(?,?,1,?)').run('mod-2','0'.repeat(64),Date.now());
 db.prepare('INSERT INTO game_stats VALUES(?,?,?,?,?)').run('mod-2','alice','minecraft:mined/minecraft:stone',12,1);await req('alice',p+'/event-claim','POST',{checkpoint:'mine'},409);
 db.prepare('UPDATE game_stats SET observed=?').run(Date.now());await req('alice',p+'/event-claim','POST',{checkpoint:'mine',value:99999});
 assert.equal((await req('alice','/api/hub/events/passport')).items.length,3);assert.equal((await req('bob','/api/hub/events/passport')).items.length,0);
 await f.restart();assert.equal((await req('alice','/api/hub/events/passport')).items.length,3);
});

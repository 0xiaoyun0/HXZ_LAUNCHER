import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture} from './helpers/hub.mjs';
import {quietUntil} from '../src/hub/common.mjs';
import {WebSocket} from 'ws';
import {once as eventOnce} from 'node:events';

test('browsing workspace sections does not consume the write allowance',async t=>{
 const {req}=await fixture(t);
 for(let i=0;i<45;i++)await req('alice','/api/hub/social');
 await req('alice','/api/hub/saved','POST',{id:'after-browsing',title:'可正常保存',url:'/community/hub?section=event',tags:[]});
 assert.equal((await req('alice','/api/hub/saved')).items[0].id,'after-browsing');
});

test('friends require recipient consent; private profiles, blocks and teams enforce identity',async t=>{
 const {req}=await fixture(t);
 const profile={revision:0,bio:'一起建造',tags:['机械动力'],availability:'周末',visibility:'friends',discoverable:true,mentor:true,home:{theme:'sky',companion:'cat'}};
 await req('alice','/api/hub/profile','PUT',profile);
 assert.equal((await req('bob','/api/hub/profiles/alice')).restricted,true);
 await req('alice','/api/hub/friends','POST',{uid:'bob',action:'request'});
 await req('alice','/api/hub/friends','POST',{uid:'bob',action:'accept'},409);
 await req('bob','/api/hub/friends','POST',{uid:'alice',action:'accept'});
 assert.equal((await req('bob','/api/hub/profiles/alice')).bio,'一起建造');
 await req('alice','/api/hub/profile','PUT',profile,409);
 const input={requestId:randomUUID(),title:'周末小队',visibility:'private'},team=await req('alice','/api/hub/teams','POST',input);
 assert.equal((await req('alice','/api/hub/teams','POST',input)).id,team.id);
 await req('eve','/api/hub/teams/'+team.id,'GET',undefined,403);
 await req('bob','/api/hub/teams/'+team.id,'POST',{action:'accept'},403);
 await req('alice','/api/hub/teams/'+team.id,'POST',{action:'invite',uid:'bob'});
 await req('bob','/api/hub/teams/'+team.id,'POST',{action:'accept'});
 assert.equal((await req('bob','/api/hub/teams/'+team.id)).members.length,2);
 await req('bob','/api/hub/teams/'+team.id,'POST',{action:'invite',uid:'eve'},403);
 await req('bob','/api/hub/friends','POST',{action:'block',uid:'alice'});
 await req('alice','/api/hub/profiles/bob','GET',undefined,404);
 await req('alice','/api/hub/friends','POST',{action:'request',uid:'bob'},403);
 assert.equal((await req('bob','/api/hub/social')).relationships.length,0);
});

test('private collections, scheduled letters and device handoffs persist without command execution',async t=>{
 const f=await fixture(t),{req}=f;
 await req('alice','/api/hub/saved','POST',{id:'one',title:'蓝图',url:'/workshop/blueprints?item=one',tags:['建筑']});
 await req('alice','/api/hub/saved','POST',{title:'恶意链接',url:'javascript:alert(1)'},400);
 assert.equal((await req('bob','/api/hub/saved')).items.length,0);
 await req('alice','/api/hub/letters','POST',{requestId:randomUUID(),uid:'eve',title:'信',body:'不能给陌生人发信',due:Date.now()+120000},403);
 await req('alice','/api/hub/letters','POST',{requestId:randomUUID(),uid:'alice',title:'未来',body:'你好',due:Date.now()+120000});
 await req('alice','/api/hub/devices','POST',{id:'desktop-one',name:'我的电脑',platform:'desktop'});
 const task={requestId:randomUUID(),device:'desktop-one',kind:'server-download',title:'下载二服',server:'HXZ-mod-2'};
 const created=await req('alice','/api/hub/handoffs','POST',task);
 assert.equal((await req('alice','/api/hub/handoffs','POST',task)).id,created.id);
 await req('bob','/api/hub/handoffs','POST',{...task,requestId:randomUUID()},404);
 await req('alice','/api/hub/handoffs','POST',{...task,requestId:randomUUID(),kind:'shell'},400);
 await f.restart();
 assert.equal((await req('alice','/api/hub/saved')).items[0].title,'蓝图');
 assert.equal((await req('alice','/api/hub/letters')).items.length,1);
 assert.equal((await req('alice','/api/hub/handoffs')).items[0].status,'pending');
 await req('alice','/api/hub/devices/desktop-one','DELETE');
 assert.equal((await req('alice','/api/hub/handoffs')).items[0].status,'cancelled');
});

test('member picking excludes blocked users; old team invitations cannot bypass a block',async t=>{
 const {req}=await fixture(t);
 assert.equal((await req('alice','/api/hub/members?q=bob')).items[0].uid,'bob');
 const team=await req('alice','/api/hub/teams','POST',{requestId:randomUUID(),title:'等待加入'});
 await req('alice','/api/hub/teams/'+team.id,'POST',{action:'invite',uid:'bob'});
 await req('bob','/api/hub/friends','POST',{action:'block',uid:'alice'});
 assert.equal((await req('bob','/api/hub/members?q=alice')).items.length,0);
 await req('bob','/api/hub/teams/'+team.id,'POST',{action:'accept'},403);
});

test('only the targeted registered desktop may complete a download handoff',async t=>{
 const {req}=await fixture(t);
 for(const [id,platform]of [['pc','desktop'],['phone','android']])await req('alice','/api/hub/devices','POST',{id,name:id,platform});
 const task={requestId:randomUUID(),device:'pc',kind:'server-download',title:'下载安装',server:'HXZ-mod-1'};
 const {id}=await req('alice','/api/hub/handoffs','POST',task),p='/api/hub/handoffs/'+id;
 await req('alice','/api/hub/handoffs','POST',{...task,requestId:randomUUID(),device:'phone'},400);
 await req('alice',p,'POST',{status:'done',device:'phone'},403);
 await req('alice',p,'POST',{status:'done'},403);
 await req('bob',p,'POST',{status:'done',device:'pc'},404);
 await req('alice',p,'POST',{status:'done',device:'pc'});
 await req('alice',p,'POST',{status:'done',device:'pc'});
 assert.equal((await req('alice','/api/hub/handoffs')).items[0].status,'done');
});

test('quiet hours defer notifications, disabling quiet delivers once, and overnight times use Beijing',async t=>{
 assert.equal(quietUntil({quiet:true,quietStart:23,quietEnd:8},Date.parse('2026-10-18T23:20:00+08:00')),Date.parse('2026-10-19T08:00:00+08:00'));
 assert.equal(quietUntil({quiet:true,quietStart:23,quietEnd:8},Date.parse('2026-10-19T07:20:00+08:00')),Date.parse('2026-10-19T08:00:00+08:00'));
 assert.equal(quietUntil({quiet:true,quietStart:23,quietEnd:8},Date.parse('2026-10-19T08:00:00+08:00')),0);
 const {req}=await fixture(t),hour=new Date(Date.now()+8*3600000).getUTCHours();
 await req('alice','/api/hub/preferences','PUT',{quiet:true,quietStart:(hour+23)%24,quietEnd:(hour+1)%24});
 await req('bob','/api/hub/friends','POST',{uid:'alice',action:'request'});
 assert.equal((await req('alice','/api/inbox')).items.length,0);
 await req('alice','/api/hub/preferences','PUT',{quiet:false});
 assert.equal((await req('alice','/api/inbox')).items.length,1);
 await req('alice','/api/hub/preferences','PUT',{quiet:false});
 assert.equal((await req('alice','/api/inbox')).items.length,1);
});

test('returning users receive a bounded digest once through the real connection flow',async t=>{
 const f=await fixture(t),{req}=f;
 await req('admin','/api/hub/records','POST',{kind:'article',revision:0,title:'回归指南',body:'新内容',status:'review',data:{}});
 f.db.prepare('INSERT INTO hub_visits VALUES(?,?)').run('bob',Date.now()-2*86400000);
 const {token}=await req('bob','/api/session','POST',{uid:'bob'}),ws=new WebSocket(f.base.replace('http:','ws:')+'/ws');t.after(()=>ws.close());
 await eventOnce(ws,'open');const ready=new Promise(resolve=>ws.on('message',raw=>{if(JSON.parse(raw).type==='ready')resolve();}));ws.send(JSON.stringify({type:'auth',token,platform:'desktop'}));await ready;
 const mail=await req('bob','/api/inbox');assert.equal(mail.items.length,1);assert.match(mail.items[0].title,/欢迎回来/);assert.match(mail.items[0].body,/回归指南/);
});

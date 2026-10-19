import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createCommunity} from '../src/server.mjs';
test('story expansion preserves live opening and draft; task rewards are gated and issued once',async t=>{
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-linking081-'));
 const service=createCommunity({data,adminIDs:['admin081'],exchange:async input=>({selectedProfile:{id:input.accessToken,name:input.accessToken},accessToken:input.accessToken})});
 await new Promise(resolve=>service.server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await service.close();await fs.rm(data,{recursive:true,force:true});});const base='http://127.0.0.1:'+service.server.address().port;
 async function api(route,method='GET',body,token){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Object.assign(Error(v.error),{status:r.status});return v;}
 const admin=(await api('/api/session','POST',{accessToken:'admin081'})).token,player=(await api('/api/session','POST',{accessToken:'player081'})).token;
 const management=(p,m='GET',b)=>api('/api/admin/linking'+p,m,b,admin),play=(p,m='GET',b)=>api('/api/linking'+p,m,b,player),inventory=(p='',m='GET',b)=>api('/api/inventory'+p,m,b,player);
 const c={id:'lab-opening',title:'原有实验记录',archives:[{id:'snow',title:'0479-雾间雪',body:'用户的原文 A'},{id:'miko',title:'0480-雾间见子',body:'用户的原文 B'}],tasks:[{id:'old-read',title:'既有任务',type:'read',archiveId:'snow'}]};
 let document=await management('/chapters/'+c.id,'PUT',{revision:0,chapter:c});await management('/chapters/'+c.id+'/publish','POST',{revision:1});
 const action=(kind,id,extra={})=>play('/chapters/'+c.id+'/action','POST',{kind,id,...extra});await action('read','snow');await action('read','miko');
 document.chapter.archives[1].notes=['尚未发布的手写补记'];document=await management('/chapters/'+c.id,'PUT',{revision:1,chapter:document.chapter});
 await assert.rejects(management('/story-expansion','POST',{chapter:c.id,revision:1}),e=>e.status===409);
 await assert.rejects(api('/api/admin/linking/story-expansion','POST',{chapter:c.id,revision:2},player),e=>e.status===403);
 document=await management('/story-expansion','POST',{chapter:c.id,revision:2});assert.equal(document.revision,3);assert.equal(document.chapter.archives.length,7);assert.deepEqual(document.chapter.archives[1].notes,['尚未发布的手写补记']);assert.equal(document.chapter.archives[0].body,'用户的原文 A');
 const expansionInfo=(await management('')).storyExpansions.story;assert.equal(expansionInfo.archives,document.chapter.archives.length-c.archives.length);assert.equal(expansionInfo.tasks,document.chapter.tasks.length-c.tasks.length);assert.equal(expansionInfo.items,5);
 assert.equal((await play('/chapters/'+c.id)).archives.length,2,'adding a draft must not publish');
 await assert.rejects(management('/story-expansion','POST',{chapter:c.id,revision:3}),e=>e.status===409);
 await management('/chapters/'+c.id+'/publish','POST',{revision:3});let view=await play('/chapters/'+c.id);assert.equal(view.progress.read,2);assert.equal(view.tasks.find(t=>t.id==='old-read').completed,true);assert.equal(view.archives[2].body,undefined,'locked body must not leak');
 await assert.rejects(action('claim','snow-ash-index'),e=>e.status===403);await assert.rejects(action('submit','snow-ash-index',{answer:'wrong'}));
 view=await action('submit','snow-ash-index',{answer:'0479-0480'});assert.equal(view.archives[2].unlocked,true);assert.equal((await inventory()).mail.length,0,'reading does not silently issue rewards');
 await Promise.all(Array.from({length:5},()=>action('claim','snow-ash-index')));let bag=await inventory();assert.equal(bag.mail.length,1);const reward=bag.mail[0];await inventory('/claim','POST',{id:reward.id});await inventory('/claim','POST',{id:reward.id});assert.equal((await inventory()).items.find(i=>i.id==='linking-paired-index').quantity,1);
 assert.deepEqual((await play('/features')).effects,[]);
 await assert.rejects(action('read','snow-ash-resonance'),e=>e.status===403);
 await action('read','snow-ash-silver-gate');await action('submit','snow-ash-distance',{answer:'十步'});await action('read','snow-ash-whitebranch');await action('claim','snow-ash-read-whitebranch');
 assert.deepEqual((await play('/features')).effects,[],'whitebranch is a prerequisite, not the final music unlock');
 await action('read','snow-ash-resonance');assert.deepEqual((await play('/features')).effects,['music-archive']);await action('read','snow-ash-resonance');assert.deepEqual((await play('/features')).effects,['music-archive'],'repeated reads do not duplicate effects');
 await assert.rejects(action('read','snow-ash-return-signal'),e=>e.status===403,'audio recovery alone does not unlock the route');
 await action('submit','snow-ash-field-note',{submission:'事实：两份实验记录编号相邻；灰衣人把刀放远。问题：档案来源与时间是什么？'});await assert.rejects(action('claim','snow-ash-field-note'),e=>e.status===403);
 await assert.rejects(action('read','snow-ash-return-signal'),e=>e.status===403,'pending note approval is not completion');
 const queue=await management('/submissions'),submission=queue.items.find(v=>v.task==='snow-ash-field-note');await management('/submissions/'+submission.id,'POST',{status:'approved',updated:submission.updated,note:'已区分事实与推测'});await action('claim','snow-ash-field-note');assert.deepEqual((await play('/features')).effects,['music-archive'],'approval unlocks access, reading is still required');
 await action('read','snow-ash-return-signal');assert.deepEqual((await play('/features')).effects,['archive-signal','music-archive']);await action('claim','snow-ash-light-signal');await action('claim','snow-ash-light-signal');
 document=await management('/chapters/'+c.id);document.chapter.subtitle='管理员继续更新章节';await management('/chapters/'+c.id,'PUT',{revision:3,chapter:document.chapter});await management('/chapters/'+c.id+'/publish','POST',{revision:4});await action('claim','snow-ash-index');bag=await inventory();assert.equal(bag.mail.length,3,'revision changes cannot duplicate the earlier reward');assert.equal(bag.items[0].quantity,1);
});

async function isolated(t){
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-linking-effects-'));
 const service=createCommunity({data,adminIDs:['admin081'],exchange:async input=>({selectedProfile:{id:input.accessToken,name:input.accessToken},accessToken:input.accessToken})});
 await new Promise(resolve=>service.server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await service.close();await fs.rm(data,{recursive:true,force:true});});const base='http://127.0.0.1:'+service.server.address().port;
 async function api(route,method='GET',body,token){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Object.assign(Error(v.error),{status:r.status});return v;}
 const admin=(await api('/api/session','POST',{accessToken:'admin081'})).token,player=(await api('/api/session','POST',{accessToken:'player081'})).token,other=(await api('/api/session','POST',{accessToken:'other081'})).token;
 return {api,admin,player,other,management:(p,m='GET',b)=>api('/api/admin/linking'+p,m,b,admin),play:(p,m='GET',b)=>api('/api/linking'+p,m,b,player)};
}

test('music continuation preserves an expanded draft, grants only published completion and survives closure',async t=>{
 const {api,player,other,management,play}=await isolated(t);
 const c={id:'existing-whitebranch',title:'管理员已编辑的白枝',archives:[{id:'snow-ash-whitebranch',title:'白枝门槛',body:'管理员保留的原文',notes:['原有补记']}],tasks:[{id:'snow-ash-read-whitebranch',title:'原有阅读',type:'read',archiveId:'snow-ash-whitebranch'}]};
 let document=await management('/chapters/'+c.id,'PUT',{revision:0,chapter:c});await management('/chapters/'+c.id+'/publish','POST',{revision:1});
 const action=(kind,id)=>play('/chapters/'+c.id+'/action','POST',{kind,id});await action('read','snow-ash-whitebranch');
 document.chapter.subtitle='尚未发布的内容';document=await management('/chapters/'+c.id,'PUT',{revision:1,chapter:document.chapter});
 await assert.rejects(management('/music-expansion','POST',{chapter:c.id,revision:1}),e=>e.status===409);
 await assert.rejects(api('/api/admin/linking/music-expansion','POST',{chapter:c.id,revision:2},player),e=>e.status===403);
 document=await management('/music-expansion','POST',{chapter:c.id,revision:2});assert.equal(document.revision,3);assert.equal(document.liveRevision,1);assert.equal(document.chapter.subtitle,'尚未发布的内容');assert.equal(document.chapter.archives[0].body,'管理员保留的原文');assert.deepEqual(document.chapter.archives[0].notes,['原有补记']);assert.equal(document.chapter.archives.length,2);
 assert.deepEqual((await play('/features')).effects,[]);assert.equal((await play('/chapters/'+c.id)).progress.read,1);await assert.rejects(action('read','snow-ash-resonance'),e=>e.status===404);
 await assert.rejects(management('/music-expansion','POST',{chapter:c.id,revision:3}),e=>e.status===409);
 await management('/chapters/'+c.id+'/publish','POST',{revision:3});assert.deepEqual((await play('/features')).effects,[]);
 await action('read','snow-ash-resonance');assert.deepEqual((await play('/features')).effects,['music-archive']);
 assert.deepEqual((await api('/api/linking/features','GET',undefined,other)).effects,[]);await assert.rejects(api('/api/linking/features'),e=>e.status===401);
 document.chapter.tasks.find(v=>v.id==='snow-ash-restore-audio').effect=undefined;await management('/chapters/'+c.id,'PUT',{revision:3,chapter:document.chapter});await management('/chapters/'+c.id+'/publish','POST',{revision:4});await management('/chapters/'+c.id+'/archive','POST',{revision:4});
 const {config}=await management('');await management('/config','PUT',{...config,enabled:false});assert.deepEqual((await play('/features')).effects,['music-archive'],'earned appearance remains available after effect removal, archive and activity maintenance');assert.deepEqual((await api('/api/linking/features','GET',undefined,other)).effects,[]);
});

test('admin appearance selection rejects unknown permissions and manual effects require approval',async t=>{
 const {management,play}=await isolated(t);
 const c={id:'music-review',title:'审核解锁',archives:[{id:'intro',title:'说明',body:'有效正文'}],tasks:[{id:'review',title:'聆听记录',type:'manual',effect:'room-host'},{id:'existing-read',title:'原有阅读',type:'read',archiveId:'intro'}]};
 await assert.rejects(management('/chapters/'+c.id,'PUT',{revision:0,chapter:c}),e=>e.status===400);
 c.tasks[0].effect='music-archive';await management('/chapters/'+c.id,'PUT',{revision:0,chapter:c});await management('/chapters/'+c.id+'/publish','POST',{revision:1});
 await play('/chapters/'+c.id+'/action','POST',{kind:'read',id:'intro'});const draft=await management('/chapters/'+c.id);draft.chapter.tasks[1].effect='music-archive';await management('/chapters/'+c.id,'PUT',{revision:1,chapter:draft.chapter});assert.deepEqual((await play('/features')).effects,[],'adding an effect to an already completed task in a draft cannot grant it');
 const submit=()=>play('/chapters/'+c.id+'/action','POST',{kind:'submit',id:'review',submission:'风声、门闩声与未能辨认的停顿。'});await submit();assert.deepEqual((await play('/features')).effects,[]);
 let submission=(await management('/submissions')).items[0];await management('/submissions/'+submission.id,'POST',{status:'rejected',updated:submission.updated,note:'请补充一条明确的观察'});assert.deepEqual((await play('/features')).effects,[]);
 await submit();submission=(await management('/submissions')).items[0];await management('/submissions/'+submission.id,'POST',{status:'approved',updated:submission.updated});assert.deepEqual((await play('/features')).effects,['music-archive']);await assert.rejects(management('/submissions/'+submission.id,'POST',{status:'approved',updated:submission.updated}),e=>e.status===409);assert.deepEqual((await play('/features')).effects,['music-archive']);
});

test('signal continuation only appends to an existing resonance draft and needs both prior achievements',async t=>{
 const {api,player,other,management,play}=await isolated(t);
 const c={id:'existing-resonance',title:'既有回声记录',archives:[{id:'snow-ash-resonance',title:'管理员的回声归档',body:'已存在的声音记录',notes:['不要覆盖这条批注']}],tasks:[{id:'snow-ash-restore-audio',title:'已有声音任务',type:'read',archiveId:'snow-ash-resonance',effect:'music-archive'},{id:'snow-ash-field-note',title:'观察札记',type:'manual'}]};
 let document=await management('/chapters/'+c.id,'PUT',{revision:0,chapter:c});await management('/chapters/'+c.id+'/publish','POST',{revision:1});
 const action=(kind,id,extra={})=>play('/chapters/'+c.id+'/action','POST',{kind,id,...extra});await action('read','snow-ash-resonance');assert.deepEqual((await play('/features')).effects,['music-archive']);
 document.chapter.subtitle='管理员尚未发布的路线想法';document=await management('/chapters/'+c.id,'PUT',{revision:1,chapter:document.chapter});
 await assert.rejects(management('/signal-expansion','POST',{chapter:c.id,revision:1}),e=>e.status===409);await assert.rejects(api('/api/admin/linking/signal-expansion','POST',{chapter:c.id,revision:2},player),e=>e.status===403);
 document=await management('/signal-expansion','POST',{chapter:c.id,revision:2});assert.equal(document.revision,3);assert.equal(document.liveRevision,1);assert.equal(document.chapter.subtitle,'管理员尚未发布的路线想法');assert.equal(document.chapter.archives[0].body,'已存在的声音记录');assert.deepEqual(document.chapter.archives[0].notes,['不要覆盖这条批注']);assert.equal(document.chapter.archives.length,2);assert.deepEqual(document.chapter.archives[1].requires,['snow-ash-restore-audio','snow-ash-field-note']);
 assert.deepEqual((await play('/features')).effects,['music-archive']);assert.equal((await play('/chapters/'+c.id)).archives.length,1);await assert.rejects(action('read','snow-ash-return-signal'),e=>e.status===404);await assert.rejects(management('/signal-expansion','POST',{chapter:c.id,revision:3}),e=>e.status===409);
 await management('/chapters/'+c.id+'/publish','POST',{revision:3});await assert.rejects(action('read','snow-ash-return-signal'),e=>e.status===403);
 await action('submit','snow-ash-field-note',{submission:'记录三次轻响，但不判断发出声音的人是谁。'});const submission=(await management('/submissions')).items[0];await management('/submissions/'+submission.id,'POST',{status:'approved',updated:submission.updated});
 assert.deepEqual((await play('/features')).effects,['music-archive']);const view=await action('read','snow-ash-return-signal');assert.equal(view.progress.read,2);assert.deepEqual((await play('/features')).effects,['archive-signal','music-archive']);assert.deepEqual((await api('/api/linking/features','GET',undefined,other)).effects,[]);
});

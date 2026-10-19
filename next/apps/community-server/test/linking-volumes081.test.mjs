import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createCommunity} from '../src/server.mjs';
import {validateChapter} from '../src/linking.mjs';
import {createStoryVolumes081,volume081Items} from '../src/linking-volumes081.mjs';

async function isolated(t){
  const data=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-linking-volumes081-'));
  const service=createCommunity({data,adminIDs:['admin081'],exchange:async input=>({selectedProfile:{id:input.accessToken,name:input.accessToken},accessToken:input.accessToken})});
  await new Promise(resolve=>service.server.listen(0,'127.0.0.1',resolve));
  const db=new DatabaseSync(path.join(data,'community.sqlite'));
  t.after(async()=>{db.close();await service.close();await fs.rm(data,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+service.server.address().port;
  async function api(route,method='GET',body,token){
    const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const v=await r.json();if(!r.ok)throw Object.assign(Error(v.error),{status:r.status});return v;
  }
  const admin=(await api('/api/session','POST',{accessToken:'admin081'})).token,player=(await api('/api/session','POST',{accessToken:'player081'})).token;
  return {api,db,admin,player,data,management:(p,m='GET',b)=>api('/api/admin/linking'+p,m,b,admin),play:(p,m='GET',b)=>api('/api/linking'+p,m,b,player)};
}
const chapter=(id,prerequisites)=>({id,title:id,prerequisites,archives:[{id:'record',title:'记录',body:'必须锁住的正文',notes:['必须锁住的补记']}],tasks:[{id:'finish',title:'读完',type:'read',archiveId:'record',effect:'music-archive'}]});
const save=(management,c,revision=0)=>management('/chapters/'+c.id,'PUT',{revision,chapter:c});
const publish=(management,id,revision=1)=>management('/chapters/'+id+'/publish','POST',{revision});

test('chapter prerequisites are bounded and publishing protects the external graph',async t=>{
  const {management,db,play}=await isolated(t);
  assert.throws(()=>validateChapter(chapter('self',[{chapter:'self',task:'finish'}])),/其他章节/);
  assert.throws(()=>validateChapter(chapter('many',Array.from({length:17},(_,i)=>({chapter:'dep-'+i,task:'finish'})))),/16/);
  assert.throws(()=>validateChapter(chapter('duplicate',[{chapter:'parent',task:'finish'},{chapter:'parent',task:'finish'}])),/重复/);
  const parent=chapter('parent'),child=chapter('child',[{chapter:'parent',task:'finish'}]);
  await save(management,child);await assert.rejects(publish(management,'child'),e=>e.status===409&&/前置章节/.test(e.message));
  await save(management,parent);await publish(management,'parent');await publish(management,'child');
  await assert.rejects(save(management,{...child,prerequisites:[]},1),e=>e.status===409);
  await assert.rejects(management('/chapters/parent/archive','POST',{revision:1}),e=>e.status===409);
  await save(management,{...parent,tasks:[]},1);await assert.rejects(publish(management,'parent',2),e=>e.status===409&&/前置任务/.test(e.message));
  const missing=chapter('missing-task',[{chapter:'parent',task:'absent'}]);await save(management,missing);await assert.rejects(publish(management,missing.id),e=>e.status===409);
  // A historical/corrupt live graph must fail closed rather than recurse forever.
  const cycleA=chapter('cycle-a',[{chapter:'cycle-b',task:'finish'}]),cycleB=chapter('cycle-b',[{chapter:'cycle-a',task:'finish'}]);
  await save(management,cycleA);await save(management,cycleB);
  db.prepare('UPDATE linking_chapters SET live=draft,live_revision=1 WHERE id=?').run('cycle-b');
  await assert.rejects(publish(management,'cycle-a'),/跨章循环/);
  db.prepare('UPDATE linking_chapters SET live=draft,live_revision=1 WHERE id=?').run('cycle-a');
  assert.equal((await play('/catalog')).chapters.find(c=>c.id==='cycle-a').locked,true);
  await assert.rejects(play('/chapters/cycle-a'),e=>e.status===403);
});

test('locked chapter reads and every action fail closed; catalog and admin previews never grant',async t=>{
  const {api,db,management,play,data}=await isolated(t);
  const parent=chapter('parent'),child=chapter('child',[{chapter:'parent',task:'finish'}]);
  child.tasks.push({id:'secret-code',title:'口令任务',type:'code',answer:'绝不能泄露的口令'});
  await save(management,parent);await publish(management,parent.id);await save(management,child);await publish(management,child.id);
  // Previously persisted child progress cannot bypass its current external gate.
  db.prepare('INSERT INTO linking_progress VALUES(?,?,?,?,?)').run('player081','child','read','record',Date.now());
  const catalog=await play('/catalog'),entry=catalog.chapters.find(c=>c.id==='child');assert.equal(entry.locked,true);assert.equal(entry.completed,0);assert.deepEqual(entry.prerequisites,[{chapter:'parent',task:'finish',completed:false}]);
  assert.equal(JSON.stringify(catalog).includes('必须锁住'),false);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM linking_effects').get().n,0);
  await assert.rejects(play('/chapters/child'),e=>e.status===403);
  for(const input of [{kind:'read',id:'record'},{kind:'bookmark',id:'record',value:true},{kind:'submit',id:'secret-code',answer:'绝不能泄露的口令'},{kind:'claim',id:'finish'}])await assert.rejects(play('/chapters/child/action','POST',input),e=>e.status===403);
  assert.deepEqual((await play('/features')).effects,[]);
  const draft=await management('/chapters/child');assert.equal(draft.chapter.archives[0].body,'必须锁住的正文');assert.equal(JSON.stringify(draft).includes('绝不能泄露的口令'),false);assert.equal(JSON.stringify(draft).includes('answerHash'),false);
  const password=(await fs.readFile(path.join(data,'初始管理员密码.txt'),'utf8')).match(/初始密码：([^\n]+)/)[1].trim();
  const consoleToken=(await api('/api/admin/login','POST',{username:'admin',password})).token;
  await api('/api/admin/linking/chapters/parent','GET',undefined,consoleToken);await api('/api/linking/chapters/parent','GET',undefined,consoleToken);
  await assert.rejects(api('/api/linking/chapters/parent/action','POST',{kind:'read',id:'record'},consoleToken),e=>e.status===403);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM linking_progress WHERE uid='@console'").get().n,0);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM linking_effects WHERE uid='@console'").get().n,0);
  await play('/chapters/parent/action','POST',{kind:'read',id:'record'});assert.equal((await play('/catalog')).chapters.find(c=>c.id==='child').locked,false);
  const unlocked=await play('/chapters/child');assert.equal(unlocked.archives[0].body,'必须锁住的正文');assert.equal(JSON.stringify(unlocked).includes('answerHash'),false);assert.equal(JSON.stringify(unlocked).includes('绝不能泄露的口令'),false);
});

test('approval in a prerequisite chapter unlocks the next chapter without granting its effects',async t=>{
  const {management,play}=await isolated(t),parent=chapter('review-parent'),child=chapter('review-child',[{chapter:'review-parent',task:'finish'}]);
  parent.tasks=[{id:'finish',title:'观察札记',type:'manual'}];child.tasks[0].effect='archive-signal';
  await save(management,parent);await publish(management,parent.id);await save(management,child);await publish(management,child.id);
  await play('/chapters/review-parent/action','POST',{kind:'submit',id:'finish',submission:'只记录可以观察的声音，不推断说话者的身份。'});
  await assert.rejects(play('/chapters/review-child'),e=>e.status===403);assert.deepEqual((await play('/features')).effects,[]);
  const submission=(await management('/submissions')).items[0];await management('/submissions/'+submission.id,'POST',{status:'approved',updated:submission.updated});
  assert.equal((await play('/catalog')).chapters.find(c=>c.id===child.id).locked,false);assert.deepEqual((await play('/features')).effects,[]);
  await play('/chapters/review-child/action','POST',{kind:'read',id:'record'});assert.deepEqual((await play('/features')).effects,['archive-signal']);
});

test('two volumes import atomically with source CAS, preserve the opening, and remain drafts',async t=>{
  const {api,db,player,management,play}=await isolated(t),opening=chapter('opening');
  await save(management,opening);await publish(management,opening.id);
  await assert.rejects(management('/volumes-expansion','POST',{chapter:opening.id,revision:1}),e=>e.status===400&&/归途灯标/.test(e.message));
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM linking_chapters WHERE id LIKE 'linking-volume-%'").get().n,0);
  opening.tasks[0].id='snow-ash-light-signal';let draft=await save(management,opening,1);const before=JSON.stringify(draft.chapter);
  await assert.rejects(api('/api/admin/linking/volumes-expansion','POST',{chapter:opening.id,revision:2},player),e=>e.status===403);
  const results=await Promise.allSettled(Array.from({length:2},()=>management('/volumes-expansion','POST',{chapter:opening.id,revision:2})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  const imported=results.find(r=>r.status==='fulfilled').value;assert.deepEqual(imported.chapterIds,['linking-volume-01','linking-volume-02']);assert.equal(imported.openingRevision,3);
  assert.equal(JSON.stringify((await management('/chapters/opening')).chapter),before);
  assert.equal((await play('/chapters/opening')).tasks[0].id,'finish','import does not publish opening edits');assert.equal((await play('/catalog')).chapters.some(c=>c.id.startsWith('linking-volume-')),false);
  for(const c of imported.chapters){assert.equal(c.revision,1);assert.equal(c.published,false);assert.equal(c.chapter.archives.length,12);assert.equal(JSON.stringify(c).includes('answerHash'),false);await assert.rejects(play('/chapters/'+c.id),e=>e.status===404);}
  await assert.rejects(management('/volumes-expansion','POST',{chapter:opening.id,revision:3}),e=>e.status===409&&/已存在/.test(e.message));
  assert.equal((await management('/chapters/opening')).revision,3);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM linking_audit WHERE action=?').get('create-story-volumes-081').n,2);
  for(const item of volume081Items){const row=db.prepare('SELECT kind,permission FROM inventory_items WHERE id=?').get(item.id);assert.equal(row.kind,'collectible');assert.equal(row.permission,'');}
  assert.equal((await management('')).volumeExpansion.available,true);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM linking_rewards').get().n,0);
  await assert.rejects(publish(management,'linking-volume-02'),e=>e.status===409);
  await assert.rejects(publish(management,'linking-volume-01'),e=>e.status===409&&/前置任务/.test(e.message));
});

test('an existing volume ID aborts the whole import, and concurrent draft writers lose CAS',async t=>{
  const {db,management}=await isolated(t),opening=chapter('opening');opening.tasks[0].id='snow-ash-light-signal';
  await save(management,opening);const existing=chapter('linking-volume-02');await save(management,existing);
  await assert.rejects(management('/volumes-expansion','POST',{chapter:'opening',revision:1}),e=>e.status===409);
  assert.equal(db.prepare('SELECT 1 FROM linking_chapters WHERE id=?').get('linking-volume-01'),undefined);assert.equal((await management('/chapters/opening')).revision,1);
  assert.equal((await management('/chapters/linking-volume-02')).chapter.archives[0].body,'必须锁住的正文');
  for(const item of volume081Items)assert.equal(db.prepare('SELECT 1 FROM inventory_items WHERE id=?').get(item.id),undefined);
  const results=await Promise.allSettled([save(management,{...opening,subtitle:'编辑一'},1),save(management,{...opening,subtitle:'编辑二'},1)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);assert.equal((await management('/chapters/opening')).revision,2);
});

test('a conflicting permission item rolls back drafts, other items, audit and source CAS',async t=>{
  const {db,management}=await isolated(t),opening=chapter('opening');opening.tasks[0].id='snow-ash-light-signal';await save(management,opening);
  const conflict=volume081Items.at(-1),now=Date.now();db.prepare("INSERT INTO inventory_items VALUES(?,?,?,'','voucher','music.netease','days',1,0,1,?,?)").run(conflict.id,'原有权限道具','不应覆盖',now,now);
  await assert.rejects(management('/volumes-expansion','POST',{chapter:'opening',revision:1}),e=>e.status===409&&/权限道具冲突/.test(e.message));
  assert.equal((await management('/chapters/opening')).revision,1);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM linking_chapters WHERE id LIKE 'linking-volume-%'").get().n,0);
  for(const item of volume081Items.slice(0,-1))assert.equal(db.prepare('SELECT 1 FROM inventory_items WHERE id=?').get(item.id),undefined);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM linking_audit WHERE action='create-story-volumes-081'").get().n,0);assert.equal(db.prepare('SELECT title FROM inventory_items WHERE id=?').get(conflict.id).title,'原有权限道具');
});

test('both published volumes complete in order; reward claims remain idempotent without points or permissions',async t=>{
  const {api,db,player,management,play}=await isolated(t),opening=chapter('opening');opening.tasks[0].id='snow-ash-light-signal';
  await save(management,opening);await publish(management,opening.id);await management('/volumes-expansion','POST',{chapter:opening.id,revision:1});
  await publish(management,'linking-volume-01');await publish(management,'linking-volume-02');
  await assert.rejects(play('/chapters/linking-volume-01'),e=>e.status===403);await play('/chapters/opening/action','POST',{kind:'read',id:'record'});
  await assert.rejects(play('/chapters/linking-volume-02'),e=>e.status===403);
  const authored=createStoryVolumes081({openingChapter:'opening'});let claimCount=0;
  for(const c of authored){
    let view=await play('/chapters/'+c.id),turns=0;
    while(view.progress.completed<view.progress.tasks){
      assert.ok(turns++<100,'story must have a reachable ending');
      const archive=view.archives.find(a=>a.unlocked&&!a.readAt);
      if(archive){view=await play('/chapters/'+c.id+'/action','POST',{kind:'read',id:archive.id});continue;}
      const task=view.tasks.find(v=>v.available&&!v.completed&&['code','manual'].includes(v.type));assert.ok(task,'all unresolved tasks should be reachable');
      if(task.type==='code'){const answer=c.tasks.find(v=>v.id===task.id).answer;view=await play('/chapters/'+c.id+'/action','POST',{kind:'submit',id:task.id,answer});}
      else {
        await play('/chapters/'+c.id+'/action','POST',{kind:'submit',id:task.id,submission:'可核实的观察：影像、声音与纸面记录存在差别。尚待查证：差异的来源。'});
        await assert.rejects(play('/chapters/'+c.id+'/action','POST',{kind:'claim',id:task.id}),e=>e.status===403||e.status===400);
        const submission=(await management('/submissions')).items.find(v=>v.chapter===c.id&&v.task===task.id);await management('/submissions/'+submission.id,'POST',{status:'approved',updated:submission.updated});view=await play('/chapters/'+c.id);
      }
    }
    for(const task of view.tasks.filter(v=>v.reward)){await play('/chapters/'+c.id+'/action','POST',{kind:'claim',id:task.id});claimCount++;}
    const reward=view.tasks.find(v=>v.reward);if(reward)await Promise.all(Array.from({length:3},()=>play('/chapters/'+c.id+'/action','POST',{kind:'claim',id:reward.id})));
    assert.equal(view.progress.read,12);
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM linking_rewards').get().n,claimCount);const bag=await api('/api/inventory','GET',undefined,player);assert.equal(bag.mail.length,claimCount);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM points_ledger').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM permission_leases').get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM linking_effects WHERE chapter LIKE 'linking-volume-%'").get().n,0);
  const before=db.prepare('SELECT COUNT(*) AS n FROM linking_rewards').get().n;
  const draft=await management('/chapters/linking-volume-01');draft.chapter.subtitle='只改副标题';await save(management,draft.chapter,draft.revision);await publish(management,draft.chapter.id,draft.revision+1);
  const reward=draft.chapter.tasks.find(v=>v.reward);if(reward)await play('/chapters/linking-volume-01/action','POST',{kind:'claim',id:reward.id});assert.equal(db.prepare('SELECT COUNT(*) AS n FROM linking_rewards').get().n,before);
});

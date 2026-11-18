import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createCommunity} from '../src/server.mjs';
import {validateChapter} from '../src/linking.mjs';
import {createObserverChapter082,observer082Info,observer082Items} from '../src/linking-observer082.mjs';

async function isolated(t){
  const data=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-linking-observer082-'));
  const service=createCommunity({data,adminIDs:['admin082'],exchange:async input=>({selectedProfile:{id:input.accessToken,name:input.accessToken},accessToken:input.accessToken})});
  await new Promise(resolve=>service.server.listen(0,'127.0.0.1',resolve));
  const db=new DatabaseSync(path.join(data,'community.sqlite'));
  t.after(async()=>{db.close();await service.close();assert.equal(path.dirname(path.resolve(data)),path.resolve(os.tmpdir()));assert.ok(path.basename(data).startsWith('hxz-linking-observer082-'));await fs.rm(data,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+service.server.address().port;
  async function api(route,method='GET',body,token){
    const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const result=await r.json();if(!r.ok)throw Object.assign(Error(result.error),{status:r.status});return result;
  }
  const admin=(await api('/api/session','POST',{accessToken:'admin082'})).token;
  const player=(await api('/api/session','POST',{accessToken:'player082'})).token;
  return {api,db,admin,player,management:(p,m='GET',b)=>api('/api/admin/linking'+p,m,b,admin),play:(p,m='GET',b)=>api('/api/linking'+p,m,b,player)};
}
const source=()=>({id:observer082Info.sourceChapter,title:'第二卷 · 保留原稿',archives:[{id:'source-record',title:'北行路由归档',body:'第二卷已有正文，任何第三值夜导入不得改变。'}],tasks:[{id:observer082Info.sourceTask,title:'归档：迟到的北行信',type:'read',archiveId:'source-record'}]});
const save=(management,c,revision=0)=>management('/chapters/'+c.id,'PUT',{chapter:c,revision});
const publish=(management,id,revision=1)=>management('/chapters/'+id+'/publish','POST',{revision});
const prepare=(management,revision=1)=>management('/observer-expansion','POST',{chapter:observer082Info.sourceChapter,revision});
const observe=(play,kind,id,extra={})=>play('/chapters/'+observer082Info.id+'/action','POST',{kind,id,...extra});

test('observer chapter is self-contained, canonical boundaries are retained, and all answers appear before their gate',()=>{
  const template=createObserverChapter082(),validated=validateChapter(template);
  assert.equal(template.archives.length,7);assert.equal(template.tasks.length,10);
  assert.deepEqual(template.prerequisites,[{chapter:'linking-volume-02',task:'lv2-deliver-morning'}]);
  assert.deepEqual(template.tasks.filter(t=>t.reward).map(t=>t.reward.item),observer082Items.map(i=>i.id));
  assert.ok(template.tasks.every(t=>['read','code'].includes(t.type)&&!t.effect));
  for(const task of template.tasks.filter(t=>t.type==='code')){
    const read=template.tasks.find(t=>task.requires.includes(t.id)&&t.type==='read');
    const record=template.archives.find(a=>a.id===read.archiveId);assert.ok(record.body.includes(task.answer));
    assert.ok(validated.tasks.find(t=>t.id===task.id).answerHash);assert.equal(validated.tasks.find(t=>t.id===task.id).answer,undefined);
  }
  assert.equal(new Set(template.tasks.map(t=>t.id)).size,template.tasks.length);
  const playerText=template.archives.map(a=>a.body).join('\n');
  assert.doesNotMatch(playerText,/模拟世界|模拟器|操作者|虚拟世界|重置世界|sourceMap/);
  assert.match(playerText,/第四颗核心星片与水晶/);assert.match(playerText,/莉莉安的下落仍是需要继续寻找/);
  assert.match(playerText,/LINKING 留在这里/);assert.match(playerText,/不会为了等我们看懂而停下/);
});

test('creation requires published prerequisites and latest source CAS; retries preserve existing drafts, live text and progress',async t=>{
  const {api,db,player,management,play}=await isolated(t),original=source();
  await assert.rejects(prepare(management),e=>e.status===409);
  await save(management,original);await assert.rejects(prepare(management),e=>e.status===409);
  await publish(management,original.id);await play('/chapters/'+original.id+'/action','POST',{kind:'read',id:'source-record'});
  const edited=structuredClone(original);edited.archives[0].body+='\n作者尚未审阅的新段落。';edited.subtitle='未发布编辑必须保留';
  await save(management,edited,1);
  const before=db.prepare('SELECT * FROM linking_chapters WHERE id=?').get(original.id);
  await assert.rejects(prepare(management,1),e=>e.status===409);
  await assert.rejects(api('/api/admin/linking/observer-expansion','POST',{chapter:original.id,revision:2},player),e=>e.status===403);
  const prepared=await Promise.all([prepare(management,2),prepare(management,2)]);
  assert.equal(prepared.filter(v=>!v.alreadyExists).length,1);assert.equal(prepared.filter(v=>v.alreadyExists).length,1);
  assert.equal(prepared[0].revision,1);assert.equal(prepared[0].published,false);
  assert.deepEqual(db.prepare('SELECT * FROM linking_chapters WHERE id=?').get(original.id),before);
  assert.equal((await play('/chapters/'+original.id)).archives[0].body,original.archives[0].body);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM linking_progress WHERE uid=? AND chapter=?').get('player082',original.id).n,1);
  assert.equal((await play('/catalog')).chapters.some(c=>c.id===observer082Info.id),false);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM linking_audit WHERE action='create-observer-082'").get().n,1);
  const draft=await management('/chapters/'+observer082Info.id);draft.chapter.subtitle='管理员自己的新章批注';await save(management,draft.chapter,1);
  const retried=await prepare(management,1);assert.equal(retried.alreadyExists,true);assert.equal(retried.revision,2);assert.equal(retried.chapter.subtitle,'管理员自己的新章批注');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM linking_rewards').get().n,0);
});

test('every new task is playable without removed features; rewards are once-only and no permissions or appearance are granted',async t=>{
  const {api,db,player,management,play}=await isolated(t),original=source(),authored=createObserverChapter082();
  await save(management,original);await publish(management,original.id);await prepare(management);await publish(management,observer082Info.id);
  const locked=(await play('/catalog')).chapters.find(c=>c.id===observer082Info.id);assert.equal(locked.locked,true);
  await assert.rejects(play('/chapters/'+observer082Info.id),e=>e.status===403);
  await assert.rejects(observe(play,'read',authored.archives[0].id),e=>e.status===403);
  await play('/chapters/'+original.id+'/action','POST',{kind:'read',id:'source-record'});
  let view=await play('/chapters/'+observer082Info.id),turns=0;
  assert.equal(view.archives[1].body,undefined);
  await assert.rejects(observe(play,'read',authored.archives.at(-1).id),e=>e.status===403);
  await assert.rejects(observe(play,'claim',observer082Info.finalTask),e=>e.status===403);
  while(view.progress.completed<view.progress.tasks){
    assert.ok(turns++<20,'must reach ending without outside tools or manual review');
    const archive=view.archives.find(a=>a.unlocked&&!a.readAt);
    if(archive){view=await observe(play,'read',archive.id);continue;}
    const task=view.tasks.find(t=>t.available&&!t.completed&&t.type==='code');assert.ok(task);
    assert.equal(task.answer,undefined);assert.equal(task.answerHash,undefined);
    const expected=authored.tasks.find(t=>t.id===task.id).answer;
    await assert.rejects(observe(play,'submit',task.id,{answer:'不是答案'}),e=>e.status===400);
    view=await observe(play,'submit',task.id,{answer:expected});
  }
  assert.equal(view.progress.read,7);assert.equal(view.progress.completed,10);
  for(const task of view.tasks.filter(t=>t.reward))await Promise.all(Array.from({length:3},()=>observe(play,'claim',task.id)));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM linking_rewards').get().n,2);
  const bag=await api('/api/inventory','GET',undefined,player);assert.equal(bag.mail.length,2);
  for(const mail of bag.mail)await api('/api/inventory/claim','POST',{id:mail.id},player);
  assert.deepEqual((await api('/api/inventory','GET',undefined,player)).items.map(i=>[i.id,i.quantity]).sort(),observer082Items.map(i=>[i.id,1]).sort());
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM points_ledger').get().n,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM permission_leases').get().n,0);
  assert.deepEqual((await play('/features')).effects,[]);
  const updated=await management('/chapters/'+observer082Info.id);updated.chapter.subtitle='发布后校对副标题';await save(management,updated.chapter,1);await publish(management,observer082Info.id,2);
  assert.equal((await play('/chapters/'+observer082Info.id)).progress.completed,10);
  await observe(play,'claim',observer082Info.finalTask);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM linking_rewards').get().n,2);
});

test('admin can inspect exact published content separately from drafts without exposing answers or mutating revisions',async t=>{
  const {api,player,management,play}=await isolated(t),original=source();
  original.tasks.push({id:'kept-code',title:'旧校核',type:'code',answer:'不公开的答案'});
  await save(management,original);await publish(management,original.id);
  const edited=structuredClone(original);edited.archives[0].body='尚未审阅的草稿文本';await save(management,edited,1);
  const before=await management('/chapters/'+original.id),published=await management('/chapters/'+original.id+'/published');
  assert.equal(published.revision,1);assert.equal(published.draftRevision,2);assert.equal(published.chapter.archives[0].body,original.archives[0].body);
  assert.doesNotMatch(JSON.stringify(published),/不公开的答案|answerHash/);assert.equal(published.chapter.tasks[1].answerConfigured,true);
  assert.deepEqual(await management('/chapters/'+original.id),before);
  await assert.rejects(api('/api/admin/linking/chapters/'+original.id+'/published','GET',undefined,player),e=>e.status===403);
  await assert.rejects(management('/chapters/'+original.id+'/published','POST',{revision:2}),e=>e.status===404);
  assert.equal((await play('/chapters/'+original.id)).archives[0].body,original.archives[0].body);
});

test('closed source and permission-item collisions fail safely, and published observer dependencies cannot be removed',async t=>{
  const {db,management}=await isolated(t),original=source();
  original.closesAt='2020-01-01T00:00:00Z';await save(management,original);await publish(management,original.id);
  await assert.rejects(prepare(management),e=>e.status===409&&/已结束/.test(e.message));
  delete original.closesAt;await save(management,original,1);await publish(management,original.id,2);
  const item=observer082Items[1],now=Date.now();
  db.prepare("INSERT INTO inventory_items VALUES(?,?,?,'','permission','room-host','days',3,0,1,?,?)").run(item.id,item.title,'不应被覆盖的权限商品',now,now);
  await assert.rejects(prepare(management,2),e=>e.status===409&&/纪念物/.test(e.message));
  assert.equal(db.prepare('SELECT 1 FROM linking_chapters WHERE id=?').get(observer082Info.id),undefined);
  assert.equal(db.prepare('SELECT 1 FROM inventory_items WHERE id=?').get(observer082Items[0].id),undefined,'transaction rolls back earlier insert');
  assert.equal(db.prepare('SELECT permission FROM inventory_items WHERE id=?').get(item.id).permission,'room-host');
  db.prepare('DELETE FROM inventory_items WHERE id=?').run(item.id);
  await prepare(management,2);await publish(management,observer082Info.id);
  await assert.rejects(management('/chapters/'+original.id+'/archive','POST',{revision:2}),e=>e.status===409);
  await save(management,{...original,tasks:[]},2);await assert.rejects(publish(management,original.id,3),e=>e.status===409);
  const current=await management('/chapters/'+observer082Info.id);current.chapter.prerequisites=[];
  await assert.rejects(save(management,current.chapter,1),e=>e.status===409);
});

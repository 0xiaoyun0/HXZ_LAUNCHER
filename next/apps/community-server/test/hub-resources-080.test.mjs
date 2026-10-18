import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture} from './helpers/hub.mjs';
import {knowledgePackage} from '../../../packages/hub/knowledge-cache.mjs';

test('assigned members update only their progress; deleted tasks stay deleted and history is permissioned',async t=>{
 const {req}=await fixture(t),project=await req('alice','/api/hub/records','POST',{kind:'project',title:'共同建设',body:'计划',status:'review',visibility:'private',revision:0,data:{}}),p='/api/hub/records/'+project.id;
 await req('alice',p+'/members','POST',{uid:'bob',role:'member'});await req('bob',p+'/join','POST',{});
 let value=await req('alice',p+'/tasks','POST',{id:'material',revision:0,title:'石砖',quantity:64,done:0,assignee:'bob'});
 value=await req('bob',p+'/tasks','POST',{id:'material',revision:1,title:'被替换的标题',quantity:1,done:32,assignee:'eve'});
 assert.equal(value.tasks[0].title,'石砖');assert.equal(value.tasks[0].quantity,64);assert.equal(value.tasks[0].assignee,'bob');assert.equal(value.tasks[0].done,32);
 await req('bob',p+'/tasks','POST',{id:'material',revision:2,deleted:true},403);
 await req('bob',p+'/tasks','POST',{id:'new-task',revision:0,title:'没有权限',quantity:1,done:0},403);
 await req('bob',p+'/project-history','GET',undefined,403);
 value=await req('alice',p+'/tasks','POST',{id:'material',revision:2,deleted:true});assert.equal(value.tasks.length,0);
 await req('alice',p+'/tasks','POST',{id:'material',revision:3,title:'复活旧任务',quantity:1,done:0},409);
 const history=await req('alice',p+'/project-history');assert.equal(history.items.length,3);assert.ok(history.items[0].description.includes('移除任务'));
});

test('offline knowledge exports are public, server-filtered, bounded and independently readable',async t=>{
 const {req,db}=await fixture(t);
 const make=(title,status='review',visibility='community')=>({kind:'article',title,body:'正确的版本与操作说明',summary:'说明',data:{server:'mod-1',version:'1.21.1'},status,visibility,revision:0});
 const article=await req('admin','/api/hub/records','POST',make('公开资料'));
 await req('admin','/api/hub/records','POST',make('未公开的草稿','draft'));
 await req('admin','/api/hub/records','POST',make('私密资料','review','private'));
 await req('alice','/api/hub/records','POST',make('尚未审核的投稿'));
 const insert=db.prepare('INSERT INTO hub_records SELECT ?,kind,owner,title,summary,body,data,tags,images,visibility,status,revision,created,updated FROM hub_records WHERE id=?');
 for(let i=0;i<42;i++)insert.run('copy-'+i,article.id);
 const first=await req('bob','/api/hub/knowledge/export?server=mod-1&offset=0');assert.equal(first.items.length,40);assert.equal(first.total,43);assert.equal(first.hasMore,true);assert.ok(first.items.every(v=>v.title==='公开资料'));
 const second=await req('bob','/api/hub/knowledge/export?server=mod-1&offset=40');assert.equal(second.items.length,3);assert.equal(second.hasMore,false);assert.ok(!first.items.some(a=>second.items.some(b=>a.id===b.id)));
 assert.equal((await req('bob','/api/hub/knowledge/export?server=survival')).items.length,0);
 const pack=knowledgePackage({...first,items:[...first.items,...second.items]});assert.equal(pack.items.length,43);assert.equal(pack.items[0].data.version,'1.21.1');
 assert.throws(()=>knowledgePackage({...first,items:[first.items[0],first.items[0]]}),/无效/);
 await req('bob','/api/hub/knowledge/export?offset=-1','GET',undefined,400);
});

test('activities gate publishing, reject stale edits, bound capacity and accept one vote per member',async t=>{
 const {req}=await fixture(t);
 const make={kind:'event',revision:0,title:'周末建筑赛',body:'完成站台',status:'review',visibility:'community',data:{starts:Date.now()+60000,ends:Date.now()+3600000,capacity:1}};
 let event=await req('alice','/api/hub/records','POST',make);
 assert.equal(event.status,'review');await req('bob','/api/hub/records/'+event.id,'GET',undefined,404);
 await req('alice','/api/hub/records/'+event.id+'/review','POST',{revision:1,status:'published'},403);
 event=await req('admin','/api/hub/records/'+event.id+'/review','POST',{revision:1,status:'published'});
 await req('bob','/api/hub/records/'+event.id+'/join','POST',{});await req('bob','/api/hub/records/'+event.id+'/join','POST',{});
 await req('eve','/api/hub/records/'+event.id+'/join','POST',{},409);
 await req('bob','/api/hub/records/'+event.id+'/result','POST',{uid:'bob',score:999},403);
 await req('alice','/api/hub/records/'+event.id+'/result','POST',{uid:'bob',score:5,note:'完成'});
 assert.equal((await req('bob','/api/hub/records/'+event.id)).results[0].score,5);
 await req('alice','/api/hub/records/'+event.id,'PUT',{...make,revision:0},409);
 let proposal=await req('admin','/api/hub/records','POST',{kind:'proposal',revision:0,title:'活动时间',body:'选择时间',status:'review',data:{choices:'周六\n周日',ends:Date.now()+3600000}});
 await req('bob','/api/hub/records/'+proposal.id+'/vote','POST',{choice:0});await req('bob','/api/hub/records/'+proposal.id+'/vote','POST',{choice:1});
 proposal=await req('alice','/api/hub/records/'+proposal.id);assert.deepEqual(proposal.votes,[{choice:1,count:1}]);
 await req('admin','/api/hub/records/'+proposal.id,'PUT',{...proposal,data:{choices:'周一\n周二',ends:Date.now()+3600000},status:'review'},409);
});

test('private collaboration supports explicit invitation acceptance and detects concurrent task changes',async t=>{
 const {req}=await fixture(t);
 const project=await req('alice','/api/hub/records','POST',{kind:'project',revision:0,title:'秘密车站',body:'项目计划',visibility:'private',status:'review',data:{}}),p='/api/hub/records/'+project.id;
 await req('eve',p,'GET',undefined,404);
 await req('alice',p+'/members','POST',{uid:'bob',role:'editor'});
 await req('bob',p+'/join','POST',{});
 let value=await req('bob',p+'/tasks','POST',{title:'收集木材',quantity:64,done:0,revision:0,assignee:'bob'});
 const task=value.tasks[0];await req('bob',p+'/tasks','POST',{...task,done:32});
 await req('alice',p+'/tasks','POST',{...task,done:64},409);
 value=await req('bob',p+'/canvas','POST',{id:'note-one',revision:0,value:{text:'车站位置',x:100,y:200,color:'blue'}});
 assert.equal(value.canvas.length,1);
 await req('alice',p+'/members','POST',{uid:'bob',action:'remove'});
 await req('bob',p+'/canvas','POST',{id:'note-one',revision:1,value:{text:'无权限',x:100,y:200,color:'blue'}},404);
});

test('knowledge citations exclude drafts; branching stories validate edges and persist progress',async t=>{
 const {req}=await fixture(t);
 await req('alice','/api/hub/records','POST',{kind:'article',revision:0,title:'不会公开的密钥',body:'个人内容',status:'draft',data:{}});
 const article=await req('admin','/api/hub/records','POST',{kind:'article',revision:0,title:'火车建造指南',body:'先准备铁轨，再铺设站台。',status:'review',data:{server:'mod-1',version:'1.21.1'}});
 const result=await req('bob','/api/hub/knowledge?q='+encodeURIComponent('火车'));assert.equal(result.sources[0].id,article.id);
 assert.equal((await req('bob','/api/hub/knowledge/export')).items.length,1);
 const nodes=[{id:'start',text:'从哪里出发？',choices:[{label:'去车站',to:'end'}]},{id:'end',text:'抵达车站',choices:[]}];
 const story=await req('admin','/api/hub/records','POST',{kind:'story',revision:0,title:'车站故事',body:'小故事',status:'review',data:{nodes:JSON.stringify(nodes)}});
 const before=await req('bob','/api/hub/records/'+story.id);assert.equal(before.data.nodes.length,1);assert.equal(before.progress.node,'start');
 const after=await req('bob','/api/hub/records/'+story.id+'/play','POST',{choice:0});assert.equal(after.progress.node,'end');
 await req('bob','/api/hub/records/'+story.id+'/play','POST',{choice:0},400);
 assert.equal((await req('bob','/api/hub/records/'+story.id+'/play','POST',{restart:true})).progress.node,'start');
 await req('admin','/api/hub/records','POST',{kind:'story',revision:0,title:'坏故事',status:'draft',data:{nodes:JSON.stringify([{id:'start',text:'错误',choices:[{label:'不存在',to:'missing'}]}])}},400);
});

test('retrying content creation is idempotent; deleted canvas notes reject stale recreation',async t=>{
 const {req}=await fixture(t),make={requestId:randomUUID(),kind:'project',revision:0,title:'协作空间',status:'review',data:{}};
 const project=await req('alice','/api/hub/records','POST',make),again=await req('alice','/api/hub/records','POST',make);
 assert.equal(again.id,project.id);
 const p='/api/hub/records/'+project.id;
 await req('alice',p+'/canvas','POST',{id:'note',revision:0,value:{text:'A',x:0,y:0,color:'blue'}});
 assert.equal((await req('alice',p+'/canvas','POST',{id:'note',revision:1,deleted:true})).canvas.length,0);
 await req('alice',p+'/canvas','POST',{id:'note',revision:0,value:{text:'旧会话',x:0,y:0,color:'blue'}},409);
 await req('alice',p+'/canvas','POST',{id:'note',revision:2,value:{text:'不能复活',x:0,y:0,color:'blue'}},409);
});

test('project collaborators can retain existing images but cannot attach unrelated private uploads',async t=>{
 const {req}=await fixture(t),image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=';
 const media=await req('alice','/api/media/upload','POST',{scope:'hub',image},201);
 const project=await req('alice','/api/hub/records','POST',{kind:'project',revision:0,title:'图片协作',status:'review',visibility:'private',images:[media.url],data:{}}),p='/api/hub/records/'+project.id;
 await req('alice',p+'/members','POST',{uid:'bob',role:'editor'});await req('bob',p+'/join','POST',{});
 const value=await req('bob',p,'PUT',{...project,status:'review',title:'保留原图'});assert.deepEqual(value.images,[media.url]);
 await req('eve','/api/hub/records','POST',{kind:'project',revision:0,title:'偷用图片',data:{},images:[media.url]},400);
});
test('project outcomes reference reviewed public works, stay idempotent and cannot be recreated after removal',async t=>{
 const {req}=await fixture(t),project=await req('admin','/api/hub/records','POST',{kind:'project',title:'协作车站',revision:0,status:'review',data:{}}),work=await req('admin','/api/hub/records','POST',{kind:'work',title:'完成的车站',revision:0,status:'review',data:{category:'build'}}),draft=await req('admin','/api/hub/records','POST',{kind:'work',title:'草稿',revision:0,status:'draft',data:{category:'build'}}),p='/api/hub/records/'+project.id;
 const body={id:'outcome-test',work:work.id,title:'第一阶段完工',note:'站台已交付'};await req('alice',p+'/outcome','POST',body,403);await req('admin',p+'/outcome','POST',{...body,work:draft.id},409);
 let v=await req('admin',p+'/outcome','POST',body);assert.equal(v.outcomes.length,1);v=await req('admin',p+'/outcome','POST',body);assert.equal(v.outcomes.length,1);
 await req('admin','/api/hub/records/'+work.id,'DELETE');assert.equal((await req('alice',p)).outcomes[0].available,0);
 await req('admin',p+'/outcome','POST',{id:body.id,remove:true});await req('admin',p+'/outcome','POST',body,409);assert.equal((await req('admin',p)).outcomes.length,0);
});
test('knowledge search finds body text with exact server and partial version filters, without leaking drafts',async t=>{
 const {req}=await fixture(t);for(const [title,status,server] of [['原版指南','review','survival'],['模组指南','review','mod-1'],['秘密草稿','draft','mod-1']])await req('admin','/api/hub/records','POST',{kind:'article',revision:0,title,status,body:'这篇正文介绍星轨站台搭建。',data:{server,version:'1.21.1'}});
 const query='/api/hub/records?kind=article&q='+encodeURIComponent('星轨站台')+'&server=mod-1&version=1.21';const value=await req('alice',query);assert.equal(value.total,1);assert.equal(value.items[0].title,'模组指南');assert.equal((await req('alice',query+'&scope=mine')).total,0);assert.equal((await req('alice',query.replace('version=1.21','version=26.2'))).total,0);
});

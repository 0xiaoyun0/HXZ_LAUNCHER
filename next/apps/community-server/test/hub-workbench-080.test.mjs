import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './helpers/hub.mjs';
test('admin workbench combines real queues and removes processed items without exposing them to players',async t=>{
 const {req}=await fixture(t),content=await req('alice','/api/hub/records','POST',{kind:'article',revision:0,title:'蒸汽动力指南',body:'待审正文不可泄露到聚合列表',status:'review',data:{server:'mod-1',version:'1.21.1'}});
 const feedback=await req('bob','/api/feedback','POST',{category:'launcher',title:'下载任务无法继续',body:'希望检查日志中的传输步骤',report:'secret-log'},201);
 await req('alice','/api/hub/workbench','GET',undefined,403);let overview=await req('admin','/api/hub/workbench');assert.equal(overview.counts.content,1);assert.equal(overview.counts.feedback,1);assert.equal(overview.total,2);assert.ok(!JSON.stringify(overview).includes('secret-log'));assert.ok(!JSON.stringify(overview).includes('待审正文'));
 assert.equal((await req('admin','/api/hub/workbench?category=content&q=%E5%8A%A8%E5%8A%9B')).total,1);
 await req('admin','/api/hub/records/'+content.id+'/review','POST',{revision:1,status:'published'});await req('admin','/api/feedback/'+feedback.id,'POST',{status:'resolved',body:'已处理'});
 overview=await req('admin','/api/hub/workbench');assert.equal(overview.total,0);assert.equal(overview.stats.publishedWeek,1);assert.ok(overview.audit.some(a=>a.action==='review:published'));
 await req('admin','/api/hub/workbench?category=invalid','GET',undefined,400);await req('admin','/api/hub/workbench?offset=-1','GET',undefined,400);
});

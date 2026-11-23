import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './helpers/hub.mjs';
test('personal desk reflects the original workflows and never reveals another member drafts or private requests',async t=>{
 const {req}=await fixture(t);
 const article=await req('alice','/api/hub/records','POST',{kind:'article',title:'待修改指南',body:'草稿正文',revision:0,status:'draft',data:{}});
 await req('bob','/api/hub/records','POST',{kind:'appeal',title:'他人私密申诉',body:'保密',revision:0,status:'review',data:{}});
 await req('bob','/api/hub/friends','POST',{uid:'alice',action:'request'});
 let desk=await req('alice','/api/hub/desk');assert.equal(desk.total,2);assert.ok(desk.items.some(v=>v.record===article.id));assert.ok(!JSON.stringify(desk).includes('草稿正文'));assert.ok(!JSON.stringify(desk).includes('保密'));
 assert.equal((await req('admin','/api/hub/desk')).total,0);
 await req('alice','/api/hub/friends','POST',{uid:'bob',action:'accept'});
 await req('alice','/api/hub/records/'+article.id,'PUT',{kind:'article',title:'待修改指南',body:'正文',revision:1,status:'review',data:{}});
 desk=await req('alice','/api/hub/desk?category=waiting');assert.equal(desk.counts.action,0);assert.equal(desk.total,1);
 await req('admin','/api/hub/records/'+article.id+'/review','POST',{revision:2,status:'published'});
 assert.equal((await req('alice','/api/hub/desk?category=done')).items[0].record,article.id);
 await req('alice','/api/hub/desk?category=anything','GET',undefined,400);await req('alice','/api/hub/desk?offset=-1','GET',undefined,400);
});

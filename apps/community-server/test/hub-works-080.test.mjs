import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './helpers/hub.mjs';
test('reviewed works have an idempotent forum discussion with normal replies and private/hidden boundaries',async t=>{
 const {req,db}=await fixture(t),work=await req('alice','/api/hub/records','POST',{kind:'work',title:'白石车站',revision:0,status:'review',data:{category:'build'}}),p='/api/hub/records/'+work.id;
 await req('alice',p+'/discussion','POST',{},409);await req('admin',p+'/review','POST',{revision:1,status:'published'});await req('bob',p+'/discussion','POST',{},403);
 const [a,b]=await Promise.all([req('alice',p+'/discussion','POST',{}),req('alice',p+'/discussion','POST',{})]);assert.equal(a.post,b.post);assert.equal(db.prepare('SELECT COUNT(*) n FROM hub_work_discussions').get().n,1);
 const post=await req('bob','/api/forum/posts/'+a.post);assert.equal(post.post.uid,'alice');assert.equal(post.post.work.id,work.id);await req('bob','/api/forum/posts/'+a.post+'/replies','POST',{body:'入口层次很清楚。'},201);assert.equal((await req('alice','/api/forum/posts/'+a.post)).replies.length,1);
 assert.equal((await req('alice',p)).discussion.id,a.post);assert.ok((await req('bob','/api/hub/records?kind=work&category=build')).items.some(v=>v.id===work.id));assert.equal((await req('bob','/api/hub/records?kind=work&category=photo')).total,0);
 db.prepare('UPDATE forum_posts SET hidden=1 WHERE id=?').run(a.post);await req('alice',p+'/discussion','POST',{},409);assert.equal(db.prepare('SELECT COUNT(*) n FROM hub_work_discussions').get().n,1);
 await req('alice',p,'DELETE');await req('bob',p,'GET',undefined,404);db.prepare('UPDATE forum_posts SET hidden=0 WHERE id=?').run(a.post);assert.equal((await req('bob','/api/forum/posts/'+a.post)).post.work,null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/hub.mjs';

async function program(req,title,options={}){return req('admin','/api/hub/records','POST',{kind:'program',title,revision:0,status:'review',data:{format:'video',source:'https://example.com/'+title+'.mp4'},...options});}
test('Bilibili programs retain canonical links; short-link resolution cannot fetch redirect targets',async t=>{
 const {req}=await fixture(t);const originalFetch=globalThis.fetch;let mode='valid',requests=0;globalThis.fetch=(url,options)=>{if(String(url).startsWith('https://b23.tv/')){requests++;assert.equal(options.redirect,'manual');return Promise.resolve(new Response(null,{status:302,headers:{location:mode==='valid'?'https://www.bilibili.com/video/BV1B7411m7LV/?p=2':'http://127.0.0.1/private'}}));}return originalFetch(url,options);};t.after(()=>globalThis.fetch=originalFetch);
 const normalized=await req('alice','/api/hub/media/resolve','POST',{source:'分享视频 https://b23.tv/Ab123'});assert.equal(normalized.source,'https://www.bilibili.com/video/BV1B7411m7LV?p=2');mode='invalid';await req('alice','/api/hub/media/resolve','POST',{source:'https://b23.tv/Ab123'},400);assert.equal(requests,2);
 const item=await program(req,'B站测试',{data:{format:'bilibili',source:'BV1B7411m7LV'}}),room=await req('alice','/api/hub/media/rooms','POST',{record:item.id});assert.equal(room.current.format,'bilibili');assert.equal(room.current.source,'https://www.bilibili.com/video/BV1B7411m7LV');await req('alice','/api/hub/media/rooms/'+room.id+'/control','POST',{revision:1,position:45,playing:true});const value=await req('bob','/api/hub/media/rooms/'+room.id+'/join','POST',{});assert.ok(value.position>=45);
});
test('shared viewing restricts control, deduplicates queue and votes, and transfers hosting on departure',async t=>{
 const {req}=await fixture(t),a=await program(req,'一'),b=await program(req,'二'),c=await program(req,'三');
 let room=await req('alice','/api/hub/media/rooms','POST',{record:a.id,title:'周末放映'});const p='/api/hub/media/rooms/'+room.id;
 await req('bob',p+'/control','POST',{revision:1,playing:true,position:0},403);
 await req('bob',p+'/join','POST',{});await req('eve',p+'/join','POST',{});
 await req('bob',p+'/control','POST',{revision:1,playing:true,position:0},403);
 room=await req('alice',p+'/control','POST',{revision:1,playing:true,position:12});assert.equal(room.playing,true);assert.ok(room.position>=12);
 await req('alice',p+'/control','POST',{revision:1,playing:false,position:0},409);
 await req('alice',p+'/control','POST',{revision:2,playing:true,position:-1},400);
 await req('bob',p+'/queue','POST',{record:b.id});await req('bob',p+'/queue','POST',{record:b.id});room=await req('eve',p+'/queue','POST',{record:c.id});assert.equal(room.queue.length,2);
 const voted=room.queue.find(q=>q.record===c.id);await req('bob',p+'/vote','POST',{item:voted.id,voted:true});room=await req('bob',p+'/vote','POST',{item:voted.id,voted:true});assert.equal(room.queue[0].votes,1);
 room=await req('alice',p+'/next','POST',{revision:2});assert.equal(room.current.id,c.id);assert.equal(room.queue.length,1);
 await req('eve',p+'/remove','POST',{item:room.queue[0].id},403);
 await req('alice',p+'/leave','POST',{});room=await req('bob',p);assert.notEqual(room.host,'alice');assert.equal(room.playing,false);
 await req('admin',p,'DELETE');await req('bob',p,'GET',undefined,404);
});
test('unpublished media cannot create or enter the queue; withdrawn media stops clients and idle rooms expire',async t=>{
 const {req,db}=await fixture(t),hidden=await program(req,'草稿',{status:'draft'}),privateItem=await program(req,'私密',{visibility:'private'}),a=await program(req,'公开');
 await req('alice','/api/hub/media/rooms','POST',{record:hidden.id},409);await req('alice','/api/hub/media/rooms','POST',{record:privateItem.id},409);
 const room=await req('alice','/api/hub/media/rooms','POST',{record:a.id}),p='/api/hub/media/rooms/'+room.id;
 await req('alice',p+'/queue','POST',{record:hidden.id},409);
 await req('admin','/api/hub/records/'+a.id,'DELETE');assert.equal((await req('alice',p)).current,null);await req('bob',p+'/join','POST',{},409);
 db.prepare('UPDATE hub_media_members SET seen=0 WHERE room=?').run(room.id);await req('alice',p,'GET',undefined,404);assert.equal(db.prepare('SELECT COUNT(*) n FROM hub_media_queue').get().n,0);
});

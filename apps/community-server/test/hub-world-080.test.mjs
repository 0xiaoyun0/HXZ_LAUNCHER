import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './helpers/hub.mjs';
test('world handoffs require a valid lease, approval and the current revision; retries never replace twice',async t=>{
 const {req}=await fixture(t),initial={kind:'world',title:'社区小镇',body:'世界接力',revision:0,status:'review',data:{version:'1.21.1',source:'https://example.com/world.zip',sha256:'a'.repeat(64),relay:true}},world=await req('admin','/api/hub/records','POST',initial),p='/api/hub/records/'+world.id;
 await req('alice',p+'/lease','POST',{});await req('bob',p+'/lease','POST',{},409);
 const snapshot={revision:1,source:'https://example.com/new.zip',sha256:'b'.repeat(64),mapVersion:'2',note:'修建车站'};
 await req('bob',p+'/world-snapshot','POST',snapshot,403);await req('alice',p+'/world-snapshot','POST',snapshot);let value=await req('alice',p+'/world-snapshot','POST',snapshot);assert.equal(value.snapshots.length,1);assert.equal(value.data.sha256,'a'.repeat(64));assert.equal((await req('bob',p)).snapshots.length,0);
 const key=value.snapshots[0].id;await req('alice',p+'/world-review','POST',{snapshot:key,revision:1,accept:true},403);
 value=await req('admin',p+'/world-review','POST',{snapshot:key,revision:1,accept:true});assert.equal(value.revision,2);assert.equal(value.lease,null);assert.equal(value.data.sha256,'b'.repeat(64));assert.equal((await req('bob',p)).snapshots[0].status,'accepted');await req('admin',p+'/world-review','POST',{snapshot:key,revision:1,accept:true},409);
 await req('bob',p+'/lease','POST',{});await req('bob',p+'/world-snapshot','POST',{...snapshot,sha256:'c'.repeat(64)},409);
 assert.equal((await req('admin',p+'/history')).items.length,2);
});
test('a map requiring mods must declare an exact loader; another active relay blocks snapshot replacement',async t=>{
 const {req}=await fixture(t),base={kind:'world',title:'机械世界',revision:0,status:'review',data:{version:'1.21.1',loader:'neoforge',source:'https://example.com/map.zip',sha256:'a'.repeat(64),relay:true}};
 await req('admin','/api/hub/records','POST',base,400);const world=await req('admin','/api/hub/records','POST',{...base,data:{...base.data,loaderVersion:'21.1.250'}}),p='/api/hub/records/'+world.id;
 const submitted=await req('admin',p+'/world-snapshot','POST',{revision:1,source:'https://example.com/v2.zip',sha256:'b'.repeat(64),mapVersion:'2'});await req('bob',p+'/lease','POST',{});await req('admin',p+'/world-review','POST',{revision:1,snapshot:submitted.snapshots[0].id,accept:true},409);
});

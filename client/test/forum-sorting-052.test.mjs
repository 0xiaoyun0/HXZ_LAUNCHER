import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {loadForumPage} from '../src/lib/forum-list.mjs';

test('forum sort works across pagination with a real old API that ignores sorting',async t=>{
 const rows=Array.from({length:57},(_,i)=>({id:String(i),created:i*1000,updated:(57-i)*1000,likes:i%7,replies:i%3,pinned:i===4?1:0}));
 let requests=0;
 const server=http.createServer((req,res)=>{requests++;const u=new URL(req.url,'http://localhost'),offset=Number(u.searchParams.get('offset'));res.end(JSON.stringify({items:rows.slice(offset,offset+24),total:rows.length}));});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const request=async route=>(await fetch('http://127.0.0.1:'+server.address().port+route)).json();
 const newest=await loadForumPage(request,{sort:'newest'});assert.deepEqual(newest.items.slice(0,3).map(p=>p.id),['4','56','55']);
 const oldest=await loadForumPage(request,{sort:'oldest'});assert.deepEqual(oldest.items.slice(0,3).map(p=>p.id),['4','0','1']);
 const likes=await loadForumPage(request,{sort:'likes'});assert.deepEqual(likes.items.slice(0,3).map(p=>p.id),['4','55','48']);
 const next=await loadForumPage(request,{sort:'newest',offset:24});assert.equal(next.items[0].id,'33');
 assert.equal(requests,12);
 requests=0;const modern=await loadForumPage(async()=>{requests++;return {items:rows.slice(24,48),total:57,sort:'likes',sortVersion:1};},{sort:'likes',offset:24});assert.equal(requests,1);assert.equal(modern.items[0].id,'24');
});

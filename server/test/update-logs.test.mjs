import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {once} from 'node:events';
import {createUpdateLogs,normalizeSources} from '../src/update-logs.mjs';
test('HXZ UP logs stay bound to each group, maintenance and rebinding cannot reuse another feed',async t=>{
 const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),pack=u.pathname.split('/')[1];res.setHeader('Content-Type','application/json');if(u.pathname.endsWith('version.json'))res.end(JSON.stringify({version:'hash-'+pack,maintenance:pack==='maintenance'}));else res.end(JSON.stringify({currentVersion:pack,history:[{version:pack,date:'2026-09-14',content:'ONLY-'+pack}]}));});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;let sources=normalizeSources({'survival':base+'/s','mod-1':base+'/one','mod-2':base+'/maintenance'});
 assert.throws(()=>normalizeSources({'survival':base+'/s/','mod-1':base+'/s'}),/相同/);
 const fetchLogs=createUpdateLogs(()=>sources),feeds=await fetchLogs();
 assert.deepEqual(feeds.map(f=>f.groupId),['survival','mod-1','mod-2']);assert.equal(feeds[0].entries[0].content,'ONLY-s');assert.equal(feeds[1].entries[0].content,'ONLY-one');assert.equal(feeds[2].status,'maintenance');assert.deepEqual(feeds[2].entries,[]);
 sources=normalizeSources({'survival':base+'/new','mod-1':base+'/one'});const rebound=await fetchLogs();assert.equal(rebound[0].entries[0].content,'ONLY-new');assert.equal(rebound[2].status,'unconfigured');
});

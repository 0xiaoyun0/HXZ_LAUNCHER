import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readUpdateSource,normalizeUpdateUrl} from '../src-electron/core/hxzup-sources.mjs';
test('HXZ UP accepts HTTP ports, fails over complete profiles, and preserves maintenance/cancellation',async()=>{
 assert.equal(normalizeUpdateUrl('http://updates.example.com:8088/modv1/'),'http://updates.example.com:8088/modv1');
 assert.equal(normalizeUpdateUrl('https://updates.example.com:8443/modv2'),'https://updates.example.com:8443/modv2');
 assert.throws(()=>normalizeUpdateUrl('file:///C:/game'));assert.throws(()=>normalizeUpdateUrl('http://name:password@example.com'));
 const requests=[],server=createServer((req,res)=>{requests.push(req.url);res.setHeader('content-type','application/json');res.end(JSON.stringify(req.url.startsWith('/maintenance')?{maintenance:true}:req.url.endsWith('/version.json')?{version:'same-pack',maintenance:false}:req.url.startsWith('/good')?{gameVersion:'1.21.1',loader:{type:'neoforge',version:'21.1.250'}}:{}));});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 try{
  const result=await readUpdateSource([base+'/bad',base+'/good'],{profile:true});assert.equal(result.base,base+'/good');assert.equal(result.profile.gameVersion,'1.21.1');
  requests.length=0;assert.equal((await readUpdateSource([base+'/maintenance',base+'/good'],{profile:true})).status.maintenance,true);assert.deepEqual(requests,['/maintenance/version.json']);
  const controller=new AbortController();controller.abort();requests.length=0;await assert.rejects(()=>readUpdateSource([base+'/good'],{signal:controller.signal}));assert.deepEqual(requests,[]);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

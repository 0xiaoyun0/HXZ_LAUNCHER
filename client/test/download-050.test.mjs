import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {download,remoteJSON} from '../src-electron/core/io.mjs';

test('verified mirror wins a stalled origin; interrupted large files resume and invalid HTTP JSON is classified',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxzl-050-download-'));
 const data=Buffer.alloc(256*1024,71),sha256=createHash('sha256').update(data).digest('hex');let resumed=false,attempt=0;
 const server=http.createServer((req,res)=>{
  if(req.url==='/stall')return;
  if(req.url==='/bad'){res.writeHead(503);res.end('<html>unavailable</html>');return;}
  if(req.url==='/resume'&&++attempt===1){res.writeHead(200,{'Content-Length':data.length});res.write(data.subarray(0,65536));setTimeout(()=>res.destroy(),80);return;}
  const offset=Number(req.headers.range?.match(/bytes=(\d+)-/)?.[1]||0);resumed ||= offset>0;
  res.writeHead(offset?206:200,{'Content-Length':data.length-offset,...(offset?{'Content-Range':`bytes ${offset}-${data.length-1}/${data.length}`}:{})});res.end(data.subarray(offset));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+server.address().port,started=Date.now();
 await download(base+'/stall',path.join(root,'hedge.jar'),{urls:[base+'/ok'],sha256,hedgeDelay:20,retryBudgetMs:500});
 assert.ok(Date.now()-started<2000);
 await download(base+'/resume',path.join(root,'resume.jar'),{sha256,size:data.length,retryDelay:1,retryBudgetMs:2000});
 assert.ok(resumed,'second request must use a byte range');assert.deepEqual(await fs.readFile(path.join(root,'resume.jar')),data);
 assert.deepEqual((await fs.readdir(root)).sort(),['hedge.jar','resume.jar']);
 await assert.rejects(remoteJSON(base+'/bad'),e=>e.status===503&&e.network===true);
});

test('large files use bounded ranges, reject corrupt segments and clean cancellation staging',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxzl-ranges-'));
 const data=Buffer.alloc(16*1024*1024);for(let i=0;i<data.length;i++)data[i]=i%251;
 const sha256=createHash('sha256').update(data).digest('hex');let ranges=0,full=0;
 const server=http.createServer((req,res)=>{
  if(req.url==='/stall')return;
  const match=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range||'');
  if(match){ranges++;const start=Number(match[1]),end=Number(match[2]);res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(req.url==='/corrupt'?Buffer.alloc(end-start+1):data.subarray(start,end+1));}
  else{full++;res.writeHead(200,{'Content-Length':data.length});res.end(data);}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+server.address().port;
 await download(base+'/ok',path.join(root,'good.jar'),{sha256,size:data.length});assert.equal(ranges,4);assert.equal(full,0);
 await download(base+'/corrupt',path.join(root,'fallback.jar'),{sha256,size:data.length,retryBudgetMs:0});assert.equal(full,1);assert.deepEqual(await fs.readFile(path.join(root,'fallback.jar')),data);
 const controller=new AbortController();const pending=download(base+'/stall',path.join(root,'cancel.jar'),{sha256,size:data.length,signal:controller.signal});setTimeout(()=>controller.abort(),100);await assert.rejects(pending);
 assert.deepEqual((await fs.readdir(root)).sort(),['fallback.jar','good.jar']);
});

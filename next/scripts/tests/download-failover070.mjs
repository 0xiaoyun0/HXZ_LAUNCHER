import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {download} from '../../packages/engine/core/io.mjs';
import {setDownloadMode} from '../../packages/engine/core/sources.mjs';

const body=Buffer.from('verified logging configuration'),sha1=createHash('sha1').update(body).digest('hex');
const dir=await fs.mkdtemp(path.resolve('.runtime/failover070-')),hits=[];
const server=http.createServer((req,res)=>{hits.push(req.url);if(req.url==='/missing'){res.writeHead(404);res.end();}else if(req.url==='/unstable'){res.writeHead(503);res.end();}else{res.end(body);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
try{
  setDownloadMode('official');
  await download(base+'/missing',dir+'/log.xml',{urls:[base+'/missing',base+'/unstable',base+'/good'],size:body.length,sha1,retryDelay:1,retryBudgetMs:1000});
  assert.deepEqual(hits,['/missing',...Array(5).fill('/unstable'),'/good'],'permanent errors skip once; retry a temporary failure five times before changing source');
  assert.equal(await fs.readFile(dir+'/log.xml','utf8'),body.toString());
  hits.length=0;
  await assert.rejects(download(base+'/missing',dir+'/failed.xml',{urls:[base+'/missing',base+'/unstable'],sha1,retryDelay:1,retryBudgetMs:0}));
  assert.equal(hits.filter(x=>x==='/missing').length,1,'404 must not be retried');
  assert.equal(hits.filter(x=>x==='/unstable').length,5,'a full source attempt is bounded');
  console.log('PASS bounded failover, permanent errors, verified atomic file');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

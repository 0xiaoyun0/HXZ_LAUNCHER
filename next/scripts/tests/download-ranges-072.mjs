import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {download,hash,configureDownloads} from '../../packages/engine/core/io.mjs';
import {setDownloadMode} from '../../packages/engine/core/sources.mjs';
import {resolveSearchQuery} from '../../packages/engine/core/content-search.mjs';
const dir=await fs.mkdtemp(path.resolve('.runtime/ranges072-')),blob=Buffer.alloc(6*1024*1024);
for(let i=0;i<blob.length;i++)blob[i]=i%239;
const sha1=createHash('sha1').update(blob).digest('hex'),starts=[];let severed=false;
const server=http.createServer((req,res)=>{const match=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range||'');if(!match){res.end(blob);return;}
 const start=Number(match[1]),end=Number(match[2]);starts.push(start);res.writeHead(206,{'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${blob.length}`});
 if(start===0&&!severed){severed=true;res.write(blob.subarray(0,262144));setTimeout(()=>res.destroy(),80);}else res.end(blob.subarray(start,end+1));
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 configureDownloads({concurrency:32});setDownloadMode('official');const url='http://127.0.0.1:'+server.address().port+'/payload';
 await download(url,dir+'/resume.bin',{size:blob.length,sha1,retryDelay:1});
 assert.equal(await hash(dir+'/resume.bin'),sha1);assert(starts.includes(262144),'must resume the interrupted range at its retained byte offset');
 const identity=createHash('sha256').update(JSON.stringify([blob.length,sha1,undefined,undefined])).digest('hex').slice(0,20),file=dir+'/stale.bin',temp=file+'.'+identity+'.ranges.partial';
 await fs.writeFile(temp,Buffer.alloc(20));await fs.writeFile(temp+'.json',JSON.stringify({identity,block:2097152,done:[true,false,false],received:[2097152,1234,9876]}));starts.length=0;
 await download(url,file,{size:blob.length,sha1,retryDelay:1});assert.equal(await hash(file),sha1);assert(starts.includes(0),'a missing or truncated partial file must invalidate all resume offsets');
 assert.equal(resolveSearchQuery('机械动力 附属'),'Create addon');assert.equal(resolveSearchQuery('未知中文项目'),'未知中文项目');assert.equal(resolveSearchQuery('玉米'),'玉米');
 console.log('PASS: partial range resume, stale resume-state recovery, full hash commit, Chinese aliases with safe fallback');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

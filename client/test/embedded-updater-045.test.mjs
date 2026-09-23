import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('embedded HXZUP uses 128 file workers and publishes verified files inside an isolated root',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-updater-045-')),updater=path.join(root,'updater');await fs.mkdir(updater);
 const payload=Buffer.from('verified update fixture'),sha1=createHash('sha1').update(payload).digest('hex');
 let active=0,peak=0;
 const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/0/')){active++;peak=Math.max(peak,active);setTimeout(()=>{res.end(payload);active--;},350);return;}
  const values={'/version.json':{version:'fixture'},'/manifest.json':{files:Array.from({length:96},(_,i)=>({path:'0/file-'+i+'.txt',sha1,fileSize:payload.length}))},'/action.json':{},'/changelog.json':{},'/game-profile.json':{}};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(values[req.url.split('?')[0]]||{}));
 });server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 await fs.copyFile(new URL('../resources/hxzup/updater-launcher.jar',import.meta.url),path.join(updater,'updater-launcher.jar'));
 await fs.writeFile(path.join(updater,'config.json'),JSON.stringify({servers:['http://127.0.0.1:'+server.address().port],parallelDownloads:128,maxParentLevels:0,showChangelog:false}));
 const child=spawn('C:/Program Files/Java/jdk-21/bin/java.exe',['-Xmx256m','-Djava.awt.headless=true','-Dfile.encoding=UTF-8','-jar','updater-launcher.jar'],{cwd:updater,windowsHide:true});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);const timer=setTimeout(()=>child.kill(),30000);
 const [code]=await once(child,'exit');clearTimeout(timer);assert.equal(code,0,output);
 assert(peak>64,'Observed peak '+peak+'; HXZUP still clamps below selected 128 concurrency');
 assert.equal(await fs.readFile(path.join(updater,'file-95.txt'),'utf8'),payload.toString());
});

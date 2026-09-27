import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('installed unchanged HXZUP pack must not wait for an unavailable optional changelog',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-startup-052-')),cache=path.join(root,'.updater');
 await fs.mkdir(cache);const requests=[],sockets=new Set();
 const server=http.createServer((req,res)=>{requests.push(req.url);if(req.url.startsWith('/changelog.json'))return;res.end(JSON.stringify({version:'already-installed'}));});
 server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 await fs.copyFile(new URL('../resources/hxzup/updater-launcher.jar',import.meta.url),path.join(root,'updater-launcher.jar'));
 await fs.writeFile(path.join(root,'config.json'),JSON.stringify({servers:['http://127.0.0.1:'+server.address().port],showChangelog:false,downloadTimeout:1800}));
 await fs.writeFile(path.join(cache,'local-version.json'),JSON.stringify({version:'already-installed'}));
 await fs.writeFile(path.join(cache,'local-manifest.json'),JSON.stringify({files:[]}));
 const child=spawn('C:/Program Files/Java/jdk-21/bin/java.exe',['-Xmx128m','-Djava.awt.headless=true','-jar','updater-launcher.jar'],{cwd:root,windowsHide:true});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 const timer=setTimeout(()=>child.kill(),3500);const [code]=await once(child,'close');clearTimeout(timer);
 assert.equal(code,0,'Launch remains blocked; requests='+requests.join(',')+'\n'+output);
 assert(!requests.some(s=>s.startsWith('/changelog.json')),'Unchanged launch must not fetch optional changelog');
});

test('managed popup exits after successful update even when changelog duration is unlimited',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-popup-052-'));
 const server=http.createServer((req,res)=>{const p=req.url.split('?')[0];res.end(JSON.stringify(p==='/version.json'?{version:'new-release'}:p==='/manifest.json'?{files:[]}:{}));});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 await fs.copyFile(new URL('../resources/hxzup/updater-launcher.jar',import.meta.url),path.join(root,'updater-launcher.jar'));
 await fs.writeFile(path.join(root,'config.json'),JSON.stringify({servers:['http://127.0.0.1:'+server.address().port],showChangelog:true,changelogDuration:0,autoCloseChangelog:true}));
 const child=spawn('C:/Program Files/Java/jdk-21/bin/java.exe',['-Xmx128m','-Dhxz.launcher.managed=true','-jar','updater-launcher.jar'],{cwd:root,windowsHide:true});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 const timer=setTimeout(()=>child.kill(),5000);const [code]=await once(child,'close');clearTimeout(timer);
 assert.equal(code,0,'The completed popup still blocks the launcher: '+output);
 assert.equal(JSON.parse(await fs.readFile(path.join(root,'.updater/local-version.json'),'utf8')).version,'new-release');
});

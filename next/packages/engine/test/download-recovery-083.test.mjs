import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createServices} from '../core/services.mjs';
import {download,remoteJSON} from '../core/io.mjs';
import {downloadSources,setDownloadMode} from '../core/sources.mjs';

test('actual game.install accepts UI vanilla request and reaches version lookup',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-vanilla083-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'settings.json'),JSON.stringify({gameRoot:path.join(root,'game')}));
 const originalFetch=globalThis.fetch;globalThis.fetch=async url=>new Response(JSON.stringify({versions:[]}),{headers:{'Content-Type':'application/json'}});t.after(()=>globalThis.fetch=originalFetch);
 const service=await createServices({data:root,resources:root,safeStorage:{isEncryptionAvailable:()=>false},emit:()=>{},window:()=>null});t.after(()=>service.dispose());
 await assert.rejects(service.invoke('game.install',{name:'纯原版',minecraft:'1.21.1',loader:'vanilla',loaderVersion:'stale-loader'}),/Minecraft 版本不存在/);
 const journal=JSON.parse(await fs.readFile(path.join(root,'game/.hxzl-install/纯原版/job.json'),'utf8'));
 assert.deepEqual(journal.identity.request,{gameVersion:'1.21.1',loader:{type:'',version:''}});
 for(const input of [{minecraft:'../escape',loader:'vanilla'},{minecraft:'1.21.1',loader:'fabric',loaderVersion:''},{minecraft:'1.21.1',loader:'evil',loaderVersion:'1'}])await assert.rejects(service.invoke('game.install',{name:'invalid',...input}),/版本无效/);
});

test('stalled actual HTTP body switches to verified fallback promptly; reuses verified file',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-download083-')),body=Buffer.from('verified artifact'),sha1=createHash('sha1').update(body).digest('hex'),hits=[];
 const server=http.createServer((req,res)=>{hits.push(req.url);if(req.url==='/stalled'){res.writeHead(200,{'Content-Length':body.length});res.flushHeaders();res.write(body.subarray(0,2));}else res.end(body);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`,controller=new AbortController(),timer=setTimeout(()=>controller.abort(Error('stalled node did not switch within 1500ms')),1500);t.after(()=>clearTimeout(timer));setDownloadMode('official');
 await download(base+'/stalled',path.join(root,'artifact'),{urls:[base+'/stalled',base+'/good'],sha1,size:body.length,idleTimeoutMs:80,connectTimeoutMs:80,retryDelay:1,retryBudgetMs:0,signal:controller.signal});
 assert.deepEqual(hits,['/stalled','/good']);assert.deepEqual(await fs.readFile(path.join(root,'artifact')),body);
 await download(base+'/stalled',path.join(root,'artifact'),{sha1,size:body.length});assert.equal(hits.length,2);
});

test('signed and credential-bearing URLs are never rewritten to mirrors',()=>{
 for(const raw of ['https://libraries.minecraft.net/a/b/c.jar?token=private','https://user:private@libraries.minecraft.net/a/b/c.jar','https://libraries.minecraft.net:444/a/b/c.jar'])assert.deepEqual(downloadSources(raw),[raw]);
 assert.deepEqual(downloadSources('https://unknown.example/a.jar'),['https://unknown.example/a.jar']);
 const publicArtifact='https://libraries.minecraft.net/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar';
 assert.ok(downloadSources(publicArtifact).includes('https://bmclapi2.bangbang93.com/maven/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar'));
 assert.ok(downloadSources(publicArtifact).includes('https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar'));
});

test('explicit fallback and redirects strip authentication and custom secrets across origins',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-auth083-')),body=Buffer.from('safe public download'),sha1=createHash('sha1').update(body).digest('hex'),seen=[];
 const other=http.createServer((req,res)=>{seen.push(req.headers);res.end(body);});await new Promise(r=>other.listen(0,'127.0.0.1',r));const target=`http://127.0.0.1:${other.address().port}/artifact`;
 const origin=http.createServer((req,res)=>{if(req.url==='/redirect'){res.writeHead(302,{Location:target});}else res.writeHead(404);res.end();});await new Promise(r=>origin.listen(0,'127.0.0.1',r));
 t.after(async()=>{for(const server of [origin,other]){server.closeAllConnections();await new Promise(r=>server.close(r));}await fs.rm(root,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${origin.address().port}`,headers={Authorization:'Bearer private',Cookie:'session=private','X-API-Key':'private'};
 await download(base+'/missing',root+'/fallback',{urls:[base+'/missing',target],sha1,headers,retryBudgetMs:0});
 await download(base+'/redirect',root+'/redirect',{sha1,headers});
 assert.equal(seen.length,2);for(const request of seen)for(const key of ['authorization','cookie','x-api-key'])assert.equal(request[key],undefined,`${key} leaked to another origin`);
});

test('expired partial receiving 416 restarts and validates; complete partial needs no network',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-resume083-')),body=Buffer.from('complete authoritative artifact'),sha1=createHash('sha1').update(body).digest('hex'),ranges=[];
 const server=http.createServer((req,res)=>{ranges.push(req.headers.range||'full');if(req.headers.range){res.writeHead(416);res.end();}else res.end(body);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 const url=`http://127.0.0.1:${server.address().port}/artifact`,file=root+'/artifact',key=createHash('sha256').update(url+JSON.stringify([sha1,undefined,undefined])).digest('hex').slice(0,20),partial=file+'.'+key+'.partial';
 await fs.writeFile(partial,body.subarray(0,4));await download(url,file,{sha1,size:body.length,retryDelay:1});assert.deepEqual(ranges,['bytes=4-','full']);assert.deepEqual(await fs.readFile(file),body);
 await fs.rm(file);await fs.writeFile(partial,body);ranges.length=0;await download(url,file,{sha1,size:body.length});assert.equal(ranges.length,0);assert.deepEqual(await fs.readFile(file),body);
});

test('corrupt binary and metadata cannot be committed or parsed as a successful download',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-hash083-')),body=Buffer.from('trusted'),sha1=createHash('sha1').update(body).digest('hex');
 const server=http.createServer((req,res)=>res.end(req.url==='/json'?'{}':'tampered'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 const url=`http://127.0.0.1:${server.address().port}`;await assert.rejects(download(url+'/file',root+'/bad',{sha1,retryBudgetMs:0}),/校验/);assert.equal(await fs.stat(root+'/bad').catch(()=>null),null);
 await assert.rejects(remoteJSON(url+'/json',{sha1}),/元数据校验/);
});

test('long Retry-After wait remains promptly cancellable and preserves no unverified target',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-cancel083-')),controller=new AbortController();let requested;
 const called=new Promise(r=>requested=r),server=http.createServer((req,res)=>{res.writeHead(429,{'Retry-After':'300'});res.end();requested();});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 const promise=download(`http://127.0.0.1:${server.address().port}/file`,root+'/cancel',{sha1:'a'.repeat(40),signal:controller.signal,retryBudgetMs:600000});
 await called;const started=Date.now();controller.abort(Error('user cancelled'));await assert.rejects(promise,/user cancelled/);assert.ok(Date.now()-started<500);assert.equal(await fs.stat(root+'/cancel').catch(()=>null),null);
});

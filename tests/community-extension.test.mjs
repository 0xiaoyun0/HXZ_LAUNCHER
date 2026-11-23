import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import yazl from 'yazl';
import {communityExtension} from '../engine/community-extension.mjs';

test('a checked package is committed after transfer, supports local import and survives cancellation, corruption and a concurrent retry',async t=>{
  const home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-ext-'));
  t.after(()=>fs.rm(home,{recursive:true,force:true,maxRetries:5}));
  const sample=path.join(home,'stock.zip'),zip=new yazl.ZipFile(),writing=pipeline(zip.outputStream,createWriteStream(sample));
  zip.addBuffer(Buffer.from('export default 42;'),'assets/community.js');zip.end();await writing;
  const bytes=await fs.readFile(sample),sha256=createHash('sha256').update(bytes).digest('hex');
  const definition={size:bytes.length,sha256,name:'test.zip',url:'https://example.invalid/plugin'};
  let picked,respond,requested=0;
  const op=communityExtension({home,resources:path.join(home,'sample/bin/engine/resources'),definition,choose:async()=>({filePaths:picked?[picked]:[]}),
    fetcher:async()=>{requested++;return new Promise(r=>{respond=r;});}});
  const marker=path.join(home,'extensions/community/enabled.json');
  const start=async()=>{const p=op('extension.install');while(!respond)await new Promise(r=>setTimeout(r,3));return {p};};
  assert.deepEqual(await op('extension.import'),{changed:false});
  let run=await start();await assert.rejects(op('extension.install'),/正在处理/);
  respond(new Response(bytes.subarray(0,3)));respond=null;await assert.rejects(run.p,/下载中断/);
  await assert.rejects(fs.access(marker));run=await start();respond(new Response(bytes));respond=null;await run.p;
  assert.equal(JSON.parse(await fs.readFile(marker)).sha256,sha256);
  assert.equal(await fs.readFile(path.join(home,'extensions/community',sha256,'assets/community.js'),'utf8'),'export default 42;');
  run=await start();respond(new Response(null,{status:503}));respond=null;await assert.rejects(run.p,/503/);
  assert.equal(JSON.parse(await fs.readFile(marker)).sha256,sha256);
  await op('extension.disable');assert.equal(JSON.parse(await fs.readFile(marker)).sha256,'');
  picked=sample;await op('extension.import');assert.equal(JSON.parse(await fs.readFile(marker)).sha256,sha256);
  const installerSource=path.join(home,'本机交付','extensions'),installedApp=path.join(home,'sample','bin');
  await fs.mkdir(installerSource,{recursive:true});await fs.mkdir(installedApp,{recursive:true});
  await fs.writeFile(path.join(installedApp,'installed.flag'),'\uFEFF'+installerSource,'utf16le');
  await fs.copyFile(sample,path.join(installerSource,definition.name));
  const server=http.createServer((req,res)=>{
    if(req.url==='/release'){res.writeHead(302,{Location:'/attachment'});res.end();return;}
    res.end(bytes);
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
  definition.url='http://127.0.0.1:'+server.address().port+'/release';
  let fetched=false;
  const download=communityExtension({home,resources:path.join(installedApp,'engine/resources'),definition,
    fetcher:(url,options)=>{fetched=true;return fetch(url,options);}});
  await op('extension.disable');await download('extension.install');assert.equal(fetched,true);
  assert.equal(JSON.parse(await fs.readFile(marker)).sha256,sha256);
  assert.equal(requested,3);
});

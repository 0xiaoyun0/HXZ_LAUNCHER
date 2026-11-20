import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as wait} from 'node:timers/promises';
const {version}=JSON.parse(await fs.readFile('package.json','utf8')),release=path.resolve('release',version);
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-delivery-'));
async function check(folder,script,paths) {
 const server=net.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(r=>server.close(r));
 const cwd=path.join(release,folder),proc=spawn(path.join(cwd,'node.exe'),[script],{cwd,windowsHide:true,stdio:'ignore',env:{...process.env,PORT:String(port),HOST:'127.0.0.1',HXZ_DATA:path.join(temp,'community'),HXZ_NEXT_WEB_DATA:path.join(temp,'web'),HXZ_FEC_AUTO:'0'}});
 const done=once(proc,'exit');try{
  for(const [route,expected] of paths){let response;const limit=Date.now()+30000;
    while(!response&&Date.now()<limit&&proc.exitCode===null){try{response=await fetch('http://127.0.0.1:'+port+route,{signal:AbortSignal.timeout(5000)});}catch{await wait(180);}}
    assert.ok(response,folder+' '+route+' 未响应');assert.equal(response.status,expected,route);
    if(route==='/health')assert.equal((await response.json()).version,version);
    else if(route==='/api/releases'){
      const catalog=await response.json();assert.equal(catalog.version,version);
      assert.ok(catalog.assets.some(f=>f.name.endsWith('.apk')));assert.ok(catalog.assets.some(f=>f.name.includes('-setup-x64')));
      const definition=JSON.parse(await fs.readFile('.runtime/community-extension.json','utf8'));
      const plugin=catalog.assets.find(f=>f.name===definition.name);assert.equal(plugin?.size,definition.size);
      const source='http://127.0.0.1:'+port+plugin.url;
      const head=await fetch(source,{method:'HEAD'});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),plugin.size);
      const payload=await fetch(source),digest=createHash('sha256');assert.equal(payload.status,200);
      for await(const chunk of payload.body)digest.update(chunk);assert.equal(digest.digest('hex'),definition.sha256);
    }
    else if(expected===200)assert.ok((await response.text()).length>350,route);
  }
  console.log(folder+' '+paths.map(r=>r[0]).join(' '));
 }finally{if(proc.exitCode===null)proc.kill();await done;}
}
try{
 await check('server/幻想镇社区服务端','src/server.mjs',[['/health',200],['/admin/',200],['/api/not-installed',404]]);
 await check('website/幻想镇官网','server/index.mjs',[['/',200],['/worlds/',200],['/guide/',200],['/downloads/',200],['/api/releases',200],['/api/release-file/missing',404],['/admin/',200],['/missing-test',404]]);
}finally{await fs.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:150});}

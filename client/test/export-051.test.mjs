import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {exportPack} from '../src-electron/core/export-pack.mjs';
import {inspectPack,extractPack} from '../src-electron/core/packs.mjs';

test('exported HXZUP synchronizes a foreign launcher instance without rewriting its version metadata',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-export-051-'));
 const payload=Buffer.from('updated config'),sha1=createHash('sha1').update(payload).digest('hex');
 const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/1/config/server.txt')){res.end(payload);return;}
  const values={'/version.json':{version:'051-fixture'},'/manifest.json':{files:[{path:'1/config/server.txt',sha1,fileSize:payload.length}]},'/action.json':{},'/game-profile.json':{gameVersion:'1.20.1',loader:{type:'fabric',version:'0.16.0'}},'/changelog.json':{}};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(values[req.url.split('?')[0]]||{}));
 });server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});});
 const instance=path.join(root,'original','versions','fixture');await fs.mkdir(instance,{recursive:true});
 await fs.writeFile(path.join(instance,'fixture.json'),JSON.stringify({id:'fixture',minecraftVersion:'1.20.1',mainClass:'net.minecraft.Main',libraries:[{name:'net.fabricmc:fabric-loader:0.16.0'}]}));
 const pack=path.join(root,'fixture.mrpack');await exportPack({settings:{gameRoot:path.join(root,'original'),downloadConcurrency:32,instanceSettings:{}},id:'fixture',destination:pack,resources:path.resolve('client/resources'),urls:['http://127.0.0.1:'+server.address().port]});
 const foreign=path.join(root,'Prism','我的实例','.minecraft');await fs.mkdir(foreign,{recursive:true});
 await extractPack(await inspectPack(pack),foreign);
 const configPath=path.join(foreign,'updater/config.json'),config=JSON.parse(await fs.readFile(configPath));config.showChangelog=false;await fs.writeFile(configPath,JSON.stringify(config));
 const child=spawn('C:/Program Files/Java/jdk-21/bin/java.exe',['-Djava.awt.headless=true','-Dfile.encoding=UTF-8','-jar','updater/updater-launcher.jar'],{cwd:foreign,windowsHide:true});let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);const timer=setTimeout(()=>child.kill(),15000);const [code]=await once(child,'exit');clearTimeout(timer);
 assert.equal(code,0,output);assert.equal(await fs.readFile(path.join(foreign,'config/server.txt'),'utf8'),payload.toString());
 const agent=spawn('C:/Program Files/Java/jdk-21/bin/java.exe',['-Djava.awt.headless=true','-Dfile.encoding=UTF-8','-javaagent:updater/launcher-agent.jar','-version'],{cwd:foreign,windowsHide:true});let agentOutput='';agent.stdout.on('data',c=>agentOutput+=c);agent.stderr.on('data',c=>agentOutput+=c);const agentTimer=setTimeout(()=>agent.kill(),15000);const [agentCode]=await once(agent,'exit');clearTimeout(agentTimer);assert.equal(agentCode,0,agentOutput);
 assert.equal(await fs.stat(path.join(foreign,'.minecraft.json')).then(()=>true,()=>false),false);
});

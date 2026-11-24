import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as wait} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
import {verifyRelease} from '../packages/engine/core/update-sources.mjs';
import {verifyDesktopArchitecture} from './verify-desktop-arch.mjs';

const arch=process.argv.includes('--ia32')?'ia32':'x64';
const publicFeed=process.argv.includes('--github');
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const oldRelease=process.env.HXZ092_RELEASE,extractor=process.env.HXZ_QA_7Z;
if(!oldRelease||!extractor)throw Error('需要 HXZ092_RELEASE（原始安装包及签名清单目录）和 HXZ_QA_7Z');
const asar=await import(process.env.HXZ_QA_ASAR?pathToFileURL(process.env.HXZ_QA_ASAR).href:'@electron/asar');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-092-handoff-'));
const from=path.join(temp,'old'),target=path.join(temp,'new'),home=path.join(temp,'profile'),roaming=path.join(temp,'roaming');
const legacy=path.join(roaming,'幻想镇启动器'),game=path.join(temp,'Minecraft'),instance='旧服';
const feed=arch==='ia32'?'latest-ia32.json':'latest.json',updates=path.resolve('release',version,'updates');
const asset='HXZ-Launcher-'+version+'-'+arch+'.exe',downloaded=new Set();
const server=http.createServer(async (req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const name=url.pathname==='/latest/download/'+feed?feed:url.pathname==='/download/v'+version+'/'+asset?asset:null;
  if(!name){res.writeHead(404).end();return;}
  downloaded.add(name);
  const file=path.join(updates,name);
  res.writeHead(200,{'Content-Length':(await fs.stat(file)).size,'Content-Type':name===feed?'application/json':'application/octet-stream'});
  createReadStream(file).on('error',()=>res.destroy()).pipe(res);
});
async function digest(file,algo,format){
  const hash=createHash(algo);for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest(format);
}
async function port(){
  const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');
  const value=s.address().port;await new Promise(r=>s.close(r));return value;
}
let previous,browser,page;
try{
  const oldEnvelope=JSON.parse(await fs.readFile(path.join(oldRelease,'updates',feed),'utf8'));
  const original=verifyRelease(oldEnvelope,undefined,arch);assert.equal(original.version,'0.9.2');
  const oldInstaller=path.join(oldRelease,'windows-'+arch,original.files[0].url);
  assert.equal(await digest(oldInstaller,'sha512','base64'),original.files[0].sha512);
  execFileSync(extractor,['x','-y','-o'+from,oldInstaller],{windowsHide:true,stdio:'ignore',timeout:160000});
  const res=path.join(from,'resources'),packed=path.join(res,'app.asar'),unpacked=path.join(res,'app');
  if(!await fs.stat(packed).catch(()=>null)){
    // electron-builder NSIS installers store the application in a second archive.
    const inner=path.join(from,'$PLUGINSDIR',arch==='ia32'?'app-32.7z':'app-64.7z');
    execFileSync(extractor,['x','-y','-o'+from,inner],{windowsHide:true,stdio:'ignore',timeout:160000});
  }
  asar.extractAll(packed,unpacked);await fs.rename(packed,path.join(temp,'original.asar'));
  const pkg=JSON.parse(await fs.readFile(path.join(unpacked,'package.json'),'utf8'));assert.equal(pkg.version,'0.9.2');
  assert.equal(JSON.parse(await fs.readFile(path.join(res,'install-channel.json'),'utf8')).channel,'installed');
  const entry=path.join(unpacked,pkg.main);
  let code=await fs.readFile(entry,'utf8');
  const substitute=(pattern,value)=>{assert.equal([...code.matchAll(pattern)].length,1,'0.9.2 fixture: '+pattern);code=code.replace(pattern,value);};
  if(!publicFeed){
    server.listen(0,'127.0.0.1');await once(server,'listening');
    substitute(/var RELEASE_ROOT = "https:\/\/github\.com\/0xiaoyun0\/HXZ_LAUNCHER\/releases";/g,'var RELEASE_ROOT = "http://127.0.0.1:'+server.address().port+'";');
    substitute(/var UPDATE_SOURCES = Object\.freeze\(\[.*\]\);/g,'var UPDATE_SOURCES = [{name:"草稿附件",prefix:""}];');
  }
  // NsisUpdater supports installDirectory. Its real launch flags, signed feed
  // verification, download, exit and NSIS handoff all run in the old client.
  substitute(/updater2\.autoInstallOnAppQuit = false;/g,'updater2.installDirectory = '+JSON.stringify(target)+'; updater2.autoInstallOnAppQuit = false;');
  substitute(/if \(installed\) for \(const name2 of \["hxz-room", "hxzroom"\]\) [\w.]+\.setAsDefaultProtocolClient\(name2\);/g,'');
  await fs.writeFile(entry,code);
  await fs.writeFile(path.join(res,'app-update.yml'),'updaterCacheDirName: '+path.basename(temp)+'\n');
  await Promise.all([target,home,legacy,path.join(game,'versions',instance)].map(dir=>fs.mkdir(dir,{recursive:true})));
  await fs.writeFile(path.join(target,'no-shell.flag'),'');
  await fs.writeFile(path.join(game,'versions',instance,instance+'.json'),JSON.stringify({id:instance,mainClass:'net.minecraft.client.main.Main'}));
  const settings={gameRoot:game,selectedInstance:instance,autoCheckUpdates:true,memoryMode:'manual',defaultMemoryMB:6656,fecEnabled:false};
  await fs.writeFile(path.join(legacy,'settings.json'),JSON.stringify(settings));
  const oldPort=await port(),newPort=await port();
  previous=spawn(path.join(from,'幻想镇启动器.exe'),['--remote-debugging-port='+oldPort],{windowsHide:true,stdio:'ignore',env:{
    ...process.env,APPDATA:roaming,LOCALAPPDATA:path.join(temp,'local'),HXZ_NEXT_HOME:legacy,HXZ3_HOME:home,HXZ3_QA_INSTANCE:'1',HXZ3_QA_BACKGROUND:'1',
    WEBVIEW2_USER_DATA_FOLDER:path.join(temp,'webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+newPort+' --remote-debugging-address=127.0.0.1'
  }});
  const deadline=Date.now()+(publicFeed?300000:115000);
  let lastPhase='';
  while(Date.now()<deadline){
    if(previous.exitCode===null){
      try{
        browser??=await chromium.connectOverCDP('http://127.0.0.1:'+oldPort,{timeout:600});
        const oldPage=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('file:'));
        if(oldPage)lastPhase=await oldPage.evaluate(async()=>(await window.launcher?.invoke('app-update.status'))?.value?.phase)||lastPhase;
      }catch{}
    }
    if(previous.exitCode!==null&&await fs.stat(path.join(target,'installed.flag')).catch(()=>null))break;
    await wait(300);
  }
  if(!publicFeed)assert.deepEqual([...downloaded].sort(),[feed,asset].sort(),'原版更新器访问的附件；最后状态 '+lastPhase);
  assert.equal(previous.exitCode,0,'原版结束并交接；最后状态 '+lastPhase);
  await browser?.close().catch(()=>{});browser=undefined;
  for(let i=0;i<100&&!page;i++){
    try{
      browser??=await chromium.connectOverCDP('http://127.0.0.1:'+newPort,{timeout:450});
      page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost'));
    }catch{}if(!page)await wait(250);
  }
  assert.ok(page,'安装完成后新版应自动打开');
  await page.waitForFunction(()=>typeof window.launcher?.invoke==='function');
  const result=await page.evaluate(async()=>window.launcher.invoke('state',{localOnly:true}));
  assert.ok(result.ok,result.error);assert.equal(result.value.settings.gameRoot,game);assert.equal(result.value.settings.fecEnabled,false);
  assert.equal(result.value.settings.defaultMemoryMB,6656);assert.equal(result.value.settings.selectedInstance,instance);
  await verifyDesktopArchitecture(target,arch);
  const exe='幻想镇 3rd.exe';
  assert.equal(await digest(path.join(target,exe),'sha256','hex'),await digest(path.resolve('release',version,'windows-'+arch,exe),'sha256','hex'));
  console.log(arch+' 0.9.2 已自动发现、下载、校验、退出并启动 '+version+'。实例与 6656 MB、HXZRE 关闭均已迁移。来源为正式旧安装包、'+(publicFeed?'原版公开更新渠道':'本机草稿更新源')+'和隔离玩家资料。');
}finally{
  await page?.evaluate(()=>window.launcher.invoke('window.control',{action:'close'})).catch(()=>{});
  await browser?.close().catch(()=>{});
  if(previous&&previous.exitCode===null){const done=once(previous,'exit');previous.kill();await done;}
  if(server.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}
  if(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('hxz-092-handoff-'))await fs.rm(temp,{recursive:true,force:true,maxRetries:10,retryDelay:350});
}

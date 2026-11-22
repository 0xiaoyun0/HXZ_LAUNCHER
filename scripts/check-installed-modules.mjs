import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {setTimeout as wait} from 'node:timers/promises';
import {verifyDesktopArchitecture} from './verify-desktop-arch.mjs';
import {chromium} from 'playwright-core';

const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const arch=process.argv.includes('--ia32')?'ia32':'x64';
const release=path.resolve('release',version);
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-installed-'));
const app=path.join(tmp,'program'),home=path.join(tmp,'new-profile'),appData=path.join(tmp,'roaming');
const old=path.join(appData,'幻想镇启动器'),root=path.join(tmp,'sample-game'),world=path.join(root,'versions','山谷');
const ids=['community','music','arcade'],catalog=JSON.parse(await fs.readFile('.runtime/official-extensions.json','utf8'));
let proc,browser,page;
async function start(args=[]){
  const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');
  const port=socket.address().port;await new Promise(r=>socket.close(r));
  proc=spawn(path.join(app,'幻想镇 3rd.exe'),args,{windowsHide:true,stdio:'ignore',env:{
    ...process.env,APPDATA:appData,HXZ3_HOME:home,HXZ3_QA_INSTANCE:'1',WEBVIEW2_USER_DATA_FOLDER:path.join(tmp,'webview'),
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --remote-debugging-address=127.0.0.1'
  }});
  const deadline=Date.now()+45000;
  while(!page&&Date.now()<deadline){
    try{browser??=await chromium.connectOverCDP('http://127.0.0.1:'+port,{timeout:1000});
      page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost'));}catch{}
    if(!page)await wait(150);
  }
  assert.ok(page,'安装后的启动器窗口');await page.waitForFunction(()=>typeof window.launcher?.invoke==='function');
}
const call=(action,input={})=>page.evaluate(([a,i])=>window.launcher.invoke(a,i),[action,input]);
async function close(){
  const exit=proc&&proc.exitCode===null?once(proc,'exit'):Promise.resolve();
  await page?.evaluate(()=>window.launcher.invoke('window.control',{action:'close'})).catch(()=>{});
  await browser?.close().catch(()=>{});
  if(proc?.exitCode===null){await Promise.race([exit,wait(1200)]);if(proc.exitCode===null)proc.kill();await exit;}
  proc=browser=page=undefined;
}
async function states(installed,active){
  const status=await call('extension.status');assert.ok(status.ok,status.error);
  for(const id of ids){
    const module=status.value.modules[id];
    assert.equal(module.installed,installed,id+' installed');
    assert.equal(module.active,active,id+' active');
    const url='/'+catalog[id].entry;
    assert.equal(await page.evaluate(async src=>(await fetch(src)).ok,url),active,id+' assets');
  }
}
async function settings(){
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'扩展',exact:true}).click();
}
try{
  await fs.mkdir(old,{recursive:true});await fs.mkdir(world,{recursive:true});
  await fs.writeFile(path.join(world,'山谷.json'),JSON.stringify({id:'山谷',mainClass:'net.minecraft.client.main.Main'}));
  const legacy=JSON.stringify({gameRoot:root,selectedInstance:'山谷',fecEnabled:false,memoryMode:'manual',defaultMemoryMB:7168,unknownFixture:701});
  const legacyFile=path.join(old,'settings.json');await fs.writeFile(legacyFile,legacy);
  await fs.mkdir(app,{recursive:true});await fs.writeFile(path.join(app,'幻想镇 极简版.exe'),'previous-install-wrapper');
  // /D= must be NSIS's final, unquoted argument, including on Windows temp paths containing spaces.
  execFileSync(path.join(release,'HXZ-3rd-'+version+'-setup-'+arch+'.exe'),['/S','/NOSHELL','/D='+app],{windowsHide:true,windowsVerbatimArguments:true,timeout:180000});
  await fs.access(path.join(app,'no-shell.flag'));
  await verifyDesktopArchitecture(app,arch);
  await start();await states(false,false);
  const initial=(await call('state',{localOnly:true})).value;
  assert.equal(initial.settings.gameRoot,root);assert.equal(initial.settings.fecEnabled,false);
  assert.equal(initial.settings.defaultMemoryMB,7168);assert.equal(initial.settings.memoryMode,'manual');
  assert.equal((await call('points.overview')).ok,false);
  assert.equal((await call('arcade.score',{route:'/api/arcade/runner?period=week',method:'GET'})).ok,false);
  await call('settings.save',{onboardingDone:true});await page.reload();
  const sentinel=path.join(home,'game-playtime.json');
  const play=await fs.readFile(sentinel).catch(()=>null);
  await settings();
  for(const [title,name] of [['社区插件','下载社区插件'],['音乐播放器','安装音乐播放器'],['小游戏','安装小游戏']]){
    const section=page.locator('.preference-section').filter({has:page.getByRole('heading',{name:title,exact:true})}),button=section.getByRole('button',{name,exact:true});
    await button.click();
    const ready=section.getByText('已下载 · 重启后启用',{exact:true}),failure=section.getByRole('alert');
    await ready.or(failure).first().waitFor({timeout:90000});
    if(await failure.isVisible())throw Error(title+'安装失败：'+await failure.innerText());
    assert.ok(await ready.isVisible());
  }
  await states(true,false);await page.reload();await states(true,false);
  await close();await start(['--disable-plugins']);await states(true,false);await close();
  await start();await states(true,true);
  const nav=page.getByRole('navigation',{name:'主导航'});
  for(const name of ['社区','小游戏'])await nav.getByRole('link',{name,exact:true}).waitFor();
  await page.locator('footer').getByRole('link',{name:'音乐播放器',exact:true}).waitFor();
  await settings();
  for(const [title,name] of [['社区插件','停用插件'],['音乐播放器','移除音乐播放器'],['小游戏','移除小游戏']]){
    const section=page.locator('.preference-section').filter({has:page.getByRole('heading',{name:title,exact:true})}),button=section.getByRole('button',{name,exact:true});
    await button.click();await section.getByText('已停用 · 重启后移除',{exact:true}).waitFor();
  }
  await states(false,true);await close();await start();await states(false,false);
  for(const id of ids)assert.equal(await fs.stat(path.join(home,'extensions',id,catalog[id].sha256)).catch(()=>null),null);
  assert.equal(await fs.readFile(legacyFile,'utf8'),legacy);
  if(play)assert.deepEqual(await fs.readFile(sentinel),play);
  console.log(arch+' 安装程序、0.9.2 首启迁移、三个扩展冷启动/安全模式/移除及游客权限通过。');
} finally {
  await close();
  if(path.dirname(tmp)===os.tmpdir()&&path.basename(tmp).startsWith('hxz-installed-'))await fs.rm(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:400});
}

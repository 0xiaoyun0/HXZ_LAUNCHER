import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import {setTimeout as wait} from 'node:timers/promises';
import {chromium} from 'playwright-core';
import {installedLibrary} from '../engine/installed-game-root.mjs';
import {DEFAULT_SERVERS} from '../server/shared/server-presets.mjs';

const library=await installedLibrary(process.env.APPDATA);
assert.ok(library,'需要已安装的 0.9.2 和有效的游戏目录');
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const exe=path.resolve('release',version,'windows-x64','幻想镇 3rd.exe');
const old=path.join(process.env.APPDATA,'幻想镇启动器'),home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-installed-check-'));
const tracked=[...['settings.json','server-presets-cache.json','game-playtime.json','launch-history.json'].map(name=>path.join(old,name)),
  ...DEFAULT_SERVERS.map(p=>path.join(library.root,'versions',p.id,p.id+'.json'))];
const fingerprint=()=>Promise.all(tracked.map(file=>fs.readFile(file).then(bytes=>createHash('sha256').update(bytes).digest('hex'),e=>{if(e.code==='ENOENT')return null;throw e;})));
const before=await fingerprint(),listener=net.createServer();
listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
const proc=spawn(exe,[],{windowsHide:true,stdio:'ignore',env:{...process.env,HXZ3_QA_INSTANCE:'1',HXZ3_HOME:home,
  WEBVIEW2_USER_DATA_FOLDER:path.join(home,'webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --remote-debugging-address=127.0.0.1'}});
let browser,page;
try{
  const until=Date.now()+45000;
  while(!page&&Date.now()<until){
    if(proc.exitCode!==null)throw Error('桌面进程提前退出');
    try{browser??=await chromium.connectOverCDP('http://127.0.0.1:'+port,{timeout:1000});page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost'));}catch{}
    if(!page)await wait(150);
  }
  assert.ok(page);await page.setViewportSize({width:1360,height:880});
  await page.locator('.home-server-list a').first().waitFor();
  const state=await page.evaluate(async()=>(await window.launcher.invoke('state',{localOnly:true})).value);
  assert.equal(state.settings.gameRoot,library.root);assert.equal(state.accounts.length,0);
  assert.deepEqual(state.settings.lastPlayed??null,library.lastPlayed);
  assert.equal(state.settings.selectedInstance,library.selected);
  const servers=state.instances.filter(g=>g.builtin);
  assert.deepEqual(servers.map(g=>g.id),DEFAULT_SERVERS.map(p=>p.id));
  for(const [n,preset] of servers.entries()){
    if(!before[4+n])continue;
    assert.equal(preset.installed,true);
    const meta=JSON.parse(await fs.readFile(tracked[4+n],'utf8'));
    const game=meta.patches?.find(p=>p.id==='game'),loader=meta.patches?.find(p=>p.id!=='game');
    if(game)assert.equal(preset.version,game.version);
    if(loader)assert.equal(preset.loader,loader.id+' '+loader.version);
  }
  if(library.playtime){
    const time=await page.evaluate(async()=>(await window.launcher.invoke('game.playtime')).value);
    assert.equal(time.totalSeconds,Math.floor(Object.values(library.playtime.days).reduce((n,v)=>n+v,0)/1000));
  }
  await page.evaluate(()=>document.fonts.ready);
  await fs.mkdir('.preview',{recursive:true});await page.screenshot({path:'.preview/installed-library-home.png',animations:'disabled'});
  await page.locator('.home-server-list a').last().click();
  await page.locator('.default-server-card').first().waitFor();
  await page.screenshot({path:'.preview/installed-library-servers.png',animations:'disabled'});
  assert.deepEqual(await fingerprint(),before);
  console.log(JSON.stringify({instances:state.instances.length,installed:state.instances.filter(i=>i.installed).length,
    servers:servers.map(({name,version,loader,installed})=>({name,version,loader,installed})),calendarDays:Object.keys(library.playtime?.days||{}).length,sourceFilesUnchanged:true}));
}finally{
  await browser?.close().catch(()=>{});if(proc.exitCode===null)proc.kill();await wait(350);
  await fs.rm(home,{recursive:true,force:true,maxRetries:8,retryDelay:300}).catch(()=>{});
}

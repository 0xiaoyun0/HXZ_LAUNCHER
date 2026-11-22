import assert from 'node:assert/strict';
import {openFullWorkspace,switchWorkspace} from './check-desktop-lite.mjs';
import {scan as measureInsets,cardHeadingIssues} from './desktop-insets.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import {setTimeout as wait} from 'node:timers/promises';
import {chromium} from 'playwright-core';
import {mediaReference,mediaPath} from '../packages/engine/core/media.mjs';
import {installedLibrary} from '../engine/installed-game-root.mjs';
import {DEFAULT_SERVERS} from '../server/shared/server-presets.mjs';

const library=await installedLibrary(process.env.APPDATA);
assert.ok(library,'需要已安装的 0.9.2 和有效的游戏目录');
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const exe=path.resolve(process.env.HXZ3_TEST_DIST||path.join('release',version,'windows-x64'),'幻想镇 3rd.exe');
const old=path.join(process.env.APPDATA,'幻想镇启动器'),home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-installed-check-'));
const tracked=[...['settings.json','server-presets-cache.json','game-playtime.json','launch-history.json'].map(name=>path.join(old,name)),
  ...DEFAULT_SERVERS.map(p=>path.join(library.root,'versions',p.id,p.id+'.json'))];
const oldSettings=JSON.parse((await fs.readFile(tracked[0],'utf8')).replace(/^\uFEFF/,''));
const oldWallpaper=oldSettings.backgroundVideo||oldSettings.backgroundImage;
if(mediaReference(oldWallpaper))tracked.push(mediaPath(old,oldWallpaper));
const fingerprint=()=>Promise.all(tracked.map(file=>fs.readFile(file).then(bytes=>createHash('sha256').update(bytes).digest('hex'),e=>{if(e.code==='ENOENT')return null;throw e;})));
const {communityExtension}=await import('../engine/community-extension.mjs');
const definition=JSON.parse(await fs.readFile('.runtime/official-extensions.json','utf8')).music;
const zip=path.resolve('release',version,'extensions',definition.name);
await communityExtension({home,id:'music',definition,choose:async()=>({filePaths:[zip]})})('extension.import');
const before=await fingerprint(),listener=net.createServer();
listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
const proc=spawn(exe,[],{windowsHide:true,stdio:'ignore',env:{...process.env,HXZ3_QA_INSTANCE:'1',HXZ3_QA_BACKGROUND:'1',HXZ3_HOME:home,
  WEBVIEW2_USER_DATA_FOLDER:path.join(home,'webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --remote-debugging-address=127.0.0.1 --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling'}});
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
  const welcome=page.getByRole('dialog',{name:'登录幻想镇'});
  if(await welcome.isVisible()){await welcome.getByRole('button',{name:'先以游客身份浏览'}).click();await page.getByRole('button',{name:'跳过引导'}).click();}
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
  assert.deepEqual((await page.evaluate(measureInsets)).issues,[],'本机实例和角色的文字超出了首页留白');
  await fs.mkdir('.preview',{recursive:true});await page.screenshot({path:'.preview/installed-library-home.png',animations:'disabled'});
  await page.setViewportSize({width:1250,height:825});
  await page.locator('main').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  assert.deepEqual(await page.evaluate(cardHeadingIssues),[],'既有默认服务器和日历的操作必须紧靠卡片工具');
  await page.screenshot({path:'.preview/installed-home-actions.png',animations:'disabled'});
  await switchWorkspace(page,true);
  await page.locator('.lite-game h2').waitFor();
  assert.deepEqual((await page.evaluate(measureInsets)).issues,[]);
  await page.screenshot({path:'.preview/installed-lite-start.png',animations:'disabled'});
  await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'设置',exact:true}).click();await page.getByRole('navigation',{name:'极简设置分类'}).getByRole('link',{name:'启动器',exact:true}).click();await page.getByRole('button',{name:'切换到完整工作台'}).waitFor();
  await page.screenshot({path:'.preview/installed-workspace-switch.png',animations:'disabled'});
  assert.equal((await page.locator('.launcher-frame').getAttribute('data-shell')),'lite');
  await openFullWorkspace(page);
  await page.locator('.home-server-list a').last().click();
  await page.locator('.default-server-card').first().waitFor();
  assert.deepEqual((await page.evaluate(measureInsets)).issues,[],'默认服务器的文字超出了卡片留白');
  await page.screenshot({path:'.preview/installed-library-servers.png',animations:'disabled'});
  await page.setViewportSize({width:1250,height:825});
  await page.getByRole('button',{name:'设置',exact:true}).click();
  const categories=page.getByRole('navigation',{name:'设置分类'});
  for(const [name,file] of [['下载与更新','downloads'],['联机连接','network']]){
    await categories.getByRole('link',{name,exact:true}).click();
    if(file==='network')await page.locator('.settings-status').getByText('HXZRE 已内嵌并通过校验').waitFor();
    else await page.getByRole('heading',{name:'启动器版本',exact:true}).waitFor();
    assert.deepEqual((await page.evaluate(measureInsets)).issues,[],name+' 文字越过边界');
    await page.screenshot({path:'.preview/installed-settings-'+file+'.png',animations:'disabled'});
  }
  await page.setViewportSize({width:1360,height:880});
  const {verifyWorkspaces}=await import('./desktop-workspaces.mjs');await verifyWorkspaces(page,'.preview');
  const {verifyCustomization}=await import('./desktop-customization.mjs');await verifyCustomization(page,'.preview');
  const oldLook=await page.evaluate(async()=>(await window.launcher.invoke('profile.look')).value);
  if(oldLook?.available){
    await page.getByRole('link',{name:'外观',exact:true}).click();await page.getByRole('button',{name:'壁纸',exact:true}).click();await page.getByRole('button',{name:'接回旧版壁纸'}).click();await page.getByRole('button',{name:'应用旧版壁纸'}).click();
    await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--pane-radius')!=='');
    if(oldLook.kind==='动态壁纸'){
      await page.waitForFunction(()=>document.querySelector('.launcher-wallpaper video')?.videoWidth>0);
      const video=page.locator('.launcher-wallpaper video');assert.ok(await video.evaluate(el=>el.muted));
      const originalVideo=await video.getAttribute('src');await page.getByRole('button',{name:'颜色与窗格',exact:true}).click();
      await page.getByRole('button',{name:'使用纸上工坊'}).click();await page.getByRole('button',{name:'工作台',exact:true}).click();await page.getByRole('button',{name:'使用实例控制台'}).click();
      await page.reload();await page.waitForFunction(()=>document.querySelector('.launcher-wallpaper video')?.videoWidth>0);assert.equal(await video.getAttribute('src'),originalVideo);
      await page.getByRole('button',{name:'使用经典工作台'}).click();
      await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.launcher-wallpaper video')?.paused);
    }
    console.log('本机旧版外观',oldLook.kind,oldLook.radius+'px',oldLook.opacity+'%');
  }
  const oldCards=await page.evaluate(async()=>(await window.launcher.invoke('profile.cards')).value);
  if(oldCards){
    const widgets=await page.evaluate(async()=>{
      const {settings}=(await window.launcher.invoke('state',{localOnly:true})).value;
      const fixture={id:'local-checked-card',type:'extension',title:'每日清单',page:'home',checked:['ready'],extension:{format:'hxz-card-extension',version:1,id:'qa-daily',title:'每日清单',blocks:[{type:'check',id:'ready',label:'已经整理'}]}};
      return (await window.launcher.invoke('settings.save',{widgets:[...settings.widgets,fixture]})).value.widgets;
    });
    await page.reload();
    if(!await page.getByRole('button',{name:'接回旧版布局'}).count()){await page.getByRole('link',{name:'游戏',exact:true}).click();await page.getByRole('link',{name:'外观',exact:true}).click();}
    const readLayouts=()=>page.evaluate(async()=>(await window.launcher.invoke('state',{localOnly:true})).value.settings.cardLayouts);
    const original=await readLayouts(),open=page.getByRole('button',{name:'接回旧版布局'}),preview=page.getByRole('dialog');
    await open.click();await preview.getByText('本机 0.9.2 卡片布局',{exact:true}).waitFor();await page.keyboard.press('Escape');assert.deepEqual(await readLayouts(),original);
    await open.click();await preview.getByRole('button',{name:'应用布局'}).click();await preview.waitFor({state:'hidden'});
    const merged=await readLayouts();for(const [key,layout] of Object.entries(oldCards.layout.cardLayouts))assert.deepEqual(merged[key],layout);
    const appearancePath=await page.evaluate(()=>location.hash);
    for(const [route,card] of [['/workshop/sources','nodes'],['/multiplayer','network']]){
      await page.evaluate(route=>{location.hash=route;},route);
      if(card==='network'){await page.locator('.login-gate').getByRole('button',{name:'登录账号'}).waitFor();continue;}
      const panel=page.locator('[data-card-id="'+card+'"]');await panel.waitFor();await panel.locator('.desktop-panel-body').waitFor();
      assert.equal(await panel.getAttribute('data-fixed'),null);
      if(card==='nodes')await panel.locator('.source-pages').waitFor();
      assert.ok(await panel.evaluate(el=>{const body=el.querySelector('.desktop-panel-body');return Math.abs(el.getBoundingClientRect().bottom-body.getBoundingClientRect().bottom)<5;}),'旧布局不应在新内容下方预留空板');
      await (card==='nodes'?panel.locator('.source-pages'):panel).evaluate(el=>el.scrollIntoView({block:'center'}));
      await page.screenshot({path:path.join('.preview','installed-'+card+'.png'),animations:'disabled'});
    }
    await page.evaluate(route=>{location.hash=route;},appearancePath);
    await page.getByRole('button',{name:'撤销本次导入'}).click();await page.getByRole('button',{name:'撤销本次导入'}).waitFor({state:'hidden'});assert.deepEqual(await readLayouts(),original);
    assert.deepEqual(await page.evaluate(async()=>(await window.launcher.invoke('state',{localOnly:true})).value.settings.widgets),widgets);
    console.log('本机旧版卡片布局预览、取消、合并和撤销通过',oldCards.counts);
  }
  const localPlugin=path.resolve(path.dirname(exe),'../extensions','HXZ-Community-Plugin-'+version+'.zip');
  if(await fs.stat(localPlugin).then(s=>s.isFile(),()=>false)){
    await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'扩展',exact:true}).click();
    await page.getByRole('button',{name:'下载社区插件'}).click();await page.getByText('已下载 · 重启后启用').waitFor({timeout:65000});
    const status=await page.evaluate(async()=>(await window.launcher.invoke('extension.status')).value);assert.ok(status.installed);assert.equal(status.active,false);
    console.log('实际交付目录的本地社区包已校验并进入待重启状态');
  }
  const {checkInstanceDrawer}=await import('./check-instance-drawer.mjs');await checkInstanceDrawer(page,'.preview',servers[1].name);
  assert.deepEqual(await fingerprint(),before);
  console.log(JSON.stringify({instances:state.instances.length,installed:state.instances.filter(i=>i.installed).length,
    servers:servers.map(({name,version,loader,installed})=>({name,version,loader,installed})),calendarDays:Object.keys(library.playtime?.days||{}).length,sourceFilesUnchanged:true}));
}finally{
  await browser?.close().catch(()=>{});if(proc.exitCode===null)proc.kill();await wait(350);
  await fs.rm(home,{recursive:true,force:true,maxRetries:8,retryDelay:300}).catch(()=>{});
}

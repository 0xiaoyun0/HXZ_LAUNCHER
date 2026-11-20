import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {openSync,closeSync} from 'node:fs';
import {setTimeout as wait} from 'node:timers/promises';
import {chromium} from 'playwright-core';

const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const architecture=process.argv.includes('--ia32')?'ia32':'x64';
const withAccount=process.argv.includes('--fixture-account');
const title='幻想镇 3rd.exe';
const dist=path.resolve(process.env.HXZ3_TEST_DIST||path.join('release',version,'windows-'+architecture));
let exe=path.join(dist,title);
const home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-third-check-'));
const gameRoot=path.join(home,'game'),artifacts=path.resolve('.preview',architecture==='x64'?'':'ia32');
const sampleDays={};
for(const [offset,minutes] of [[0,42],[1,80],[2,24],[4,115],[6,90],[8,25],[11,127],[13,40],[17,65],[22,33],[31,122],[40,83],[42,39],[49,63],[53,31],[61,75],[73,92],[88,24],[94,124],[108,40],[127,68],[141,131],[160,36]]){
  const day=new Date(Date.now()+8*3600000-offset*86400000).toISOString().slice(0,10);sampleDays[day]=minutes*60000;
}
await fs.writeFile(path.join(home,'game-playtime.json'),JSON.stringify({version:2,days:sampleDays}));
const previousSeconds=Object.values(sampleDays).reduce((a,b)=>a+b,0)/1000;
await fs.mkdir(artifacts,{recursive:true});
const names=['云杉谷生存','星港 · 机械动力','暮色群岛','方块工坊'];
for(let n=0;n<325;n++){
 const id=names[n]??('test-world-'+String(n).padStart(3,'0')),folder=path.join(gameRoot,'versions',id);
 await fs.mkdir(folder,{recursive:true});await fs.writeFile(path.join(folder,id+'.json'),JSON.stringify({id,releaseTime:'2025-01-01',mainClass:'net.minecraft.client.main.Main',javaVersion:{majorVersion:17}}));
}
{
 const {default:yazl}=await import('yazl'),{createWriteStream}=await import('node:fs'),{pipeline}=await import('node:stream/promises');
 const zip=new yazl.ZipFile(),output=pipeline(zip.outputStream,createWriteStream(path.join(gameRoot,'versions',names[0],names[0]+'.jar')));
 zip.addBuffer(Buffer.from('Manifest-Version: 1.0\r\n\r\n'),'META-INF/MANIFEST.MF');zip.end();await output;
}
let fixture;
if(withAccount){
 const {communityFixture}=await import('./check-community-session.mjs');
 fixture=await communityFixture(home,dist,title);
 exe=fixture.exe;
}
const jdk=path.join(process.env.ProgramFiles||'C:/Program Files','Java/jdk-17/bin/java.exe');
const javaPath=await fs.access(jdk).then(()=>jdk,()=>'');
if(fixture)await fixture.prepareJava(gameRoot,names[0],javaPath);
await fs.writeFile(path.join(home,'settings.json'),JSON.stringify({gameRoot,javaPath,gameWindowAction:'keep',gameSleep:false,memoryMode:'manual',defaultMemoryMB:512,communityUrl:fixture?.url||'http://127.0.0.1:9',autoReportErrors:false,futureSetting:{keep:42},onboardingDone:true,instanceSettings:{...Object.fromEntries(names.slice(1).map(id=>[id,{favorite:true}])),[names[0]]:{memoryMode:'inherit',memoryMB:2048,jvmArgs:['-Xmx512M']}},selectedInstance:names[1],lastPlayed:{id:names[0],root:gameRoot,startedAt:'2026-11-01T12:00:00Z'}}));
{
 const track='ada80000-0000-4333-8000-000000000001',count=8000*15,buffer=Buffer.alloc(44+count*2);
 buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);
 buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(count*2,40);
 await fs.mkdir(path.join(home,'media'),{recursive:true});await fs.writeFile(path.join(home,'media',track+'.wav'),buffer);
 await fs.writeFile(path.join(home,'music-library.json'),JSON.stringify({items:[{id:track,title:'小镇晨间',artist:'本地音频样本',source:'local',url:'http://hxz-media.localhost/'+track+'.wav'}]}));
}
const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));
const nativeLog=openSync(path.join(artifacts,'native-qa.log'),'w');
const proc=spawn(exe,[],{windowsHide:true,stdio:['ignore',nativeLog,nativeLog],env:{...process.env,HXZ3_QA_INSTANCE:'1',HXZ3_HOME:home,WEBVIEW2_USER_DATA_FOLDER:path.join(home,'webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --remote-debugging-address=127.0.0.1'}});
closeSync(nativeLog);let browser,page;const errors=[];
proc.on('exit',(code,signal)=>console.log('QA launcher exit',code,signal||''));
try {
 const end=Date.now()+60000;let last;
 while(!page&&Date.now()<end){
   if(proc.exitCode!==null)throw Error('启动器提前退出 '+proc.exitCode);
   try{browser??=await chromium.connectOverCDP('http://127.0.0.1:'+port,{timeout:1200});page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost'));}catch(error){last=error;}if(!page)await wait(180);
 }
 if(!page)throw Error('WebView2 未就绪 '+(last?.message||''));
 page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>console.log('QA WebView crashed'));
 page.setDefaultTimeout(10000);
 const native=(action,input={})=>page.evaluate(([a,i])=>window.launcher.invoke(a,i),[action,input]);
 const capture=async name=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(artifacts,name+'.png'),animations:'disabled'});};
 const denied=async action=>{const result=await native(action);assert.equal(result.ok,false,action);assert.match(result.error,/登录|未在本应用/);};
 {
   const nav=page.getByRole('navigation',{name:'主导航'});
   await page.getByRole('heading',{name:'启动游戏',exact:true}).waitFor({timeout:40000});
   assert.deepEqual(await nav.getByRole('link').allTextContents(),['游戏','游戏库','资源','联机大厅']);
   for(const link of await nav.getByRole('link').all())assert.equal(await link.locator('svg').count(),1);
   assert.equal((await native('extension.status')).value.active,false);
   assert.match((await native('community.connect')).error,/社区插件/);
   const state=await native('state',{localOnly:true});assert.equal(state.ok,true,state.error);assert.equal(state.value.instances.length,328);
   assert.equal(state.value.settings.selectedInstance,names[1]);
   const resume=page.locator('.resume-panel');await resume.getByText(names[0],{exact:true}).waitFor();
   const left=await page.locator('.game-summary').boundingBox(),right=await page.locator('.game-primary').boundingBox();
   assert.ok(left.x<42&&Math.abs(left.y-right.y)<2&&right.x>left.x+left.width&&right.x-left.x-left.width<26);
   await page.getByRole('textbox',{name:'搜索实例',exact:true}).fill('test-world-324');await page.getByText('test-world-324',{exact:true}).waitFor();
   await page.getByRole('textbox',{name:'搜索实例',exact:true}).fill('');
   await page.getByRole('button',{name:'一年',exact:true}).click();assert.equal(await page.locator('.calendar-grid i').count(),364);
   await page.getByRole('button',{name:'半年',exact:true}).click();assert.equal(await page.locator('.calendar-grid i').count(),182);
   assert.equal(await page.evaluate(()=>{const rows=[...document.querySelectorAll('.home-instance-row')],card=document.querySelector('.instances-card').getBoundingClientRect(),footer=document.querySelector('.instances-card footer').getBoundingClientRect(),calendar=document.querySelector('.calendar-card').getBoundingClientRect(),search=document.querySelector('.instance-toolbar label').getBoundingClientRect();return rows.every(row=>row.getBoundingClientRect().bottom<=footer.top)&&footer.bottom<=card.bottom+1&&card.bottom<calendar.top&&search.height<=40;}),true,'instance list, footer and calendar must fit in their own panels');
   await capture('launcher-home');
   await resume.getByRole('button',{name:'继续游玩'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
   await denied('game.launch');await denied('lobby.host');await denied('plugins.list');await denied('lyrics.update');
   await page.getByRole('link',{name:'启动前检查',exact:true}).click();
   await page.getByText('版本清单和客户端 JAR 可读取',{exact:true}).waitFor();
   await page.getByText('登录后可以启动游戏',{exact:true}).waitFor();
   assert.equal(await page.locator('.check-row').count(),5);
   await capture('launcher-preflight');
   await page.getByRole('button',{name:'登录账号',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
   await nav.getByRole('link',{name:'游戏库'}).click();
   const cards=page.locator('.direct-game-card');await cards.first().waitFor();assert.equal(await cards.count(),24);
   await page.getByRole('button',{name:'默认服务器',exact:true}).click();await capture('launcher-library');
   await page.getByRole('button',{name:/全部游戏/}).click();await page.getByRole('button',{name:'下一页',exact:true}).click();
   await page.getByRole('textbox',{name:'搜索游戏',exact:true}).fill('test-world-324');
   await page.getByRole('heading',{name:'test-world-324'}).waitFor();assert.equal(await cards.count(),1);
   const menu=()=>page.getByRole('button',{name:'test-world-324的更多操作'}).click();
   await menu();await page.getByRole('menuitem',{name:'收藏',exact:true}).click();
   await menu();await page.getByRole('menuitem',{name:'取消收藏',exact:true}).waitFor();await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'管理 test-world-324',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
   await menu();await page.getByRole('menuitem',{name:'启动前检查',exact:true}).click();
   await page.getByText('没有找到客户端 JAR，清单也没有下载地址',{exact:true}).waitFor();
   await page.getByRole('button',{name:'查看实例'}).click();await page.getByRole('heading',{name:'test-world-324'}).waitFor();
   await nav.getByRole('link',{name:'游戏',exact:true}).click();await resume.getByText(names[0],{exact:true}).waitFor();
   await nav.getByRole('link',{name:'联机大厅'}).click();await page.getByRole('button',{name:'登录账号'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
   await page.keyboard.press('Control+k');await page.getByPlaceholder('搜索实例或功能').fill('启动前检查');await page.locator('.finder-results button').first().click();await page.getByRole('heading',{name:'启动前检查'}).waitFor();
   const memory=await native('memory.compact');assert.equal(memory.ok,true,memory.error);
   await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('heading',{name:'设置',exact:true}).waitFor();
   const amount=page.getByRole('spinbutton',{name:'最大内存 MB'});
   await page.getByLabel('内存分配方式').selectOption('manual');await amount.fill('509');await page.getByRole('button',{name:'保存内存'}).click();await page.getByRole('alert').filter({hasText:'512'}).waitFor();
   await amount.fill('768');await page.getByRole('button',{name:'保存内存'}).click();await page.getByText('已保存，下次启动游戏时生效。').waitFor();
   await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'外观与启动器'}).click();await page.getByLabel('外观',{exact:true}).selectOption('dark');await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
   await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'下载与更新'}).click();await page.getByLabel('下载并发数').selectOption('8');
   await page.waitForFunction(async()=>{const r=await window.launcher.invoke('state',{localOnly:true});return r.value?.settings.downloadConcurrency===8;});
   await page.reload();await page.getByRole('heading',{name:'设置',exact:true}).waitFor();await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'游戏与 Java'}).click();assert.equal(await amount.inputValue(),'768');await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
   await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'外观与启动器'}).click();await page.getByLabel('外观',{exact:true}).selectOption('light');await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'游戏与 Java'}).click();await capture('launcher-settings');
   await page.locator('footer').getByRole('link',{name:'音乐播放器',exact:true}).click();await page.getByRole('button',{name:'播放 小镇晨间',exact:true}).click();
   await page.getByRole('button',{name:'暂停',exact:true}).waitFor();await page.waitForFunction(()=>Number(document.querySelector('input[aria-label="播放进度"]').value)>0);await capture('launcher-music');await nav.getByRole('link',{name:'游戏库'}).click();await page.locator('footer').getByRole('button',{name:'暂停当前音乐'}).click();
   await nav.getByRole('link',{name:'游戏',exact:true}).click();await page.getByRole('link',{name:'游玩记录'}).click();await page.getByRole('heading',{name:'游玩记录',exact:true}).waitFor();
   await nav.getByRole('link',{name:'游戏',exact:true}).click();await page.setViewportSize({width:800,height:565});await resume.getByText(names[0],{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth&&Array.from(document.querySelectorAll('.launcher-bar nav[aria-label="主导航"] a,.window-buttons button,.home-instance-row>button')).every(el=>{const box=el.getBoundingClientRect();return box.left>=0&&box.right<=window.innerWidth;})),true);await capture('launcher-compact');
   const saved=JSON.parse(await fs.readFile(path.join(home,'settings.json'),'utf8'));assert.deepEqual(saved.futureSetting,{keep:42});assert.equal(saved.instanceSettings['test-world-324'].favorite,true);
   if(fixture){
     await page.setViewportSize({width:1250,height:825});await resume.getByRole('button',{name:'继续游玩'}).click();await fixture.login(page);
     await resume.getByRole('button',{name:'继续游玩'}).click();await page.getByRole('button',{name:'收起任务'}).click();
     await resume.getByRole('button',{name:'停止游戏'}).waitFor({timeout:90000});
     const running=(await native('state',{localOnly:true})).value;
     assert.equal(running.settings.lastPlayed.id,names[0]);assert.equal(running.sessions.length,1);
     const marker=path.join(gameRoot,'versions',names[0],'client-started.txt');
     const end=Date.now()+16000;while(!await fs.stat(marker).catch(()=>undefined)&&Date.now()<end)await wait(150);
     const heap=(await fs.readFile(marker,'utf8')).trim().split(' ');assert.equal(heap[0],'-Xmx768M');assert.ok(Math.abs(Number(heap[1])/1048576-768)<32);await wait(1500);await resume.getByRole('button',{name:'停止游戏'}).click();
     await resume.getByRole('button',{name:'继续游玩'}).waitFor();
     await nav.getByRole('link',{name:'联机大厅'}).click();await page.getByRole('navigation',{name:'房间操作'}).waitFor();
     await page.getByRole('button',{name:'创建房间',exact:true}).first().click();
     await page.getByRole('button',{name:'加入伙伴',exact:true}).click();await page.getByPlaceholder('粘贴房主发来的 hxz-room:// 邀请').waitFor();
     await capture('launcher-lobby');
     const timeline=await native('game.playtime');assert.ok(timeline.value.totalSeconds>=previousSeconds+1);
     await page.getByRole('button',{name:'账号与角色',exact:true}).click();await page.getByRole('button',{name:'检测连接'}).click();await page.getByText(/当前角色验证成功/).waitFor();
     fixture.skinOffline(true);await page.getByRole('button',{name:'重新检测'}).click();await page.locator('.issue-help').getByRole('heading',{name:/皮肤站/}).waitFor();
     await capture('skin-recovery');fixture.skinOffline(false);await page.getByRole('button',{name:'重新检测'}).click();await page.getByText(/当前角色验证成功/).waitFor();
     const pluginSettings=async()=>{await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'扩展',exact:true}).click();await page.getByRole('heading',{name:'社区插件',exact:true}).waitFor();};
     const restart=async()=>{
       const closing=new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error('原 WebView2 未在重启时退出')),25000);browser.once('disconnected',()=>{clearTimeout(timer);done();});});
       await page.getByRole('button',{name:'重启启动器',exact:true}).click().catch(()=>{});await closing;
       browser=undefined;page=undefined;const timeout=Date.now()+60000;
       while(!page&&Date.now()<timeout){try{browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{timeout:1200});page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost'));}catch{}if(!page)await wait(250);}
       assert.ok(page,'restart should reopen native launcher');page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
       await page.getByRole('navigation',{name:'主导航'}).waitFor();await page.getByRole('heading',{name:'启动游戏',exact:true}).waitFor();
     };
     await pluginSettings();await capture('launcher-extensions');
     fixture.delivery('offline');await page.getByRole('button',{name:'下载社区插件'}).click();await page.getByText('社区插件下载暂时不可用').waitFor();await page.getByRole('button',{name:'复制给管理员的摘要'}).click();await page.getByText(/已复制脱敏摘要|请选择下方摘要并复制/).waitFor();await capture('extension-recovery');
     fixture.delivery('bad');await page.getByRole('button',{name:'下载社区插件'}).click();await page.getByText('社区插件与启动器版本不匹配').waitFor();assert.equal((await native('extension.status')).value.installed,false);
     console.log('Checked game heap, playtime, skin outage and two rejected plugin downloads');fixture.delivery('good');await page.getByRole('button',{name:'下载社区插件'}).click();await page.getByText('已下载 · 重启后启用').waitFor({timeout:65000});
     assert.equal((await native('extension.status')).value.active,false);assert.equal(await nav.getByRole('link',{name:'社区',exact:true}).count(),0);
     await page.reload();await page.getByRole('button',{name:'重启启动器'}).waitFor();assert.equal((await native('extension.status')).value.active,false);
     console.log('Plugin staged: a WebView reload kept it inactive');await restart();assert.equal((await native('extension.status')).value.active,true);console.log('Community enabled by native restart');
     const reopened=await native('state',{localOnly:true});assert.equal(reopened.value.settings.defaultMemoryMB,768);assert.equal(reopened.value.settings.downloadConcurrency,8);
     await page.setViewportSize({width:780,height:540});
     assert.ok(await page.evaluate(()=>Array.from(document.querySelectorAll('.launcher-bar nav[aria-label="主导航"] a,.window-buttons button')).every(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;})));
     await page.setViewportSize({width:1250,height:825});
     await capture('launcher-enabled-home');await fixture.exercise(page,capture);
     const social=page.getByRole('navigation',{name:'社区导航'});
     await social.getByRole('link',{name:'冒险者协会'}).click();await page.getByRole('heading',{name:'委托广场'}).waitFor();await capture('launcher-guild');
     await social.getByRole('link',{name:'LINKING'}).click();await page.frameLocator('iframe[title*="档案探索"]').locator('body').waitFor();
     await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.title.includes('LINKING'),{},{timeout:25000});await capture('launcher-linking');
     await pluginSettings();await page.getByRole('button',{name:'停用插件'}).click();await page.getByText('已停用 · 重启后生效').waitFor();
     const installedPath=(await native('extension.status')).value.entry;await restart();assert.equal((await native('extension.status')).value.active,false);
     assert.equal(await page.evaluate(async path=>(await fetch('/'+path)).status,installedPath),404);
     console.log('Signed-in launcher: native login, real Java 17 fixture main ran, stop, persisted last played and lobby controls.');
   }
 }
 assert.deepEqual(errors,[]);
 console.log('WebView2 '+architecture+': 328 instances, resume, preflight, guest gates, persistent settings, player, optional extension and navigation verified.');
} catch(error){
 console.error('Host status',proc.exitCode,proc.signalCode);if(page)console.error('Current route:',new URL(page.url()).hash,'Headings:',await page.getByRole('heading').allTextContents().catch(()=>[]));
 throw error;
} finally {
 if(page){await page.screenshot({path:path.join(artifacts,'launcher-last.png')}).catch(()=>{});await page.evaluate(()=>window.launcher.invoke('window.control',{action:'close'})).catch(()=>{});}
 await browser?.close().catch(()=>{});if(proc.exitCode===null)proc.kill();await wait(400);
 // The WebView subprocesses may briefly retain locks after the host exits.
 await fixture?.close();
 await fs.rm(home,{recursive:true,force:true,maxRetries:8,retryDelay:350}).catch(()=>{});
}

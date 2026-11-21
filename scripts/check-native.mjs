import assert from 'node:assert/strict';
import {checkLocalGames,checkCommunityGames,checkGuestCatalog} from './check-desktop-arcade.mjs';
import {checkLiteHome,openFullWorkspace} from './check-desktop-lite.mjs';
import {scan as measureInsets} from './desktop-insets.mjs';
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
const layoutOnly=withAccount&&process.argv.includes('--layout-only');
const startLite=process.argv.includes('--lite');
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
const searchedInstance='石溪驿站';
const names=['云杉谷生存','星港 · 机械动力','暮色群岛','方块工坊'];
for(let n=0;n<325;n++){
 const id=names[n]??(n===324?searchedInstance:'test-world-'+String(n).padStart(3,'0')),folder=path.join(gameRoot,'versions',id);
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
if(layoutOnly){
 const {communityExtension}=await import('../engine/community-extension.mjs');
 const definition=JSON.parse(await fs.readFile('.runtime/community-extension.json','utf8'));
 const zip=path.resolve('release',version,'extensions',definition.name);
 await communityExtension({home,definition,choose:async()=>({filePaths:[zip]})})('extension.import');
}
if(fixture&&!layoutOnly)await fixture.prepareJava(gameRoot,names[0],javaPath);
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
const proc=spawn(exe,startLite?['--lite']:[],{windowsHide:true,stdio:['ignore',nativeLog,nativeLog],env:{...process.env,HXZ3_QA_INSTANCE:'1',HXZ3_QA_BACKGROUND:'1',HXZ3_HOME:home,APPDATA:path.join(home,'roaming'),WEBVIEW2_USER_DATA_FOLDER:path.join(home,'webview'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port='+port+' --remote-debugging-address=127.0.0.1 --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling'}});
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
 const capture=async name=>{
   await page.evaluate(()=>document.fonts.ready);
   if(['skin-recovery','extension-recovery'].includes(name)){
     const {issues}=await page.evaluate(measureInsets);
     assert.deepEqual(issues,[],name+' '+issues.join(' / '));
   }
   await page.screenshot({path:path.join(artifacts,name+'.png'),animations:'disabled'});
 };
 const denied=async action=>{const result=await native(action);assert.equal(result.ok,false,action);assert.match(result.error,/登录|未在本应用/);};
 if(!layoutOnly||startLite)await checkLiteHome(page,native,{names,searchedInstance,capture,cold:startLite});
 if(layoutOnly){
   await page.getByRole('heading',{name:'启动游戏',exact:true}).waitFor();
   await checkGuestCatalog(page);
   await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'小游戏'}).click();
   await page.getByRole('link',{name:'积分排行榜'}).click();
   await page.locator('.login-gate').getByRole('heading',{name:'积分排行榜'}).waitFor();
   assert.equal(await page.locator('.points-ranking').count(),0);
   await page.getByRole('button',{name:'登录账号',exact:true}).click();await fixture.login(page);
   const {verifyDesktopLayout}=await import('./desktop-layout.mjs');await verifyDesktopLayout(page,native,artifacts);
 }else{
   const nav=page.getByRole('navigation',{name:'主导航'});
   await page.getByRole('heading',{name:'启动游戏',exact:true}).waitFor({timeout:40000});
   assert.deepEqual(await nav.getByRole('link').allTextContents(),['游戏','游戏库','资源','联机大厅','小游戏']);
   for(const link of await nav.getByRole('link').all())assert.equal(await link.locator('svg').count(),1);
   assert.equal((await native('extension.status')).value.active,false);
   assert.match((await native('community.connect')).error,/社区插件/);
   await checkLocalGames(page,capture);
   const state=await native('state',{localOnly:true});assert.equal(state.ok,true,state.error);assert.equal(state.value.instances.length,328);
   assert.equal(state.value.settings.selectedInstance,names[1]);
   const presets=page.locator('.home-server-list');
   await presets.locator('a').first().waitFor();
   const expected=['原版生存群组服','模组一服','模组二服'];
   assert.deepEqual(await presets.locator('a span').allTextContents(),expected);
   await presets.getByRole('link',{name:/模组二服/}).click();
   await page.getByRole('heading',{name:'默认服务器',exact:true}).waitFor();
   const selectedServer=page.locator('.default-server-card').first();await selectedServer.getByRole('heading',{name:/^模组二服/}).waitFor();
   await selectedServer.getByText('s3.hxzmc.top',{exact:true}).waitFor();
   await selectedServer.getByRole('button',{name:'安装并进入'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
   if(!fixture){await page.getByRole('button',{name:'刷新服务器配置'}).click();await page.getByText(/服务器配置刷新失败/).first().waitFor();assert.equal(await page.locator('.default-server-card').count(),3);}
   await nav.getByRole('link',{name:'游戏',exact:true}).click();
   const resume=page.locator('.resume-panel');await resume.getByText(names[0],{exact:true}).waitFor();
   const left=await page.locator('.home-role-card').boundingBox(),right=await page.locator('.instances-card').boundingBox();
   assert.ok(left.x<42&&Math.abs(left.y-right.y)<2&&right.x>left.x+left.width&&right.x-left.x-left.width<26);
   await page.getByRole('textbox',{name:'搜索实例',exact:true}).fill(searchedInstance);await page.getByText(searchedInstance,{exact:true}).waitFor();
   await page.getByRole('textbox',{name:'搜索实例',exact:true}).fill('');
   await page.getByRole('button',{name:'一年',exact:true}).click();assert.equal(await page.locator('.calendar-grid i').count(),364);assert.ok(await page.locator('.calendar-months span').count()>=11);
   await page.getByRole('button',{name:'半年',exact:true}).click();assert.equal(await page.locator('.calendar-grid i').count(),182);assert.equal(await page.locator('.calendar-weekdays span').count(),4);
   assert.equal(await page.evaluate(()=>{const rows=[...document.querySelectorAll('.home-instance-row')],card=document.querySelector('.instances-card').getBoundingClientRect(),footer=document.querySelector('.instances-card footer').getBoundingClientRect(),calendar=document.querySelector('.calendar-card').getBoundingClientRect(),search=document.querySelector('.instance-toolbar label').getBoundingClientRect();return rows.every(row=>row.getBoundingClientRect().bottom<=footer.top)&&footer.bottom<=card.bottom+1&&card.bottom<calendar.top&&search.height<=40;}),true,'instance list, footer and calendar must fit in their own panels');
   await capture('launcher-home');
   const calendarDay=page.locator('.calendar-grid a[tabindex="0"]');const label=await calendarDay.getAttribute('aria-label');
   await calendarDay.focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:label.slice(0,10)+' · 本机记录'}).waitFor();
   await nav.getByRole('link',{name:'游戏',exact:true}).click();
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
   await page.getByRole('button',{name:'默认服务器',exact:true}).click();const installLink=page.getByRole('link',{name:'安装游戏',exact:true});
   assert.ok(await installLink.evaluate(el=>{
     const luminance=color=>color.match(/[\d.]+/g).slice(0,3).reduce((sum,n,i)=>{const c=Number(n)/255;return sum+[.2126,.7152,.0722][i]*(c<=.04045?c/12.92:((c+.055)/1.055)**2.4);},0);
     const style=getComputedStyle(el),fg=luminance(style.color),bg=luminance(style.backgroundColor);
     return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)>=4.5;
   }),'library install label must have readable contrast');await capture('launcher-library');
   await page.getByRole('button',{name:/全部游戏/}).click();await page.getByRole('button',{name:'下一页',exact:true}).click();
   await page.getByRole('textbox',{name:'搜索游戏',exact:true}).fill(searchedInstance);
   await page.getByRole('heading',{name:searchedInstance}).waitFor();assert.equal(await cards.count(),1);
   const menu=()=>page.getByRole('button',{name:searchedInstance+'的更多操作'}).click();
   await menu();await page.getByRole('dialog').getByRole('button',{name:'收藏',exact:true}).click();
   await menu();await page.getByRole('dialog').getByRole('button',{name:'取消收藏',exact:true}).waitFor();await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'管理 '+searchedInstance,exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
   await menu();await page.getByRole('dialog').getByRole('button',{name:'启动前检查',exact:true}).click();
   await page.getByText('没有找到客户端 JAR，清单也没有下载地址',{exact:true}).waitFor();
   await page.getByRole('button',{name:'查看实例'}).click();await page.getByRole('heading',{name:searchedInstance}).waitFor();
   await nav.getByRole('link',{name:'游戏',exact:true}).click();await resume.getByText(names[0],{exact:true}).waitFor();
   await nav.getByRole('link',{name:'联机大厅'}).click();await page.getByRole('button',{name:'登录账号'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
   await page.keyboard.press('Control+k');await page.getByPlaceholder('搜索实例或功能').fill('启动前检查');await page.locator('.finder-results button').first().click();await page.getByRole('heading',{name:'启动前检查'}).waitFor();
   const memory=await native('memory.compact');assert.equal(memory.ok,true,memory.error);
   await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('heading',{name:'设置',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'查看已移除实例'}).count(),1,'保留文件移除后，应能从设置找回实例');
   assert.equal((await native('instance.delete',{id:searchedInstance,mode:'logical',confirmed:true})).ok,true);
   await page.getByRole('button',{name:'查看已移除实例'}).click();
   await page.locator('.setting-line').filter({has:page.getByText(searchedInstance,{exact:true})}).getByRole('button',{name:'恢复到游戏库'}).click();
   await page.getByText('当前目录没有可恢复的实例。').waitFor();
   assert.ok((await native('state',{localOnly:true})).value.instances.some(v=>v.id===searchedInstance));
   await fs.access(path.join(gameRoot,'versions',searchedInstance,searchedInstance+'.json'));
   const amount=page.getByRole('spinbutton',{name:'最大内存 MB'});
   await page.getByRole('radio',{name:'手动设置',exact:true}).click();await amount.fill('509');await page.getByRole('button',{name:'保存内存'}).click();await page.getByRole('alert').filter({hasText:'512'}).waitFor();
   await amount.fill('768');await page.getByRole('button',{name:'保存内存'}).click();await page.getByText('已保存，下次启动游戏时生效。').waitFor();
   await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'外观与启动器'}).click();await page.getByRole('radio',{name:'深色',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
   await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'下载与更新'}).click();await page.getByRole('radiogroup',{name:'下载并发数'}).getByRole('radio',{name:'8',exact:true}).click();
   const speed=page.getByRole('slider',{name:'下载总限速'});await speed.focus();await speed.press('Home');for(let i=0;i<3;i++)await speed.press('ArrowRight');await page.getByRole('radio',{name:'国内镜像优先',exact:true}).click();
   await page.waitForFunction(async()=>{const r=await window.launcher.invoke('state',{localOnly:true});return r.value?.settings.downloadConcurrency===8&&r.value.settings.downloadSpeedMBps===2&&r.value.settings.downloadMode==='domestic';});
   await page.reload();await page.getByRole('heading',{name:'设置',exact:true}).waitFor();
   await speed.waitFor();assert.equal(await speed.getAttribute('aria-valuetext'),'2 MiB/s');
   {
     const versionActions=page.locator('.settings-block').filter({has:page.getByRole('heading',{name:'启动器版本'})});
     for(const [name,ready] of [['启动器更新公告','.launcher-updates'],['帮助与反馈','.support-reports']]){
       await versionActions.getByRole('link',{name,exact:true}).click();
       await page.locator(ready).first().waitFor();await page.goBack();
       await versionActions.waitFor();
     }
     await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'联机连接'}).click();
     const address=page.getByRole('textbox',{name:'社区服务地址'}),save=page.getByRole('button',{name:'保存地址'});
     const original=await address.inputValue();
     await address.fill('invalid-address');await save.click();
     assert.equal(await address.evaluate(el=>el.validity.typeMismatch),true);
     assert.equal((await native('state',{localOnly:true})).value.settings.communityUrl,original);
     for(const value of [original+'/settings-check',original]){
       await address.fill(value);await save.click();
       await page.waitForFunction(async expected=>(await window.launcher.invoke('state',{localOnly:true})).value.settings.communityUrl===expected,value);
     }
   }
   await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'游戏与 Java'}).click();assert.equal(await amount.inputValue(),'768');await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
   await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'外观与启动器'}).click();await page.getByRole('radio',{name:'浅色',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'游戏与 Java'}).click();await capture('launcher-settings');
   await page.locator('footer').getByRole('link',{name:'音乐播放器',exact:true}).click();await page.getByRole('button',{name:'播放 小镇晨间',exact:true}).click();
   await page.getByRole('button',{name:'暂停',exact:true}).waitFor();await page.waitForFunction(()=>Number(document.querySelector('input[aria-label="播放进度"]').value)>0);const volumeName=page.locator(' .volume-line>label>span');
   assert.ok(await volumeName.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getClientRects().length===1;}),'volume label should remain on one line');
   await capture('launcher-music');await nav.getByRole('link',{name:'游戏库'}).click();await page.locator('footer').getByRole('button',{name:'暂停当前音乐'}).click();
   await nav.getByRole('link',{name:'游戏',exact:true}).click();await page.getByRole('link',{name:'游玩记录'}).click();await page.getByRole('heading',{name:'游玩记录',exact:true}).waitFor();
   await nav.getByRole('link',{name:'游戏',exact:true}).click();await page.setViewportSize({width:800,height:565});await resume.getByText(names[0],{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth&&Array.from(document.querySelectorAll('.launcher-bar nav[aria-label="主导航"] a,.window-buttons button,.home-instance-row>button')).every(el=>{const box=el.getBoundingClientRect();return box.left>=0&&box.right<=window.innerWidth;})),true);await capture('launcher-compact');
   const saved=JSON.parse(await fs.readFile(path.join(home,'settings.json'),'utf8'));assert.deepEqual(saved.futureSetting,{keep:42});assert.equal(saved.instanceSettings[searchedInstance].favorite,true);
   if(fixture){
     await page.setViewportSize({width:1250,height:825});await resume.getByRole('button',{name:'继续游玩'}).click();await fixture.login(page);
     const launchPanel=startLite?page.locator('.lite-game'):resume;
     if(startLite)await page.getByRole('link',{name:'极简版',exact:true}).click();
     await launchPanel.getByRole('button',{name:'继续游玩'}).click();await page.getByRole('button',{name:'收起任务'}).click();
     await launchPanel.getByRole('button',{name:'停止游戏'}).waitFor({timeout:90000});
     const running=(await native('state',{localOnly:true})).value;
     assert.equal(running.settings.lastPlayed.id,names[0]);assert.equal(running.sessions.length,1);
     const marker=path.join(gameRoot,'versions',names[0],'client-started.txt');
     const end=Date.now()+16000;while(!await fs.stat(marker).catch(()=>undefined)&&Date.now()<end)await wait(150);
     const heap=(await fs.readFile(marker,'utf8')).trim().split(' ');assert.equal(heap[0],'-Xmx768M');assert.ok(Math.abs(Number(heap[1])/1048576-768)<32);await wait(1500);await launchPanel.getByRole('button',{name:'停止游戏'}).click();
     await launchPanel.getByRole('button',{name:'继续游玩'}).waitFor();
     if(startLite)await openFullWorkspace(page);
     await nav.getByRole('link',{name:'联机大厅'}).click();await page.getByRole('navigation',{name:'房间操作'}).waitFor();
     await page.getByRole('button',{name:'创建房间',exact:true}).first().click();
     await page.getByRole('button',{name:'加入伙伴',exact:true}).click();await page.getByPlaceholder('粘贴房主发来的 hxz-room:// 邀请').waitFor();
     await page.getByRole('button',{name:'连接方式与旧版邀请'}).click();const joinSettings=page.getByRole('dialog',{name:'连接方式与旧版邀请'});
     await joinSettings.getByRole('button',{name:'联机游戏实例'}).click();const picker=page.getByRole('dialog',{name:'联机游戏实例'});
     const query=picker.getByRole('textbox',{name:'搜索选项'});await query.fill('not-an-installed-id');await picker.getByText('没有匹配的选项').waitFor();
     await query.fill(searchedInstance);await picker.getByRole('button',{name:new RegExp(searchedInstance)}).click();
     await joinSettings.getByRole('button',{name:'联机游戏实例'}).getByText(searchedInstance,{exact:false}).waitFor();
     await page.keyboard.press('Escape');await joinSettings.waitFor({state:'hidden'});
     await capture('launcher-lobby');
     const originalBoards=(await native('state',{localOnly:true})).value.settings.cardLayouts;
     const oldPackage=(await native('profile.cards')).value;
     const oldLobby=oldPackage?.layout?.cardLayouts?.['multiplayer.wide']||{items:[{i:'network',x:0,y:69,w:6,h:20}],fixed:['network'],hidden:[],locked:[]};
     assert.ok((await native('settings.save',{cardLayouts:{...originalBoards,'multiplayer.wide':oldLobby}})).ok);await page.reload();
     const diagnostics=page.locator('[data-card-id="network"]');await diagnostics.getByRole('button',{name:'测试本机 P2P'}).waitFor();await diagnostics.scrollIntoViewIfNeeded();
     assert.equal(await diagnostics.getAttribute('data-fixed'),null);
     assert.ok(await diagnostics.evaluate(el=>Math.abs(el.getBoundingClientRect().bottom-el.querySelector('.desktop-panel-body').getBoundingClientRect().bottom)<5));
     await capture('legacy-lobby-diagnostics');
     assert.ok((await native('settings.save',{cardLayouts:originalBoards})).ok);await page.reload();await page.getByRole('navigation',{name:'房间操作'}).waitFor();
     const timeline=await native('game.playtime');assert.ok(timeline.value.totalSeconds>=previousSeconds+1);
     await page.getByRole('button',{name:'账号与角色',exact:true}).click();await page.getByRole('button',{name:'检测连接'}).click();await page.getByText(/当前角色验证成功/).waitFor();
     const avatar=await page.locator('.setting-line > .avatar').first().boundingBox();
     assert.ok(avatar&&Math.abs(avatar.width-avatar.height)<1&&avatar.width>=32,'account avatar should be square');
     fixture.skinOffline(true);await page.getByRole('button',{name:'重新检测'}).click();await page.locator('.issue-help').getByRole('heading',{name:/皮肤站/}).waitFor();
     await capture('skin-recovery');fixture.skinOffline(false);await page.getByRole('button',{name:'重新检测'}).click();await page.getByText(/当前角色验证成功/).waitFor();
     await page.getByRole('link',{name:'我的工单',exact:true}).click();
     await page.getByRole('button',{name:'提交反馈',exact:true}).click();
     const feedback=page.getByRole('dialog');
     await feedback.getByPlaceholder('简要说明遇到的问题').fill('本机回归工单');
     await feedback.locator('textarea').first().fill('在临时资料中验证玩家求助和工单回复。');
     await feedback.getByRole('button',{name:'提交',exact:true}).click();
     const ticket=page.getByRole('dialog',{name:'本机回归工单'});await ticket.getByText(/工单编号/).waitFor();
     await ticket.locator('textarea').fill('补充操作已经验证。');await ticket.getByRole('button',{name:'发送回复'}).click();
     await ticket.getByText('补充操作已经验证。',{exact:true}).waitFor();await page.keyboard.press('Escape');
     const pluginSettings=async()=>{await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('navigation',{name:'设置分类'}).getByRole('link',{name:'扩展',exact:true}).click();await page.getByRole('heading',{name:'社区插件',exact:true}).waitFor();};
     const restart=async()=>{
       const base='http://127.0.0.1:'+port,expected=(await native('extension.status')).value.installed;
       const session=await page.context().newCDPSession(page);
       const previous=(await session.send('Target.getTargetInfo')).targetInfo.targetId;
       await session.detach();
       await page.getByRole('button',{name:'重启启动器',exact:true}).click().catch(()=>{});
       page=undefined;const timeout=Date.now()+60000;
       while(!page&&Date.now()<timeout){
         try{
           const targets=await (await fetch(base+'/json/list',{signal:AbortSignal.timeout(1200)})).json();
           const next=targets.find(t=>t.id!==previous&&t.type==='page'&&t.url.includes('tauri.localhost'));
           if(next){
             browser=await chromium.connectOverCDP(base,{timeout:1200});
             for(const candidate of browser.contexts().flatMap(c=>c.pages())){
               if(!candidate.url().includes('tauri.localhost'))continue;
               const child=await candidate.context().newCDPSession(candidate);
               const {targetInfo}=await child.send('Target.getTargetInfo');await child.detach();
               if(targetInfo.targetId===next.id){page=candidate;break;}
             }
           }
         }catch{}
         if(!page)await wait(250);
       }
       assert.ok(page,'restart should reopen native launcher');page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
       await page.getByRole('navigation',{name:'主导航'}).waitFor();
       if(startLite){await page.getByRole('heading',{name:'极简启动',exact:true}).waitFor();await openFullWorkspace(page);}
       await page.getByRole('heading',{name:'启动游戏',exact:true}).waitFor();
       assert.equal((await native('extension.status')).value.active,expected);
     };
     await pluginSettings();await capture('launcher-extensions');
     fixture.delivery('offline');await page.getByRole('button',{name:'下载社区插件'}).click();await page.getByText('社区插件下载暂时不可用').waitFor();await page.getByRole('button',{name:'复制给管理员的摘要'}).click();await page.getByText(/已复制脱敏摘要|请选择下方摘要并复制/).waitFor();await capture('extension-recovery');
     fixture.delivery('bad');await page.getByRole('button',{name:'下载社区插件'}).click();await page.getByText('社区插件与启动器版本不匹配').waitFor();assert.equal((await native('extension.status')).value.installed,false);
     console.log('Checked game heap, playtime, skin outage and two rejected plugin downloads');fixture.delivery('good');await page.getByRole('button',{name:'下载社区插件'}).click();await page.getByText('已下载 · 重启后启用').waitFor({timeout:65000});
     assert.equal((await native('extension.status')).value.active,false);assert.equal(await nav.getByRole('link',{name:'社区',exact:true}).count(),0);
     await page.reload();await page.getByRole('button',{name:'重启启动器'}).waitFor();assert.equal((await native('extension.status')).value.active,false);
     console.log('Plugin staged: a WebView reload kept it inactive');await restart();assert.equal((await native('extension.status')).value.active,true);console.log('Community enabled by native restart');
     const reopened=await native('state',{localOnly:true});assert.equal(reopened.value.settings.defaultMemoryMB,768);assert.equal(reopened.value.settings.downloadConcurrency,8);
     assert.equal(reopened.value.settings.downloadSpeedMBps,2);assert.equal(reopened.value.settings.downloadMode,'domestic');
     const shortcuts=page.getByRole('navigation',{name:'快捷导航'});
     for(const width of [780,850,921,980,981,1121,1231,1250]){
       await page.setViewportSize({width,height:width<900?540:825});
       for(const name of ['音乐播放器','冒险者协会','LINKING 档案馆']){
         assert.ok(await shortcuts.getByRole('link',{name,exact:true}).isVisible(),name+' at '+width);
       }
       const layout=await page.evaluate(()=>{
         const buttons=Array.from(document.querySelectorAll('.launcher-bar a,.launcher-bar button'));
         const boxes=buttons.map(button=>button.getBoundingClientRect());
         return boxes.every((box,index)=>box.width>0&&box.left>=0&&box.right<=innerWidth&&(!index||box.left>=boxes[index-1].right-1));
       });
       assert.ok(layout,'titlebar controls overlap at '+width);
     }
     const roleText=page.locator('.bar-role-name');
     assert.ok(await roleText.evaluate(el=>getComputedStyle(el).whiteSpace==='nowrap'&&el.scrollWidth<=el.clientWidth+1),'four-character player name should fit on one line');
     await capture('launcher-enabled-home');await checkCommunityGames(page,capture,fixture);await fixture.exercise(page,capture);
     const social=page.getByRole('navigation',{name:'社区导航'});
     await social.getByRole('button',{name:'全部栏目'}).click();await page.getByRole('dialog',{name:'社区栏目'}).getByRole('link',{name:'冒险者协会'}).click();await page.getByRole('heading',{name:'委托广场'}).waitFor();await capture('launcher-guild');
     await social.getByRole('button',{name:'全部栏目'}).click();await page.getByRole('dialog',{name:'社区栏目'}).getByRole('link',{name:'LINKING 档案馆'}).click();await page.frameLocator('iframe[title*="档案探索"]').locator('body').waitFor();
     await page.waitForFunction(()=>document.querySelector('iframe')?.contentDocument?.title.includes('LINKING'),{},{timeout:25000});await capture('launcher-linking');
     if(process.argv.includes('--layout')){
       const {verifyDesktopLayout}=await import('./desktop-layout.mjs');await verifyDesktopLayout(page,native,artifacts);
       await native('settings.save',{fontSize:16,theme:'light',animationSpeed:1});await page.setViewportSize({width:1250,height:825});await page.reload();
     }
     await pluginSettings();await page.getByRole('button',{name:'停用插件'}).click();await page.getByText('已停用 · 重启后生效').waitFor();
     const installedPath=(await native('extension.status')).value.entry;await restart();assert.equal((await native('extension.status')).value.active,false);
     assert.equal(await page.evaluate(async path=>(await fetch('/'+path)).status,installedPath),404);
     console.log('Signed-in launcher: native login, real Java 17 fixture main ran, stop, persisted last played and lobby controls.');
   }
 }
 assert.deepEqual(errors,[]);
 if(!layoutOnly)console.log('WebView2 '+architecture+': 328 instances, resume, preflight, guest gates, persistent settings, player, optional extension and navigation verified.');
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

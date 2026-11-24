import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {randomInt,randomUUID} from 'node:crypto';
import {chromium} from 'playwright-core';
import {createCommunity} from '../community-server/src/server.mjs';
import {checkPersonalization} from './tests/check-personalization.mjs';
import {checkSharedPlay} from './tests/check-shared-play.mjs';

// Windows can assign a browser-blocked low port when asked for port zero.
async function listenForBrowser(server){
  for(let attempt=0;attempt<12;attempt++){
    try{
      const ready=once(server,'listening');
      server.listen(randomInt(49152,65536),'127.0.0.1');
      await ready;
      return;
    }catch(error){if(error.code!=='EADDRINUSE'||attempt===11)throw error;}
  }
}

const dir=path.resolve('.runtime/town-android-assets/town');
async function capture(page,name){
  if(!process.env.HXZ_ANDROID_PREVIEW)return;
  await page.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));
  });
  await page.screenshot({path:path.join(process.env.HXZ_ANDROID_PREVIEW,name)});
}
const home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-android-community-'));
const uid=randomUUID().replaceAll('-',''),name='TownMobileQA',admin=randomUUID().replaceAll('-','');
const assets=http.createServer(async(req,res)=>{
  const file=path.resolve(dir,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(dir+path.sep)){res.writeHead(404).end();return;}
  try{
    const mime={'.svg':'image/svg+xml','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.wasm':'application/wasm'};
    const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404).end();}
});
await listenForBrowser(assets);
const origin='http://127.0.0.1:'+assets.address().port;
const service=createCommunity({data:home,origins:[origin],adminIDs:[admin],exchange:async input=>({
  selectedProfile:input.clientToken==='fixture-admin'?{id:admin,name:'TownAdminQA'}:{id:uid,name},accessToken:'fixture-skin',clientToken:'fixture-client'
})});
let browser,page;
try{
  await listenForBrowser(service.server);
  const base='http://127.0.0.1:'+service.server.address().port;
  const auth=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(auth.status,200);
  const {token,user}=await auth.json();
  const adminSession=await (await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientToken:'fixture-admin'})})).json();
  browser=await chromium.launch({channel:'msedge',headless:true});
  page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const initialImages=[];
  page.on('request',request=>{if(request.resourceType()==='image'&&new URL(request.url()).protocol.startsWith('http'))initialImages.push(request.url());});
  const noticeId=randomUUID();
  service.db.prepare('INSERT INTO notices VALUES(?,?,?,?,?,?)').run(noticeId,'mod-1','模组一服开服活动','从本公告进入模组一服。',name,Date.now());
  await page.addInitScript(({base,token,user})=>{
    const bridge=new EventTarget();
    bridge.postMessage=async data=>{
      const {id,action,input}=JSON.parse(data);
      const session=localStorage.getItem('test-player')==='true';
      let value;
      if(action==='android.legal')value=localStorage.getItem('accepted')==='yes';
      if(action==='android.appearance.bars')value=true;
      if(action==='android.legal.read')value='测试协议正文';
      if(action==='android.legal.accept'){localStorage.setItem('accepted','yes');value=true;}
      if(['android.device.tools','android.voice.overlay','android.widget.pin'].includes(action)){
        if(action==='android.voice.overlay'&&(!input.enabled||sessionStorage.getItem('overlay-permission')))localStorage.setItem('overlay-enabled',String(input.enabled));
        value={overlay:localStorage.getItem('overlay-enabled')==='true',permission:!!sessionStorage.getItem('overlay-permission'),canPin:true,widgets:0,
          hint:action==='android.widget.pin'?'请在桌面确认添加幻想镇小组件。':''};
      }
      const task=()=>JSON.parse(sessionStorage.getItem('task')||'{"phase":"idle"}');
      if(action==='android.game.state')value=task();
      if(action==='android.game.list')value=['测试实例','另一实例'];
      if(action==='android.game.options'||action==='android.game.options.save'){
        const key='options:'+input.instance;
        value=JSON.parse(localStorage.getItem(key)||'{"enabled":false,"physicalMiB":7600,"availableMiB":3100,"swapMiB":8192,"freeSwapMiB":5900,"isolated":true,"mobileGraphics":false,"modelsEnabled":false,"modelsAvailable":true,"supportsZink":true,"itemSearch":false,"last":null}');
        if(action.endsWith('.save')){
          if(sessionStorage.getItem('reject-save')){sessionStorage.removeItem('reject-save');bridge.onmessage?.({data:JSON.stringify({id,ok:false,error:'内存选项没有保存，请重试。'})});return;}
          if(input.option==='renderer'||input.option==='tier')value[input.option]=input[input.option];
          else value[{swap:'enabled',graphics:'mobileGraphics',models:'modelsEnabled',itemSearch:'itemSearch'}[input.option]]=input.enabled;
          localStorage.setItem(key,JSON.stringify(value));
        }
      }
      if(action==='android.game.versions')value=['1.21.1','1.16.5'];
      if(action==='android.game.respond'&&input.ticket==='qa'&&input.value==='second'){
        value={phase:'working',ticket:'qa',server:'HXZ-mod-1',title:'正在校验和补全游戏文件'};sessionStorage.setItem('task',JSON.stringify(value));
      }
      if(action==='android.game.cancel'){value={phase:'idle'};sessionStorage.setItem('task',JSON.stringify(value));}
      if(action==='android.identity')value=session?user:{};
      if(action==='android.account'){
        if(localStorage.getItem('test-cancel')){localStorage.removeItem('test-cancel');value={canceled:true};}
        else{localStorage.setItem('test-player','true');value=user;}
      }
      if(action==='community.connect'&&session)value={token,user,base};
      if(action.startsWith('android.directory'))value=(await (await fetch(base+'/api/server-presets')).json()).servers;
      if(action==='android.directory.refresh')sessionStorage.setItem('qa-lobby-refreshes',String(Number(sessionStorage.getItem('qa-lobby-refreshes')||0)+1));
      if(action==='android.server.profile'){
        if(sessionStorage.getItem('offline-profile')){bridge.onmessage?.({data:JSON.stringify({id,ok:false,error:'暂时无法核对版本'})});return;}
        value={id:input.server,version:'1.21.1',loader:'neoforge',loaderVersion:'21.1.250',profileState:'fresh',profileSource:'hxzup'};
      }
      if(action==='android.notices'||action==='android.topics')value=[];
      if(action==='android.topics.refresh')value=(await(await fetch(base+'/api/public/v1/forum?limit=4')).json()).items;
      if(action==='android.notices.refresh')value=(await (await fetch(base+'/api/public/v1/notices')).json()).items.map(n=>({...n,serverId:'HXZ-'+n.groupId}));
      if(action==='android.join'&&session&&input.uid===user.uid&&input.server==='HXZ-mod-1'){
        localStorage.setItem('test-joined',JSON.stringify(input));
        value={phase:'choice',title:'选择进入模组一服的实例',server:input.server,ticket:'qa',step:1,options:[{value:'first',label:'测试实例一'},{value:'second',label:'测试实例二'}]};
        sessionStorage.setItem('task',JSON.stringify(value));
      }
      bridge.onmessage?.({data:JSON.stringify({id,ok:value!==undefined,value})});
    };
    window.TownNative=bridge;
  },{base,token,user});
  await page.goto(origin+'/index.html');
  await page.getByRole('button',{name:'同意并进入社区'}).waitFor();
  assert.equal(await page.locator('.town-welcome img,.town-welcome video').count(),0);
  await page.getByRole('button',{name:'阅读隐私政策'}).click();
  await page.getByText('测试协议正文').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'关闭'}).click();
  await page.getByRole('button',{name:'同意并进入社区'}).click();
  await page.getByRole('heading',{name:'社区大厅',exact:true}).waitFor();
  await page.getByRole('link',{name:/原版生存群组服/}).waitFor();
  assert.equal(await page.locator('.town-shell img, .town-shell video').count(),0,'新安装的大厅保持纯色和文字');
  assert.deepEqual(initialImages,[],'首次打开不下载配图');
  assert.equal(await page.locator('.town-hall-cover').count(),0,'首次打开使用简洁大厅');
  assert.equal(await page.locator('.town-server-mark svg').count(),3);
  for(const [width,height] of [[320,720],[360,800],[412,915],[800,420]]){
    await page.setViewportSize({width,height});
    const fits=await page.evaluate(()=>{
      const el=document.querySelector('.town-bar'),items=[...el.children].map(c=>c.getBoundingClientRect());
      const tabs=document.querySelector('nav[aria-label="社区导航"]'),title=document.querySelector('.town-lobby h1');
      if(!title||!tabs)return false;
      const a=title.getBoundingClientRect(),b=tabs.getBoundingClientRect();
      const separate=b.bottom<=a.top+1;
      const controls=[...tabs.children].map(c=>c.getBoundingClientRect());
      const brand=el.querySelector('.brand-home strong');
      const bars=document.querySelectorAll('nav[aria-label="主导航"]');if(bars.length!==1)return false;
      const bar=bars[0],bottom=bar.classList.contains('town-nav-bottom'),navRect=bar.getBoundingClientRect(),main=document.querySelector('.town-main').getBoundingClientRect();
      const primary=[...bar.querySelectorAll('a')].every(link=>{
        const box=link.getBoundingClientRect(),icon=link.querySelector('svg').getBoundingClientRect(),label=link.lastElementChild.getBoundingClientRect();
        return box.width>=43&&box.height>=43&&label.width>0&&label.left>=box.left-1&&label.right<=box.right+1&&
          (bottom?icon.bottom<=label.top+1:icon.right<=label.left+1);
      })&&(bottom?navRect.top>=main.bottom-1:navRect.bottom<=main.top+1);
      return separate&&primary&&brand.getBoundingClientRect().width>0&&controls.every(r=>r.left>=0&&r.right<=innerWidth+1&&r.height>=43)&&document.documentElement.scrollWidth<=innerWidth+1 && items.every((r,i)=>r.left>=0&&r.right<=innerWidth+1&&(!i||items[i-1].right<=r.left+1));
    });
    assert.ok(fits,'Android navigation fits '+width+'×'+height);
  }
  await page.setViewportSize({width:390,height:844});
  const touch=await page.context().newCDPSession(page);
  async function swipe(x,y,dx,dy){
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(const step of [.25,.5,.75,1])await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step,y:y+dy*step}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  const refreshCount=()=>page.evaluate(()=>Number(sessionStorage.getItem('qa-lobby-refreshes')));
  const previousRefresh=await refreshCount();
  await swipe(190,270,60,10);
  assert.equal(await refreshCount(),previousRefresh,'横向移动不会刷新大厅');
  await swipe(190,270,0,110);
  await page.waitForFunction(n=>Number(sessionStorage.getItem('qa-lobby-refreshes'))===n+1,previousRefresh);
  await page.getByRole('button',{name:'自定义社区大厅'}).click();
  const sheet=page.getByRole('dialog');
  await sheet.getByRole('tab',{name:'首页卡片'}).click();
  const rows=sheet.locator('.town-edit-card');
  const grip=await rows.first().locator('.town-grip').boundingBox(),target=await rows.nth(1).boundingBox();
  const x=grip.x+grip.width/2,y=grip.y+grip.height/2;
  await swipe(x,y,0,target.y+target.height*.65-y);
  await page.waitForFunction(()=>document.querySelector('.town-edit-card strong')?.textContent==='服务器公告');
  await sheet.getByRole('button',{name:'恢复默认顺序与显示'}).click();
  const header=await sheet.locator('header').boundingBox();
  const sheetBox=await sheet.boundingBox();
  assert.ok(sheetBox.x<=1&&Math.abs(sheetBox.width-390)<=1&&Math.abs(sheetBox.y+sheetBox.height-844)<=1,'手机面板贴合两侧与底边');
  await swipe(header.x+header.width/2,header.y+12,0,100);
  await sheet.waitFor({state:'hidden'});
  await touch.detach();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='off');
  assert.equal(await page.locator('.town-nav-track i').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='on');
  const mainNav=page.getByRole('navigation',{name:'主导航'});
  await mainNav.getByRole('link',{name:'我的',exact:true}).click();
  const overlay=page.getByRole('switch',{name:'语音悬浮控件'});
  await overlay.click();
  assert.equal(await overlay.getAttribute('aria-checked'),'false','系统尚未授权时保持关闭');
  await page.evaluate(()=>sessionStorage.setItem('overlay-permission','1'));await overlay.click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="语音悬浮控件"]').getAttribute('aria-checked')==='true');
  await page.reload();await overlay.click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="语音悬浮控件"]').getAttribute('aria-checked')==='false');
  await page.getByRole('button',{name:'添加',exact:true}).click();await page.getByText('请在桌面确认添加幻想镇小组件。').waitFor();
  await capture(page,'android-profile.png');
  await page.getByRole('button',{name:'外观与动效',exact:true}).click();
  await capture(page,'android-appearance.png');
  await page.getByRole('button',{name:'星海观测站'}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.skin==='observatory');
  await page.getByRole('switch',{name:'减少动态效果'}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='off');
  await page.reload();
  await page.getByRole('button',{name:'外观与动效',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'星海观测站'}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('switch',{name:'减少动态效果'}).getAttribute('aria-checked'),'true');
  await page.getByRole('switch',{name:'减少动态效果'}).click();
  await page.getByRole('button',{name:'纸上工坊'}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.skin==='paper');
  await page.getByRole('button',{name:'小镇微光'}).click();
  assert.equal(await page.evaluate(()=>window.dispatchEvent(new Event('town-back',{cancelable:true}))),false);
  await page.getByRole('dialog',{name:'外观与动效'}).waitFor({state:'hidden'});
  await mainNav.getByRole('link',{name:'社区',exact:true}).click();
  await checkPersonalization(page);
  await mainNav.getByRole('link',{name:'游戏',exact:true}).click();
  await page.getByRole('navigation',{name:'游戏内容'}).getByRole('link',{name:'游戏任务'}).click();
  await page.getByRole('heading',{name:'当前没有游戏任务'}).waitFor();
  await mainNav.getByRole('link',{name:'社区'}).click();
  await capture(page,'android-town-community.png');
  await page.getByRole('link',{name:/模组一服开服活动/}).click();
  await page.getByRole('heading',{name:'模组一服开服活动'}).waitFor();
  assert.ok(page.url().includes('/town/world/HXZ-mod-1?notice='));
  assert.equal(await page.getByRole('navigation',{name:'社区导航'}).count(),0);
  const titleGap=await page.locator('.town-world-title').evaluate(header=>header.querySelector('h1').getBoundingClientRect().left-header.querySelector('.town-server-mark').getBoundingClientRect().right);
  assert.ok(titleGap>=6&&titleGap<=20,'服务器图标与标题应成组排列');
  await page.getByText('1.21.1 · NeoForge · 21.1.250',{exact:true}).waitFor();
  await page.evaluate(()=>sessionStorage.setItem('offline-profile','1'));
  await page.reload();
  await page.getByRole('button',{name:'重新核对整合包'}).waitFor();
  await page.evaluate(()=>sessionStorage.removeItem('offline-profile'));
  await page.getByRole('button',{name:'重新核对整合包'}).click();
  await page.getByText('HXZUP · 已核对',{exact:true}).waitFor();
  await page.evaluate(()=>localStorage.setItem('test-cancel','true'));
  await page.getByRole('button',{name:'登录并进入服务器'}).click();
  await page.getByRole('button',{name:'登录并进入服务器'}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('test-joined')),null);
  await page.getByRole('button',{name:'登录并进入服务器'}).click();
  await page.waitForFunction(()=>!!localStorage.getItem('test-joined'));
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-joined'))),{server:'HXZ-mod-1',uid});
  await capture(page,'android-town-select.png');
  await page.getByRole('button',{name:'测试实例二'}).click();
  await page.getByRole('heading',{name:'正在校验和补全游戏文件'}).waitFor();
  await mainNav.getByRole('link',{name:'游戏',exact:true}).click();
  await page.getByRole('heading',{name:'正在校验和补全游戏文件'}).waitFor();
  await page.getByRole('button',{name:'取消',exact:true}).click();
  const openOptions=()=>page.getByRole('button',{name:'测试实例 实例设置'}).click();
  const swap=page.getByRole('switch',{name:'将系统虚拟内存计入游戏预算'});
  await openOptions();
  assert.equal(await swap.getAttribute('aria-checked'),'false');
  await page.getByRole('tab',{name:'画质与加载'}).click();
  for(const name of ['手机画质','按需加载模型','低内存物品搜索']){
    await page.getByRole('switch',{name,exact:true}).click();
    await page.waitForFunction(label=>document.querySelector('[role=switch][aria-label="'+label+'"]')?.getAttribute('aria-checked')==='true',name);
  }
  await page.getByRole('button',{name:'MobileGlues'}).click();
  await page.waitForFunction(()=>document.querySelector('.town-renderers [aria-pressed=true]')?.textContent==='MobileGlues');
  await page.getByRole('tab',{name:'内存',exact:true}).click();
  await swap.click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="将系统虚拟内存计入游戏预算"]')?.getAttribute('aria-checked')==='true');
  await page.getByRole('button',{name:'加大 · 最多 2 GiB'}).click();
  await page.reload();
  await page.getByRole('dialog',{name:'实例设置'}).waitFor();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'另一实例 实例设置'}).click();
  assert.equal(await swap.getAttribute('aria-checked'),'false');
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await openOptions();
  assert.equal(await swap.getAttribute('aria-checked'),'true');
  await page.getByRole('tab',{name:'画质与加载'}).click();
  assert.equal(await page.getByRole('switch',{name:'低内存物品搜索'}).getAttribute('aria-checked'),'true');
  assert.equal(await page.getByRole('button',{name:'MobileGlues'}).getAttribute('aria-pressed'),'true');
  await page.getByRole('tab',{name:'画质与加载'}).press('Home');
  await page.getByRole('tabpanel',{name:'内存'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'加大 · 最多 2 GiB'}).getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>sessionStorage.setItem('reject-save','1'));
  await swap.click();await page.getByRole('alert').filter({hasText:'内存选项没有保存'}).waitFor();
  assert.equal(await swap.getAttribute('aria-checked'),'true');
  await swap.click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="将系统虚拟内存计入游戏预算"]')?.getAttribute('aria-checked')==='false');
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.evaluate(()=>{
    const key='options:测试实例',saved=JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key,JSON.stringify({...saved,enabled:true,swapMiB:0,freeSwapMiB:0,customHeap:true}));
  });
  await openOptions();
  assert.equal(await swap.isEnabled(),true,'an unsupported setting can always be switched off');
  await swap.click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="将系统虚拟内存计入游戏预算"]')?.disabled===true);
  assert.equal(await swap.getAttribute('aria-checked'),'false');
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>{document.documentElement.style.fontSize='19px';});
  await openOptions();
  await page.getByRole('tab',{name:'画质与加载'}).click();
  const renderer=page.getByRole('button',{name:'MobileGlues'});
  await renderer.scrollIntoViewIfNeeded();
  const inside=await renderer.evaluate(el=>{
    const dialog=el.closest('[role=dialog]'),body=dialog.querySelector('.modal-body');
    const control=el.getBoundingClientRect(),panel=body.getBoundingClientRect();
    return document.documentElement.scrollWidth<=innerWidth+1&&dialog.scrollWidth<=dialog.clientWidth+1&&
      control.left>=panel.left&&control.right<=panel.right+1&&control.top>=panel.top-1&&control.bottom<=panel.bottom+1;
  });
  assert.ok(inside,'窄屏大字下的渲染器按钮可完整滚入弹窗');
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'下载游戏',exact:true}).click();
  await page.getByRole('textbox',{name:'查找版本'}).fill('1.21');
  await page.getByText('1.21.1',{exact:true}).waitFor();
  await page.goBack();
  await page.reload();
  await page.getByRole('button',{name:'进入服务器',exact:true}).waitFor();
  await page.evaluate(()=>{
    sessionStorage.setItem('task',JSON.stringify({phase:'error',server:'HXZ-mod-1',instance:'测试实例',title:'上次游戏因手机内存不足退出'}));
    window.dispatchEvent(new Event('town-game'));
  });
  await page.getByRole('link',{name:'调整实例设置'}).click();
  await page.getByRole('dialog',{name:'实例设置'}).getByText('测试实例',{exact:true}).waitFor();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('heading',{name:'模组一服',exact:true}).waitFor();
  await page.getByRole('link',{name:'社区大厅',exact:true}).click();
  await page.getByRole('link',{name:'聊天',exact:true}).click();
  const message='安卓版社区回声 '+randomUUID().slice(0,8);
  const composer=page.locator('.social-chat textarea').first();
  await composer.waitFor();
  await page.waitForFunction(()=>!document.querySelector('.social-connection'));
  assert.equal(await page.getByRole('button',{name:'查看更早的消息'}).count(),0,'空聊天室不应该显示历史分页');
  await composer.fill(message);await composer.press('Enter');
  await page.locator('.chat-history').getByText(message,{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'查看更早的消息'}).count(),0,'新收到的第一条消息之前没有历史记录');
  const roster=page.getByRole('navigation',{name:'聊天频道'}).getByRole('button',{name:/此刻在线/});
  await roster.click();
  await page.getByRole('dialog',{name:'此刻在线'}).locator('.person').filter({hasText:name}).waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'关闭'}).click();
  const chatBounds=await page.locator('.chat-main').boundingBox(),statusBounds=await page.locator('.town-nav-bottom').boundingBox();
  assert.ok(Math.abs(statusBounds.y-(chatBounds.y+chatBounds.height))<2,'消息区与底栏无空白层');
  const inputBounds=await page.locator('.chat-composer').boundingBox();
  assert.ok(statusBounds.y-inputBounds.y-inputBounds.height<14,'手机输入框靠近底栏');
  for(const size of [{width:320,height:568},{width:390,height:844}]){
    await page.setViewportSize(size);
    assert.ok(await page.locator('.chat-composer-tools .composer-tool,.chat-send,.town-members-slot button').evaluateAll(buttons=>
      buttons.length>=3&&buttons.every(el=>{const b=el.getBoundingClientRect();return b.height>=47.9&&b.width>=47.9&&b.left>=0&&b.right<=innerWidth+1;})),'窄屏聊天按钮完整且至少 48 CSS 像素');
  }
  const nav=page.getByRole('navigation',{name:'社区导航'});
  await capture(page,'android-community-chat.png');
  await mainNav.getByRole('link',{name:'社区',exact:true}).click();
  const directoryButton=nav.getByRole('button',{name:'全部栏目'});
  await directoryButton.click();
  assert.equal(await page.getByRole('dialog').getByRole('link',{name:'聊天',exact:true}).getAttribute('href'),'#/community');
  const cssFiles=(await fs.readdir(path.join(dir,'assets'))).filter(name=>name.endsWith('.css'));
  assert.equal(cssFiles.length,1,'手机共享样式在同一层叠顺序中编译');
  const compiled=await fs.readFile(path.join(dir,'assets',cssFiles[0]),'utf8');
  assert.doesNotMatch(compiled,/@layer\b/,'旧 WebView 必须能读取所有组件规则');
  const geometry=await page.getByRole('dialog').evaluate(dialog=>{
    const rect=dialog.getBoundingClientRect(), shade=document.querySelector('.modal-backdrop').getBoundingClientRect();
    return {
      inside:rect.width>0&&rect.height>0&&rect.left>=0&&rect.top>=0&&rect.right<=innerWidth+1&&rect.bottom<=innerHeight+1,
      covered:shade.left<=0&&shade.top<=0&&shade.right>=innerWidth-1&&shade.bottom>=innerHeight-1
    };
  });
  assert.deepEqual(geometry,{inside:true,covered:true},'栏目弹窗和遮罩在旧 WebView 里应位于当前视口');
  await page.getByRole('dialog').getByRole('button',{name:'关闭'}).click({trial:true});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='全部栏目');
  await nav.getByRole('link',{name:'论坛',exact:true}).click();
  await page.getByRole('heading',{name:'社区论坛',exact:true}).waitFor();
  for(const [label,section] of [['冒险者协会','.guild-viewport'],['LINKING 档案馆','.archive-viewport'],['积分排行榜','.points-ranking'],['我的积分','.social-content']]){
    await mainNav.getByRole('link',{name:'社区',exact:true}).click();
    await nav.getByRole('button',{name:'全部栏目'}).click();
    await page.getByRole('dialog').getByRole('link',{name:label,exact:true}).click();
    await page.locator(section).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,label+' phone width');
  }
  const insert=service.db.prepare('INSERT INTO messages(channel,uid,name,body,created) VALUES(?,?,?,?,?)');
  const desktopDevice=await fetch(base+'/api/hub/devices',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({id:'desktop-qa',name:'接续测试电脑',platform:'desktop'})});
  assert.ok(desktopDevice.ok);
  await mainNav.getByRole('link',{name:'我的',exact:true}).click();
  await page.getByRole('link',{name:'多端接续'}).click();
  await page.getByRole('button',{name:'登记这台手机'}).click();
  await page.getByText('这台手机',{exact:true}).waitFor();
  await page.getByRole('button',{name:'发送待办',exact:true}).click();
  await page.getByRole('button',{name:'模组二服',exact:true}).click();
  await page.getByRole('button',{name:'发送安装待办'}).click();
  await page.getByText('安装模组二服',{exact:true}).waitFor();
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByText(/已取消 · 接续测试电脑/).waitFor();
  const seed=n=>insert.run('lobby',uid,name,'记录 '+n,Date.now());
  const count=Number(service.db.prepare("SELECT count(*) AS n FROM messages WHERE channel='lobby'").get().n);
  for(let i=count+1;i<=100;i++)seed(i);
  const historyURL=r=>r.url().includes('/api/chat/history?before=');
  const opening=page.waitForResponse(historyURL);
  await page.goto(origin+'/index.html#/community');
  await page.reload();
  assert.deepEqual((await (await opening).json()).items,[]);
  assert.equal(await page.locator('.chat-history [data-message]').count(),100);
  assert.equal(await page.getByRole('button',{name:'查看更早的消息'}).count(),0);
  seed(101);seed(102);
  await page.route('**/api/chat/history?before=*',route=>route.abort('failed'),{times:1});
  await page.reload();
  await page.getByRole('button',{name:'重试读取聊天记录'}).click();
  await page.getByRole('button',{name:'查看更早的消息'}).click();
  await page.locator('.chat-history').getByText(message,{exact:true}).waitFor();
  assert.equal(await page.locator('.chat-history [data-message]').count(),102);
  assert.equal(await page.getByRole('button',{name:'查看更早的消息'}).count(),0);
  await checkSharedPlay(page,service,base,user,adminSession.token);
  assert.deepEqual(errors,[]);
  console.log('Android 社区页面通过：横竖屏与窄屏大字、个性化媒体与卡片保存恢复、三套外观与减少动效、返回键、公告与公开版本核对、任务、实例设置、角色及社区功能。');
}catch(error){
  if(page)console.error(page.url(),await page.evaluate(()=>({nav:document.querySelector('.social-sections')?.textContent,dialog:document.querySelector('[role=dialog]')?.textContent})).catch(()=>({})));
  throw error;
}finally{
  await browser?.close();await service.close();await new Promise(r=>assets.close(r));
  if(path.dirname(home)===os.tmpdir()&&path.basename(home).startsWith('hxz-android-community-'))await fs.rm(home,{recursive:true,force:true,maxRetries:4});
}

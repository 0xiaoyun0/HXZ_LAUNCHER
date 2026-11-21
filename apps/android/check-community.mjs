import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {randomInt,randomUUID} from 'node:crypto';
import {chromium} from 'playwright-core';
import {createCommunity} from '../community-server/src/server.mjs';

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
const home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-android-community-'));
const uid=randomUUID().replaceAll('-',''),name='移动测试旅人';
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
const service=createCommunity({data:home,origins:[origin],exchange:async()=>({selectedProfile:{id:uid,name},accessToken:'fixture-skin',clientToken:'fixture-client'})});
let browser,page;
try{
  await listenForBrowser(service.server);
  const base='http://127.0.0.1:'+service.server.address().port;
  const auth=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(auth.status,200);
  const {token,user}=await auth.json();
  browser=await chromium.launch({channel:'msedge',headless:true});
  page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const noticeId=randomUUID();
  service.db.prepare('INSERT INTO notices VALUES(?,?,?,?,?,?)').run(noticeId,'mod-1','模组一服开服活动','从本公告进入模组一服。',name,Date.now());
  await page.addInitScript(({base,token,user})=>{
    const bridge=new EventTarget();
    bridge.postMessage=async data=>{
      const {id,action,input}=JSON.parse(data);
      const session=localStorage.getItem('test-player')==='true';
      let value;
      if(action==='android.legal')value=localStorage.getItem('accepted')==='yes';
      if(action==='android.legal.read')value='测试协议正文';
      if(action==='android.legal.accept'){localStorage.setItem('accepted','yes');value=true;}
      const task=()=>JSON.parse(sessionStorage.getItem('task')||'{"phase":"idle"}');
      if(action==='android.game.state')value=task();
      if(action==='android.game.list')value=['测试实例'];
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
  await page.getByRole('button',{name:'阅读隐私政策'}).click();
  await page.getByText('测试协议正文').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'关闭'}).click();
  await page.getByRole('button',{name:'同意并进入社区'}).click();
  await page.getByRole('heading',{name:'社区大厅',exact:true}).waitFor();
  await page.getByRole('link',{name:/原版生存群组服/}).waitFor();
  await page.locator('.brand-home img').evaluate(img=>img.decode());
  for(const [width,height] of [[320,720],[360,800],[412,915],[800,420]]){
    await page.setViewportSize({width,height});
    const fits=await page.evaluate(()=>{
      const el=document.querySelector('.town-bar'),items=[...el.children].map(c=>c.getBoundingClientRect());
      const tabs=document.querySelector('nav[aria-label="社区导航"]'),heading=tabs?.closest('header'),title=heading?.querySelector('h1');
      if(!title||getComputedStyle(tabs).backgroundColor!=='rgba(0, 0, 0, 0)')return false;
      const a=title.getBoundingClientRect(),b=tabs.getBoundingClientRect();
      const separate=a.right<=b.left+1||a.bottom<=b.top+1;
      const controls=[...tabs.children].map(c=>c.getBoundingClientRect());
      const brand=el.querySelector('.brand-home strong');
      const primary=[...el.querySelectorAll('nav a')].every(link=>{
        const box=link.getBoundingClientRect(),icon=link.querySelector('svg').getBoundingClientRect(),label=link.querySelector('span').getBoundingClientRect();
        return label.width>0&&icon.left>=box.left&&icon.right<=label.left+1&&label.right<=box.right+1;
      });
      return separate&&primary&&brand.getBoundingClientRect().width>0&&controls.every(r=>r.left>=0&&r.right<=innerWidth+1&&r.height>=43)&&document.documentElement.scrollWidth<=innerWidth+1 && items.every((r,i)=>r.left>=0&&r.right<=innerWidth+1&&(!i||items[i-1].right<=r.left+1));
    });
    assert.ok(fits,'Android navigation fits '+width+'×'+height);
  }
  await page.setViewportSize({width:390,height:844});
  if(process.env.HXZ_ANDROID_PREVIEW)await page.screenshot({path:path.join(process.env.HXZ_ANDROID_PREVIEW,'android-town-community.png')});
  await page.getByRole('link',{name:/模组一服开服活动/}).click();
  await page.getByRole('heading',{name:'模组一服开服活动'}).waitFor();
  assert.ok(page.url().includes('/town/world/HXZ-mod-1?notice='));
  await page.evaluate(()=>localStorage.setItem('test-cancel','true'));
  await page.getByRole('button',{name:'登录并进入服务器'}).click();
  await page.getByRole('button',{name:'登录并进入服务器'}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('test-joined')),null);
  await page.getByRole('button',{name:'登录并进入服务器'}).click();
  await page.waitForFunction(()=>!!localStorage.getItem('test-joined'));
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-joined'))),{server:'HXZ-mod-1',uid});
  if(process.env.HXZ_ANDROID_PREVIEW)await page.screenshot({path:path.join(process.env.HXZ_ANDROID_PREVIEW,'android-town-select.png')});
  await page.getByRole('button',{name:'测试实例二'}).click();
  await page.getByRole('heading',{name:'正在校验和补全游戏文件'}).waitFor();
  await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'游戏库'}).click();
  await page.getByRole('heading',{name:'正在校验和补全游戏文件'}).waitFor();
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('button',{name:'下载游戏',exact:true}).click();
  await page.getByRole('textbox',{name:'查找版本'}).fill('1.21');
  await page.getByText('1.21.1',{exact:true}).waitFor();
  await page.goBack();
  await page.reload();
  await page.getByRole('button',{name:'进入服务器',exact:true}).waitFor();
  await page.getByRole('link',{name:'社区大厅',exact:true}).click();
  await page.getByRole('link',{name:'聊天',exact:true}).click();
  const message='安卓版社区回声 '+randomUUID().slice(0,8);
  const composer=page.locator('.social-chat textarea').first();
  await composer.waitFor();
  await page.waitForFunction(()=>!document.querySelector('.social-connection'));
  await composer.fill(message);await composer.press('Enter');
  await page.locator('.chat-history').getByText(message,{exact:true}).waitFor();
  await page.getByRole('button',{name:/此刻在线/}).click();
  await page.getByRole('dialog',{name:'此刻在线'}).locator('.person').filter({hasText:name}).waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'关闭'}).click();
  const chatBounds=await page.locator('.chat-main').boundingBox(),statusBounds=await page.locator('.town-status').boundingBox();
  assert.ok(statusBounds.y-(chatBounds.y+chatBounds.height)<42,'聊天卡片应填满可用工作区');
  const nav=page.getByRole('navigation',{name:'社区导航'});
  if(process.env.HXZ_ANDROID_PREVIEW)await page.screenshot({path:path.join(process.env.HXZ_ANDROID_PREVIEW,'android-community-chat.png')});
  const directoryButton=nav.getByRole('button',{name:'全部栏目'});
  await directoryButton.click();
  assert.equal(await page.getByRole('dialog').getByRole('link',{name:'聊天',exact:true}).getAttribute('aria-current'),'page');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='全部栏目');
  await nav.getByRole('link',{name:'论坛',exact:true}).click();
  await page.getByRole('heading',{name:'社区论坛',exact:true}).waitFor();
  for(const [label,section] of [['冒险者协会','.guild-viewport'],['LINKING 档案馆','.archive-viewport'],['积分排行榜','.points-ranking'],['我的积分','.social-content']]){
    const primary=nav.getByRole('link',{name:label,exact:true});
    if(label==='积分排行榜')await primary.click();
    else {
      await nav.getByRole('button',{name:'全部栏目'}).click();
      await page.getByRole('dialog').getByRole('link',{name:label,exact:true}).click();
    }
    await page.locator(section).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,label+' phone width');
  }
  assert.deepEqual(errors,[]);
  console.log('Android 社区页面 · 390×844，社区首屏与使用协议、横竖屏导航、公告选服、社区内选实例与下载、取消与登录后续接、重开角色、临时社区服务、WebSocket 聊天、论坛、协会、LINKING、排行及钱包通过。');
}catch(error){
  if(page)console.error(page.url(),await page.evaluate(()=>({nav:document.querySelector('.social-sections')?.textContent,dialog:document.querySelector('[role=dialog]')?.textContent})).catch(()=>({})));
  throw error;
}finally{
  await browser?.close();await service.close();await new Promise(r=>assets.close(r));
  if(path.dirname(home)===os.tmpdir()&&path.basename(home).startsWith('hxz-android-community-'))await fs.rm(home,{recursive:true,force:true,maxRetries:4});
}

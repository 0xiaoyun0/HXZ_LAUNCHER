import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright-core';
import {createCommunity} from '../community-server/src/server.mjs';

const dir=path.resolve('.runtime/town-android-assets/town');
const home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-android-community-'));
const uid=randomUUID().replaceAll('-',''),name='移动测试旅人';
const assets=http.createServer(async(req,res)=>{
  const file=path.resolve(dir,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(dir+path.sep)){res.writeHead(404).end();return;}
  try{
    const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.wasm':'application/wasm'};
    const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404).end();}
});
assets.listen(0,'127.0.0.1');await once(assets,'listening');
const origin='http://127.0.0.1:'+assets.address().port;
const service=createCommunity({data:home,origins:[origin],exchange:async()=>({selectedProfile:{id:uid,name},accessToken:'fixture-skin',clientToken:'fixture-client'})});
let browser,page;
try{
  service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
  const base='http://127.0.0.1:'+service.server.address().port;
  const auth=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(auth.status,200);
  const {token,user}=await auth.json();
  browser=await chromium.launch({channel:'msedge',headless:true});
  page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/index.html#/community');
  // The test implements just the Android native message port. All community HTTP and WebSocket traffic is real.
  await page.evaluate(({base,token,user})=>{
    const ports=new MessageChannel();
    ports.port1.onmessage=event=>{
      const {id,action}=JSON.parse(event.data);
      const value=action==='android.identity'?user:action==='community.connect'?{token,user,base}:null;
      ports.port1.postMessage(JSON.stringify({id,ok:value!==null,value}));
    };
    window.postMessage('town-port',location.origin,[ports.port2]);
  },{base,token,user});
  const message='安卓版社区回声 '+randomUUID().slice(0,8);
  const composer=page.locator('.social-chat textarea').first();
  await composer.waitFor();
  await page.waitForFunction(()=>!document.querySelector('.social-connection'));
  await composer.fill(message);await composer.press('Enter');
  await page.locator('.chat-history').getByText(message,{exact:true}).waitFor();
  const nav=page.getByRole('navigation',{name:'社区导航'});
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
  console.log('Android 社区页面 · 390×844，临时真实社区服务、测试角色、WebSocket 聊天、论坛、协会、LINKING、排行及钱包通过。');
}catch(error){
  if(page)console.error(page.url(),await page.evaluate(()=>({nav:document.querySelector('.social-sections')?.textContent,dialog:document.querySelector('[role=dialog]')?.textContent})).catch(()=>({})));
  throw error;
}finally{
  await browser?.close();await service.close();await new Promise(r=>assets.close(r));
  if(path.dirname(home)===os.tmpdir()&&path.basename(home).startsWith('hxz-android-community-'))await fs.rm(home,{recursive:true,force:true,maxRetries:4});
}

import { createRequire } from 'node:module';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { createCommunity } from '../server/src/server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const data=await mkdtemp(path.join(os.tmpdir(),'hxz-ui-'));
const service=createCommunity({data,adminIDs:['alice'],exchange:async input=>({accessToken:'rotated',clientToken:'client',selectedProfile:{id:input.accessToken,name:input.accessToken}})});
service.server.listen(8787,'127.0.0.1');await once(service.server,'listening');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const output=path.resolve('docs/screenshots');await mkdir(output,{recursive:true});
const errors=[];
try {
  async function client(name) {
    const session=await fetch('http://127.0.0.1:8787/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:name})}).then(r=>r.json());
    const context=await browser.newContext({viewport:{width:1280,height:840},permissions:['microphone']});
    await context.addInitScript(({session,name})=>{
      const settings={gameRoot:'',javaPath:'',selectedInstance:'',selectedAccount:name,theme:'dark',communityUrl:'http://127.0.0.1:8787',instanceSettings:{}};
      const accounts=[{id:name,username:name,name,uuid:name,profiles:[{id:name,name}],persistent:true}];
      // Test-only desktop bridge. The application build contains no test authentication path.
      window.launcher={subscribe:()=>()=>{},invoke:async(action,input={})=>{try{let value;
        if(action==='state')value={settings,accounts,instances:[],system:{memoryMB:16384},persistentCredentials:true,running:false};
        else if(action==='community.connect')value={...session,base:settings.communityUrl};
        else if(action==='settings.save')value=Object.assign(settings,input);
        else if(action==='notices.list')value=await fetch(settings.communityUrl+'/api/notices').then(r=>r.json());
        else if(action==='notices.publish') {const r=await fetch(settings.communityUrl+'/api/notices',{method:'POST',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify(input)});value=await r.json();if(!r.ok)throw Error(value.error);}
        else throw Error('Not implemented in UI test: '+action);
        return {ok:true,value};
      }catch(e){return {ok:false,error:e.message};}}};
      window.__peers=[];const Original=window.RTCPeerConnection;window.RTCPeerConnection=class extends Original{constructor(config){super(config);window.__peers.push(this);}};
    },{session,name});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:9000');await page.getByText('社区在线',{exact:true}).waitFor();return page;
  }
  const a=await client('alice'),b=await client('bob');
  await a.screenshot({path:path.join(output,'home-dark.png')});
  await a.getByTitle('切换外观').click();await a.waitForFunction(()=>document.documentElement.dataset.theme==='light');await a.screenshot({path:path.join(output,'home-light.png')});
  await a.getByRole('link',{name:'游戏实例',exact:true}).click();await a.getByRole('heading',{name:'游戏实例',exact:true}).waitFor();await a.reload();await a.getByRole('navigation',{name:'主导航'}).waitFor();assert.match(a.url(),/#\/instances$/);
  await a.getByRole('link',{name:'通知公告',exact:true}).click();await a.getByRole('button',{name:'发布公告',exact:true}).click();await a.getByLabel('标题',{exact:true}).fill('UI 联调公告');await a.getByLabel('正文（纯文本）').fill('实例更新后，请重新启动游戏。');await a.getByRole('button',{name:'发布',exact:true}).click();await a.getByRole('heading',{name:'UI 联调公告'}).waitFor();
  for(const page of [a,b])await page.getByRole('link',{name:'聊天大厅',exact:true}).click();
  await a.getByPlaceholder('和大家聊聊…').fill('真实双客户端联调消息');await a.getByTitle('发送消息').click();await b.getByText('真实双客户端联调消息',{exact:true}).waitFor();
  await a.getByRole('button',{name:/旅人休息室/}).click();await b.getByRole('button',{name:/旅人休息室/}).click();
  for(const page of [a,b])await page.waitForFunction(()=>window.__peers.some(pc=>pc.connectionState==='connected'),{},{timeout:20000});
  await a.waitForFunction(async()=>{for(const pc of window.__peers){for(const stat of (await pc.getStats()).values())if(stat.type==='inbound-rtp' && stat.kind==='audio' && stat.bytesReceived>0)return true;}return false;},{},{timeout:10000});
  await a.getByTitle('切换麦克风静音').click();await a.waitForFunction(()=>window.__peers.filter(pc=>pc.connectionState==='connected').every(pc=>pc.getSenders().filter(s=>s.track).every(s=>!s.track.enabled)));
  await a.screenshot({path:path.join(output,'chat-light.png')});await a.getByTitle('离开语音').click();await a.waitForFunction(()=>window.__peers.every(pc=>pc.connectionState==='closed'));
  assert.deepEqual(errors,[]);console.log('PASS: routes, refresh, themes, administrator notices, two-client chat, WebRTC audio RTP, mute and cleanup');
}finally{await browser.close();await service.close();await rm(data,{recursive:true,force:true});}

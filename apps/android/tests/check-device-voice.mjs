import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {createEncoder,Application} from 'libopus-wasm';
import {createCommunity} from '../../community-server/src/server.mjs';

import {run,shell,app,home,poll,shot,web,pkg} from './device-ui.mjs';

const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-mobile-voice-'));
const origin='https://appassets.androidplatform.net';
const qaID=randomUUID().replaceAll('-',''),peerID=randomUUID().replaceAll('-','');
const service=createCommunity({data:dir,origins:[origin],exchange:async input=>({
  selectedProfile:input.clientToken==='peer'?{id:peerID,name:'语音伙伴'}:{id:qaID,name:'手机验收'},
  accessToken:'local-qa',clientToken:'local'
})});
let api,tlsPort,session,peer,encoder,tone;
try{
  const key=path.join(dir,'tls-key.pem'),cert=path.join(dir,'tls.pem');
  const config=path.join(dir,'openssl.cnf');
  await fs.writeFile(config,'[req]\ndistinguished_name=dn\n[dn]\n');
  execFileSync('openssl',['req','-config',config,'-x509','-nodes','-newkey','rsa:2048','-days','1','-subj','/CN=127.0.0.1','-keyout',key,'-out',cert],{stdio:'ignore',windowsHide:true});
  api=https.createServer({key:await fs.readFile(key),cert:await fs.readFile(cert)},(req,res)=>service.server.emit('request',req,res));
  api.on('upgrade',(req,socket,head)=>service.server.emit('upgrade',req,socket,head));
  api.listen(0,'127.0.0.1');await once(api,'listening');tlsPort=api.address().port;
  service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
  const auth=async clientToken=>(await fetch('http://127.0.0.1:'+service.server.address().port+'/api/session',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({clientToken})})).json();
  const user=await auth('phone'),companion=await auth('peer');
  assert.ok(user.token&&companion.token);
  run('reverse','tcp:'+tlsPort,'tcp:'+tlsPort);
  app();session=await web();
  const {click,evaluate,call}=session;
  await poll('安卓社区初始化',()=>evaluate("document.querySelector('.town-shell')?.innerText.length>5"));
  if(await evaluate("document.body.innerText.includes('同意并进入社区')"))await click('同意并进入社区');
  await poll('导航',()=>evaluate("!!document.querySelector('.town-nav')"));
  await call('Security.enable');await call('Security.setIgnoreCertificateErrors',{ignore:true});
  const localSession={...user,base:'https://127.0.0.1:'+tlsPort};
  // Only identity and endpoint discovery come from the fixture. All Android tools use the shipped bridge.
  await evaluate("(()=>{const qa="+JSON.stringify(localSession)+";const original=window.launcher.invoke.bind(window.launcher);window.voiceTest=[];window.launcher.invoke=(action,input)=>{if(action==='android.identity')return Promise.resolve({ok:true,value:qa.user});if(action==='community.connect')return Promise.resolve({ok:true,value:qa});if(action==='android.voice.status')window.voiceTest.push(input);return original(action,input)};window.dispatchEvent(new Event('town-resume'));})()");
  await click('我的');
  await poll('手机工具就绪',()=>evaluate("!!document.querySelector('.town-switch:not(:disabled)')"));
  await shot('device-tools');
  const sw=()=>evaluate("document.querySelector('.town-switch')?.getAttribute('aria-checked')");
  if(await sw()==='true')await click('语音悬浮控件');
  shell('appops','set',pkg,'SYSTEM_ALERT_WINDOW','deny');
  await click('语音悬浮控件');
  await poll('系统悬浮窗权限页',()=>/com.android.settings/.test(shell('dumpsys','activity','activities').split('mResumedActivity:').pop().slice(0,260)));
  shell('input','keyevent','4');await poll('拒绝后开关关闭',async()=>await sw()==='false');
  shell('appops','set',pkg,'SYSTEM_ALERT_WINDOW','allow');
  await click('语音悬浮控件');await poll('已开启',async()=>await sw()==='true');
  await click('打开语音房');
  await poll('社区语音房准备就绪',()=>evaluate("!!document.querySelector('.voice-room-row:not(:disabled)')"),30000);
  const room=await evaluate("document.querySelector('.voice-room-row:not(:disabled) strong').textContent");
  assert.ok(await evaluate("Array.from(document.querySelectorAll('.town-voice-mode button')).some(b=>b.textContent==='仅收听'&&b.getAttribute('aria-pressed')==='true')"));
  assert.equal(await evaluate("document.querySelectorAll('.voice-controls').length"),0);
  await click('通话设置');
  await poll('麦克风和说话模式可在同一处设置',()=>evaluate("document.querySelector('[role=dialog]')?.innerText.includes('麦克风模式')"));
  shell('input','keyevent','4');
  await poll('返回房间列表',()=>evaluate("!document.querySelector('[role=dialog]')"));
  await shot('device-voice-rooms');
  // Record native permission-less listen-only join; the real audio path receives known Opus test tones.
  await evaluate("document.querySelector('.voice-room-row:not(:disabled)').click()");
  await poll('实际加入 '+room,()=>evaluate("!!document.querySelector('.voice-controls button:not(:disabled)')"),26000);
  assert.ok(await evaluate("document.querySelector('.town-active-call')?.getBoundingClientRect().top<document.querySelector('.voice-room-list').getBoundingClientRect().top"));
  await shot('device-active-call');
  const roomID=await evaluate("window.voiceTest.filter(x=>x.room).slice(-1)[0]?.room");
  assert.ok(roomID);
  peer=new WebSocket('wss://127.0.0.1:'+tlsPort+'/ws',{origin,rejectUnauthorized:false});
  const peerReady=once(peer,'message');await once(peer,'open');peer.send(JSON.stringify({type:'auth',token:companion.token,platform:'desktop'}));await peerReady;
  peer.send(JSON.stringify({type:'voice-join',room:roomID,transport:'ws-opus-v1'}));
  encoder=await createEncoder({channels:1,sampleRate:48000,application:Application.Voip,bitrate:24000});
  const pcm=Float32Array.from({length:960},(_,i)=>.21*Math.sin(2*Math.PI*400*i/48000));
  let seq=0;
  tone=setInterval(()=>{if(peer.readyState!==WebSocket.OPEN)return;const packet=encoder.encodeFloat(pcm),buf=Buffer.alloc(9+packet.length);
    buf[0]=1;buf.writeUInt32BE(742,1);buf.writeUInt32BE(seq++,5);buf.set(packet,9);peer.send(buf);},20);
  await poll('实际解码语音伙伴音频',()=>evaluate("window.voiceTest.some(x=>x.speaker==='语音伙伴')"));
  const bounds=()=>{
    const dump=shell('dumpsys','window','windows');
    const part=dump.split(/Window #\d+ /).find(block=>block.slice(0,190).includes('幻想镇语音悬浮控件')&&block.includes('mHasSurface=true'));
    const box=part?.match(/\b(?:frame|mFrame)=\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/);
    return box?box.slice(1).map(Number):null;
  };
  await poll('通话页使用页内控件',()=>!bounds());
  await click('文字大厅');
  await poll('切到文字频道后恢复悬浮窗',bounds);
  await click('语音房');
  await poll('回到语音房收起悬浮窗',()=>!bounds());
  home();const panel=await poll('桌面上真实的系统悬浮窗',bounds);
  await shot('device-voice-overlay');
  const density=Number(shell('wm','density').match(/(\d+)\s*$/)[1])/160;
  const tapAction=(box,offset)=>shell('input','tap',String(Math.round(box[2]-density*(4+(offset+.5)*48))),String(Math.round((box[1]+box[3])/2)));
  tapAction(panel,1);
  await poll('悬浮窗静音听筒',()=>evaluate("window.voiceTest.slice(-1)[0]?.deafened===true"));
  tapAction(panel,1);
  await poll('悬浮窗恢复听筒',()=>evaluate("window.voiceTest.slice(-1)[0]?.deafened===false"));
  const gripX=panel[0]+Math.round(25*density),gripY=Math.round((panel[1]+panel[3])/2);
  shell('input','swipe',String(gripX),String(gripY),String(gripX+Math.round(24*density)),String(gripY+Math.round(110*density)),'420');
  const moved=await poll('移动悬浮窗',()=>{const box=bounds();return box&&box[1]>panel[1]+30?box:null;});
  tapAction(moved,2);await poll('只听模式返回语音房',()=>shell('dumpsys','activity','activities').split('mResumedActivity:').pop().slice(0,260).includes(pkg));
  shell('pm','grant',pkg,'android.permission.RECORD_AUDIO');
  await click('开麦');await poll('启用系统麦克风',()=>evaluate("window.voiceTest.slice(-1)[0]?.listenOnly===false"),22000);
  home();
  tapAction(await poll('通话面板',bounds),2);
  await poll('悬浮窗静音麦克风',()=>evaluate("window.voiceTest.slice(-1)[0]?.muted===true"));
  const current=await poll('返回语音房的悬浮控件',bounds);
  shell('input','tap',String(Math.round(current[0]+25*density)),String(Math.round((current[1]+current[3])/2)));
  await poll('返回页内通话控制',()=>!bounds());
  await click('离开');await poll('退出房间移除悬浮窗',()=>!bounds());
  await click('我的');await click('语音悬浮控件');await poll('关闭持久开关',async()=>await sw()==='false');
  await click('聊天');
  await poll('频道栏在线成员',()=>evaluate("!!document.querySelector('.town-members-slot button')"));
  await evaluate("document.querySelector('.town-members-slot button').click()");
  await poll('成员名单可达',()=>evaluate("!!document.querySelector('[role=dialog] .person')"));
  shell('input','keyevent','4');
  await poll('关闭成员名单',()=>evaluate("!document.querySelector('[role=dialog]')"));
  const keyboard=shell('settings','get','secure','show_ime_with_hard_keyboard');
  try{
    shell('settings','put','secure','show_ime_with_hard_keyboard','1');
    const before=await evaluate("innerHeight");
    shell('uiautomator','dump','/sdcard/town-chat-qa.xml');
    const tree=run('exec-out','cat','/sdcard/town-chat-qa.xml');
    const host=tree.match(/<node\b[^>]*class="android.webkit.WebView"[^>]*>/)?.[0];
    assert.ok(host,'系统窗口包含社区 WebView');
    const [left,top,right]=host.match(/bounds="([^"]+)"/)[1].match(/\d+/g).map(Number);
    const target=await evaluate("(()=>{const r=document.querySelector('.chat-composer textarea').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:visualViewport.width};})()");
    const scale=(right-left)/target.width;
    shell('input','tap',String(Math.round(left+target.x*scale)),String(Math.round(top+target.y*scale)));
    await poll('系统软键盘展开',()=>evaluate("document.documentElement.hasAttribute('data-ime') && visualViewport.height < "+before+" - 75"));
    assert.ok(await evaluate("document.querySelector('.town-nav-bottom').offsetHeight===0&&Math.abs(document.querySelector('.chat-composer').getBoundingClientRect().bottom - visualViewport.height)<16"),'输入框紧邻键盘');
    await shot('device-chat-keyboard');
    shell('input','keyevent','4');
    await poll('收起键盘后仍在聊天',()=>evaluate("location.hash==='#/community'&&visualViewport.height>="+before+"-2"));
  }catch(error){
    const geometry=await evaluate("({focus:document.activeElement?.tagName,keyboard:document.documentElement.hasAttribute('data-ime'),viewport:visualViewport.height,composer:document.querySelector('.chat-composer')?.getBoundingClientRect().toJSON()})");
    console.error('系统键盘与输入框',geometry,shell('dumpsys','input_method').match(/mInputShown=\w+/)?.[0]);
    await shot('device-chat-keyboard-check');
    throw error;
  }finally{
    if(keyboard==='null')shell('settings','delete','secure','show_ime_with_hard_keyboard');
    else shell('settings','put','secure','show_ime_with_hard_keyboard',keyboard);
  }
  await click('社区');
  console.log('旧 WebView 实际加入隔离社区语音房，收到第二个会话的 Opus 音频；已验证显示说话人、拖动、前后台麦克风/听筒、关闭及离房清理。');
} catch(error){
  if(session)console.error('当前页面',await session.evaluate("({route:location.hash,body:document.querySelector('main')?.innerText.slice(0,1200),voice:window.voiceTest?.slice(-2)})").catch(()=>null));
  throw error;
} finally{
  clearInterval(tone);encoder?.free();peer?.terminate();
  if(session){try{await session.call('Security.setIgnoreCertificateErrors',{ignore:false});await session.call('Page.reload');}catch{}session.close();}
  if(tlsPort){try{run('reverse','--remove','tcp:'+tlsPort);}catch{}}
  api?.closeAllConnections();api?.close();await service.close();
  await fs.rm(dir,{recursive:true,force:true});
}

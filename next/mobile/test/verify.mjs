// One targeted check against an isolated, UNMODIFIED 0.4.2 server.
// This does not exercise Android hardware, permissions or device background limits.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {createCommunity} from '../../server/src/server.mjs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../server/package.json',import.meta.url));
const {WebSocket}=require('ws');
const root=fileURLToPath(new URL('../',import.meta.url)),temp=path.join(root,'.test','run-'+Date.now());
await fs.mkdir(temp,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_PATH));
const community=createCommunity({data:path.join(temp,'community'),adminIDs:['mobile_probe'],exchange:async input=>({accessToken:input.accessToken,clientToken:'fixture',selectedProfile:{id:input.accessToken,name:'手机验证'}})});
community.server.listen(0,'127.0.0.1');await once(community.server,'listening');
const base='http://127.0.0.1:'+community.server.address().port;
const session=await fetch(base+'/api/session',{method:'POST',body:JSON.stringify({accessToken:'mobile_probe'})}).then(r=>r.json());
const peerSession=await fetch(base+'/api/session',{method:'POST',body:JSON.stringify({accessToken:'desktop_probe'})}).then(r=>r.json());
const webServer=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;const asset=path.join(root,'web/dist',p==='/'?'index.html':decodeURIComponent(p));if(!asset.startsWith(path.join(root,'web/dist')+path.sep))throw Error();const content=await fs.readFile(asset);res.setHeader('content-type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(content);}catch{res.writeHead(404);res.end();}});
webServer.listen(0,'127.0.0.1');await once(webServer,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let client,peer;
const state={server:base,user:session.user,hasAccount:true,profiles:[{id:'mobile_probe',name:'手机验证'}],selectedProfile:{id:'mobile_probe',name:'手机验证'},connected:true,connection:'已连接',messages:[],users:[],room:'',muted:false,deafened:false,ptt:false,id:'',version:'0.4.2'};
const emit=async(name,data)=>{if(!page.isClosed())await page.evaluate(({name,data})=>window.HXZEvent?.(name,data),{name,data});};
try{
  await page.exposeBinding('nativeCall',async(_,raw)=>{
    const {id,op,input}=JSON.parse(raw);let data;
    try{
      if(op==='state')data=state;
      else if(op==='api'){const r=await fetch(base+input.path,{method:input.method,headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:input.body?JSON.stringify(input.body):undefined});data=await r.json();if(!r.ok)throw Error(data.error);}
      else if(op==='chat'){client.send(JSON.stringify({type:'chat',body:input.body}));data=true;}
      else if(op==='logout'){Object.assign(state,{connected:false,user:{},hasAccount:false,profiles:[],selectedProfile:null});data=state;}
      else data=true;
      await emit('result',{id,data,error:null});
    }catch(e){await emit('result',{id,error:e.message});}
  });
  await page.addInitScript(()=>{window.HXZNative={call:raw=>window.nativeCall(raw)};});
  await page.goto('http://127.0.0.1:'+webServer.address().port);await page.waitForFunction(()=>!!window.HXZEvent);
  client=new WebSocket(base.replace('http:','ws:')+'/ws');peer=new WebSocket(base.replace('http:','ws:')+'/ws');
  client.on('message',(raw,binary)=>{if(binary)return;const packet=JSON.parse(raw);if(packet.type==='ready'){state.id=packet.id;state.messages=packet.messages;}if(packet.type==='presence')state.users=packet.users;if(packet.type==='chat')emit('message',packet.message);else emit('state',state);});
  await Promise.all([once(client,'open'),once(peer,'open')]);
  const ready=once(client,'message'),peerReady=once(peer,'message');client.send(JSON.stringify({type:'auth',token:session.token}));peer.send(JSON.stringify({type:'auth',token:peerSession.token}));await Promise.all([ready,peerReady]);
  await page.getByPlaceholder('聊点什么…').fill('安卓接口验证');await page.getByRole('button',{name:'发送消息',exact:true}).click();await page.getByText('安卓接口验证',{exact:true}).waitFor();assert.equal(await page.locator('.composer textarea').evaluate(el=>el===document.activeElement),true);
  await page.getByRole('navigation').getByRole('button',{name:'论坛',exact:true}).click();await page.getByRole('button',{name:'发帖',exact:true}).click();await page.getByLabel('标题',{exact:true}).fill('移动端话题');await page.getByLabel('正文',{exact:true}).fill('接口及评论验证');await page.getByRole('button',{name:'发布帖子',exact:true}).click();await page.getByRole('heading',{name:'移动端话题',exact:true}).waitFor();
  await page.getByPlaceholder('写下你的回复…').fill('第一条回复');await page.getByRole('button',{name:'发布回复',exact:true}).click();await page.getByText('第一条回复',{exact:true}).waitFor();await page.locator('.reply-card').getByRole('button',{name:'回复',exact:true}).click();await page.getByPlaceholder('写下你的回复…').fill('嵌套回复');await page.getByRole('button',{name:'发布回复',exact:true}).click();await page.getByText('嵌套回复',{exact:true}).waitFor();assert.equal(await page.locator('.reply-card blockquote').count(),1);await page.locator('.reply-card').last().getByRole('button',{name:'0',exact:true}).click();await page.locator('.reply-card').last().getByRole('button',{name:'1',exact:true}).waitFor();
  await page.getByRole('navigation').getByRole('button',{name:'公告',exact:true}).click();await page.getByText('本服尚未配置更新日志',{exact:true}).waitFor();for(const name of ['原版生存','模组一服','模组二服']){await page.locator('.segmented').getByRole('button',{name,exact:true}).click();assert.equal(await page.locator('.segmented .selected').innerText(),name);}
  await page.getByRole('navigation').getByRole('button',{name:'我的',exact:true}).click();for(const width of [320,390,820]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.bottom-nav button').count(),6);}await page.getByRole('button',{name:'主题',exact:true}).click();await page.getByRole('option',{name:'深色',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  // Java -> community relay -> desktop decoder, then desktop encoder -> Java decoder.
  const classes=path.join(root,'android/app/build/intermediates/javac/debug/compileDebugJavaWithJavac/classes');
  const java=path.join(process.env.JAVA_HOME,'bin/java.exe'),javac=path.join(process.env.JAVA_HOME,'bin/javac.exe');
  execFileSync(javac,['-cp',classes,'-d',temp,path.join(root,'test/CodecProbe.java')]);
  execFileSync(java,['-cp',classes+path.delimiter+temp,'CodecProbe','encode',path.join(temp,'android.opus-packet')]);
  const packet=await fs.readFile(path.join(temp,'android.opus-packet'));
  client.send(JSON.stringify({type:'voice-join',room:'lobby',transport:'ws-opus-v1'}));peer.send(JSON.stringify({type:'voice-join',room:'lobby',transport:'ws-opus-v1'}));
  await new Promise(resolve=>setTimeout(resolve,150));
  const forwarded=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Voice relay timeout')),5000);peer.on('message',(raw,binary)=>{if(binary){clearTimeout(timer);resolve(raw);}});});client.send(packet);const relayed=await forwarded;assert.equal(relayed.readUInt32BE(37),42);assert.equal(relayed.readUInt32BE(41),1);assert.deepEqual(relayed.subarray(45),packet.subarray(9));
  const desktop=await page.evaluate(async bytes=>{
    let sampleCount=0,energy=0;
    const decoder=new AudioDecoder({output:frame=>{const out=new Float32Array(frame.numberOfFrames);frame.copyTo(out,{planeIndex:0,format:'f32-planar'});sampleCount+=out.length;energy+=out.reduce((n,v)=>n+Math.abs(v),0);frame.close();},error:e=>{throw e;}});decoder.configure({codec:'opus',sampleRate:48000,numberOfChannels:1});decoder.decode(new EncodedAudioChunk({type:'key',timestamp:0,data:new Uint8Array(bytes)}));await decoder.flush();decoder.close();
    const chunks=[];const encoder=new AudioEncoder({output:chunk=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);chunks.push([...data]);},error:e=>{throw e;}});encoder.configure({codec:'opus',sampleRate:48000,numberOfChannels:1,bitrate:24000,opus:{frameDuration:20000}});const pcm=new Float32Array(960);for(let n=0;n<960;n++)pcm[n]=.3*Math.sin(2*Math.PI*440*n/48000);const frame=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:960,numberOfChannels:1,timestamp:0,data:pcm});encoder.encode(frame);frame.close();await encoder.flush();encoder.close();return {sampleCount,energy,packet:chunks[0]};
  },[...relayed.subarray(45)]);assert.equal(desktop.sampleCount,960);assert(desktop.energy>1);await fs.writeFile(path.join(temp,'desktop.opus'),Buffer.from(desktop.packet));const decoded=execFileSync(java,['-cp',classes+path.delimiter+temp,'CodecProbe','decode',path.join(temp,'desktop.opus')],{encoding:'utf8'});console.log(decoded.trim());
  assert.deepEqual(errors,[]);console.log('PASS: real 0.4.2 chat + retained input focus; forum post/reply/nested reply/like; separated notices; responsive bounds; bidirectional desktop/Java Opus through unchanged relay.');
}finally{client?.terminate();peer?.terminate();await browser.close();webServer.closeAllConnections();await new Promise(r=>webServer.close(r));await community.close();}

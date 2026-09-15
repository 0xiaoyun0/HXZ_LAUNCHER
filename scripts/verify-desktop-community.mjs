// Test-only identities and IPC live outside the distributed application.
import http from "node:http";
import fs from 'node:fs/promises';import path from 'node:path';import {once} from 'node:events';import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {createCommunity} from '../server/src/server.mjs';
const require=createRequire(import.meta.url),{_electron}=require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(import.meta.dirname,'..'),data=await fs.mkdtemp(path.join(root,'.test/community-021-'));
const updates=http.createServer((req,res)=>{const pack=req.url.split('/')[1];res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url.includes('version.json')?{version:'hash-'+pack}:{currentVersion:pack,history:[{version:pack,date:'2026-09-14',content:'ONLY-'+pack}]}));});updates.listen(0,'127.0.0.1');await once(updates,'listening');
const updateBase='http://127.0.0.1:'+updates.address().port;
await fs.writeFile(path.join(data,'community-settings.json'),JSON.stringify({hxzSources:{'survival':updateBase+'/survival','mod-1':updateBase+'/mod-1','mod-2':updateBase+'/mod-2'}}));
const service=createCommunity({data,origins:['null'],adminIDs:['alice'],exchange:async input=>({accessToken:'fixture',clientToken:'fixture',selectedProfile:{id:input.accessToken,name:input.accessToken}})});service.server.listen(0,'127.0.0.1');await once(service.server,'listening');const base='http://127.0.0.1:'+service.server.address().port;
let app;try{
 const clients=[];for(const name of ['alice','bob']){const session=await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:name})}).then(r=>r.json());clients.push({session,state:{settings:{gameRoot:'',javaPath:'',selectedInstance:'',selectedAccount:name,theme:'dark',fontSize:15,accentColor:'#a9ce80',backgroundImage:'',backgroundColor:'',backgroundOpacity:.12,layout:'standard',communityUrl:base,instanceSettings:{}},accounts:[{id:name,name,uuid:name,profiles:[{id:name,name}],persistent:true}],instances:[],system:{memoryMB:16384},running:false}});}
 const config=path.join(data,'fixture.json');await fs.writeFile(config,JSON.stringify({base,clients,page:path.join(root,'client/dist/electron/Packaged/win-unpacked/resources/app.asar/index.html')}));
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:path.join(root,'client/src-electron/node_modules/electron/dist/electron.exe'),args:[path.join(root,'scripts/fixtures/community-electron.cjs'),config],env});
 const deadline=Date.now()+10000;while(app.windows().length<2&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));const [a,b]=app.windows();assert.ok(a&&b);
 for(const page of [a,b]){await page.addInitScript(()=>{window.__peers=[];const Original=window.RTCPeerConnection;window.RTCPeerConnection=class extends Original{constructor(config){super(config);window.__peers.push(this);}};});await page.reload();await page.getByText('社区在线',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>location.origin),'file://');}
 await a.getByRole('link',{name:'通知公告',exact:true}).click();await a.getByRole('button',{name:'发布公告',exact:true}).click();await a.getByLabel('标题',{exact:true}).fill('桌面来源回归公告');await a.getByLabel('正文（纯文本）').fill('0.2.1 本地隔离测试');await a.getByRole('button',{name:'发布',exact:true}).click();await a.getByRole('heading',{name:'桌面来源回归公告'}).waitFor();
 await a.locator('.update-feed[data-group="survival"]').getByText('ONLY-survival',{exact:true}).waitFor();
 for(const id of ['survival','mod-1','mod-2']){await a.locator('.filter-tabs a[href="#/notices/'+id+'"]').count().then(async count=>{if(count)await a.locator('.filter-tabs a[href="#/notices/'+id+'"]').click();else await a.locator('.filter-tabs').getByRole('link',{name:id==='survival'?'原版生存群组':id==='mod-1'?'模组一服':'模组二服',exact:true}).click();});await a.locator('.update-feed').getByText('ONLY-'+id,{exact:true}).waitFor();assert.equal(await a.locator('.update-feed').count(),1);}
 await a.screenshot({path:path.join(root,'docs/screenshots/022-update-logs.png')});
 await a.getByRole('link',{name:'个性化',exact:true}).click();await a.getByRole('button',{name:'选择图片',exact:true}).click();await a.locator('.avatar-preview img').waitFor();await a.getByRole('button',{name:'保存头像',exact:true}).click();await a.getByText('头像已保存并同步社区',{exact:true}).waitFor();
 await a.screenshot({path:path.join(root,'docs/screenshots/022-avatar.png')});
 for(const page of [a,b])await page.getByRole('link',{name:'聊天大厅',exact:true}).click();
 await a.getByPlaceholder('和大家聊聊…').fill('桌面聊天回归');await a.getByTitle('发送消息').click();await b.getByText('桌面聊天回归',{exact:true}).waitFor();await b.waitForFunction(()=>{const img=document.querySelector('.chat-message .player-avatar img');return img?.complete && img.naturalWidth>0;});
 for(const page of [a,b])await page.getByRole('button',{name:/旅人休息室/}).click();
 await a.waitForFunction(async()=>{for(const pc of window.__peers)for(const s of (await pc.getStats()).values())if(s.type==='inbound-rtp'&&s.kind==='audio'&&s.bytesReceived>0)return true;return false;},null,{timeout:25000});
 await fs.mkdir(path.join(root,'docs/screenshots'),{recursive:true});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().sort((a,b)=>a.id-b.id)[0].showInactive());
 for(const theme of ['light','dark']) {
  await a.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await a.screenshot({path:path.join(root,'docs/screenshots/022-community-'+theme+'.png')});
  const sizes=await a.locator('.voice-actions button').evaluateAll(nodes=>nodes.map(n=>({w:n.clientWidth,h:n.clientHeight})));
  assert.ok(sizes.every(s=>s.w>=44&&s.h>=56));
  assert.ok(await a.locator('.voice-capacity').evaluateAll(nodes=>nodes.every(n=>{const range=document.createRange();range.selectNodeContents(n.firstChild);const count=range.getBoundingClientRect(),capacity=n.querySelector('small').getBoundingClientRect();return Math.abs(count.top-capacity.top)<3 && capacity.left>=count.right;})), 'room occupancy stays on one line');
 }
 const events=JSON.parse(await fs.readFile(path.join(root,'.test/progress-events.json'),'utf8'));
 const active=events.find(e=>e.received>0&&e.completed<e.total);
 await app.evaluate(({BrowserWindow},event)=>{const w=BrowserWindow.getAllWindows().sort((a,b)=>a.id-b.id)[0];w.webContents.send('fixture:event',{type:'logs-reset'});w.webContents.send('fixture:event',event);w.webContents.send('fixture:event',{type:'logs',lines:['[下载] libraries/test/0.jar','[ERROR] libraries/test/0.jar 下载校验失败']});},active);
 await a.getByRole('button',{name:'任务详情',exact:true}).click();await a.locator('.task-details').waitFor();
 assert.match(await a.locator('.task-metrics').innerText(),/0 \/ 2/);
 await a.getByPlaceholder('搜索步骤、文件或日志').fill('test/0');
 assert.match(await a.locator('.task-log-output').innerText(),/test\/0.jar/);
 await a.getByPlaceholder('搜索步骤、文件或日志').fill('');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().sort((a,b)=>a.id-b.id)[0].webContents.send('fixture:event',{type:'task',busy:false,failed:true,phase:'安装未完成',failure:'libraries/test/0.jar: 下载校验失败'}));
 await a.locator('.task-steps .failed').waitFor();assert.match(await a.locator('.task-failure').innerText(),/下载来源/);
 await a.screenshot({path:path.join(root,'docs/screenshots/022-task-details.png')});
 await a.getByTitle('收起任务详情').click();
 await a.evaluate(()=>{document.documentElement.dataset.theme='light';document.documentElement.style.setProperty('--ui-font-size','22px');});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().sort((a,b)=>a.id-b.id)[0].setSize(1024,680));
 await a.screenshot({path:path.join(root,'docs/screenshots/022-large-font.png')});
 assert.ok(await a.locator('.brand').evaluate(el=>el.scrollWidth<=el.clientWidth));
 assert.ok(await a.locator('.launch-dock').evaluate(el=>el.scrollWidth<=el.clientWidth));
 assert.ok(await a.locator('.voice-capacity').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth)), 'room occupancy fits at large font size');
 await a.getByRole('button',{name:'任务详情',exact:true}).click();await a.locator('.task-details').waitFor();
 assert.ok(await a.locator('.task-details').evaluate(el=>el.scrollWidth<=el.clientWidth));
 await a.getByTitle('收起任务详情').click();
 await a.getByTitle('切换麦克风静音').click();await a.waitForFunction(()=>window.__peers.filter(pc=>pc.connectionState==='connected').every(pc=>pc.getSenders().filter(s=>s.track).every(s=>!s.track.enabled)));
 await a.getByTitle('离开语音').click();await a.waitForFunction(()=>window.__peers.every(pc=>pc.connectionState==='closed'));
 await a.getByRole('link',{name:'设置',exact:true}).click();const popup=a.locator('.q-toggle').first();assert.equal(await popup.getAttribute('aria-checked'),'true');await popup.click();await a.getByRole('button',{name:'保存设置',exact:true}).click();await a.waitForFunction(async()=>!(await window.launcher.invoke('state')).value.settings.hxzupPopup);await a.screenshot({path:path.join(root,'docs/screenshots/022-settings.png')});
 console.log('PASS packaged file:// pages: authenticated online state, notices, chat, actual audio RTP, mute and leave; voice themes, brand, real progress events, failure preservation/search and large fonts');
}finally{if(app)await app.close();await service.close();await new Promise(r=>updates.close(r));}

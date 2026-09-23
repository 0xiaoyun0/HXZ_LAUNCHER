import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(process.env.PLAYWRIGHT_PATH).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(5000);
 const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeBinding('nativeCall',async(_,raw)=>{
  const {id,op}=JSON.parse(raw);calls.push(op);
  const data=op==='state'?{connected:true,hasAccount:true,user:{uid:'fixture',name:'测试角色'},profiles:[],users:[],messages:[],room:''}:op==='appUpdate'?{currentVersion:'0.4.5',currentBuild:40502,phase:'idle'}:op==='api'?{items:[],total:0,more:false,minecraft:[],create:[]}:true;
  await page.evaluate(value=>window.HXZEvent('result',value),{id,data,error:null});
 });
 await page.addInitScript(()=>{window.HXZNative={call:raw=>window.nativeCall(raw)};});
 await page.goto(process.env.MOBILE_PREVIEW_URL||'http://127.0.0.1:5195');
 const toggle=page.locator('.floating-section-switch'),nav=page.getByRole('navigation',{name:'主导航'}),title=page.locator('.header-title span');
 await toggle.waitFor({state:'visible'});await page.waitForTimeout(200);
 assert.equal(await page.locator('.section-nav,.navigation-dock').count(),0);
 assert((await page.locator('.workspace').boundingBox()).width>=389,'workspace must retain full width');
 assert((await nav.boundingBox()).width>=389,'main navigation must retain full width');
 await toggle.tap();await page.waitForTimeout(200);assert.equal(await title.textContent(),'语音');
 await toggle.tap();await page.waitForTimeout(200);assert.equal(await title.textContent(),'聊天');
 const cdp=await page.context().newCDPSession(page);
 async function drag(dx,dy,hold=470){
  const r=await toggle.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(hold);
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});await page.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(120);
 }
 const initial=await toggle.boundingBox();await drag(200,80);
 const moved=await toggle.boundingBox();assert(moved.x>initial.x+150&&moved.y>initial.y+50);assert.equal(await title.textContent(),'聊天','drag release must not switch');
 await toggle.tap();await page.waitForTimeout(200);assert.equal(await title.textContent(),'语音','tap after drag must switch once');
 assert(Math.abs((await toggle.boundingBox()).x-moved.x)<2,'switching paired pages retains position');
 await nav.getByRole('button',{name:'社区',exact:true}).tap();await page.waitForTimeout(220);
 const communityInitial=await toggle.boundingBox();assert(communityInitial.x<15,'independent community default stays left');
 await toggle.tap();await page.waitForTimeout(200);assert.equal(await title.textContent(),'蓝图');
 await drag(100,-90);const communityMoved=await toggle.boundingBox();assert(communityMoved.x>80);assert.equal(await title.textContent(),'蓝图');
 await nav.getByRole('button',{name:'游戏',exact:true}).tap();await page.waitForTimeout(220);assert.equal(await toggle.isVisible(),false);
 await nav.getByRole('button',{name:'聊天',exact:true}).tap();await page.waitForTimeout(200);assert.equal(await title.textContent(),'语音');assert(Math.abs((await toggle.boundingBox()).x-moved.x)<2);
 await nav.getByRole('button',{name:'社区',exact:true}).tap();await page.waitForTimeout(200);assert.equal(await title.textContent(),'蓝图');assert(Math.abs((await toggle.boundingBox()).x-communityMoved.x)<2);
 const saved=await page.evaluate(()=>localStorage.getItem('hxz-mobile-switch-positions-v1'));assert(saved);
 await page.reload();await toggle.waitFor({state:'visible'});await page.waitForTimeout(200);assert(Math.abs((await toggle.boundingBox()).x-moved.x)<2,'position survives reload');
 await drag(20,0,20);assert.equal(await title.textContent(),'聊天','early swipe must not activate switch');
 assert.equal(await page.evaluate(()=>localStorage.getItem('hxz-mobile-switch-positions-v1')),saved);
 for(const [width,height] of [[320,640],[390,350],[844,390],[820,1180]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(150);
  const r=await toggle.boundingBox(),w=await page.locator('.workspace').boundingBox();
  assert(r.x>=w.x-1&&r.x+r.width<=w.x+w.width+1&&r.y>=w.y-1&&r.y+r.height<=w.y+w.height+1,'switch must remain in content bounds');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no document overflow');
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'在线',exact:true}).tap();await page.waitForTimeout(220);assert.equal(await toggle.isVisible(),false,'dialogs must not have an active floating control above them');
 assert(!calls.includes('voiceLeave'),'page switches do not leave voice');assert.deepEqual(errors,[]);
 console.log('PASS: full-width layout, both toggles, long-press drag/no accidental click, separate persisted positions, other tabs, keyboard/rotation bounds and overlays.');
}finally{await browser.close();}

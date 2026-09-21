import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:320,height:640},isMobile:true,hasTouch:true}),cdp=await page.context().newCDPSession(page);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(process.env.MOBILE_PREVIEW_URL||'http://127.0.0.1:5194');
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'游戏',exact:true}).click();
 await page.waitForSelector('.arcade-card');await page.waitForTimeout(200);
 async function swipe(x,y){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*22}]});await page.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);
 }
 const before=(await page.locator('.arcade-card').last().boundingBox()).y;
 await swipe(294,470);
 const after=(await page.locator('.arcade-card').last().boundingBox()).y;
 console.log(JSON.stringify({library:{before,after}}));assert.ok(after<before-80,'小游戏库必须能通过手势向下浏览');
 await page.locator('.arcade-card').nth(1).click();await page.waitForSelector('.arcade-guide');await page.waitForTimeout(180);
 for(const [width,height] of [[320,640],[740,390],[820,600]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>document.querySelector('.games-scroll')?.scrollTo(0,0));
  const start=(await page.locator('.arcade-guide').boundingBox()).y;await swipe(width-6,height-150);const end=(await page.locator('.arcade-guide').boundingBox()).y;
  assert.ok(end<start-50,`游戏详情在 ${width}×${height} 下应能滑动到排行榜和操作说明`);
  const nav=await page.locator('.bottom-nav').boundingBox();assert.ok(nav.y+nav.height<=height+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 await page.setViewportSize({width:320,height:640});await page.evaluate(()=>document.querySelector('.games-scroll').scrollTo(0,0));
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();await page.waitForTimeout(2200);
 const canvas=page.locator('.arcade-stage>canvas'),rect=await canvas.boundingBox();const start=(await page.locator('.arcade-guide').boundingBox()).y;
 await swipe(rect.x+rect.width/2,Math.min(rect.y+rect.height-10,480));
 assert.ok((await page.locator('.arcade-guide').boundingBox()).y<start-50,'俄罗斯方块画布不使用拖动操作，应允许纵向浏览页面');
 assert.deepEqual(errors,[]);console.log('PASS touch scrolling: library and game detail; phone, landscape and tablet; navigation remains visible.');
} finally {await browser.close();}

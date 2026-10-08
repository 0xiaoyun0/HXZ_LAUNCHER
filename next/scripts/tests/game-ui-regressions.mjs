import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1360,height:880}});
 await page.route('**/api/**',r=>r.fulfill({json:{items:[]}}));
 await page.goto('http://127.0.0.1:5178/#/arcade/play/runner');
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();
 await page.getByRole('button',{name:'暂停',exact:true}).click();
 const results=[];
 results.push({name:'倒计时暂停显示继续按钮',pass:await page.locator('.game-overlay').getByRole('button',{name:'继续游戏',exact:true}).count()===1});
 results.push(await page.evaluate(async()=>{
  const {createArcade}=await import('/@fs/E:/hxz_next/packages/games/arcade-controller.mjs');
  const {GAMES}=await import('/@fs/E:/hxz_next/server/shared/arcade-engine.mjs');
  let resolve,requests=[];
  const a=createArcade(async url=>{requests.push(url);if(requests.length===1)return await new Promise(r=>resolve=r);return {items:[],label:'长期'};});
  const loading=a.select(GAMES[0]);await a.changeRank('all');resolve({items:[],label:'本周'});await loading;await new Promise(r=>setTimeout(r,20));
  const result={name:'切换长期榜不被迟到的周榜覆盖',pass:a.rankLabel.value==='长期',observed:a.rankLabel.value};a.dispose();return result;
 }));
 console.log(JSON.stringify(results,null,2));assert.ok(results.every(r=>r.pass),'游戏界面回归失败');
} finally {await browser.close();}

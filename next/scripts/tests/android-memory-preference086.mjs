import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
// Real Vue settings -> saved preference -> native launch payload. No game/server calls.
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('hxz-mobile-guide-version','99');
  if(!localStorage.getItem('hxz-mobile-game'))localStorage.setItem('hxz-mobile-game',JSON.stringify({extendedMemory:true,memoryMB:0}));
  window.__launches=[];
  window.HXZNative={call(raw){const{id,op,input}=JSON.parse(raw);let data={items:[],total:0,rooms:[]};
   if(op==='state')data={user:{uid:'fixture',name:'fixture'},profiles:[{id:'fixture',name:'fixture'}],selectedProfile:{id:'fixture',name:'fixture'},hasAccount:true,connected:true,users:[],messages:[],voiceRooms:[],server:'https://fixture.invalid'};
   if(op==='gameEngine'){data={installed:true,riskAccepted:true,phase:'ready'};if(input?.action==='launch')window.__launches.push(input);}
   if(op==='api'&&input.path==='/api/server-presets')data={servers:[{id:'HXZ-mod-1',name:'模组一服',version:'1.21.1',enabled:true}]};
   setTimeout(()=>window.HXZEvent('result',{id,data}),0);
  }};
 });
 async function open(){await page.goto(process.env.HXZ_MOBILE_TEST_URL||'http://127.0.0.1:11485');await page.locator('.bottom-nav').getByRole('button',{name:'游戏',exact:true}).click();await page.getByRole('heading',{name:'Minecraft',exact:true}).waitFor();await page.getByRole('button',{name:'运行设置 内存、渲染器与自动更新'}).click();}
 await open();
 let toggle=page.getByRole('checkbox',{name:'使用交换内存（扩展预算）'});
 assert.equal(await toggle.isChecked(),true);
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.__launches.at(-1).options.extendedMemory),true);
 await toggle.uncheck();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hxz-mobile-game')).extendedMemory===false);
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.__launches.at(-1).options.extendedMemory),false);
 await open();toggle=page.getByRole('checkbox',{name:'使用交换内存（扩展预算）'});
 assert.equal(await toggle.isChecked(),false);
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.__launches.at(-1).options.extendedMemory),false);
 assert.equal(await page.evaluate(()=>window.__launches.at(-1).options.memoryMB),0);
 assert.deepEqual(errors,[]);
 console.log('PASS actual mobile preference ON -> OFF -> page reload -> native launch stays OFF');
}finally{await browser.close();}

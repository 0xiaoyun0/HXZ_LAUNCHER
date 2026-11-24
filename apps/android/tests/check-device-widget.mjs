import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {run,shell,app,home,poll,shot,web,pkg} from './device-ui.mjs';

function nodes(){
  shell('uiautomator','dump','/sdcard/town-widget-qa.xml');
  return Array.from(run('exec-out','cat','/sdcard/town-widget-qa.xml').matchAll(/<node\s+([^>]+)/g),m=>
    Object.fromEntries(Array.from(m[1].matchAll(/([\w-]+)="([^"]*)"/g),a=>[a[1],a[2]])));
}
async function tapAndroid(label,match){
  const node=await poll(label,()=>nodes().find(match),12000);
  const [x1,y1,x2,y2]=node.bounds.match(/\d+/g).map(Number);
  shell('input','tap',String((x1+x2)>>1),String((y1+y2)>>1));
}
const actions=[['收件箱','inbox','/community/inbox'],['语音房','voice','/community/voice'],['聊天','chat','/community'],
  ['活动','events','/community/events'],['接续','devices','/town/devices'],['幻想镇社区','home','/town']];
async function onPage(action){
  const page=await web();
  try{return await action(page);}finally{page.close();}
}
const tools=()=>onPage(p=>p.evaluate("window.launcher.invoke('android.device.tools').then(r=>r.value)"));
const click=label=>onPage(p=>p.click(label));

app();
await onPage(async p=>{
  await poll('页面就绪',()=>p.evaluate("!!document.querySelector('.town-nav,.town-welcome button')"));
  if(await p.evaluate("!!document.querySelector('.town-welcome')"))await p.click('同意并进入社区');
  await p.click('我的');
});
const first=await tools();
assert.ok(first.canPin,'该系统桌面需支持应用内添加小组件');
await click('添加');
await tapAndroid('系统取消添加',n=>/^(取消|cancel)$/i.test(n.text));
await delay(420);
assert.equal((await tools()).widgets,first.widgets);
if(!first.widgets){
  await click('添加');
  await tapAndroid('确认添加',n=>/^(自动添加|添加|add automatically|add|add to home screen)$/i.test(n.text)&&n.clickable==='true');
  await delay(700);app();
  await poll('系统已分配组件 ID',async()=>(await tools()).widgets===1);
}else console.log('复用该模拟器已添加的测试组件');
for(const [index,[label,id,route]] of actions.entries()){
  home();await delay(900);
  if(index===0){
    await poll('确认组件已显示',()=>nodes().some(n=>n['resource-id']===pkg+':id/town_widget_inbox'));
    await delay(700);await shot('device-widget');
    // Killing a background process preserves the OS PendingIntent and exercises genuine task restoration.
    shell('am','kill','--user','current',pkg);
    await poll('后台进程已退出',()=>!shell('ps','-A','-o','NAME').split(/\r?\n/).includes(pkg));
  }
  await tapAndroid(label,n=>n['resource-id']===pkg+':id/town_widget_'+id);
  await onPage(p=>poll('系统入口到达 '+route,()=>p.evaluate('location.hash==='+JSON.stringify('#'+route))));
  console.log((index===0?'冷启动':'热启动')+' '+label+' → '+route);
}
console.log('系统桌面小组件通过取消、添加、计数、冷启动及全部入口检查。');

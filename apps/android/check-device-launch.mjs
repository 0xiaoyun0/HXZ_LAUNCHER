import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {parseArgs} from 'node:util';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';

const {values}=parseArgs({options:{
  serial:{type:'string'},notice:{type:'string'},server:{type:'string'},instance:{type:'string'},
  install:{type:'boolean',default:false},'client-compat':{type:'boolean',default:false},'mobile-graphics':{type:'boolean',default:false},
  memory:{type:'string'},'dynamic-models':{type:'boolean',default:false},'lean-search':{type:'boolean',default:false},renderer:{type:'string'},tier:{type:'string'},
  package:{type:'string',default:'top.hxzmc.launcher.third.communityqa'}
}});
const {serial,notice,server,instance,install,package:app}=values;
if(values.memory)assert.ok(['on','off'].includes(values.memory)&&instance,'--memory on|off 需要指定实际的 --instance');
if(values['dynamic-models'])assert.ok(instance,'--dynamic-models 需要指定实际的 --instance');
if(values.renderer)assert.ok(instance&&['Zink','MobileGlues','沿用实例'].includes(values.renderer),'选择游戏库中可用的图形渲染器');
if(values.tier)assert.ok(instance&&values.memory==='on'&&['large','standard'].includes(values.tier),'选档需要 --memory on 和 --instance');
assert.ok(serial&&Boolean(notice)!==Boolean(server),'指定 --serial，以及 --notice 或 --server 其一');
if(server)assert.ok(['HXZ-survival','HXZ-mod-1','HXZ-mod-2'].includes(server),'选择社区服务器 ID');
assert.match(app,/^top\.hxzmc\.launcher\.third\.(?:communityqa|debug)$/);
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
const adbPath=sdk?path.join(sdk,'platform-tools',process.platform==='win32'?'adb.exe':'adb'):'adb';
const adb=(...args)=>execFileSync(adbPath,['-s',serial,...args],{encoding:'utf8',windowsHide:true,timeout:15000}).trim();
const polling=async(check,timeout,description)=>{
  const end=Date.now()+timeout;
  do{const result=await check();if(result)return result;await delay(350);}while(Date.now()<end);
  throw Error('等待超时 · '+description);
};

// Exercise normal WebView controls. Credentials and native bridge operations stay out of this driver.
function interact(action,label){
  const buttons=[...document.querySelectorAll('a,button')].filter(el=>el.getBoundingClientRect().width>0&&!el.disabled);
  const name=el=>(el.getAttribute('aria-label')||el.textContent||'').trim();
  const find=text=>buttons.find(el=>name(el)===text);
  if(action==='renderer'){
    const button=find(label);
    if(!button)return '';
    if(button.getAttribute('aria-pressed')==='true')return 'saved';
    button.click();return 'saving';
  }
  if(['memory','models','search'].includes(action)){
    const labelText={models:'按需加载模型',memory:'将系统虚拟内存计入游戏预算',search:'低内存物品搜索'}[action];
    const sw=document.querySelector('[role=switch][aria-label="'+labelText+'"]');
    if(!sw)return '';
    if(sw.getAttribute('aria-checked')===(label==='on'?'true':'false'))return 'saved';
    if(!sw.disabled){sw.click();return 'saving';}
    return 'unavailable';
  }
  if(action==='issues'){
    const task=document.querySelector('.town-progress');
    const retry=task&&[...task.querySelectorAll('button')].some(el=>name(el)==='重试');
    if(task?.getAttribute('role')==='alert'||retry)return task.innerText;
    if(find('登录并进入服务器'))return '需要已登录的测试角色';
    return '';
  }
  const target=action==='notice'?buttons.find(el=>el.tagName==='A'&&el.getAttribute('href')?.includes('notice=')&&name(el).includes(label)):
    action==='server'?buttons.find(el=>el.tagName==='A'&&el.getAttribute('href')==='#/town/world/'+label):find(label);
  if(!target)return false;
  target.scrollIntoView({block:'center'});target.click();return true;
}

// A new application process is essential: a previous FCL screen can otherwise mask an uninitialized runtime.
adb('shell','am','force-stop',app);
adb('shell','am','start','-W','-n',app+'/com.tungsten.fcl.activity.SplashActivity');
const pid=await polling(()=>{
  try{return adb('shell','pidof',app).split(' ')[0];}catch(e){if(e.status===1)return '';throw e;}
},10000,'社区进程');
assert.match(pid,/^\d+$/);
const port=adb('forward','tcp:0','localabstract:webview_devtools_remote_'+pid);
let ws;
try{
  const page=await polling(async()=>{
    try{return (await (await fetch('http://127.0.0.1:'+port+'/json')).json()).find(p=>p.url.startsWith('https://appassets.androidplatform.net/'));}
    catch{return null;}
  },20000,'可调试的内置社区页面');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await once(ws,'open');
  let id=0;
  async function run(action,label=''){
    const request=++id;
    const reply=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{ws.off('message',receive);reject(Error('社区页面没有响应'));},6000);
      function receive(raw){
        const msg=JSON.parse(raw);if(msg.id!==request)return;
        clearTimeout(timer);ws.off('message',receive);
        if(msg.error||msg.result.exceptionDetails)reject(Error('无法操作社区页面'));
        else resolve(msg.result.result.value);
      }
      ws.on('message',receive);
    });
    ws.send(JSON.stringify({id:request,method:'Runtime.evaluate',params:{
      expression:'('+interact.toString()+')('+JSON.stringify(action)+','+JSON.stringify(label)+')',returnByValue:true,userGesture:true
    }}));
    return reply;
  }
  await polling(()=>run('click','幻想镇社区首页'),15000,'已完成首次设置的社区首页');
  if(values.memory||values['dynamic-models']||values.renderer||values['lean-search']){
    await polling(()=>run('click','游戏库'),10000,'游戏库');
    await polling(()=>run('click',instance+' 实例设置'),12000,'实例设置');
    for(const [action,target] of [['memory',values.memory],['models',values['dynamic-models']?'on':null],['search',values['lean-search']?'on':null]]){
      if(target)await polling(async()=>{const state=await run(action,target);assert.notEqual(state,'unavailable','此设备或实例不支持这项设置');return state==='saved';},10000,'实例选项已保存');
    }
    if(values.renderer)await polling(async()=>(await run('renderer',values.renderer))==='saved',10000,'渲染器已保存');
    if(values.tier)await polling(async()=>(await run('renderer',values.tier==='large'?'加大 · 最多 2 GiB':'标准 · 最多 1 GiB'))==='saved',10000,'预算档位已保存');
    await run('click','关闭');
    await polling(()=>run('click','幻想镇社区首页'),10000,'返回社区');
  }
  await polling(()=>notice?run('notice',notice):run('server',server),20000,'社区内的目标服务器');
  await polling(async()=>{const issue=await run('issues');assert.ok(!issue,issue);return run('click','进入服务器');},12000,'公告内的进服入口');
  await polling(async()=>{
    const resumed=adb('shell','dumpsys','activity','activities').split('\n').filter(line=>/topResumedActivity=|mResumedActivity:/.test(line));
    if(resumed.some(line=>line.includes(app+'/')&&line.includes('JVMActivity')))return true;
    const issue=await run('issues');assert.ok(!issue,issue);
    if(instance)await run('click',instance);
    if(install)await run('click','安装并进入');
    if(values['client-compat'])await run('click','在此实例停用并继续');
    if(values['mobile-graphics'])await run('click','使用手机画质');
    return false;
  },install?90*60000:180000,'进入 Minecraft 游戏窗口');
  console.log('通过 · 从冷启动社区进入原生 Minecraft 游戏窗口');
}finally{ws?.close();adb('forward','--remove','tcp:'+port);}

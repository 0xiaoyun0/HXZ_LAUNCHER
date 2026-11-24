import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {parseArgs} from 'node:util';
import {WebSocket} from 'ws';

const {values}=parseArgs({options:{serial:{type:'string'},preview:{type:'string'}}});
const serial=values.serial, pkg='top.hxzmc.launcher.third.debug';
assert.match(serial||'',/^emulator-\d+$/,'请指定单独用于测试的安卓模拟器 --serial emulator-XXXX');
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
const adb=sdk?path.join(sdk,'platform-tools',process.platform==='win32'?'adb.exe':'adb'):'adb';
const run=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',windowsHide:true,timeout:18000,maxBuffer:8e6}).trim();
const shell=(...args)=>run('shell',...args);
const app=()=>{
  const alias=shell('cmd','package','resolve-activity','--brief','-a','android.intent.action.MAIN','-c','android.intent.category.LAUNCHER',pkg).split(/\r?\n/).pop();
  assert.ok(alias.startsWith(pkg+'/'));return shell('am','start','-W','-n',alias);
};
const home=()=>shell('input','keyevent','3');
async function poll(name,fn,ms=18000){
  const end=Date.now()+ms;
  do {const value=await fn();if(value)return value;await delay(220);}while(Date.now()<end);
  throw Error('等待超时 · '+name);
}
async function shot(name){
  if(!values.preview)return;
  await delay(360);
  await fs.mkdir(values.preview,{recursive:true});
  await fs.writeFile(path.join(values.preview,name+'.png'),execFileSync(adb,['-s',serial,'exec-out','screencap','-p'],{windowsHide:true,maxBuffer:12e6}));
}
async function web(){
  const port=await poll('WebView 调试端口',async()=>{
    try{const pid=shell('pidof',pkg).split(' ')[0];if(!pid)return;
      const p=run('forward','tcp:0','localabstract:webview_devtools_remote_'+pid);
      try{const list=await(await fetch('http://127.0.0.1:'+p+'/json',{signal:AbortSignal.timeout(2200)})).json();
        const pages=list.filter(v=>v.url.startsWith('https://appassets.androidplatform.net/index.html'));
        const target=pages.find(v=>{try{return JSON.parse(v.description).visible===true;}catch{return false;}})??pages[0];
        if(target)return {p,url:target.webSocketDebuggerUrl};
      }catch{}run('forward','--remove','tcp:'+p);
    }catch{}
  });
  const socket=new WebSocket(port.url);await once(socket,'open');
  const pending=new Map();let seq=0;
  socket.on('message',raw=>{const msg=JSON.parse(raw);const result=pending.get(msg.id);if(result){pending.delete(msg.id);result(msg);}});
  const call=async(method,params={})=>{
    const id=++seq,result=new Promise(resolve=>pending.set(id,resolve));
    socket.send(JSON.stringify({id,method,params}));const reply=await result;
    if(reply.error)throw Error(JSON.stringify(reply.error));return reply.result;
  };
  const evaluate=async(expression)=>{
    const a=await call('Runtime.evaluate',{expression,awaitPromise:true,userGesture:true,returnByValue:true});
    if(a.exceptionDetails)throw Error(a.exceptionDetails.exception?.description||a.exceptionDetails.text);return a.result.value;
  };
  const click=async(label)=>{
    const q=JSON.stringify(label);
    await poll('操作 '+label,async()=>evaluate("(()=>{const el=Array.from(document.querySelectorAll('button,a')).find(n=>n.offsetWidth&&!n.disabled&&(n.getAttribute('aria-label')==="+q+"||n.innerText.trim()==="+q+"));if(!el)return false;el.click();return true;})()"));
  };
  return {call,evaluate,click,close(){socket.close();run('forward','--remove','tcp:'+port.p);}};
}

export {run,shell,app,home,poll,shot,web,pkg};

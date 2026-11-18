import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {startFecEdge} from '../shared/hxzre-tunnel.mjs';

export const DEFAULT_FEC_ORIGINS=Object.freeze([
 {id:'HXZ-survival',target:'127.0.0.1:19999',port:40000},
 {id:'HXZ-mod-1',target:'127.0.0.1:19998',port:40001},
 {id:'HXZ-mod-2',target:'127.0.0.1:25599',port:40002}
]);
export function createFecAutoconfig({data,resources,log=()=>{},enabled}={}){
 const auto=enabled??process.env.HXZ_FEC_AUTO!=='0',binary=path.join(resources||'','hxzre/bin',process.platform==='win32'?'mc-tcp-fec.exe':'mc-tcp-fec');
 const children=new Map(),desired=new Map(),states=new Map(),timers=new Map(),probes=new Map();let closed=false;
 const publicHost=process.env.HXZ_FEC_PUBLIC_HOST||'ipv4.hxzmc.top',ports=String(process.env.HXZ_FEC_PORTS||'').split(','),targets=String(process.env.HXZ_FEC_TARGETS||'').split(',');
 let setupError='';
 if(!/^(?:\[[0-9a-f:]+\]|[a-z0-9][a-z0-9.-]*)$/i.test(publicHost))setupError='HXZ_FEC_PUBLIC_HOST 无效';
 if(!fs.existsSync(binary))setupError='未找到当前平台的 HXZRE 运行时';
 const definitions=DEFAULT_FEC_ORIGINS.map((entry,index)=>({...entry,port:Number(ports[index]||entry.port),target:(targets[index]||entry.target).trim()}));
 if(new Set(definitions.map(v=>v.port)).size!==3||definitions.some(v=>!Number.isInteger(v.port)||v.port<1||v.port>65535||!/^\[?[\da-f:.]+\]?:\d+$/.test(v.target)))setupError='HXZRE 端口或目标地址无效';
 function stop(id){clearTimeout(timers.get(id));timers.delete(id);const child=children.get(id);children.delete(id);if(child&&!child.killed)child.kill();}
 function start(entry){
  if(closed||!auto||setupError||children.has(entry.id)||desired.get(entry.id)!==entry)return;
  const state=states.get(entry.id);state.state='starting';state.error='';
  const child=spawn(binary,['origin','--listen','0.0.0.0:'+entry.port,'--target',entry.target,'--token-file',entry.file],{env:{...process.env,MC_FEC_TOKEN:entry.token},stdio:['ignore','pipe','pipe'],windowsHide:true});
  children.set(entry.id,child);state.pid=child.pid||null;
  const stdout=createInterface({input:child.stdout}),stderr=createInterface({input:child.stderr});
  stdout.on('line',line=>{if(/^MC_FEC_READY mode=origin /.test(line)){state.state='listening';state.readyAt=Date.now();state.retries=0;}});
  stderr.on('line',line=>{if(/error|failed|denied|占用/i.test(line)){state.error=line.replaceAll(entry.token,'[已隐藏]').slice(0,500);log('[HXZRE] '+state.error);}});
  child.once('error',error=>{state.state='failed';state.error=error.message;});
  child.once('close',(code,signal)=>{
   stdout.close();stderr.close();if(children.get(entry.id)!==child)return;children.delete(entry.id);state.pid=null;
   if(closed||desired.get(entry.id)!==entry)return;
   state.state='failed';state.error=state.error||'Origin 退出：'+(signal||code);state.retries=(state.retries||0)+1;
   const timer=setTimeout(()=>{timers.delete(entry.id);start(entry);},Math.min(30000,1000*2**Math.min(5,state.retries)));timer.unref();timers.set(entry.id,timer);
  });
 }
 function apply(presets){
  if(!Array.isArray(presets))return presets;
  return presets.map(preset=>{
   const def=definitions.find(v=>v.id===preset.id);if(!def)return preset;
   const origin=preset.fec?.origin||'',managed=!origin||origin===`${publicHost}:${def.port}`;
   if(!preset.fec?.enabled||!auto||setupError||!managed){
    desired.delete(def.id);stop(def.id);states.set(def.id,{id:def.id,enabled:!!preset.fec?.enabled,state:!preset.fec?.enabled?'disabled':!managed?'external':'unavailable',origin,error:setupError||(!auto?'此部署已关闭 HXZRE 自动托管':''),target:def.target});return preset;
   }
   let token,file;
   try{
    const dir=path.join(data,'hxzre');fs.mkdirSync(dir,{recursive:true});file=path.join(dir,def.id+'.token');
    try{token=fs.readFileSync(file,'utf8').trim();}catch{}
    if(!token||token.length<16||token.length>512||/[\r\n]/.test(token)){token=randomBytes(32).toString('base64url');fs.writeFileSync(file,token,{mode:0o600});}
   }catch(error){states.set(def.id,{id:def.id,state:'failed',error:'凭据无法保存：'+error.message});return preset;}
   const previous=desired.get(def.id),entry={...def,token,file,origin:`${publicHost}:${def.port}`};
   if(!previous||previous.token!==token||previous.target!==entry.target){stop(def.id);desired.set(def.id,entry);states.set(def.id,{id:def.id,enabled:true,state:'starting',origin:entry.origin,target:entry.target,port:entry.port,error:''});start(entry);}
   return {...preset,fec:{...preset.fec,origin:entry.origin,token}};
  });
 }
 async function probe(id){
  if(probes.has(id))return probes.get(id);
  const entry=desired.get(id);if(!entry)throw Error('此入口未由当前社区服务托管，请检查 Origin 部署');
  const job=(async()=>{let edge;try{edge=await startFecEdge({resources,probeTimeout:3000,preset:{address:entry.target,fec:{enabled:true,origin:'127.0.0.1:'+entry.port,token:entry.token}}});const result={ok:true,at:Date.now(),latency:edge.status.latency,online:edge.status.online};Object.assign(states.get(id),{verification:result});return result;}catch(error){const result={ok:false,at:Date.now(),error:error.message};Object.assign(states.get(id),{verification:result});return result;}finally{await edge?.stop();}})().finally(()=>probes.delete(id));probes.set(id,job);return job;
 }
 async function close(){closed=true;desired.clear();for(const id of timers.keys()){clearTimeout(timers.get(id));}timers.clear();const pending=[...children.entries()].map(([id,child])=>new Promise(resolve=>{const timer=setTimeout(resolve,2000);child.once('close',()=>{clearTimeout(timer);resolve();});stop(id);}));await Promise.all(pending);}
 return {apply,close,probe,status:()=>({auto,available:!setupError,error:setupError,items:[...states.values()],publicHost})};
}

import fs from 'node:fs/promises';
import path from 'node:path';
import {DEFAULT_STATUS_SERVERS as defaults,parseServerAddress,minecraftStatus} from '../shared/minecraft-connection.mjs';
export {minecraftStatus,varint,statusAddressCandidates} from '../shared/minecraft-connection.mjs';

export function createServerOnline({data,admin,body,send,bridgeState=()=>null}){
 const file=path.join(data,'server-online.json');let config,pending,cached;
 const read=async()=>config||(config=JSON.parse(await fs.readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return JSON.stringify(defaults);throw e;})));
 const load=async(force=false)=>{
  if(!force&&cached&&Date.now()-cached.at<15000)return cached;
  if(pending)return pending;
  pending=(async()=>{
   const configs=await read();
   const items=await Promise.all(configs.map(async s=>{
    if(!s.enabled)return {...s,available:false,error:'管理员未启用在线查询'};
    const bridge=bridgeState(s.id);
    if(bridge?.connected&&Date.now()-bridge.observed<30000&&Number.isInteger(bridge.online))return {...s,available:true,online:bridge.online,max:bridge.max,players:bridge.players.map(p=>({id:p.uid,name:p.name})),sample:false,source:'game-bridge',observed:bridge.observed,version:bridge.version};
    try{return {...s,...await minecraftStatus(s.address),available:true};}catch(e){return {...s,available:false,source:'unavailable',error:e.message};}
   }));return cached={at:Date.now(),items,protocol:2};
  })();try{return await pending;}finally{pending=null;}
 };
 return async(req,res,url)=>{
  if(url.pathname==='/api/server-online'&&req.method==='GET'){send(res,200,await load(url.searchParams.get('refresh')==='1'));return true;}
  if(url.pathname!=='/api/admin/server-online')return false;admin(req);
  if(req.method==='GET'){send(res,200,{items:await read()});return true;}
  if(req.method!=='PUT')throw Error('不支持的在线查询配置');
  const input=await body(req);if(!Array.isArray(input.items)||input.items.length!==3)throw Error('请配置三个服务器');
  const items=defaults.map(s=>{const v=input.items.find(i=>i.id===s.id);if(!v||typeof v.name!=='string'||!v.name.trim()||v.name.length>50)throw Error('服务器名称无效');parseServerAddress(v.address);return {id:s.id,name:v.name.trim(),address:v.address.trim(),enabled:v.enabled===true};});
  await fs.writeFile(file+'.tmp',JSON.stringify(items,null,2));await fs.rename(file+'.tmp',file);config=items;cached=null;send(res,200,{items});return true;
 };
}

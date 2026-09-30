import net from 'node:net';import dns from 'node:dns/promises';import fs from 'node:fs/promises';import path from 'node:path';
const defaults=[{id:'survival',name:'原版生存群组',address:'s1.hxzmc.top',enabled:true},{id:'mod-1',name:'模组一服',address:'s2.hxzmc.top',enabled:true},{id:'mod-2',name:'模组二服',address:'s3.hxzmc.top',enabled:true}];
export function varint(n){const b=[];do{let v=n&127;n>>>=7;if(n)v|=128;b.push(v);}while(n);return Buffer.from(b);}
function readVar(b,offset=0){let n=0;for(let i=0;i<5;i++){if(offset+i>=b.length)return null;const v=b[offset+i];n|=(v&127)<<(7*i);if(!(v&128))return {n:n>>>0,next:offset+i+1};}throw Error('服务器协议长度无效');}
function address(value){if(typeof value!=='string'||value.length>260||! /^(?:[a-z0-9][a-z0-9.-]*|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(value))throw Error('服务器地址无效');const u=new URL('http://'+value),match=value.match(/:(\d+)$/),port=match?Number(match[1]):25565;if(port<1||port>65535)throw Error('服务器端口应在 1–65535 范围');return {host:u.hostname.replace(/^\[|\]$/g,''),port,explicit:!!match};}
export async function minecraftStatus(value){
 const target=address(value),resolver=new dns.Resolver({timeout:2000,tries:1});let {host,port}=target;
 if(!target.explicit&&!net.isIP(host))try{const rows=await resolver.resolveSrv('_minecraft._tcp.'+host);const srv=rows.sort((a,b)=>a.priority-b.priority)[0];if(srv){host=srv.name;port=srv.port;}}catch{}
 return new Promise((resolve,reject)=>{
  const start=Date.now(),socket=net.connect({host,port}),chunks=[];let total=0,done=false;
  const timer=setTimeout(()=>finish(Error('服务器状态查询超时')),5000);
  function finish(error,value){if(done)return;done=true;clearTimeout(timer);socket.destroy();error?reject(error):resolve(value);}
  socket.on('error',e=>finish(Error('无法读取服务器状态：'+(e.code||e.message))));socket.on('end',()=>finish(Error('服务器提前结束状态查询')));
  socket.on('connect',()=>{const h=Buffer.from(target.host),p=Buffer.alloc(2);p.writeUInt16BE(port);const handshake=Buffer.concat([Buffer.from([0]),varint(-1),varint(h.length),h,p,Buffer.from([1])]);socket.write(Buffer.concat([varint(handshake.length),handshake,Buffer.from([1,0])]));});
  socket.on('data',chunk=>{try{total+=chunk.length;if(total>256*1024)throw Error('服务器状态数据超过限制');chunks.push(chunk);const all=Buffer.concat(chunks),packet=readVar(all);if(!packet)return;if(packet.n>256*1024)throw Error('服务器状态长度超过限制');if(all.length<packet.next+packet.n)return;const type=readVar(all,packet.next);if(type?.n!==0)throw Error('服务器没有返回游戏状态');const text=readVar(all,type.next);if(!text||text.next+text.n>packet.next+packet.n)throw Error('服务器状态数据不完整');const data=JSON.parse(all.subarray(text.next,text.next+text.n).toString());
    const sample=Array.isArray(data.players?.sample)?data.players.sample:[];
    finish(null,{online:Math.max(0,Number(data.players?.online)||0),max:Math.max(0,Number(data.players?.max)||0),players:sample.slice(0,200).map(p=>({name:String(p.name||'').slice(0,80),id:String(p.id||'').slice(0,64)})),sample:true,latency:Date.now()-start,version:String(data.version?.name||'').slice(0,100)});
   }catch(e){finish(e);}});
 });
}
export function createServerOnline({data,admin,body,send}){
 const file=path.join(data,'server-online.json');let config,pending,cached;
 const read=async()=>config||(config=JSON.parse(await fs.readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return JSON.stringify(defaults);throw e;})));
 const load=async()=>{if(cached&&Date.now()-cached.at<30000)return cached;if(pending)return pending;pending=(async()=>{const configs=await read();const items=await Promise.all(configs.map(async s=>{if(!s.enabled)return {...s,available:false,error:'管理员未启用在线查询'};try{return {...s,...await minecraftStatus(s.address),available:true};}catch(e){return {...s,available:false,error:e.message};}}));return cached={at:Date.now(),items};})();try{return await pending;}finally{pending=null;}};
 return async(req,res,url)=>{
  if(url.pathname==='/api/server-online'&&req.method==='GET'){send(res,200,await load());return true;}
  if(url.pathname!=='/api/admin/server-online')return false;admin(req);
  if(req.method==='GET'){send(res,200,{items:await read()});return true;}
  if(req.method!=='PUT')throw Error('不支持的在线查询配置');const input=await body(req);if(!Array.isArray(input.items)||input.items.length!==3)throw Error('请配置三个服务器');
  const items=defaults.map(s=>{const v=input.items.find(i=>i.id===s.id);if(!v||typeof v.name!=='string'||!v.name.trim()||v.name.length>50)throw Error('服务器名称无效');address(v.address);return {id:s.id,name:v.name.trim(),address:v.address,enabled:v.enabled===true};});
  await fs.writeFile(file+'.tmp',JSON.stringify(items,null,2));await fs.rename(file+'.tmp',file);config=items;cached=null;send(res,200,{items});return true;
 };
}

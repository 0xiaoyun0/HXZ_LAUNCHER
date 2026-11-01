import net from 'node:net';
import dns from 'node:dns/promises';

export const DEFAULT_STATUS_SERVERS=Object.freeze([
 {id:'survival',name:'原版生存群组',address:'s1.hxzmc.top',enabled:true},
 {id:'mod-1',name:'模组一服',address:'s2.hxzmc.top',enabled:true},
 {id:'mod-2',name:'模组二服',address:'s3.hxzmc.top',enabled:true}
]);
const fallback={ 's1.hxzmc.top':'ipv4.hxzmc.top:19999','s2.hxzmc.top':'ipv4.hxzmc.top:19998','s3.hxzmc.top':'ipv4.hxzmc.top:25599' };
export function statusAddressCandidates(value){
 const input=typeof value==='string'?value.trim():'';
 return input?(fallback[input.toLowerCase()]?[fallback[input.toLowerCase()],input]:[input]):[];
}
export function parseServerAddress(value){
 if(typeof value!=='string'||value.length>260||!/^(?:[a-z0-9][a-z0-9.-]*|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(value.trim()))throw Error('服务器地址无效');
 const input=value.trim(),match=input.match(/:(\d+)$/),port=match?Number(match[1]):25565;
 if(port<1||port>65535)throw Error('服务器端口应在 1–65535 范围');
 return {host:new URL('http://'+input).hostname.replace(/^\[|\]$/g,''),port,explicit:!!match};
}
export function varint(n){const bytes=[];do{let value=n&127;n>>>=7;if(n)value|=128;bytes.push(value);}while(n);return Buffer.from(bytes);}
function readVar(bytes,offset=0){let n=0;for(let i=0;i<5;i++){if(offset+i>=bytes.length)return null;const value=bytes[offset+i];n|=(value&127)<<(7*i);if(!(value&128))return {n:n>>>0,next:offset+i+1};}throw Error('服务器协议长度无效');}
export async function resolveMinecraftAddress(value,{signal,timeout=1200}={}){
 const target=parseServerAddress(value);signal?.throwIfAborted();
 if(target.explicit||net.isIP(target.host))return target;
 const resolver=new dns.Resolver({timeout,tries:1});
 const abort=()=>resolver.cancel();signal?.addEventListener('abort',abort,{once:true});
 try{const rows=await resolver.resolveSrv('_minecraft._tcp.'+target.host);const srv=rows.sort((a,b)=>a.priority-b.priority||b.weight-a.weight)[0];
  if(srv?.name&&srv.name!=='.'&&srv.port>0)return {...target,host:srv.name.replace(/\.$/,''),port:srv.port};
 }catch{}finally{signal?.removeEventListener('abort',abort);}
 signal?.throwIfAborted();return target;
}
export async function queryMinecraftStatus(value,{signal,timeout=3000,handshakeAddress=value,resolveSrv=true}={}){
 const target=resolveSrv?await resolveMinecraftAddress(value,{signal,timeout:Math.min(timeout,1200)}):parseServerAddress(value);
 const handshake=parseServerAddress(handshakeAddress);signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const start=Date.now(),socket=net.connect({host:target.host,port:target.port}),chunks=[];let total=0,done=false;
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);socket.destroy();error?reject(error):resolve(value);};
  const abort=()=>finish(signal.reason||Error('连接已取消'));
  const timer=setTimeout(()=>finish(Error('服务器状态查询超时')),timeout);
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)return abort();
  socket.on('error',e=>finish(Error('无法读取服务器状态：'+(e.code||e.message))));
  socket.on('end',()=>finish(Error('服务器提前结束状态查询')));
  socket.on('connect',()=>{const host=Buffer.from(handshake.host),port=Buffer.alloc(2);port.writeUInt16BE(handshake.port);
   const packet=Buffer.concat([Buffer.from([0]),varint(-1),varint(host.length),host,port,Buffer.from([1])]);
   socket.write(Buffer.concat([varint(packet.length),packet,Buffer.from([1,0])]));
  });
  socket.on('data',chunk=>{try{
   total+=chunk.length;if(total>262144)throw Error('服务器状态数据超过限制');chunks.push(chunk);
   const bytes=Buffer.concat(chunks),packet=readVar(bytes);if(!packet)return;if(packet.n>262144)throw Error('服务器状态长度超过限制');if(bytes.length<packet.next+packet.n)return;
   const type=readVar(bytes,packet.next);if(type?.n!==0)throw Error('服务器没有返回游戏状态');
   const text=readVar(bytes,type.next);if(!text||text.next+text.n!==packet.next+packet.n)throw Error('服务器状态数据不完整');
   const data=JSON.parse(bytes.subarray(text.next,text.next+text.n).toString('utf8'));
   if(!Number.isInteger(data.players?.online)||data.players.online<0||!Number.isInteger(data.players?.max)||data.players.max<0)throw Error('服务器未提供有效在线人数');
   const players=(Array.isArray(data.players.sample)?data.players.sample:[]).slice(0,1000).map(p=>({name:String(p.name||'').slice(0,80),id:String(p.id||'').slice(0,64)}));
   finish(null,{online:data.players.online,max:data.players.max,players,sample:true,latency:Date.now()-start,version:String(data.version?.name||'').slice(0,100),source:'minecraft',observed:Date.now()});
  }catch(error){finish(error);}});
 });
}
export async function minecraftStatus(value,options={}){
 const failures=[];for(const candidate of statusAddressCandidates(value))try{return await queryMinecraftStatus(candidate,{...options,handshakeAddress:options.handshakeAddress||value});}catch(error){options.signal?.throwIfAborted();failures.push(error.message);}
 throw Error([...new Set(failures)].join('；')||'服务器地址无效');
}

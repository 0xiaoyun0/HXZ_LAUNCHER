import dns from 'node:dns/promises';
import net from 'node:net';
import {serverAddress} from './instances.mjs';
export async function diagnoseServer(address){
 const valid=serverAddress(address);if(!valid)throw Error('此实例尚未设置进服地址');const target=new URL('http://'+valid),steps=[];let host=target.hostname.replace(/^\[|\]$/g,''),port=Number(target.port)||25565;
 const resolver=new dns.Resolver({timeout:3000,tries:1});
 if(!target.port&&!net.isIP(host))try{const records=await resolver.resolveSrv('_minecraft._tcp.'+host);const srv=records.sort((a,b)=>a.priority-b.priority)[0];if(srv){host=srv.name;port=srv.port;steps.push({ok:true,title:'服务器 SRV',detail:host+':'+port});}}catch(e){if(!['ENODATA','ENOTFOUND'].includes(e.code))steps.push({ok:false,title:'SRV 查询',detail:e.code+'，继续检查原地址'});}
 let addresses=[];
 try{addresses=net.isIP(host)?[host]:[...(await Promise.allSettled([resolver.resolve4(host),resolver.resolve6(host)])).flatMap(r=>r.status==='fulfilled'?r.value:[])];if(!addresses.length)throw Error('没有得到可用的 A / AAAA 记录');steps.push({ok:true,title:'域名解析',detail:addresses.join('、')});}
 catch(e){steps.push({ok:false,title:'域名解析失败',detail:e.message+'。请核对地址和 DNS；此结果不能证明服务器停服。'});return {address,steps};}
 const attempts=await Promise.all(addresses.slice(0,4).map(ip=>new Promise(resolve=>{
  const started=Date.now(),socket=net.connect({host:ip,port});let ended=false;
  const finish=(ok,detail)=>{if(ended)return;ended=true;socket.destroy();resolve({ok,title:ip+':'+port,detail});};
  socket.setTimeout(5000,()=>finish(false,'连接超时，可能是线路、防火墙或服务器无响应'));
  socket.once('connect',()=>finish(true,'TCP 端口可达 · '+(Date.now()-started)+' ms'));
  socket.once('error',e=>finish(false,e.code==='ECONNREFUSED'?'端口拒绝连接，请管理员检查监听端口与服务状态':e.code+': '+e.message));
 })));
 steps.push(...attempts);steps.push({ok:null,title:'结果边界',detail:'端口可达仅说明网络连接成功，不代表登录、模组版本或服务端插件正常。请结合游戏错误证据；服务端内部问题需管理员查看同一时间的服务端日志。'});return {address,steps};
}

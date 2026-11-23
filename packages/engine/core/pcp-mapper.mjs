import dgram from 'node:dgram';
import net from 'node:net';
import {randomBytes} from 'node:crypto';
import {gateway4async} from 'default-gateway';

// RFC 6887 MAP, TCP only. PCP grants a direct router mapping; it is not a relay.
export function pcpPacket({nonce,localAddress,localPort,publicPort=localPort,lifetime=1200}){
 if(!net.isIPv4(localAddress)||nonce.length!==12)throw Error('PCP 本机地址无效');
 const b=Buffer.alloc(60);b[0]=2;b[1]=1;b.writeUInt32BE(lifetime,4);b[18]=255;b[19]=255;
 localAddress.split('.').forEach((v,i)=>b[20+i]=Number(v));nonce.copy(b,24);b[36]=6;b.writeUInt16BE(localPort,40);b.writeUInt16BE(publicPort,42);return b;
}
export function pcpReply(b,nonce,port){
 if(b.length<60||b[0]!==2||b[1]!==129||!b.subarray(24,36).equals(nonce)||b[36]!==6||b.readUInt16BE(40)!==port)throw Error('PCP 响应与请求不符');
 if(b[3]!==0)throw Error('路由器拒绝 PCP 映射（'+b[3]+'）');
 const address=b.subarray(44,60),v4=address.subarray(0,10).every(v=>v===0)&&address[10]===255&&address[11]===255;
 return {port:b.readUInt16BE(42),host:v4?[...address.subarray(12)].join('.'):Array.from({length:8},(_,i)=>address.readUInt16BE(i*2).toString(16)).join(':'),lifetime:b.readUInt32BE(4)};
}
export async function pcpNat({gateway:provided}={}){
 const gateway=provided||(await gateway4async()).gateway,nonce=randomBytes(12);let mapped,timer,closed=false;
 async function exchange(opts,lifetime=1200){
  if(closed)throw Error('PCP 已关闭');const packet=pcpPacket({...opts,nonce,lifetime}),s=dgram.createSocket('udp4');
  return new Promise((resolve,reject)=>{let done=false;const timers=[];const finish=(e,v)=>{if(done)return;done=true;timers.forEach(clearTimeout);s.close();e?reject(e):resolve(v);};s.on('error',e=>finish(e));s.on('message',(b,r)=>{if(r.address!==gateway||r.port!==5351)return;try{finish(null,pcpReply(b,nonce,opts.localPort));}catch(e){finish(e);}});s.bind(0,opts.localAddress,()=>{for(const delay of [0,1000,2000])timers.push(setTimeout(()=>s.send(packet,5351,gateway,e=>{if(e)finish(e);}),delay));});timers.push(setTimeout(()=>finish(Error('路由器未响应 PCP')),4000));});
 }
 return {async map(opts){mapped={opts,result:await exchange(opts)};if(mapped.result.port!==opts.publicPort){await exchange(opts,0).catch(()=>{});throw Error('路由器分配了不同端口，请使用手动映射');}timer=setInterval(()=>void exchange(opts).catch(()=>{}),Math.max(30,Math.min(900,mapped.result.lifetime/2))*1000);timer.unref?.();},async externalIp(){return mapped?.result.host;},async unmap(){clearInterval(timer);if(mapped){await exchange(mapped.opts,0);mapped=null;}},async close(){clearInterval(timer);closed=true;}};
}

import net from 'node:net';
import tls from 'node:tls';
import {createHash,timingSafeEqual} from 'node:crypto';

export const TLS_OPTIONS={minVersion:'TLSv1.2'};
export const validFingerprint=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export const certificateFingerprint=raw=>createHash('sha256').update(raw).digest('hex');
export function authorizedHello(input,room){return input?.id===room.id&&typeof input.key==='string'&&/^[-\w]{43}$/.test(input.key)&&timingSafeEqual(Buffer.from(input.key),Buffer.from(room.key));}
export function portNumber(value){const port=Number(value);if(!Number.isInteger(port)||port<1||port>65535)throw Error('端口必须在 1–65535 之间');return port;}
const blocked=new net.BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(address,prefix);
export function publicAddress(host){
 if(net.isIPv4(host))return !blocked.check(host);
 if(!net.isIPv6(host))return false;
 const prefix=parseInt(host.split(':')[0],16);
 return prefix>=0x2000&&prefix<=0x3fff&&!/^2001:(?:0*:|0*db8:)/i.test(host);
}
export function parseInvitation(raw){
 if(typeof raw!=='string'||raw.length>5000)throw Error('请粘贴完整的房间邀请');
 const code=raw.trim().replace(/^hxz-room:\/\//,'');let value;
 try{value=JSON.parse(Buffer.from(code,'base64url').toString('utf8'));}catch{throw Error('房间邀请无法解析');}
 if(!value||value.v!==1||!/^[-\w]{16,80}$/.test(value.id)||!/^[-\w]{43}$/.test(value.key)||!validFingerprint(value.fingerprint)||!Array.isArray(value.hosts)||(!value.hosts.length&&!value.relay)||value.hosts.length>8||value.hosts.some(h=>typeof h!=='string'||!net.isIP(h)))throw Error('房间邀请格式无效');
 portNumber(value.port);if(typeof value.name!=='string'||value.name.length>80)throw Error('房间名称无效');
 if(!Number.isFinite(value.expires)||value.expires<Date.now())throw Error('房间邀请已过期，请向房主获取新邀请');
 return value;
}
export const invitation=value=>'hxz-room://'+Buffer.from(JSON.stringify({v:1,id:value.id,key:value.key,fingerprint:value.fingerprint,name:value.name,hosts:value.hosts,relay:value.relay===true,port:value.port,expires:value.expires})).toString('base64url');
export function readLine(socket,timeout=7000){
 return new Promise((resolve,reject)=>{
  let bytes=Buffer.alloc(0);const timer=setTimeout(()=>finish(Error('房主没有及时响应')),timeout);
  const finish=(error,value)=>{clearTimeout(timer);socket.off('data',data);socket.off('error',fail);socket.off('close',closed);if(error)reject(error);else resolve(value);};
  const fail=error=>finish(error),closed=()=>finish(Error('房主已断开连接'));
  function data(chunk){bytes=Buffer.concat([bytes,chunk]);const index=bytes.indexOf(10);if(index<0){if(bytes.length>8192)finish(Error('房间响应过大'));return;}if(index>8192){finish(Error('房间响应过大'));return;}socket.pause();const rest=bytes.subarray(index+1);if(rest.length)socket.unshift(rest);try{finish(null,JSON.parse(bytes.subarray(0,index).toString('utf8')));}catch{finish(Error('房间协议无效'));}}
  socket.on('data',data);socket.once('error',fail);socket.once('close',closed);socket.resume();
 });
}
export async function dialRoom(room,host,operation='probe',timeout=6000,stream=null){
 if(!validFingerprint(room.fingerprint))throw Error('房间证书指纹无效');
 // The invitation pins this ephemeral certificate. Never send credentials before checking it.
 const socket=tls.connect({...TLS_OPTIONS,...(stream?{socket:stream}:{host,port:portNumber(room.port)}),rejectUnauthorized:false});
 socket.on('error',()=>{});socket.setNoDelay(true);socket.setKeepAlive(true,15000);
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.destroy();reject(Error('连接房主超时'));},timeout);const cleanup=()=>{clearTimeout(timer);socket.off('secureConnect',ready);socket.off('error',fail);};const ready=()=>{cleanup();resolve();},fail=e=>{cleanup();reject(e);};socket.once('secureConnect',ready);socket.once('error',fail);});
  const certificate=socket.getPeerCertificate();if(!certificate.raw||certificateFingerprint(certificate.raw)!==room.fingerprint)throw Error('房主证书与邀请不一致，请重新获取邀请');
  socket.write(JSON.stringify({operation,id:room.id,key:room.key})+'\n');const info=await readLine(socket,timeout);if(!info?.ok)throw Error(info?.error||'房间不可用');return {socket,info};
 }catch(error){socket.destroy();throw error;}
}

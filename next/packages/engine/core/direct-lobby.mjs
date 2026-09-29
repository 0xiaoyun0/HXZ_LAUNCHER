import net from 'node:net';
import tls from 'node:tls';
import os from 'node:os';
import dgram from 'node:dgram';
import {randomBytes,randomUUID} from 'node:crypto';
import {upnpNat} from '@achingbrain/nat-port-mapper';
import {TLS_OPTIONS,authorizedHello,publicAddress,parseInvitation,invitation,readLine,dialRoom} from './direct-wire.mjs';
import {createRoomCertificate} from './direct-certificate.mjs';

const interfaces=()=>Object.entries(os.networkInterfaces()).flatMap(([name,rows])=>(rows||[]).filter(v=>!v.internal&&!v.address.includes('%')&&!/^fe80:/i.test(v.address)).map(v=>({name,address:v.address,family:net.isIP(v.address)})));
const listen=(server,options)=>new Promise((resolve,reject)=>{const fail=e=>{server.off('listening',ready);reject(e);},ready=()=>{server.off('error',fail);resolve(server.address());};server.once('error',fail);server.once('listening',ready);server.listen(options);});
const freePort=async()=>{const server=net.createServer();const {port}=await listen(server,{host:'127.0.0.1',port:0});await new Promise(r=>server.close(r));return port;};
const timed=async(promise,ms,label)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label)),ms))]);}finally{clearTimeout(timer);}};
const outboundIPv4=()=>new Promise(resolve=>{const socket=dgram.createSocket('udp4');let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);socket.close();resolve(value);};const timer=setTimeout(()=>finish(''),1000);socket.on('error',()=>finish(''));socket.connect(53,'1.1.1.1',()=>finish(socket.address().address));}); // Route lookup only; no datagrams are sent.

export function createDirectLobby({request,emit=()=>{},networkInterfaces=interfaces,makeMapper=upnpNat}){
 let server=null,nat=null,room=null,guest=null,generation=0,renewTimer=null,directoryTimer=null,renewing=false,probing=false,publishing=false,publishAgain=false;
 const sockets=new Set(),peers=new Map();
 let state={mode:'idle',phase:'尚未连接',error:'',checks:[],ready:false,connections:0,bytesIn:0,bytesOut:0};
 const snapshot=()=>({...state,room:room?{id:room.id,name:room.name,instance:room.instance,port:room.port,gamePort:room.gamePort,hosts:room.hosts,invite:room.hosts.length?invitation(room):'',expires:room.expires,leaseExpires:room.leaseExpires}:null,guest:guest?{name:guest.name,instance:guest.instance,address:guest.address,host:guest.host,latency:guest.latency}:null,peers:[...peers.values()]});
 const update=patch=>{Object.assign(state,patch);emit({type:'lobby',value:snapshot()});};
 const note=(label,ok,detail='')=>{state.checks=[...state.checks.slice(-15),{label,ok,detail}];update({});};
 async function publish(){const current=room;if(!current?.public||state.mode!=='host')return;if(publishing){publishAgain=true;return;}publishing=true;try{await request('/api/lobby/rooms',{method:'POST',body:{invite:invitation(current),ready:state.ready,connections:peers.size,scope:current.scope,version:current.version,loader:current.loader}});if(room===current)update({listed:true,directoryError:''});else void request('/api/lobby/rooms',{method:'DELETE',body:{id:current.id}}).catch(()=>{});}catch(error){if(room===current)update({listed:false,directoryError:'房间暂未显示在大厅：'+error.message});}finally{publishing=false;if(publishAgain){publishAgain=false;void publish();}}}
 function track(socket){sockets.add(socket);socket.on('error',()=>{});socket.once('close',()=>sockets.delete(socket));return socket;}
 async function close(reason='房间已关闭'){
  generation++;clearInterval(renewTimer);clearInterval(directoryTimer);renewTimer=null;directoryTimer=null;const oldNat=nat,oldPort=room?.port,oldRoom=room;nat=null;room=null;guest=null;
  if(server){server.close();server=null;}for(const socket of sockets)socket.destroy();sockets.clear();peers.clear();
  update({mode:'idle',phase:reason,ready:false,connections:0,listed:false,directoryError:''});
  if(oldRoom?.public)void request('/api/lobby/rooms',{method:'DELETE',body:{id:oldRoom.id}}).catch(()=>{});
  if(oldNat){try{if(oldPort)await timed(oldNat.unmap({localPort:oldPort,publicPort:oldPort,protocol:'TCP'}),3000,'映射释放超时');}catch{}finally{void oldNat.close().catch(()=>{});}}
 }
 async function host(input){
  if(state.mode!=='idle')throw Error('请先关闭当前房间或离开连接');
  const token=++generation;state.checks=[];update({mode:'checking',phase:'验证创建权限',error:'',bytesIn:0,bytesOut:0});
  const current=()=>{if(token!==generation)throw Error('操作已取消');};
  try{
   const lease=await request('/api/lobby/lease',{method:'POST',body:{}});current();if(!lease.allowed||lease.expiresAt<=Date.now())throw Error('尚未获得开房权限');
   note('管理员授权',true,'开房权限验证通过');
   const name=String(input.name||'一起玩 Minecraft').trim().slice(0,80);if(!name)throw Error('请填写房间名称');
   const gamePort=await freePort(),certificate=await createRoomCertificate();current();
   room={v:1,id:randomUUID(),key:randomBytes(32).toString('base64url'),fingerprint:certificate.fingerprint,name,hosts:[],port:0,gamePort,instance:input.instance,expires:Date.now()+12*3600000,leaseExpires:lease.expiresAt,owner:lease.uid,public:input.public!==false,scope:input.scope==='lan'?'lan':'internet',version:input.version||'',loader:input.loader||''};
   const hosting=room;
   server=tls.createServer({...TLS_OPTIONS,key:certificate.key,cert:certificate.cert,handshakeTimeout:5000},socket=>{
    track(socket);socket.setNoDelay(true);socket.setKeepAlive(true,15000);
    void (async()=>{
     try{
      const input=await readLine(socket);if(room!==hosting)throw Error('房间已关闭');if(!authorizedHello(input,hosting))throw Error('房间邀请已失效');
      if(input.operation==='probe'){socket.end(JSON.stringify({ok:true,name:hosting.name,ready:state.ready,connections:peers.size})+'\n',()=>socket.destroy());return;}
      if(input.operation!=='join')throw Error('未知房间操作');if(!state.ready)throw Error('房主尚未进入世界，请稍后重试');if(peers.size>=32)throw Error('房间连接数已满');
      const upstream=track(net.connect({host:'127.0.0.1',port:hosting.gamePort}));upstream.setNoDelay(true);
      socket.once('close',()=>upstream.destroy());upstream.once('close',()=>socket.destroy());
      await timed(new Promise((resolve,reject)=>{upstream.once('connect',resolve);upstream.once('error',reject);}),6000,'房主世界没有响应');
      if(socket.destroyed||room!==hosting){upstream.destroy();return;}
      const peerId=randomUUID();peers.set(peerId,{id:peerId,address:socket.remoteAddress,joined:Date.now()});update({connections:peers.size});
      socket.once('close',()=>{peers.delete(peerId);update({connections:peers.size});});
      socket.write(JSON.stringify({ok:true,name:hosting.name})+'\n');
      socket.on('data',b=>state.bytesIn+=b.length);upstream.on('data',b=>state.bytesOut+=b.length);
      socket.pipe(upstream);upstream.pipe(socket);socket.resume();
     }catch(error){if(!socket.destroyed)socket.end(JSON.stringify({ok:false,error:error.message})+'\n',()=>socket.destroy());}
    })();
   });
   server.maxConnections=64;server.on('tlsClientError',()=>{});server.on('error',e=>update({error:'房间监听异常：'+e.message}));
   // Track TCP sockets before TLS completes so cancelling also closes partial handshakes.
   server.on('connection',track);
   let address;try{address=await listen(server,{host:'::',port:0,ipv6Only:false});}catch(e){if(e.code!=='EAFNOSUPPORT')throw e;address=await listen(server,{host:'0.0.0.0',port:0});}
   hosting.port=address.port;current();note('本机联机通道',true,'已建立加密直连监听');
   const adapters=networkInterfaces(),candidates=adapters.filter(v=>publicAddress(v.address)).map(v=>v.address);
   if(input.scope==='lan'){
    hosting.hosts=adapters.filter(v=>v.family===4).map(v=>v.address).slice(0,8);if(!hosting.hosts.length)throw Error('没有可用的局域网地址');note('局域网模式',true,'仅适用于同一网络，未标记为异地可用');
   }else{
    update({phase:'检查公网 IPv6 / IPv4 直连'});
    for(const host of candidates.slice(0,3)){current();const result=await request('/api/lobby/probe',{method:'POST',body:{host,port:hosting.port,id:hosting.id,key:hosting.key,fingerprint:hosting.fingerprint}});current();if(result.reachable){hosting.hosts.push(host);note('公网直连',true,host);}}
    if(!hosting.hosts.some(net.isIPv4)){
     update({phase:'尝试路由器自动映射'});nat=makeMapper({description:'FantasyTown direct room',ttl:1200,keepAlive:true,discoveryTimeout:5000});
     try{
      const routed=await outboundIPv4();current();const localAddress=adapters.find(v=>v.family===4&&v.address===routed)?.address||adapters.find(v=>v.family===4)?.address;if(!localAddress)throw Error('没有 IPv4 网络');
      await timed(nat.map({localPort:hosting.port,publicPort:hosting.port,localAddress,protocol:'TCP'}),9000,'路由器未响应自动映射');current();
      const host=await timed(nat.externalIp(),5000,'无法读取路由器公网地址');current();
      if(!publicAddress(host))throw Error('路由器仍处于运营商或多层内网');
      const result=await request('/api/lobby/probe',{method:'POST',body:{host,port:hosting.port,id:hosting.id,key:hosting.key,fingerprint:hosting.fingerprint}});current();
      if(!result.reachable)throw Error(result.reason||'自动映射后仍无法从公网到达');hosting.hosts.push(host);note('路由器自动映射',true,'异地探测已通过');
     }catch(error){note('路由器自动映射',false,error.message);}
    }
    current();if(!hosting.hosts.length)throw Error('当前网络未通过异地直连检测。需要可入站的公网 IPv6 或支持自动映射的公网 IPv4；运营商内网无法保证零配置联机。');
   }
   current();update({mode:'host',phase:'网络已就绪 · 等待房主进入单人世界'});
   void publish();directoryTimer=setInterval(()=>void publish(),30000);directoryTimer.unref?.();
   renewTimer=setInterval(async()=>{
    if(room!==hosting||renewing)return;if(hosting.leaseExpires<=Date.now()){void close('开房授权已过期').then(()=>update({error:'请重新连接社区并验证开房权限'}));return;}
    renewing=true;try{const value=await request('/api/lobby/lease',{method:'POST',body:{}});if(room!==hosting)return;if(!value.allowed||value.uid!==hosting.owner){await close('开房权限已变更');return;}hosting.leaseExpires=value.expiresAt;}
    catch(error){if(error.status===403)await close('管理员已撤销开房权限');else update({error:'暂时无法续验开房权限，将在授权到期时关闭房间'});}finally{renewing=false;}
   },120000);renewTimer.unref?.();return snapshot();
  }catch(error){if(token===generation){await close('创建未完成');update({error:error.message});}throw error;}
 }
 async function inspect(raw){
  if(probing)throw Error('正在检测房主连接，请稍候');probing=true;
  try{const target=parseInvitation(raw),start=Date.now(),results=await Promise.all(target.hosts.map(async host=>{try{const {socket,info}=await dialRoom(target,host);socket.destroy();return{host,info,latency:Date.now()-start};}catch{return null;}}));const reachable=results.filter(Boolean).sort((a,b)=>a.latency-b.latency)[0];if(!reachable)throw Error('无法直连房主：房间可能已关闭、邀请已失效，或双方网络不兼容。请让房主重新检测网络。');return {target,...reachable};}finally{probing=false;}
 }
 async function join(input){
  if(state.mode!=='idle')throw Error('请先关闭当前房间或离开连接');const token=++generation;update({mode:'checking',phase:'检测房主网络与世界',error:'',checks:[]});
  try{
   const tested=await inspect(input.invite);if(token!==generation)throw Error('操作已取消');if(!tested.info.ready)throw Error('已连接房主，但房主尚未进入单人世界');
   const {target,host}=tested;
   server=net.createServer(socket=>{track(socket);socket.pause();void(async()=>{let remote;try{const result=await dialRoom(target,host,'join');remote=track(result.socket);if(socket.destroyed||token!==generation){remote.destroy();return;}socket.once('close',()=>remote.destroy());remote.once('close',()=>socket.destroy());socket.setNoDelay(true);socket.pipe(remote);remote.pipe(socket);socket.resume();remote.resume();}catch(error){remote?.destroy();socket.destroy();update({error:error.message});}})();});
   server.maxConnections=32;server.on('error',e=>update({error:e.message}));const address=await listen(server,{host:'127.0.0.1',port:0});if(token!==generation)throw Error('操作已取消');
   guest={name:target.name,instance:input.instance,address:'127.0.0.1:'+address.port,host,latency:tested.latency};note('房主直连',true,`${tested.latency} ms · 加密通道`);update({mode:'guest',ready:true,phase:'连接就绪 · 可以启动游戏'});return snapshot();
  }catch(error){if(token===generation){await close('加入未完成');update({error:error.message});}throw error;}
 }
 return {host,join,close,status:snapshot,inspect:async raw=>{const value=await inspect(raw);return {name:value.target.name,ready:value.info.ready,latency:value.latency,host:value.host};},
  access:()=>request('/api/lobby/access'),rooms:()=>request('/api/lobby/rooms'),grants:()=>request('/api/admin/lobby/grants'),grant:input=>request('/api/admin/lobby/grants',{method:'POST',body:input}),
  markReady(port){if(room&&Number(port)===room.gamePort){update({ready:true,phase:'世界已开放 · 等待玩家加入',error:''});void publish();}},
  markWaiting(){if(room){update({ready:false,phase:'等待房主进入单人世界'});void publish();}},
  markError(message){if(room){update({ready:false,phase:'自动开放世界未完成',error:String(message).slice(0,600)});void publish();}},
  hostConfig:()=>room&&state.mode==='host'?{port:room.gamePort,instance:room.instance,id:room.id}:null,
  guestConfig:()=>guest?{address:guest.address,instance:guest.instance}:null,
  dispose(){void close('程序已退出');}
 };
}

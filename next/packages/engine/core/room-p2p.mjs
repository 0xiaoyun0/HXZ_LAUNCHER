import {WebSocket} from 'ws';import net from 'node:net';import {createHash,randomBytes,randomUUID} from 'node:crypto';
const proof=key=>createHash('sha256').update(key).digest('hex');
const ICE=[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:global.stun.twilio.com:3478'},{urls:'stun:stun.l.google.com:19302'}];
export function createP2PClient({session,runtime,emit=()=>{},iceServers=ICE}){
 let control,retry,stopped=true,epoch=0;const signals=new Set(),peers=new Set();
 const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data),e=>{if(e)ws.terminate();});};
 async function open(input){const generation=epoch,identity=await session();if(generation!==epoch)throw Error('连接已取消');const url=new URL(identity.base);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.pathname=url.pathname.replace(/\/$/,'')+'/lobby-signal';url.search='';url.hash='';
  return new Promise((resolve,reject)=>{const ws=new WebSocket(url,{maxPayload:20000,perMessageDeflate:false});signals.add(ws);ws.on('error',()=>{});ws.once('close',()=>signals.delete(ws));
   let accepted=false,receiver;const queued=[];
   const timer=setTimeout(()=>fail(Error('P2P 协商服务连接超时')),10000),cleanup=()=>{clearTimeout(timer);ws.off('error',fail);ws.off('close',closed);},fail=e=>{cleanup();ws.terminate();reject(e);},closed=()=>fail(Error('P2P 协商服务已断开'));
   // ws may emit several frames before an await continuation runs. Keep one
   // receiver from socket creation onwards, including during async peer setup.
   const first=(raw,binary)=>{try{if(accepted){if(receiver)receiver(raw,binary);else if(queued.length<128)queued.push([raw,binary]);else ws.terminate();return;}if(binary)throw Error('协商消息无效');const v=JSON.parse(raw);if(v.type==='error')throw Error(v.error);if(!['registered','ready'].includes(v.type))throw Error('协商握手无效');accepted=true;cleanup();resolve({ws,info:v,attach(fn){receiver=fn;for(const args of queued.splice(0))fn(...args);if(ws.readyState!==WebSocket.OPEN)queueMicrotask(()=>ws.emit('close'));}});}catch(e){fail(e);}};
   ws.once('open',()=>send(ws,{...input,token:identity.token}));ws.on('message',first);ws.once('error',fail);ws.once('close',closed);
  });
 }
 async function host(room){stopped=false;const generation=epoch,current=()=>!stopped&&epoch===generation;
  const connect=async()=>{if(!current())return;try{const {ws,attach}=await open({type:'host',room:room.id,proof:proof(room.key)});if(!current()){ws.terminate();return;}control=ws;emit({p2pAvailable:true,p2pError:''});const negotiating=new Map();
   attach((raw,binary)=>{if(binary)return;let v;try{v=JSON.parse(raw);}catch{return;}
    if(v.type==='incoming'){
     const pending=runtime.peer({initiator:false,iceServers,signal:signal=>send(ws,{type:'signal',pair:v.pair,signal})});negotiating.set(v.pair,pending);
     void pending.then(async peer=>{if(!current()){peer.close();return;}peers.add(peer);peer.stream.once('close',()=>{peers.delete(peer);negotiating.delete(v.pair);});await peer.opened;if(!current()){peer.close();return;}
      // The peer still has to pass the existing TLS certificate and invitation handshake.
      const socket=net.connect({host:'127.0.0.1',port:room.port});socket.setNoDelay(true);socket.on('error',()=>peer.close());socket.once('close',()=>peer.close());peer.stream.once('close',()=>socket.destroy());socket.pipe(peer.stream).pipe(socket);
     }).catch(()=>{negotiating.delete(v.pair);});
    }else if(v.type==='signal'){void negotiating.get(v.pair)?.then(p=>p.signal(v.signal)).catch(()=>{});}
    else if(v.type==='closed'){void negotiating.get(v.pair)?.then(p=>p.close()).catch(()=>{});negotiating.delete(v.pair);}
    else if(v.type==='complete')negotiating.delete(v.pair);
   });
   ws.once('close',()=>{for(const p of negotiating.values())void p.then(p=>p.close()).catch(()=>{});negotiating.clear();if(current()){emit({p2pAvailable:false});retry=setTimeout(()=>void connect().catch(()=>{}),4000);}});
  }catch(e){if(current()){emit({p2pAvailable:false,p2pError:e.message});retry=setTimeout(()=>void connect().catch(()=>{}),5000);}throw e;}};
  await connect();return true;
 }
 async function dial(room){const generation=epoch;const {ws,info,attach}=await open({type:'join',room:room.id,proof:proof(room.key)});let done=false,peer;
  const pending=runtime.peer({initiator:true,iceServers,signal:signal=>send(ws,{type:'signal',pair:info.pair,signal})});
  attach((raw,binary)=>{if(binary)return;let v;try{v=JSON.parse(raw);}catch{return;}if(v.type==='signal')void pending.then(p=>p.signal(v.signal)).catch(()=>{});if(v.type==='error'||v.type==='closed')void pending.then(p=>p.stream.destroy(Error(v.error||v.reason||'协商已结束'))).catch(()=>{});});
  ws.once('close',()=>{if(!done)void pending.then(p=>p.stream.destroy(Error('P2P 协商中断，请重试'))).catch(()=>{});});
  try{peer=await pending;if(generation!==epoch)throw Error('连接已取消');peers.add(peer);peer.stream.once('close',()=>peers.delete(peer));await peer.opened;if(generation!==epoch)throw Error('连接已取消');done=true;send(ws,{type:'done',pair:info.pair});return {stream:peer.stream};}catch(e){peer?.close();ws.terminate();throw e;}
 }
 function close(){epoch++;stopped=true;clearTimeout(retry);for(const p of peers)p.close();peers.clear();for(const ws of signals)ws.terminate();signals.clear();control=null;}
 return {host,dial,close};
}

/**
 * Run a short loopback echo through the real community signalling and ICE
 * path. This is intentionally independent from a game room, so players can
 * decide whether to prefer P2P before opening a world.
 */
export async function testP2P({session,runtime,iceServers=ICE,timeoutMs=15000}={}){
 if(typeof session!=='function'||!runtime?.peer)throw Error('当前平台没有 P2P 测试模块');
 const client=createP2PClient({session,runtime,iceServers});
 const server=net.createServer(socket=>{socket.setNoDelay(true);socket.pipe(socket);});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen({host:'127.0.0.1',port:0},resolve);});
 const address=server.address(),room={v:1,id:'p2p-test-'+randomUUID().replaceAll('-','').slice(0,24),key:randomBytes(32).toString('base64url'),port:address.port};
 const started=Date.now();let stream,timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('P2P 测试超时')),timeoutMs);});
 try{
  await client.host(room);
  const result=await Promise.race([client.dial(room),timeout]);stream=result.stream;
  const probe=Buffer.from('hxz-p2p-test-'+randomUUID());
  const echoed=await Promise.race([new Promise((resolve,reject)=>{let data=Buffer.alloc(0);const onData=chunk=>{data=Buffer.concat([data,chunk]);if(data.length>=probe.length){stream.off('data',onData);resolve(data.subarray(0,probe.length));}};stream.on('data',onData);stream.once('error',reject);}),timeout]);
  stream.write(probe);const value=Buffer.from(echoed);if(!value.equals(probe))throw Error('P2P 回环数据校验失败');
  return {ok:true,latency:Date.now()-started,detail:'信令、ICE 与加密数据通道均可用'};
 }finally{clearTimeout(timer);stream?.destroy();client.close();await new Promise(resolve=>server.close(()=>resolve()));}
}

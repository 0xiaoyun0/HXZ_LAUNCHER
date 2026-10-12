import {WebSocket} from 'ws';import net from 'node:net';import {createHash} from 'node:crypto';
const proof=key=>createHash('sha256').update(key).digest('hex');
const ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}];
export function createP2PClient({session,runtime,emit=()=>{},iceServers=ICE}){
 let control,retry,stopped=true,epoch=0;const signals=new Set(),peers=new Set();
 const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data),e=>{if(e)ws.terminate();});};
 async function open(input){const generation=epoch,identity=await session();if(generation!==epoch)throw Error('连接已取消');const url=new URL(identity.base);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.pathname=url.pathname.replace(/\/$/,'')+'/lobby-signal';url.search='';url.hash='';
  return new Promise((resolve,reject)=>{const ws=new WebSocket(url,{maxPayload:20000,perMessageDeflate:false});signals.add(ws);ws.on('error',()=>{});ws.once('close',()=>signals.delete(ws));
   const timer=setTimeout(()=>fail(Error('P2P 协商服务连接超时')),10000),cleanup=()=>{clearTimeout(timer);ws.off('message',first);ws.off('error',fail);ws.off('close',closed);},fail=e=>{cleanup();ws.terminate();reject(e);},closed=()=>fail(Error('P2P 协商服务已断开'));
   const first=(raw,binary)=>{try{if(binary)throw Error('协商消息无效');const v=JSON.parse(raw);if(v.type==='error')throw Error(v.error);if(!['registered','ready'].includes(v.type))throw Error('协商握手无效');cleanup();resolve({ws,info:v});}catch(e){fail(e);}};
   ws.once('open',()=>send(ws,{...input,token:identity.token}));ws.once('message',first);ws.once('error',fail);ws.once('close',closed);
  });
 }
 async function host(room){stopped=false;const generation=epoch,current=()=>!stopped&&epoch===generation;
  const connect=async()=>{if(!current())return;try{const {ws}=await open({type:'host',room:room.id,proof:proof(room.key)});if(!current()){ws.terminate();return;}control=ws;emit({p2pAvailable:true,p2pError:''});const negotiating=new Map();
   ws.on('message',(raw,binary)=>{if(binary)return;let v;try{v=JSON.parse(raw);}catch{return;}
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
 async function dial(room){const generation=epoch;const {ws,info}=await open({type:'join',room:room.id,proof:proof(room.key)});let done=false,peer;
  const pending=runtime.peer({initiator:true,iceServers,signal:signal=>send(ws,{type:'signal',pair:info.pair,signal})});
  ws.on('message',(raw,binary)=>{if(binary)return;let v;try{v=JSON.parse(raw);}catch{return;}if(v.type==='signal')void pending.then(p=>p.signal(v.signal)).catch(()=>{});if(v.type==='error'||v.type==='closed')void pending.then(p=>p.stream.destroy(Error(v.error||v.reason||'协商已结束'))).catch(()=>{});});
  ws.once('close',()=>{if(!done)void pending.then(p=>p.stream.destroy(Error('P2P 协商中断，请重试'))).catch(()=>{});});
  try{peer=await pending;if(generation!==epoch)throw Error('连接已取消');peers.add(peer);peer.stream.once('close',()=>peers.delete(peer));await peer.opened;if(generation!==epoch)throw Error('连接已取消');done=true;send(ws,{type:'done',pair:info.pair});return {stream:peer.stream};}catch(e){peer?.close();ws.terminate();throw e;}
 }
 function close(){epoch++;stopped=true;clearTimeout(retry);for(const p of peers)p.close();peers.clear();for(const ws of signals)ws.terminate();signals.clear();control=null;}
 return {host,dial,close};
}

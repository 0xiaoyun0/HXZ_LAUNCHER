const {ipcRenderer}=require('electron');
// Runs in a dedicated hidden renderer, independent of the visible UI and sleep mode.
const peers=new Map(),WINDOW=262144,CHUNK=16384;
const emit=value=>ipcRenderer.send('next:p2p-event',value);
function close(id,error){const p=peers.get(id);if(!p)return;peers.delete(id);clearTimeout(p.timer);clearTimeout(p.disconnected);p.dc?.close();p.pc.close();emit({type:'closed',id,error});}
function flush(p){
 if(!p.pending||p.dc?.readyState!=='open'||p.credit<p.pending.bytes.length||p.dc.bufferedAmount>WINDOW)return;
 const {bytes,sequence}=p.pending;p.pending=null;p.credit-=bytes.length;
 try{p.dc.send(bytes);emit({type:'written',id:p.id,sequence});}catch(e){close(p.id,e.message);}
}
function channel(p,dc){
 if(p.dc){dc.close();return;}if(dc.label!=='hxz-minecraft'||!dc.ordered){close(p.id,'Invalid data channel');return;}
 p.dc=dc;dc.binaryType='arraybuffer';dc.bufferedAmountLowThreshold=65536;
 dc.onopen=()=>{clearTimeout(p.timer);emit({type:'open',id:p.id});flush(p);};dc.onbufferedamountlow=()=>flush(p);
 dc.onclose=()=>close(p.id);dc.onerror=()=>close(p.id,'P2P 数据通道中断');
 dc.onmessage=e=>{try{
  if(typeof e.data==='string'){const v=JSON.parse(e.data);if(v.end===true){emit({type:'end',id:p.id});return;}if(!Number.isInteger(v.credit)||v.credit<1||p.credit+v.credit>WINDOW)throw Error('Invalid flow credit');p.credit+=v.credit;flush(p);return;}
  const bytes=new Uint8Array(e.data);if(!bytes.length||bytes.length>CHUNK||p.receiving+bytes.length>WINDOW)throw Error('P2P 接收缓存超限');p.receiving+=bytes.length;emit({type:'data',id:p.id,bytes});
 }catch(e){close(p.id,e.message);}};
}
ipcRenderer.on('next:p2p-command',async(_event,m)=>{try{
 if(m.type==='create'){
  if(peers.size>=64)throw Error('P2P 连接数已满');
  const pc=new RTCPeerConnection({iceServers:m.iceServers,iceCandidatePoolSize:0}),p={id:m.id,pc,dc:null,credit:WINDOW,receiving:0,pending:null,candidates:[]};peers.set(m.id,p);
  p.timer=setTimeout(()=>close(m.id,'P2P 穿透未成功；双方网络可能限制 UDP，请尝试公网 IPv4/IPv6 或同一虚拟局域网'),30000);
  pc.onicecandidate=e=>{if(e.candidate&&e.candidate.type!=='relay')emit({type:'signal',id:m.id,signal:{candidate:e.candidate.toJSON()}});};
  pc.onconnectionstatechange=()=>{clearTimeout(p.disconnected);if(pc.connectionState==='failed')close(m.id,'P2P 连接失败');else if(pc.connectionState==='disconnected')p.disconnected=setTimeout(()=>close(m.id,'P2P 网络已断开，请重新加入房间'),15000);};pc.ondatachannel=e=>channel(p,e.channel);
  if(m.initiator){channel(p,pc.createDataChannel('hxz-minecraft',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());emit({type:'signal',id:m.id,signal:{description:pc.localDescription.toJSON()}});}
  return;
 }
 const p=peers.get(m.id);if(!p)return;
 if(m.type==='signal'){
  if(m.signal.description){const d=m.signal.description;if(/typ relay/.test(d.sdp))throw Error('中继候选不受支持');await p.pc.setRemoteDescription(d);for(const c of p.candidates)await p.pc.addIceCandidate(c);p.candidates=[];if(d.type==='offer'){await p.pc.setLocalDescription(await p.pc.createAnswer());emit({type:'signal',id:m.id,signal:{description:p.pc.localDescription.toJSON()}});}}
  else{const c=m.signal.candidate;if(!c||/typ relay/.test(c.candidate))throw Error('中继候选不受支持');if(p.pc.remoteDescription)await p.pc.addIceCandidate(c);else if(p.candidates.length<128)p.candidates.push(c);}
 }else if(m.type==='write'){
  const bytes=new Uint8Array(m.bytes);if(p.pending||bytes.length>CHUNK)throw Error('P2P 发送缓存超限');p.pending={bytes,sequence:m.sequence};flush(p);
 }else if(m.type==='credit'){
  if(!Number.isInteger(m.bytes)||m.bytes<1||m.bytes>p.receiving)throw Error('Invalid receive credit');p.receiving-=m.bytes;if(p.dc?.readyState==='open')p.dc.send(JSON.stringify({credit:m.bytes}));
 }else if(m.type==='end'){if(p.dc?.readyState==='open')p.dc.send(JSON.stringify({end:true}));}
 else if(m.type==='close')close(m.id);
}catch(e){close(m.id,e.message);emit({type:'error',id:m.id,error:e.message});}});

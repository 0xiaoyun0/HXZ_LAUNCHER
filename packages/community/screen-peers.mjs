// One broadcaster, at most four viewers. No TURN or media relay is configured.
export function createScreenPeers({client,send,onStream,onStatus,onEnded,iceServers=[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}]}){
 const peers=new Map();let screen=null,local=null,closed=false,after=0;
 function remove(id){const p=peers.get(id);if(!p)return;peers.delete(id);clearTimeout(p.timer);p.pc.ontrack=p.pc.onicecandidate=p.pc.onconnectionstatechange=null;p.pc.close();}
 function clear(){for(const id of peers.keys())remove(id);onStream(null);}
 function stopLocal(){const old=local;local=null;old?.getTracks().forEach(t=>{t.onended=null;t.stop();});}
 function setLocal(stream){stopLocal();local=stream;for(const t of stream.getTracks())t.onended=()=>{stopLocal();clear();onEnded?.();};onStream(stream);}
 function peer(id,version){
  let p=peers.get(id);if(p?.version===version)return p;if(p)remove(id);
  const pc=new RTCPeerConnection({iceServers,iceTransportPolicy:'all',bundlePolicy:'max-bundle'});p={pc,version,pending:[],out:Promise.resolve(),timer:0};peers.set(id,p);
  const transmit=data=>{p.out=p.out.then(()=>{if(!closed&&peers.get(id)===p&&screen)return send('screen/signal',{screen:screen.id,to:id,connection:version,data});}).catch(()=>{if(peers.get(id)===p)onStatus('连接消息暂时未送达，可以重新连接');});};p.transmit=transmit;
  pc.onicecandidate=e=>{if(e.candidate)transmit({type:'candidate',candidate:e.candidate.toJSON()});};
  pc.ontrack=e=>{if(peers.get(id)!==p)return;const stream=e.streams[0]||new MediaStream([e.track]);onStream(stream);onStatus('正在观看 · 点对点传输');};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected'){clearTimeout(p.timer);onStatus(local?'正在分享 · '+peers.size+' 位观众':'正在观看 · 点对点传输');}else if(['disconnected','failed'].includes(pc.connectionState))onStatus('点对点连接暂时不可达，请重新连接或检查网络');};
  p.timer=setTimeout(()=>{if(peers.get(id)===p&&pc.connectionState!=='connected'){remove(id);onStatus('连接超时，双方网络可能不允许点对点传输。可重新连接');}},20000);return p;
 }
 async function sync(value){
  if(closed)return;const next=value.screen;if(screen?.id!==next?.id){clear();after=0;screen=next;if(local&&next?.host!==client)stopLocal();if(local)onStream(local);}else screen=next;
  if(!screen){clear();stopLocal();return;}
  const host=screen.host===client,watcher=screen.watchers?.find(v=>v.id===client),allowed=new Set(host?screen.viewers:watcher?[screen.host]:[]);for(const id of peers.keys())if(!allowed.has(id))remove(id);
  if(host&&local){for(const w of screen.watchers){if(peers.get(w.id)?.version===w.version)continue;const p=peer(w.id,w.version);for(const track of local.getVideoTracks()){const sender=p.pc.addTrack(track,local),params=sender.getParameters();params.encodings=[{maxBitrate:1200000,maxFramerate:15}];await sender.setParameters(params).catch(()=>{});}const offer=await p.pc.createOffer();if(closed||peers.get(w.id)!==p)return;await p.pc.setLocalDescription(offer);p.transmit({type:'offer',sdp:p.pc.localDescription.sdp});}}
  for(const signal of value.signals||[]){if(signal.seq<=after)continue;after=Math.max(after,signal.seq);const version=host?screen.watchers?.find(v=>v.id===signal.from)?.version:watcher?.version;if(!allowed.has(signal.from)||version!==signal.connection)continue;const p=peer(signal.from,version),data=signal.data;
   try{if(data.type==='candidate'){if(p.pc.remoteDescription)await p.pc.addIceCandidate(data.candidate);else if(p.pending.length<64)p.pending.push(data.candidate);}else{await p.pc.setRemoteDescription({type:data.type,sdp:data.sdp});for(const candidate of p.pending.splice(0))await p.pc.addIceCandidate(candidate);if(data.type==='offer'){const answer=await p.pc.createAnswer();await p.pc.setLocalDescription(answer);p.transmit({type:'answer',sdp:p.pc.localDescription.sdp});}}}catch{remove(signal.from);onStatus('分享连接协商失败，可重新连接');}
  }
 }
 return {sync,setLocal,get after(){return after;},get sharing(){return !!local;},stop:()=>{stopLocal();clear();},close:()=>{closed=true;stopLocal();clear();}};
}

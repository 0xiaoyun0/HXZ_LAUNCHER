import {WebSocketServer,WebSocket} from 'ws';
import {randomUUID} from 'node:crypto';
// Signalling only. Binary frames and arbitrary payloads are never forwarded.
export function createLobbySignal({verify,canHost,limit}){
 const wss=new WebSocketServer({noServer:true,maxPayload:20000,perMessageDeflate:false}),hosts=new Map(),pairs=new Map(),completed=new Map();
 const send=(ws,value)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<128*1024)ws.send(JSON.stringify(value));};
 function drop(id,reason){const pair=pairs.get(id);if(!pair)return;pairs.delete(id);send(pair.host.ws,{type:'closed',pair:id,reason});send(pair.guest,{type:'closed',pair:id,reason});pair.guest.close();}
 function signal(value){
  if(!value||typeof value!=='object')throw Error('无效的协商消息');
  if(value.description){const d=value.description;if(!['offer','answer'].includes(d.type)||typeof d.sdp!=='string'||d.sdp.length>16000||!d.sdp.startsWith('v=0')||!d.sdp.includes('m=application ')||/m=(audio|video) |typ relay/.test(d.sdp))throw Error('只允许点对点数据通道');return {description:{type:d.type,sdp:d.sdp}};}
  const c=value.candidate;if(!c||typeof c.candidate!=='string'||c.candidate.length>1024||!c.candidate.startsWith('candidate:')||!/ typ (host|srflx|prflx)( |$)/.test(c.candidate))throw Error('只允许直连 ICE 候选');
  return {candidate:{candidate:c.candidate,sdpMid:typeof c.sdpMid==='string'?c.sdpMid.slice(0,32):null,sdpMLineIndex:Number.isInteger(c.sdpMLineIndex)?Math.max(0,Math.min(4,c.sdpMLineIndex)):0}};
 }
 wss.on('connection',ws=>{
  let identity=null,host=null,pairId=null,alive=true;
  const timeout=setTimeout(()=>ws.close(1008,'authentication timeout'),7000);
  ws.on('error',()=>{});ws.on('pong',()=>alive=true);
  ws.on('message',(raw,binary)=>{try{
   if(binary)throw Error('此通道不传输游戏流量');const input=JSON.parse(raw.toString());
   if(!identity){identity=verify(input.token);ws._token=input.token;limit('p2p-open:'+identity.uid,80);clearTimeout(timeout);
    if(!/^[\w-]{16,80}$/.test(input.room)||!/^[a-f0-9]{64}$/.test(input.proof))throw Error('房间凭证无效');
    if(input.type==='host'){
     if(!canHost(identity))throw Error('没有创建房间权限');if(hosts.size>=1000&&!hosts.has(input.room))throw Error('联机协商繁忙');
     const old=hosts.get(input.room);if(old&&old.uid!==identity.uid)throw Error('房间不属于当前用户');old?.ws.close();
     host={uid:identity.uid,ws,proof:input.proof,room:input.room};hosts.set(input.room,host);send(ws,{type:'registered'});
    }else if(input.type==='join'){
     host=hosts.get(input.room);if(!host||!canHost({uid:host.uid})||host.proof!==input.proof)throw Error('房间离线或邀请已失效');
     if(pairs.size>=2000||[...pairs.values()].filter(p=>p.host===host).length>=64)throw Error('房间正在处理较多连接，请稍后重试');
     pairId=randomUUID();pairs.set(pairId,{id:pairId,host,guest:ws,created:Date.now(),count:0,bytes:0});send(host.ws,{type:'incoming',pair:pairId});send(ws,{type:'ready',pair:pairId});
    }else throw Error('未知协商操作');return;
   }
   verify(ws._token);limit('p2p-signal:'+identity.uid,600,10000);
   if(input.type==='ping'){send(ws,{type:'pong'});return;}
   const pair=pairs.get(input.pair);if(!pair){const old=completed.get(input.pair);if(old&&old.until>Date.now()&&(old.host===ws||old.guest===ws))return;throw Error('协商已过期');}if(pair.guest!==ws&&pair.host.ws!==ws)throw Error('协商不属于当前连接');
   if(!canHost({uid:pair.host.uid}))throw Error('房主权限已撤销');
   if(input.type==='done'){send(pair.host.ws,{type:'complete',pair:pair.id});send(pair.guest,{type:'complete',pair:pair.id});pairs.delete(pair.id);completed.set(pair.id,{host:pair.host.ws,guest:pair.guest,until:Date.now()+60000});if(completed.size>2048)completed.delete(completed.keys().next().value);pair.guest.close();return;}
   if(input.type!=='signal')throw Error('未知协商消息');pair.count++;pair.bytes+=raw.length;if(pair.count>128||pair.bytes>128*1024||Date.now()-pair.created>40000)throw Error('协商次数或时长超过限制');
   const value=signal(input.signal);if(value.description&&value.description.type!==(pair.guest===ws?'offer':'answer'))throw Error('协商方向无效');
   send(pair.guest===ws?pair.host.ws:pair.guest,{type:'signal',pair:pair.id,signal:value});
  }catch(e){send(ws,{type:'error',error:e.message});ws.close(1008,'invalid signalling');}});
  ws.once('close',()=>{clearTimeout(timeout);if(host?.ws===ws&&hosts.get(host.room)===host)hosts.delete(host.room);for(const [id,p]of pairs)if(p.guest===ws||p.host.ws===ws)drop(id,'协商通道已断开');});
  ws._heartbeat=()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();};
 });
 const timer=setInterval(()=>{for(const ws of wss.clients)ws._heartbeat?.();for(const [id,p]of pairs)if(Date.now()-p.created>40000)drop(id,'P2P 穿透超时');for(const [id,p]of completed)if(p.until<Date.now())completed.delete(id);for(const h of hosts.values())if(!canHost({uid:h.uid}))h.ws.close(1008,'host permission revoked');},15000);timer.unref?.();
 return {upgrade:(req,socket,head)=>wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws)),close(){clearInterval(timer);for(const ws of wss.clients)ws.terminate();hosts.clear();pairs.clear();completed.clear();wss.close();}};
}

import {WebSocket} from 'ws';import {Duplex} from 'node:stream';import net from 'node:net';import {createHash} from 'node:crypto';
const proof=key=>createHash('sha256').update(key).digest('hex');
function webSocketStream(ws){
 const stream=new Duplex({highWaterMark:65536,read(){ws.resume();},write(chunk,encoding,done){let offset=0;const next=error=>{if(error)return done(error);if(offset>=chunk.length)return done();if(ws.readyState!==WebSocket.OPEN)return done(Error('中继通道已断开'));const part=chunk.subarray(offset,offset+32768);offset+=part.length;ws.send(part,{binary:true},next);};next();},final(done){ws.close();done();},destroy(error,done){ws.terminate();done(error);}});
 ws.on('message',(data,binary)=>{if(!binary){stream.destroy(Error('无效的中继数据'));return;}if(!stream.push(data))ws.pause();});ws.on('error',error=>stream.destroy(error));ws.on('close',()=>stream.push(null));return stream;
}
export function createRelayClient({session,emit=()=>{}}){
 let control=null,retry=null,stopped=true;const sockets=new Set();
 async function open(input){const identity=await session(),url=new URL(identity.base);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.pathname=url.pathname.replace(/\/$/,'')+'/lobby-relay';url.search='';url.hash='';
  return new Promise((resolve,reject)=>{const ws=new WebSocket(url,{maxPayload:65536,perMessageDeflate:false});sockets.add(ws);ws.on('error',()=>{});ws.once('close',()=>sockets.delete(ws));const timer=setTimeout(()=>{ws.terminate();reject(Error('社区中继连接超时'));},10000);
   const cleanup=()=>{clearTimeout(timer);ws.off('error',fail);ws.off('close',closed);ws.off('message',first);};const fail=e=>{cleanup();ws.terminate();reject(e);},closed=()=>fail(Error('社区中继已断开'));
   const first=(raw,binary)=>{if(binary)return fail(Error('中继握手无效'));try{const v=JSON.parse(raw.toString());if(v.type==='error')return fail(Error(v.error));if(!['ready','registered'].includes(v.type))return fail(Error('中继握手无效'));cleanup();resolve({ws,info:v});}catch(e){fail(e);}};
   ws.once('open',()=>ws.send(JSON.stringify({...input,token:identity.token})));ws.on('error',fail);ws.once('close',closed);ws.once('message',first);
  });
 }
 async function host(room){stopped=false;
  const connect=async()=>{if(stopped)return;try{const {ws,info}=await open({type:'host',room:room.id,proof:proof(room.key)});if(stopped){ws.terminate();return;}control=ws;emit({relayConnected:true,relayLimit:info.kbps});
    ws.on('message',(raw,binary)=>{if(binary)return;let value;try{value=JSON.parse(raw.toString());}catch{return;}if(value.type!=='incoming')return;
     void(async()=>{let pair,socket;try{const v=await open({type:'attach',id:value.id,key:value.key});pair=v.ws;if(stopped){pair.terminate();return;}const duplex=webSocketStream(pair);duplex.on('error',()=>{});socket=net.connect({host:'127.0.0.1',port:room.port});socket.on('error',()=>duplex.destroy());socket.once('close',()=>duplex.destroy());duplex.once('close',()=>socket.destroy());socket.pipe(duplex).pipe(socket);}catch{pair?.terminate();socket?.destroy();}})();
    });ws.once('close',()=>{emit({relayConnected:false});if(!stopped)retry=setTimeout(()=>void connect().catch(()=>{}),4000);});
   }catch(error){emit({relayConnected:false,relayError:error.message});if(!stopped)retry=setTimeout(()=>void connect().catch(()=>{}),5000);throw error;}};
  await connect();return true;
 }
 async function dial(room){const {ws,info}=await open({type:'guest',room:room.id,proof:proof(room.key)});const stream=webSocketStream(ws);stream.on('error',()=>{});return {stream,kbps:info.kbps};}
 function close(){stopped=true;clearTimeout(retry);control=null;for(const ws of sockets)ws.terminate();sockets.clear();}
 return {host,dial,close};
}

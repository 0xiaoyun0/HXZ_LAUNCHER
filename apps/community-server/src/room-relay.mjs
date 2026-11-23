import {WebSocketServer,WebSocket} from 'ws';import {randomUUID,randomBytes} from 'node:crypto';
const OPEN=WebSocket.OPEN;
/** Authenticated, bounded relay to registered room hosts only. No arbitrary TCP targets. */
export function createRoomRelay({db,auth,admin,verify,body,send,limit,canHost}){
 db.exec('CREATE TABLE IF NOT EXISTS room_relay_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL,kbps INTEGER NOT NULL);INSERT OR IGNORE INTO room_relay_settings VALUES(1,1,256)');
 let config=db.prepare('SELECT enabled,kbps FROM room_relay_settings WHERE id=1').get();
 const hosts=new Map(),tunnels=new Map(),wss=new WebSocketServer({noServer:true,maxPayload:65536,perMessageDeflate:false});
 const packet=(ws,v)=>{if(ws.readyState===OPEN)ws.send(JSON.stringify(v));};
 function closeTunnel(t,graceful=false){if(!t||t.closed)return;t.closed=true;tunnels.delete(t.id);clearTimeout(t.timer);for(const w of [t.guest,t.host]){if(w?.readyState===OPEN&&graceful)w.close();else w?.terminate();}if(t.owner){t.owner.queue=t.owner.queue.filter(q=>q.tunnel!==t);t.owner.queued=t.owner.queue.reduce((n,q)=>n+q.data.length,0);}}
 function closeRoom(room){if(!room)return;if(hosts.get(room.id)===room)hosts.delete(room.id);for(const t of tunnels.values())if(t.owner===room)closeTunnel(t);room.ws.terminate();}
 function stream(ws,t,to){ws.on('message',(data,binary)=>{if(t.closed)return;if(!binary){closeTunnel(t);return;}const room=t.owner;if(data.length>65536||room.queued+data.length>1024*1024){closeTunnel(t);return;}room.queue.push({data,tunnel:t,to,from:ws});room.queued+=data.length;if(room.queued>256*1024)for(const pair of tunnels.values())if(pair.owner===room){pair.host?.pause();pair.guest.pause();}});}
 wss.on('connection',ws=>{
  let user,token,control=false,room,tunnel;ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});
  const timer=setTimeout(()=>ws.terminate(),6000);
  ws.once('message',(raw,binary)=>{try{
   clearTimeout(timer);if(binary||raw.length>8192)throw Error('无效的中继认证');const input=JSON.parse(raw.toString());token=input.token;user=verify(token);limit('relay:'+user.uid,60);
   if(!config.enabled)throw Error('管理员已关闭联机中继');
   if(input.type==='host'){
    if(!canHost(user))throw Error('未获得开房授权');if(!/^[-\w]{16,80}$/.test(input.room)||! /^[a-f0-9]{64}$/.test(input.proof))throw Error('无效的中继房间');
    const old=hosts.get(input.room);if(old&&old.uid!==user.uid)throw Error('房间不属于你');
    for(const r of hosts.values())if(r.uid===user.uid)closeRoom(r);if(hosts.size>=40)throw Error('联机中继房间已满');
    room={id:input.room,proof:input.proof,uid:user.uid,ws,token,queue:[],queued:0,tokens:0,bytes:0,at:Date.now()};hosts.set(room.id,room);control=true;
    ws.on('message',(data,isBinary)=>{if(isBinary||data.length>4096)return ws.terminate();try{if(JSON.parse(data.toString()).type==='ping')packet(ws,{type:'pong'});}catch{ws.terminate();}});packet(ws,{type:'registered',kbps:config.kbps});return;
   }
   if(input.type==='guest'){
    room=hosts.get(input.room);if(!room||room.ws.readyState!==OPEN||!canHost(verify(room.token))||input.proof!==room.proof)throw Error('中继房间不可用或邀请已失效');
    const all=[...tunnels.values()];if(all.length>=256||all.filter(t=>t.owner===room).length>=32||all.filter(t=>t.uid===user.uid).length>=8)throw Error('中继连接数已满');
    tunnel={id:randomUUID(),key:randomBytes(24).toString('base64url'),uid:user.uid,token,guest:ws,owner:room,host:null,closed:false};tunnels.set(tunnel.id,tunnel);tunnel.timer=setTimeout(()=>closeTunnel(tunnel),10000);
    ws.pause();packet(room.ws,{type:'incoming',id:tunnel.id,key:tunnel.key});return;
   }
   if(input.type==='attach'){
    tunnel=tunnels.get(input.id);if(!tunnel||tunnel.owner.uid!==user.uid||tunnel.key!==input.key||tunnel.host||!canHost(user))throw Error('中继配对已失效');
    tunnel.host=ws;room=tunnel.owner;clearTimeout(tunnel.timer);stream(tunnel.guest,tunnel,ws);stream(ws,tunnel,tunnel.guest);packet(ws,{type:'ready',kbps:config.kbps});packet(tunnel.guest,{type:'ready',kbps:config.kbps});tunnel.guest.resume();return;
   }
   throw Error('未知中继操作');
  }catch(e){packet(ws,{type:'error',error:e.message});ws.close(1008,'中继连接未建立');}});
  ws.on('close',()=>{clearTimeout(timer);if(control)closeRoom(room);else if(tunnel&&!tunnel.closed){if(!tunnel.host)closeTunnel(tunnel);else tunnel.ending=Date.now();}});
 });
 const pump=setInterval(()=>{
  for(const room of hosts.values()){
   const now=Date.now(),rate=config.kbps*1024;room.tokens=Math.min(Math.max(65536,rate/4),room.tokens+(now-room.at)*rate/1000);room.at=now;
   // Round-robin prevents one slow guest from blocking everyone in the room.
   let attempts=room.queue.length;const blocked=new Set();
   while(room.queue.length&&attempts--){const q=room.queue.shift();if(q.tunnel.closed){room.queued-=q.data.length;continue;}if(q.to.readyState!==OPEN){closeTunnel(q.tunnel);continue;}if(blocked.has(q.to)||q.to.bufferedAmount>131072||room.tokens<q.data.length){blocked.add(q.to);room.queue.push(q);continue;}room.tokens-=q.data.length;room.queued-=q.data.length;room.bytes+=q.data.length;q.to.send(q.data,{binary:true},e=>{if(e)closeTunnel(q.tunnel);});}
   if(room.queued<65536)for(const t of tunnels.values())if(t.owner===room&&t.host){t.guest.resume();t.host.resume();}
  }
  for(const t of tunnels.values())if(t.ending&&(!t.owner.queue.some(q=>q.tunnel===t)&&!(t.host?.bufferedAmount||t.guest.bufferedAmount)||Date.now()-t.ending>5000))closeTunnel(t,true);
 },25);pump.unref();
 const heartbeat=setInterval(()=>{for(const room of hosts.values())try{if(!config.enabled||!canHost(verify(room.token)))closeRoom(room);}catch{closeRoom(room);}for(const t of tunnels.values())try{verify(t.token);}catch{closeTunnel(t);}for(const ws of wss.clients){if(!ws.alive)ws.terminate();else{ws.alive=false;ws.ping();}}},15000);heartbeat.unref();
 return {
  upgrade(req,socket,head){if(wss.clients.size>=600){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));},
  async route(req,res,url){if(!['/api/lobby/relay','/api/admin/lobby/relay'].includes(url.pathname))return false;const manage=url.pathname.includes('/admin/');manage?admin(req):auth(req);
   if(req.method==='PUT'&&manage){const input=await body(req);if(typeof input.enabled!=='boolean'||!Number.isInteger(input.kbps)||input.kbps<64||input.kbps>4096)throw Error('中继限速应为 64–4096 KB/s');db.prepare('UPDATE room_relay_settings SET enabled=?,kbps=? WHERE id=1').run(Number(input.enabled),input.kbps);config={enabled:Number(input.enabled),kbps:input.kbps};if(!config.enabled)for(const r of hosts.values())closeRoom(r);}
   else if(req.method!=='GET')throw Error('不支持的中继配置操作');send(res,200,{enabled:!!config.enabled,kbps:config.kbps,...(manage?{rooms:[...hosts.values()].map(r=>({id:r.id,uid:r.uid,bytes:r.bytes,connections:[...tunnels.values()].filter(t=>t.owner===r).length}))}:{})});return true;},
  close(){clearInterval(pump);clearInterval(heartbeat);for(const w of wss.clients)w.terminate();wss.close();}
 };
}

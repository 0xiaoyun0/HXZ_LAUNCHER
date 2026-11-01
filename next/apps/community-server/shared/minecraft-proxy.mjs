import net from 'node:net';
import {once} from 'node:events';
import {parseServerAddress,varint} from './minecraft-connection.mjs';

function readVar(bytes,offset=0){let value=0;for(let i=0;i<5;i++){if(offset+i>=bytes.length)return null;const b=bytes[offset+i];value|=(b&127)<<(7*i);if(!(b&128))return {value:value>>>0,next:offset+i+1};}throw Error('Invalid handshake VarInt');}
/** Preserve virtual-host routing when Minecraft connects through a loopback tunnel. */
export async function minecraftHandshakeProxy(targetAddress,originalAddress){
 const target=parseServerAddress(targetAddress),original=parseServerAddress(originalAddress),sockets=new Set();
 const server=net.createServer(client=>{
  if(sockets.size>=256){client.destroy();return;}
  sockets.add(client);client.once('close',()=>sockets.delete(client));client.on('error',()=>{});
  let buffer=Buffer.alloc(0);const timer=setTimeout(()=>client.destroy(),5000);client.once('close',()=>clearTimeout(timer));
  function receive(chunk){try{
   buffer=Buffer.concat([buffer,chunk]);if(buffer.length>65536)throw Error('Handshake too large');
   const frame=readVar(buffer);if(!frame)return;if(frame.value>16384)throw Error('Handshake too large');if(buffer.length<frame.next+frame.value)return;
   const type=readVar(buffer,frame.next),protocol=type&&readVar(buffer,type.next),hostLength=protocol&&readVar(buffer,protocol.next);
   if(type?.value!==0||!hostLength||hostLength.next+hostLength.value+3>frame.next+frame.value)throw Error('Invalid Minecraft handshake');
   const portOffset=hostLength.next+hostLength.value,nextState=readVar(buffer,portOffset+2);
   if(!nextState||![1,2].includes(nextState.value)||nextState.next!==frame.next+frame.value)throw Error('Invalid handshake state');
   // Preserve Forge/FML suffixes after the original hostname, if present.
   const oldHost=buffer.subarray(hostLength.next,portOffset).toString('utf8'),suffix=oldHost.includes('\0')?oldHost.slice(oldHost.indexOf('\0')):'';
   const host=Buffer.from(original.host+suffix),port=Buffer.alloc(2);port.writeUInt16BE(original.port);
   const packet=Buffer.concat([Buffer.from([0]),varint(protocol.value),varint(host.length),host,port,varint(nextState.value)]);
   clearTimeout(timer);client.removeListener('data',receive);client.pause();
   const upstream=net.connect({host:target.host,port:target.port});sockets.add(upstream);upstream.on('error',()=>client.destroy());upstream.once('close',()=>{sockets.delete(upstream);client.destroy();});client.once('close',()=>upstream.destroy());
   upstream.once('connect',()=>{upstream.write(Buffer.concat([varint(packet.length),packet,buffer.subarray(frame.next+frame.value)]));client.pipe(upstream);upstream.pipe(client);client.resume();});
  }catch{client.destroy();}}
  client.on('data',receive);
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 return {address:'127.0.0.1:'+server.address().port,async close(){for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}};
}

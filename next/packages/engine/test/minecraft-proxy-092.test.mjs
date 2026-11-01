import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import {minecraftHandshakeProxy} from '../../../server/shared/minecraft-proxy.mjs';
import {varint} from '../../../server/shared/minecraft-connection.mjs';

test('tunnel preserves server hostname, Forge suffix and following game payload across fragments',async()=>{
 const expectedHost=Buffer.from('s2.hxzmc.top\0FML3\0'),port=Buffer.from([0x63,0xdd]);
 const body=Buffer.concat([Buffer.from([0]),varint(767),varint(expectedHost.length),expectedHost,port,Buffer.from([2])]);
 const tail=Buffer.from([3,0,1,2]),expected=Buffer.concat([varint(body.length),body,tail]);
 let received=Buffer.alloc(0),resolveReceived;const got=new Promise(r=>resolveReceived=r);
 const server=net.createServer(socket=>socket.on('data',chunk=>{received=Buffer.concat([received,chunk]);if(received.length>=expected.length){socket.write(Buffer.from('MC reply'));resolveReceived();}}));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const proxy=await minecraftHandshakeProxy('127.0.0.1:'+server.address().port,'s2.hxzmc.top:25565');
 const client=net.connect(Number(proxy.address.split(':')[1]),'127.0.0.1');await once(client,'connect');
 try{
  const host=Buffer.from('127.0.0.1\0FML3\0'),source=Buffer.concat([Buffer.from([0]),varint(767),varint(host.length),host,Buffer.from([0,1,2])]),packet=Buffer.concat([varint(source.length),source,tail]);
  const reply=once(client,'data');client.write(packet.subarray(0,4));await new Promise(r=>setTimeout(r,10));client.write(packet.subarray(4));
  await got;assert.deepEqual(received,expected);assert.equal((await reply)[0].toString(),'MC reply');
 }finally{client.destroy();await proxy.close();await new Promise(r=>server.close(r));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createCommunity} from '../src/server.mjs';
import {minecraftStatus,varint} from '../src/server-online.mjs';

function stringPacket(value){const body=Buffer.from(value,'utf8');return Buffer.concat([varint(body.length),body]);}
function statusPacket(value){const payload=Buffer.concat([Buffer.from([0]),stringPacket(JSON.stringify(value))]);return Buffer.concat([varint(payload.length),payload]);}

test('Minecraft status query returns online count and public player sample',async t=>{
 const status=net.createServer(socket=>socket.once('data',()=>socket.end(statusPacket({version:{name:'1.21.1'},players:{online:3,max:20,sample:[{name:'旅人甲',id:'a'},{name:'旅人乙',id:'b'}]}}))));
 status.listen(0,'127.0.0.1');await once(status,'listening');
 t.after(()=>new Promise(resolve=>status.close(resolve)));
 const value=await minecraftStatus('127.0.0.1:'+status.address().port);
 assert.equal(value.online,3);assert.equal(value.max,20);assert.deepEqual(value.players.map(player=>player.name),['旅人甲','旅人乙']);
});

test('server-online refresh=1 bypasses the thirty second cache',async t=>{
 const status=net.createServer(socket=>socket.once('data',()=>socket.end(statusPacket({players:{online:7,max:20,sample:[]}}))));
 status.listen(0,'127.0.0.1');await once(status,'listening');
 const data=await mkdtemp(path.join(os.tmpdir(),'hxz-online091-'));await writeFile(path.join(data,'server-online.json'),JSON.stringify([{id:'survival',name:'测试服',address:'127.0.0.1:'+status.address().port,enabled:true},{id:'mod-1',name:'二服',address:'127.0.0.1:1',enabled:false},{id:'mod-2',name:'三服',address:'127.0.0.1:1',enabled:false}]));
 const service=createCommunity({data,fecAuto:false,adminIDs:['admin'],exchange:async input=>({selectedProfile:{id:String(input.uid),name:String(input.uid)}})});service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
 t.after(async()=>{await service.close();await rm(data,{recursive:true,force:true});await new Promise(resolve=>status.close(resolve));});
 const base='http://127.0.0.1:'+service.server.address().port;
 const first=await (await fetch(base+'/api/server-online')).json();assert.equal(first.items[0].online,7);
 status.close();
 const cached=await (await fetch(base+'/api/server-online')).json();assert.equal(cached.items[0].online,7);
 const refreshed=await (await fetch(base+'/api/server-online?refresh=1')).json();assert.equal(refreshed.items[0].available,false);assert.match(refreshed.items[0].error,/无法读取|连接|状态/);
});

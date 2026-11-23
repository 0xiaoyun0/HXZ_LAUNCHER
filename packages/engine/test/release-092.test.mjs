import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createServerConnection} from '../core/server-connection.mjs';
import {varint,queryMinecraftStatus} from '../../../server/shared/minecraft-connection.mjs';
import {gameSessions} from '../core/game-sessions.mjs';
import {createErrorReporter} from '../core/error-reporter.mjs';
import {cardPlugins} from '../../../engine/plugins.mjs';
import {validateCard} from '../../../server/shared/card-plugin.mjs';
import {createFecAutoconfig} from '../../../apps/community-server/src/fec-autoconfig.mjs';

async function temporary(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz092-'));t.after(async()=>{assert.ok(root.startsWith(path.join(os.tmpdir(),'hxz092-')));await fs.rm(root,{recursive:true,force:true});});return root;}
async function mc(t){const server=net.createServer(socket=>socket.once('data',()=>{const json=Buffer.from(JSON.stringify({version:{name:'test'},players:{online:3,max:20,sample:[{id:'a',name:'Alice'}]}})),packet=Buffer.concat([Buffer.from([0]),varint(json.length),json]),bytes=Buffer.concat([varint(packet.length),packet]);socket.write(bytes.subarray(0,3));setTimeout(()=>socket.end(bytes.subarray(3)),5);}));server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));return '127.0.0.1:'+server.address().port;}
test('desktop recovers counts and players when community returns ENOTFOUND',async t=>{
 const address=await mc(t),connection=createServerConnection({presets:()=>[{id:'HXZ-mod-1',name:'MC',address}],remote:async()=>({at:Date.now(),items:[{id:'mod-1',available:false,error:'ENOTFOUND'}]})});
 const {items}=await connection.status();assert.equal(items[0].online,3);assert.equal(items[0].players[0].name,'Alice');assert.equal(items[0].source,'desktop-direct');
});
test('game session completion and stopping do not overwrite another instance',async()=>{
 const events=[],manager=gameSessions(e=>events.push(e)),child=pid=>({pid,killed:false,kill(){this.killed=true;}}),a=child(1),b=child(2);
 const first=manager.add(a,{instance:'one',root:'test'}),second=manager.add(b,{instance:'two',root:'test'});manager.stop(first.key);assert.equal(a.killed,true);assert.equal(b.killed,false);first.finish();assert.equal(manager.size,1);assert.equal(events.at(-1).running,true);assert.equal(manager.list()[0].instance,'two');second.finish();assert.equal(events.at(-1).running,false);
});
test('diagnostics survive offline restart and retry with the same event identity',async t=>{
 const data=await temporary(t),seen=[];let offline=true;
 let r=await createErrorReporter({data,version:'0.9.2',enabled:()=>true,send:async e=>{seen.push(e.eventId);if(offline)throw Error('offline');}});
 await r.capture({message:'failure',detail:'password=secretvalue'});await r.flush();assert.equal(r.status().pending,1);await r.close();offline=false;
 r=await createErrorReporter({data,version:'0.9.2',enabled:()=>true,send:async e=>{seen.push(e.eventId);assert.doesNotMatch(e.detail,/secretvalue/);}});await r.flush();assert.equal(r.status().pending,0);assert.equal(new Set(seen).size,1);await r.close();
});
test('home card installation, consent, persistence, cancellation and removal',async t=>{
 const home=await temporary(t),file=path.resolve('examples/worlds.hxzplugin'),events=[];
 const fixture=JSON.parse(await fs.readFile(file,'utf8')),id=fixture.manifest.id;
 let cancel=true;
 const options={home,choose:async()=>({canceled:cancel,filePaths:[file]}),request:async()=>{throw Error('unexpected network');},emit:e=>events.push(e)};
 const invoke=cardPlugins(options);
 assert.equal((await invoke('plugins.install',{})).cancelled,true);cancel=false;
 await invoke('plugins.install',{});assert.equal((await invoke('plugins.list',{})).items[0].enabled,false);
 await assert.rejects(invoke('plugins.enable',{id}),/确认/);await invoke('plugins.enable',{id,accepted:true});
 assert.equal((await cardPlugins(options)('plugins.list',{})).items[0].enabled,true);
 await Promise.all([invoke('plugins.disable',{id}),invoke('plugins.remove',{id})]);
 assert.deepEqual((await invoke('plugins.list',{})).items,[]);assert.equal(events.length,4);
 assert.throws(()=>validateCard({...fixture,files:{}}),/字段/);
});
test('managed native HXZRE origin transports MC packets in both directions',async t=>{
 const data=await temporary(t),address=await mc(t),udp=await import('node:dgram'),socket=udp.createSocket('udp4');socket.bind(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const previous={ports:process.env.HXZ_FEC_PORTS,host:process.env.HXZ_FEC_PUBLIC_HOST,targets:process.env.HXZ_FEC_TARGETS};
 process.env.HXZ_FEC_PORTS=[port,port+1,port+2].join(',');process.env.HXZ_FEC_PUBLIC_HOST='127.0.0.1';process.env.HXZ_FEC_TARGETS=[address,address,address].join(',');
 const manager=createFecAutoconfig({data,resources:path.resolve('resources'),enabled:true});
 try{manager.apply([{id:'HXZ-survival',address,fec:{enabled:true}}]);const limit=Date.now()+3000;while(manager.status().items[0].state==='starting'&&Date.now()<limit)await new Promise(r=>setTimeout(r,20));assert.equal(manager.status().items[0].state,'listening',JSON.stringify(manager.status()));const value=await manager.probe('HXZ-survival');assert.equal(value.ok,true,JSON.stringify(value));assert.equal(value.online,3);manager.apply([{id:'HXZ-survival',address,fec:{enabled:false}}]);assert.equal(manager.status().items[0].state,'disabled');}
 finally{await manager.close();for(const [key,name]of [['ports','HXZ_FEC_PORTS'],['host','HXZ_FEC_PUBLIC_HOST'],['targets','HXZ_FEC_TARGETS']])if(previous[key]===undefined)delete process.env[name];else process.env[name]=previous[key];}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {EventEmitter} from 'node:events';
import {monitorTargets,serviceAddress,probeService,createLatencyMonitor} from '../core/monitor-latency.mjs';

test('monitor endpoints follow configured game addresses and never infer an unknown target from an ID',()=>{
  const presets=[{id:'HXZ-mod-1',name:'机械与天空',address:'mc.example.org:25566'}];
  const rows=monitorTargets([{id:2,name:'模组一服'},{id:2,name:'其他服务'},{id:1,name:'皮肤站'},{id:4,name:'HTTP服务',url:'https://service.example.org:8443/status'}],presets,'http://uptime.example.org');
  assert.equal(rows[0].address,'mc.example.org:25566');assert.equal(rows[0].srv,false);
  assert.equal(rows[1].unavailable,true);assert.equal(rows[2].port,443);assert.equal(rows[3].port,8443);
  assert.equal(serviceAddress('mc.example.org',true).srv,true);
  assert.equal(serviceAddress('[2606:4700::1111]:25565').host,'2606:4700::1111');
  for(const value of ['https://user:secret@example.org','file:///etc/hosts','host:99999','example.org/path','host:0'])assert.equal(serviceAddress(value),null);
});

test('real local TCP connection is measured; failed connection cannot be reported as a ping',async t=>{
  const sockets=new Set(),server=net.createServer(s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  const value=await probeService({host:'127.0.0.1',port,address:'127.0.0.1:'+port},{allowedAddress:()=>true,timeout:500});
  assert.equal(value.state,'ok');assert.ok(value.ms>=1);assert.ok(value.measuredAt>0);
  for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));
  const failure=await probeService({host:'127.0.0.1',port,address:'127.0.0.1:'+port},{allowedAddress:()=>true,timeout:500});
  assert.equal(failure.state,'unreachable');assert.equal(failure.ms,undefined);
  const blocked=await probeService({host:'127.0.0.1',port,address:'127.0.0.1:'+port});
  assert.equal(blocked.state,'unavailable');
});

test('DNS delays are bounded, cancellation returns promptly, and alternate IP family is attempted',async()=>{
  const target={host:'test.example.org',port:443,address:'test.example.org:443'};
  const start=Date.now(),timeout=await probeService(target,{resolve:()=>new Promise(()=>{}),timeout:35});
  assert.equal(timeout.state,'timeout');assert.ok(Date.now()-start<500);
  const controller=new AbortController(),pending=probeService(target,{resolve:()=>new Promise(()=>{}),signal:controller.signal});
  controller.abort();assert.equal((await pending).state,'cancelled');
  const attempts=[],sockets=[];
  const value=await probeService(target,{resolve:async()=>[{address:'2606:4700::1111',family:6},{address:'1.1.1.1',family:4}],timeout:800,connect(options){
    attempts.push(options);const socket=new EventEmitter();socket.destroy=()=>{socket.destroyed=true;};sockets.push(socket);
    if(options.family===4)setImmediate(()=>socket.emit('connect'));return socket;
  }});
  assert.equal(value.state,'ok');assert.equal(value.family,4);assert.equal(attempts.length,2);assert.ok(sockets.every(s=>s.destroyed));
});

test('Minecraft SRV is honored and DNS failures have a distinct result',async()=>{
  let actual;const target=serviceAddress('game.example.org',true);
  const value=await probeService(target,{resolver:{cancel(){},resolveSrv:async()=>[{name:'1.1.1.1',port:25577,priority:0,weight:1}]},connect(options){
    actual=options;const s=new EventEmitter();s.destroy=()=>{};setImmediate(()=>s.emit('connect'));return s;
  }});
  assert.equal(value.state,'ok');assert.equal(actual.port,25577);assert.equal(actual.host,'1.1.1.1');
  assert.equal((await probeService({...target,srv:false},{resolve:async()=>{throw Error('dns');}})).state,'dns');
});

test('requests are bounded, cached, deduplicated and cancelled per caller; arbitrary renderer targets are ignored',async()=>{
  const targets=Array.from({length:9},(_,i)=>({id:String(i),host:'1.1.1.1',port:80+i,address:'1.1.1.1:'+(80+i)}));
  targets.push({...targets[0],id:'alias'},{id:'unknown',unavailable:true});
  let calls=0,active=0,max=0;
  const monitor=createLatencyMonitor({targets:async()=>targets,probe:async(target,{signal})=>{
    calls++;active++;max=Math.max(max,active);
    await new Promise(resolve=>{const end=()=>{clearTimeout(timer);signal.removeEventListener('abort',end);resolve();};const timer=setTimeout(end,20);signal.addEventListener('abort',end,{once:true});});
    active--;return {state:signal.aborted?'cancelled':'ok',ms:12,address:target.address,measuredAt:Date.now()};
  }});
  const first=await monitor.measure(1,{requestId:'first',ids:[...targets.map(t=>t.id),'invented'],address:'127.0.0.1:80'});
  assert.equal(calls,9);assert.ok(max<=4);assert.equal(first.items.length,11);assert.equal(first.items.at(-1).state,'unknown');
  await monitor.measure(1,{requestId:'cached',ids:['0']});assert.equal(calls,9);
  const uncached=createLatencyMonitor({targets:async()=>targets,probe:async(_,{signal})=>new Promise(resolve=>signal.addEventListener('abort',()=>resolve({state:'cancelled'}),{once:true}))});
  const pending=uncached.measure(2,{requestId:'cancel',ids:['1','2']});await new Promise(r=>setImmediate(r));
  uncached.cancel(1,'cancel');uncached.cancel(2,'cancel');assert.deepEqual((await pending).items,[]);
  uncached.dispose();monitor.dispose();
});

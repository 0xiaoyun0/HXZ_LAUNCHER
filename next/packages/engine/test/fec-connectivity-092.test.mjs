import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import dgram from 'node:dgram';
import {once} from 'node:events';
import {startFecEdge} from '../core/fec-sidecar.mjs';

test('HXZRE must not report enabled when origin cannot receive game traffic',async t=>{
 const sink=dgram.createSocket('udp4');sink.bind(0,'127.0.0.1');await once(sink,'listening');
 t.after(()=>sink.close());
 let edge;
 try{await assert.rejects(async()=>{
  edge=await startFecEdge({resources:path.resolve('resources'),probeTimeout:700,preset:{address:'127.0.0.1:25565',fec:{enabled:true,origin:'127.0.0.1:'+sink.address().port,token:'isolated-test-token-092'}}});
 },/验证|超时|连接/);}finally{await edge?.stop();}
});

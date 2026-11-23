import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {WebSocket} from 'ws';
import {createCommunity} from '../src/server.mjs';

test('one desktop session coexists with Android and a second desktop replaces only its predecessor',async t=>{
  const data=await mkdtemp(path.join(os.tmpdir(),'hxz-products-'));
  const service=createCommunity({data,exchange:async()=>({selectedProfile:{id:'fixture',name:'Player'}})});
  service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
  const base='http://127.0.0.1:'+service.server.address().port,sockets=[];
  t.after(async()=>{sockets.forEach(s=>s.terminate());await service.close();await rm(data,{recursive:true,force:true,maxRetries:4});});
  const {token}=await fetch(base+'/api/session',{method:'POST',body:'{}'}).then(r=>r.json());
  async function login(platform){
    const ws=new WebSocket(base.replace('http','ws')+'/ws',{origin:'null'});sockets.push(ws);await once(ws,'open');
    const ready=once(ws,'message');ws.send(JSON.stringify({type:'auth',token,platform}));assert.equal(JSON.parse((await ready)[0]).type,'ready');return ws;
  }
  const chat=await login('desktop'),mobile=await login('android');
  assert.equal(chat.readyState,WebSocket.OPEN);
  const replaced=once(chat,'close');await login('desktop');assert.equal((await replaced)[0],4001);assert.equal(mobile.readyState,WebSocket.OPEN);
});

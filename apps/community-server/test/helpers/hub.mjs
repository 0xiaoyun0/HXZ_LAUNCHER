
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';

import {createCommunity} from '../../src/server.mjs';

export async function fixture(t,identities={}) {
 const data=await mkdtemp(path.join(os.tmpdir(),'hxz-hub080-'));let service;
 const start=async()=>{service=createCommunity({data,adminIDs:[identities.admin||'admin'],exchange:async input=>({selectedProfile:{id:identities[input.uid]||input.uid,name:input.uid}})});service.server.listen(0,'127.0.0.1');await once(service.server,'listening');};await start();
 const tokens={};
 async function req(uid,p,method='GET',body,status=200) {
  const r=await fetch('http://127.0.0.1:'+service.server.address().port+p,{method,headers:{'Content-Type':'application/json',...(tokens[uid]?{Authorization:'Bearer '+tokens[uid]}:{})},body:body===undefined?undefined:JSON.stringify(body)}),value=await r.json();assert.equal(r.status,status,JSON.stringify(value));return value;
 }
 for(const uid of ['admin','alice','bob','eve'])tokens[uid]=(await req(uid,'/api/session','POST',{uid})).token;
 t.after(async()=>{await service.close();assert.ok(data.startsWith(path.join(os.tmpdir(),'hxz-hub080-')));await rm(data,{recursive:true,force:true});});
 return {req,get base(){return 'http://127.0.0.1:'+service.server.address().port;},get db(){return service.db;},async restart(){await service.close();await start();}};
}


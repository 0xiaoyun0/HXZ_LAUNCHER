// Runs the actual client module with deterministic timers and a failing IPC transport.
import vm from 'node:vm';import fs from 'node:fs/promises';import {stripTypeScriptTypes} from 'node:module';import assert from 'node:assert/strict';
let attempts=0;const timers=new Map();let sequence=0;
const context=vm.createContext({console,URL,AbortSignal,Date,JSON,Map,Set,Math,WebSocket:class{static OPEN=1;},window:{addEventListener(){}},navigator:{onLine:true},setTimeout:(fn)=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id),setInterval:()=>++sequence,clearInterval(){}});
const vue=new vm.SyntheticModule(['reactive'],function(){this.setExport('reactive',x=>x);},{context});
const launcher=new vm.SyntheticModule(['invoke','errorMessage','loadNotices'],function(){this.setExport('invoke',async()=>{attempts++;throw Error('temporary TLS connection reset');});this.setExport('errorMessage',e=>e.message);this.setExport('loadNotices',()=>{});},{context});
const source=stripTypeScriptTypes(await fs.readFile(new URL('../client/src/lib/community.ts',import.meta.url),'utf8'));
const module=new vm.SourceTextModule(source,{context});await module.link(name=>name==='vue'?vue:launcher);await module.evaluate();
await module.namespace.connect();assert.equal(attempts,1);assert.ok(timers.size,'transient HTTPS identity request must schedule reconnect');
const retry=timers.values().next().value;timers.clear();retry();await new Promise(r=>setImmediate(r));assert.equal(attempts,2);module.namespace.disconnect();assert.equal(timers.size,0,'manual disconnect cancels reconnect');console.log('PASS transient HTTPS failure retries; manual disconnect stops it');

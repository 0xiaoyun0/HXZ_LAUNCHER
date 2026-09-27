import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {createServices} from '../src-electron/core/services.mjs';

test('launcher handles maintenance before Java and refuses incomplete local transactions',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-maintenance-052-')),events=[];
 const server=http.createServer((req,res)=>res.end(JSON.stringify({maintenance:true})));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const services=await createServices({data:path.join(dir,'profile'),resources:fileURLToPath(new URL('../resources',import.meta.url)),safeStorage:{isEncryptionAvailable:()=>false},dialog:{},shell:{},window:()=>null,emit:event=>events.push(event)});
 t.after(async()=>{services.dispose();await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});});
 await services.invoke('settings.save',{hxzupPopup:false,gameRoot:path.join(dir,'game')});
 await services.invoke('instance.create',{name:'fixture',updateUrl:'http://127.0.0.1:'+server.address().port});
 assert(events.some(e=>e.type==='logs'&&e.lines.some(line=>/维护/.test(line))));
 assert(!events.some(e=>e.type==='logs'&&e.lines.some(line=>line.includes('[进程]'))));
 const cache=path.join(dir,'game/versions/fixture/updater/.updater');await fs.mkdir(cache,{recursive:true});
 await fs.writeFile(path.join(cache,'transaction.json'),'{}');
 await assert.rejects(services.invoke('game.update',{id:'fixture'}),/替换尚未完成/);
 await fs.unlink(path.join(cache,'transaction.json'));await fs.writeFile(path.join(cache,'local-version.json'),JSON.stringify({version:'old',pendingVersion:'new'}));
 await assert.rejects(services.invoke('game.update',{id:'fixture'}),/未更新完成/);
});
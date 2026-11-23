import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {updates} from '../engine/updates.mjs';
test('signed update retries without publishing partial bytes and verifies the installed payload before handing off',async t=>{
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-update-third-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),data=Buffer.from('test installer bytes');
 const hash=createHash('sha256').update(data).digest('hex'),record={format:'hxz-third-update-v1',version:'0.10.1',assets:{x64:{size:data.length,sha256:hash,url:'https://files.invalid/update.exe'}}};
 let invalid=true,broken=true,busy=true;const calls=[];
 const common={home,version:'0.10.0',architecture:'x64',channel:{url:'https://feed.invalid/latest',publicKey:publicKey.export({format:'der',type:'spki'}).toString('base64')},installed:true,emit(){},launch:async v=>calls.push(v),isBusy:()=>busy,fetcher:async url=>{
   if(url.includes('feed.')){const payload=Buffer.from(JSON.stringify(record));return Response.json({payload:payload.toString('base64'),signature:sign(null,invalid?Buffer.from('different'):payload,privateKey).toString('base64')});}
   return new Response(broken?data.subarray(1):data);
 }};
 const u=updates(common);
 await assert.rejects(u.invoke('app-update.check'),/签名/);invalid=false;assert.equal((await u.invoke('app-update.check')).available,true);
 await assert.rejects(u.invoke('app-update.download'),/校验/);assert.deepEqual(await fs.readdir(path.join(home,'updates')),[]);
 broken=false;assert.equal((await u.invoke('app-update.download')).ready,true);
 const restarted=updates(common);assert.equal((await restarted.invoke('app-update.check')).ready,true);await assert.rejects(restarted.invoke('app-update.install'),/结束/);
 busy=false;await restarted.invoke('app-update.install');assert.deepEqual(calls,[{sha256:hash}]);
 await fs.writeFile(path.join(home,'updates',hash+'.exe'),'altered');await assert.rejects(restarted.invoke('app-update.install'),/下载/);
 const damaged=await restarted.invoke('app-update.status');assert.equal(damaged.ready,false);assert.equal(damaged.available,true);
 assert.equal((await restarted.invoke('app-update.download')).ready,true);await restarted.invoke('app-update.install');assert.equal(calls.length,2);
 const local=updates({...common,channel:null});assert.equal((await local.invoke('app-update.check')).managed,false);
});

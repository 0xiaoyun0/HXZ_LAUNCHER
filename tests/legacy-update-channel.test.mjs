import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {verifyRelease} from '../packages/engine/core/update-sources.mjs';
import {updates} from '../engine/updates.mjs';

for(const arch of ['x64','ia32']){
 test('0.9.2 and 3rd accept the same signed '+arch+' installer',async t=>{
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-legacy-channel-'));t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
  const {publicKey,privateKey}=generateKeyPairSync('ed25519'),bytes=Buffer.from('isolated installer fixture '+arch);
  const file={url:'HXZ-Launcher-0.10.0-'+arch+'.exe',size:bytes.length,sha512:createHash('sha512').update(bytes).digest('base64'),sha256:createHash('sha256').update(bytes).digest('hex')};
  const data={version:'0.10.0',files:[file],releaseDate:new Date(0).toISOString(),releaseNotes:'升级测试'};
  const envelope=()=>{const payload=Buffer.from(JSON.stringify(data));return {payload:payload.toString('base64'),signature:sign(null,payload,privateKey).toString('base64')};};
  assert.equal(verifyRelease(envelope(),publicKey,arch).files[0].sha512,file.sha512);
  let applied,fail=true;
  const client=updates({home:tmp,version:'0.9.2',architecture:arch,channel:{format:'legacy092',url:'https://feed.invalid/latest',publicKey:publicKey.export({type:'spki',format:'der'}).toString('base64')},installed:true,isBusy:()=>false,emit(){},launch(v){applied=v;},fetcher:async url=>url.includes('feed.invalid')?Response.json(envelope()):new Response(fail?bytes.subarray(1):bytes)});
  assert.equal((await client.invoke('app-update.check')).available,true);
  await assert.rejects(client.invoke('app-update.download'),/完整性/);
  await assert.rejects(client.invoke('app-update.install'),/重新下载/);
  fail=false;assert.equal((await client.invoke('app-update.download')).ready,true);
  await client.invoke('app-update.install');assert.deepEqual(applied,{sha256:file.sha256});
  file.url='HXZ-Launcher-0.10.0-'+(arch==='x64'?'ia32':'x64')+'.exe';await assert.rejects(client.invoke('app-update.check'),/不符合/);
 });
}

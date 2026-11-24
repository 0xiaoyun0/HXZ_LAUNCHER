import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,verify,X509Certificate} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {supportedAbis} from '../apps/android/release-info.mjs';
import {verifyRelease} from '../packages/engine/core/update-sources.mjs';
import {updateManifest} from '../apps/community-server/src/update-trust.mjs';
import {androidFeed,prepareAndroidFeed,sha256} from './android-update-index.mjs';

// A mobile-only tag still becomes GitHub's latest release for every platform.
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const source=file=>execFileSync('git',['show',commit+':'+file]);
const {version}=JSON.parse(source('package.json'));
const root=path.resolve('release',version),out=path.join(root,'github-android'),android=path.join(root,'android');
const pin=JSON.parse(source('apps/android/upstream.json'));
await fs.mkdir(out,{recursive:true});
const names=[];
async function add(name,bytes){await fs.writeFile(path.join(out,name),bytes);names.push(name);}
const signed=await prepareAndroidFeed(android,version,pin);
const index=await fs.readFile(signed);
await add(androidFeed,index);
for(const abi of supportedAbis){
  const name='HXZ-FCL-'+version+'-'+abi+'-release.apk';
  await fs.copyFile(path.join(android,name),path.join(out,name));names.push(name);
}
const response=await fetch('https://api.github.com/repos/0xiaoyun0/HXZ_LAUNCHER/releases/latest',{
  headers:{'User-Agent':'HXZ-Android-release'},signal:AbortSignal.timeout(30000)});
assert.ok(response.ok,'GitHub HTTP '+response.status);
const stable=await response.json();assert.match(stable.tag_name,/^v\d+\.\d+\.\d+$/);
const certificate=new X509Certificate(Buffer.from(JSON.parse(index).certificate,'base64'));
for(const name of ['latest.json','latest-ia32.json','community-update.json','android-latest.json','game-runtime-latest.json']){
  const item=stable.assets.find(asset=>asset.name===name);assert.match(item?.digest??'',/^sha256:[0-9a-f]{64}$/);
  assert.ok(item.size>0&&item.size<262144);
  const previous=path.resolve('release',stable.tag_name.slice(1));
  let bytes;
  for(const folder of ['github-android','github-draft']){
    const cached=await fs.readFile(path.join(previous,folder,name)).catch(()=>null);
    if(cached&&'sha256:'+createHash('sha256').update(cached).digest('hex')===item.digest){bytes=cached;break;}
  }
  if(!bytes){
    const file=await fetch(item.browser_download_url,{signal:AbortSignal.timeout(30000)});
    assert.ok(file.ok,name+' HTTP '+file.status);bytes=Buffer.from(await file.arrayBuffer());
  }
  assert.equal(bytes.length,item.size);assert.equal('sha256:'+createHash('sha256').update(bytes).digest('hex'),item.digest);
  const envelope=JSON.parse(bytes);
  if(name.startsWith('latest'))verifyRelease(envelope,undefined,name==='latest.json'?'x64':'ia32');
  else if(name==='community-update.json')updateManifest(envelope);
  else assert.ok(verify('sha256',Buffer.from(envelope.payload,'base64'),certificate.publicKey,Buffer.from(envelope.signature,'base64')),name+' 签名无效');
  await add(name,bytes);
}
const archive='HXZ-Launcher-'+version+'-source.zip';
execFileSync('git',['archive','--format=zip','--prefix=HXZ-Launcher-'+version+'/','-o',path.join(out,archive),commit]);
names.push(archive);
await add('RELEASE-NOTES.md',source('docs/'+version+'发布说明.md'));
const sums=[];
for(const name of names.sort())sums.push(await sha256(path.join(out,name))+'  '+name);
await add('SHA256SUMS.txt',sums.join('\n')+'\n');
assert.deepEqual((await fs.readdir(out)).sort(),names.sort(),'发现不属于本次发布的附件');
console.log(commit+' · '+names.length+' 个附件 · 其他更新通道来自 '+stable.tag_name+'\n'+out);

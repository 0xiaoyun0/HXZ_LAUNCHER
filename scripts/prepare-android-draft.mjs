import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {verify,X509Certificate} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {androidRelease,apkName,supportedAbis} from '../apps/android/release-info.mjs';
import {verifyRelease} from '../packages/engine/core/update-sources.mjs';
import {updateManifest} from '../apps/community-server/src/update-trust.mjs';
import {androidFeed,legacyFclFeed,assertAndroidSuccessor,prepareAndroidFeed,publishedAsset,readAndroidFeed,sha256} from './android-update-index.mjs';

// A mobile-only tag still becomes GitHub's latest release for every platform.
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const source=file=>execFileSync('git',['show',commit+':'+file]);
const info=androidRelease(JSON.parse(source('package.json')));
const root=path.resolve('release',info.id),out=path.join(root,'github-android'),android=path.join(root,'android');
const pin=JSON.parse(source('apps/android/upstream.json'));
await fs.mkdir(out,{recursive:true});
const names=[];
async function add(name,bytes){await fs.writeFile(path.join(out,name),bytes);names.push(name);}
const signed=await prepareAndroidFeed(android,info,pin);
const index=await fs.readFile(signed);
await add(androidFeed,index);
for(const abi of supportedAbis){
  const name=apkName(info,abi);
  await fs.copyFile(path.join(android,name),path.join(out,name));names.push(name);
}
const response=await fetch('https://api.github.com/repos/0xiaoyun0/HXZ_LAUNCHER/releases/latest?t='+Date.now(),{
  headers:{'User-Agent':'HXZ-Android-release'},signal:AbortSignal.timeout(30000)});
assert.ok(response.ok,'GitHub HTTP '+response.status);
const stable=await response.json();
const priorFeed=stable.assets.some(a=>a.name===androidFeed)?androidFeed:legacyFclFeed;
assertAndroidSuccessor(readAndroidFeed(await publishedAsset(stable,priorFeed)),readAndroidFeed(index));
const certificate=new X509Certificate(Buffer.from(JSON.parse(index).certificate,'base64'));
for(const name of ['latest.json','latest-ia32.json','community-update.json','android-latest.json','game-runtime-latest.json',legacyFclFeed]){
  const bytes=await publishedAsset(stable,name);
  const envelope=JSON.parse(bytes);
  if(name.startsWith('latest'))verifyRelease(envelope,undefined,name==='latest.json'?'x64':'ia32');
  else if(name==='community-update.json')updateManifest(envelope);
  else if(name===legacyFclFeed)readAndroidFeed(bytes);
  else assert.ok(verify('sha256',Buffer.from(envelope.payload,'base64'),certificate.publicKey,Buffer.from(envelope.signature,'base64')),name+' 签名无效');
  await add(name,bytes);
}
const archive='HXZ-Launcher-'+info.id+'-source.zip';
execFileSync('git',['archive','--format=zip','--prefix=HXZ-Launcher-'+info.id+'/','-o',path.join(out,archive),commit]);
names.push(archive);
await add('RELEASE-NOTES.md',source('docs/'+info.id+'发布说明.md'));
const sums=[];
for(const name of names.sort())sums.push(await sha256(path.join(out,name))+'  '+name);
await add('SHA256SUMS.txt',sums.join('\n')+'\n');
assert.deepEqual((await fs.readdir(out)).sort(),names.sort(),'发现不属于本次发布的附件');
console.log(commit+' · '+names.length+' 个附件 · 其他更新通道来自 '+stable.tag_name+'\n'+out);

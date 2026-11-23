import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {verifyUpdateRelease} from './verify-update-release.mjs';
import {verifyCommunityRelease} from './verify-community-release.mjs';
import {verifyReleaseApk} from '../apps/android/verify-apk.mjs';
import {supportedAbis} from '../apps/android/release-info.mjs';

const includeAndroid=process.argv.includes('--android');
const target=process.argv.slice(2).find(arg=>!arg.startsWith('--'))||'HEAD';
const commit=execFileSync('git',['rev-parse','--verify',target+'^{commit}'],{encoding:'utf8'}).trim();
const gitFile=name=>execFileSync('git',['show',commit+':'+name]);
const {version}=JSON.parse(gitFile('package.json'));
const root=path.resolve('release',version),dest=path.join(root,'github-draft');
await verifyUpdateRelease(root,version);await fs.mkdir(dest,{recursive:true});
const files=[];
async function copy(rel){
  const name=path.basename(rel);await fs.copyFile(path.join(root,rel),path.join(dest,name));files.push(name);
}
for(const arch of ['x64','ia32']){
  await copy('updates/HXZ-Launcher-'+version+'-'+arch+'.exe');
  await copy('updates/'+(arch==='x64'?'latest.json':'latest-ia32.json'));
  await copy('HXZ-3rd-'+version+'-windows-'+arch+'.zip');
}
const modules=JSON.parse(await fs.readFile('.runtime/official-extensions.json','utf8'));
for(const id of ['community','music','arcade'])await copy('extensions/'+modules[id].name);
await copy('server/HXZ-Community-'+version+'-windows-x64.zip');
await copy('server/HXZ-Community-'+version+'-update.zip');
await copy('updates/community-update.json');
if(includeAndroid){
  const pin=JSON.parse(gitFile('apps/android/upstream.json'));
  for(const abi of supportedAbis){
    const apk='HXZ-FCL-'+version+'-'+abi+'-release.apk';
    await verifyReleaseApk(path.join(root,'android',apk),abi,pin,version);
    await copy('android/'+apk);
  }
}

// Legacy Android and its separately versioned runtime still use their previous feeds.
const repo='https://api.github.com/repos/0xiaoyun0/HXZ_LAUNCHER';
const current=await fetch(repo+'/releases/latest',{headers:{'User-Agent':'HXZ-release-preparation'},signal:AbortSignal.timeout(25000)});
assert.ok(current.ok,'无法读取当前公开版的附件目录：'+current.status);
const stable=await current.json();
for(const name of ['android-latest.json','game-runtime-latest.json']){
  const item=stable.assets.find(file=>file.name===name);
  assert.match(item?.digest||'',/^sha256:[0-9a-f]{64}$/,name);
  let bytes;
  if(process.env.HXZ_COMPAT_FEEDS)bytes=await fs.readFile(path.join(process.env.HXZ_COMPAT_FEEDS,name));
  else{
    const response=await fetch(item.browser_download_url,{signal:AbortSignal.timeout(30000)});
    assert.ok(response.ok,name+' HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());
  }
  assert.equal('sha256:'+createHash('sha256').update(bytes).digest('hex'),item.digest,name);
  const signed=JSON.parse(bytes);assert.ok(signed.payload&&signed.signature,name);
  await fs.writeFile(path.join(dest,name),bytes);files.push(name);
}
const source='HXZ-Launcher-'+version+'-source.zip';
execFileSync('git',['archive','--format=zip','--prefix=HXZ-Launcher-'+version+'/','-o',path.join(dest,source),commit]);
files.push(source);
for(const [from,to] of [['README.md','README.md'],['docs/'+version+'发布说明.md','RELEASE-NOTES.md'],['docs/'+version+'-Windows验收.md','WINDOWS-ACCEPTANCE.md']]){
  await fs.writeFile(path.join(dest,to),gitFile(from));files.push(to);
}
await verifyCommunityRelease(dest, version, {flat:true});
const sums=[];
for(const name of files.sort()){
  const h=createHash('sha256');for await(const bytes of createReadStream(path.join(dest,name)))h.update(bytes);
  sums.push(h.digest('hex')+'  '+name);
}
await fs.writeFile(path.join(dest,'SHA256SUMS.txt'),sums.join('\n')+'\n');
console.log(commit+' · '+(files.length+1)+' 个发布附件 · 兼容更新清单来源 '+stable.tag_name+'\n'+dest);

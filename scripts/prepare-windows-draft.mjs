import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {verifyUpdateRelease} from './verify-update-release.mjs';
import {verifyCommunityRelease} from './verify-community-release.mjs';
import {androidRelease,apkName,supportedAbis} from '../apps/android/release-info.mjs';
import {androidFeed,legacyFclFeed,assertAndroidSuccessor,prepareAndroidFeed,publishedAsset,readAndroidFeed} from './android-update-index.mjs';

const includeAndroid=process.argv.includes('--android');
const target=process.argv.slice(2).find(arg=>!arg.startsWith('--'))||'HEAD';
const commit=execFileSync('git',['rev-parse','--verify',target+'^{commit}'],{encoding:'utf8'}).trim();
const gitFile=name=>execFileSync('git',['show',commit+':'+name]);
const pkg=JSON.parse(gitFile('package.json'));
const {version}=pkg;
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
await copy('server-tools/HXZ-Community-'+version+'-connection-repair.zip');
await copy('updates/community-update.json');
// Legacy Android and its separately versioned runtime still use their previous feeds.
const repo='https://api.github.com/repos/0xiaoyun0/HXZ_LAUNCHER';
const current=await fetch(repo+'/releases/latest?t='+Date.now(),{headers:{'User-Agent':'HXZ-release-preparation'},signal:AbortSignal.timeout(25000)});
assert.ok(current.ok,'无法读取当前公开版的附件目录：'+current.status);
const stable=await current.json();
const previousFeed=stable.assets.some(asset=>asset.name===androidFeed)?androidFeed:legacyFclFeed;
const preserved=['android-latest.json','game-runtime-latest.json',legacyFclFeed];
if(includeAndroid){
  const info=androidRelease(pkg),folder=path.resolve('release',info.id,'android');
  const pin=JSON.parse(gitFile('apps/android/upstream.json'));
  const previous=readAndroidFeed(await publishedAsset(stable,previousFeed));
  const tag=previous.versionCode===info.versionCode?previous.tag:'v'+version;
  const signed=await prepareAndroidFeed(folder,info,pin,{tag,outputDir:dest});
  assertAndroidSuccessor(previous,readAndroidFeed(await fs.readFile(signed)));
  files.push(androidFeed);
  for(const abi of supportedAbis){
    const apk=apkName(info,abi);
    await fs.copyFile(path.join(folder,apk),path.join(dest,apk));files.push(apk);
  }
}else if(previousFeed===androidFeed)preserved.push(androidFeed);
for(const name of preserved){
  const bytes=await publishedAsset(stable,name);
  const signed=JSON.parse(bytes);assert.ok(signed.payload&&signed.signature,name);
  if(name===androidFeed||name===legacyFclFeed)readAndroidFeed(bytes);
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

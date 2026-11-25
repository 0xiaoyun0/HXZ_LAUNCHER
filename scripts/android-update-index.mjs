import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,verify,X509Certificate} from 'node:crypto';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {androidRelease,androidVersionCode,apkName,releasePackage,releaseSigner,supportedAbis} from '../apps/android/release-info.mjs';
import {verifyReleaseApk} from '../apps/android/verify-apk.mjs';

export const androidFeed = 'android-build-latest.json';
export const legacyFclFeed = 'android-fcl-latest.json';
export async function sha256(file) {
  const hash=createHash('sha256');
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest('hex');
}
export function readAndroidFeed(bytes) {
  assert.ok(bytes.length<=32768,'安卓更新清单过大');
  const raw=JSON.parse(bytes), certificate=new X509Certificate(Buffer.from(raw.certificate,'base64'));
  assert.equal(createHash('sha256').update(certificate.raw).digest('hex'),releaseSigner,'安卓签名证书');
  const data=Buffer.from(raw.payload,'base64');
  assert.ok(verify('sha256',data,certificate.publicKey,Buffer.from(raw.signature,'base64')),'安卓更新清单签名无效');
  const manifest=JSON.parse(data);
  assert.equal(manifest.package,releasePackage);
  if(manifest.format==='hxz-fcl-update-v2'){
    const info=androidRelease({androidBuild:{version:manifest.version,number:manifest.build,versionCode:manifest.versionCode}});
    assert.ok(manifest.tag===info.tag||/^v(0|[1-9]\d{0,3})\.(0|[1-9]\d?)\.(0|[1-9]\d?)$/.test(manifest.tag),'安卓更新来源须为本构建标签或正式版标签');
  }else{
    assert.equal(manifest.format,'hxz-fcl-update-v1');
    assert.equal(manifest.versionCode,androidVersionCode(manifest.version));
  }
  assert.deepEqual(Object.keys(manifest.assets).sort(),[...supportedAbis].sort());
  for(const abi of supportedAbis){
    const {size,sha256}=manifest.assets[abi];
    assert.ok(Number.isSafeInteger(size)&&size>0&&size<=512*1024*1024);assert.match(sha256,/^[0-9a-f]{64}$/);
  }
  return manifest;
}
export function assertAndroidSuccessor(previous,next) {
  if(next.versionCode===previous.versionCode){
    assert.deepEqual(next,previous,'已发布的安装序号不能用于不同的 APK 或清单');
    return;
  }
  assert.ok(next.versionCode>previous.versionCode,'安卓安装序号必须大于上一个正式包');
  if(next.version===previous.version)assert.ok(next.build>(previous.build??1),'同一版本的构建号必须递增');
}

export async function publishedAsset(stable,name) {
  const item=stable.assets.find(asset=>asset.name===name);
  assert.match(item?.digest??'',/^sha256:[0-9a-f]{64}$/,name+' 缺少已发布的摘要');
  assert.ok(item.size>0&&item.size<262144,name);
  assert.match(stable.tag_name,/^v\d+\.\d+\.\d+(?:-build\.\d+)?$/);
  const root=path.resolve('release',stable.tag_name.slice(1));
  const folders=[process.env.HXZ_COMPAT_FEEDS,path.join(root,'github-android'),path.join(root,'github-draft')].filter(Boolean);
  const matches=bytes=>bytes?.length===item.size&&'sha256:'+createHash('sha256').update(bytes).digest('hex')===item.digest;
  for(const folder of folders){
    const bytes=await fs.readFile(path.join(folder,name)).catch(()=>null);
    if(matches(bytes))return bytes;
  }
  const response=await fetch(item.browser_download_url,{signal:AbortSignal.timeout(30000)});
  assert.ok(response.ok,name+' HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.ok(matches(bytes),name+' 下载摘要或大小不符');
  return bytes;
}

export async function prepareAndroidFeed(folder,info,pin,{tag=info.tag,outputDir=folder}={}) {
  const assets={};
  for(const abi of supportedAbis){
    const file=path.join(folder,apkName(info,abi));
    await verifyReleaseApk(file,abi,pin,info);
    assets[abi]={size:(await fs.stat(file)).size,sha256:await sha256(file)};
  }
  const {version,build,versionCode}=info;
  const manifest={format:'hxz-fcl-update-v2',package:releasePackage,version,build,versionCode,tag,assets};
  const output=path.join(outputDir,androidFeed);
  if(process.env.HXZ_ANDROID_STORE){
    const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-android-index-'));
    try{
      const payload=path.join(tmp,'payload.json'),signed=path.join(tmp,androidFeed);
      await fs.writeFile(payload,JSON.stringify(manifest));
      const java=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin','java'):'java';
      execFileSync(java,['apps/android/tools/SignUpdateIndex.java',payload,signed,releaseSigner],{windowsHide:true,stdio:'inherit'});
      const bytes=await fs.readFile(signed);
      assert.deepEqual(readAndroidFeed(bytes),manifest);await fs.writeFile(output,bytes);
    }finally{await fs.rm(tmp,{recursive:true,force:true});}
  }
  assert.deepEqual(readAndroidFeed(await fs.readFile(output)),manifest,'签名清单必须匹配两个正式 APK');
  return output;
}

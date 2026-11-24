import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,verify,X509Certificate} from 'node:crypto';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {androidVersionCode,releasePackage,releaseSigner,supportedAbis} from '../apps/android/release-info.mjs';
import {verifyReleaseApk} from '../apps/android/verify-apk.mjs';

export const androidFeed = 'android-fcl-latest.json';
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
  assert.equal(manifest.format,'hxz-fcl-update-v1');assert.equal(manifest.package,releasePackage);
  assert.equal(manifest.versionCode,androidVersionCode(manifest.version));
  assert.deepEqual(Object.keys(manifest.assets).sort(),[...supportedAbis].sort());
  for(const abi of supportedAbis){
    const {size,sha256}=manifest.assets[abi];
    assert.ok(Number.isSafeInteger(size)&&size>0&&size<=512*1024*1024);assert.match(sha256,/^[0-9a-f]{64}$/);
  }
  return manifest;
}
export async function prepareAndroidFeed(folder,version,pin) {
  const assets={};
  for(const abi of supportedAbis){
    const file=path.join(folder,'HXZ-FCL-'+version+'-'+abi+'-release.apk');
    await verifyReleaseApk(file,abi,pin,version);
    assets[abi]={size:(await fs.stat(file)).size,sha256:await sha256(file)};
  }
  const manifest={format:'hxz-fcl-update-v1',package:releasePackage,version,versionCode:androidVersionCode(version),assets};
  const output=path.join(folder,androidFeed);
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

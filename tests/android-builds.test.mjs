import assert from 'node:assert/strict';
import test from 'node:test';
import {androidRelease,androidVersionCode,apkName} from '../apps/android/release-info.mjs';
import {assertAndroidSuccessor} from '../scripts/android-update-index.mjs';

test('同一产品版本的安卓版可以覆盖两个历史正式包',()=>{
  const release=androidRelease({version:'0.10.1',androidBuild:{version:'0.10.0',number:2,versionCode:100101}});
  assert.equal(release.version,'0.10.0','安卓发布不跟随桌面版本字段');
  assert.equal(release.versionName,'0.10.0+2');
  assert.equal(release.tag,'v0.10.0-build.2');
  for(const abi of ['arm64-v8a','x86_64'])assert.equal(apkName(release,abi),'HXZ-FCL-0.10.0-build.2-'+abi+'-release.apk');
  for(const version of ['0.10.0','0.10.1'])assertAndroidSuccessor({version,versionCode:androidVersionCode(version)},release);
  assertAndroidSuccessor(release,{...release,build:3,versionCode:100102});
});

test('发布拒绝重复安装序号、构建号倒退和非法构建资料',()=>{
  const last={version:'0.10.0',build:2,versionCode:100101,assets:{example:'a'}};
  assertAndroidSuccessor(last,structuredClone(last));
  assert.throws(()=>assertAndroidSuccessor(last,{...last,assets:{example:'b'}}));
  assert.throws(()=>assertAndroidSuccessor(last,{...last,versionCode:100100,build:3}));
  assert.throws(()=>assertAndroidSuccessor(last,{...last,versionCode:100102}));
  for(const number of [0,2.5,'2',2_100_000_001])assert.throws(()=>androidRelease({androidBuild:{version:'0.10.0',number,versionCode:100101}}));
  assert.throws(()=>androidRelease({androidBuild:{version:'0.10.0+2',number:2,versionCode:100101}}));
});

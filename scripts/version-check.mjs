import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {androidRelease} from '../apps/android/release-info.mjs';

const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const pkg=await readJson('package.json');
const {version}=pkg;
const android=androidRelease(pkg);

for(const file of ['apps/desktop/package.json','apps/community-server/package.json']){
  assert.equal((await readJson(file)).version,version,file+' 与根清单版本不一致');
}
for(const file of ['package-lock.json','apps/community-server/package-lock.json']){
  const lock=await readJson(file);
  assert.equal(lock.version,version,file);
  assert.equal(lock.packages[''].version,version,file+' 根包');
}
const cargo=await fs.readFile('native/Cargo.toml','utf8');
const lock=await fs.readFile('native/Cargo.lock','utf8');
assert.equal(cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1],version,'Cargo.toml');
assert.equal(lock.match(/^name = "hxz-launcher"\r?\nversion = "([^"]+)"/m)?.[1],version,'Cargo.lock');
assert.equal((await readJson('native/tauri.conf.json')).version,'../package.json');
console.log('桌面 '+version+' · 安卓 '+android.version+' 构建 '+android.build+' · versionCode '+android.versionCode);

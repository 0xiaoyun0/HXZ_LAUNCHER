import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const {version}=await readJson('package.json');

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
console.log(version);

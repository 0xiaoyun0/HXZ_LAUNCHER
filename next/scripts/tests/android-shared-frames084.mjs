import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const native=path.join(root,'mobile/runtime/native');
const source=await fs.readFile(path.join(native,'hxz_ipc.cpp'),'utf8');
const clean=source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
assert.match(clean,/#include\s+"hxz_shared_frames\.h"/);
assert.doesNotMatch(clean,/\bfstat\s*\(/,'IPC capacity validation must not use ordinary file size');
function bodyOf(name){
  const declaration=new RegExp(`\\bstd::string\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(clean);
  assert(declaration,`${name} must exist`);
  const begin=declaration.index+declaration[0].length;
  let depth=1;
  for(let i=begin;i<clean.length;i++){
    if(clean[i]==='{')depth++;
    if(clean[i]==='}'&&--depth===0)return clean.slice(begin,i);
  }
  assert.fail(`${name} body is incomplete`);
}
for(const [name,fd] of [['hxz_ipc_start','s->fd'],['hxz_ipc_child_connect','fd']]){
  const body=bodyOf(name);
  const check=body.indexOf('hxz_check_shared_frames(');
  const map=body.indexOf('mmap(');
  assert(check>=0&&map>check,`${name} must check shared capacity before mmap`);
  const beforeMap=body.slice(0,map);
  const call=new RegExp(`const\\s+std::string\\s+(\\w+)\\s*=\\s*hxz_check_shared_frames\\(\\s*${fd}\\s*,\\s*s->slotBytes\\s*\\*\\s*2\\s*\\)\\s*;`);
  const result=call.exec(beforeMap);
  assert(result,`${name} must validate both frame slots on the mapped descriptor`);
  const error=result[1];
  assert.match(beforeMap.slice(result.index+result[0].length),new RegExp(`if\\s*\\(\\s*!\\s*${error}\\.empty\\(\\)\\s*\\)\\s*return\\s+${error}\\s*;`),`${name} must reject the helper error before mapping`);
}

const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-shared-frames-'));
const include=path.join(tmp,'include');
await fs.mkdir(path.join(include,'android'),{recursive:true});
await fs.writeFile(path.join(include,'android/sharedmem.h'),`#pragma once
#include <cstddef>
extern "C" size_t ASharedMemory_getSize(int fd);
`);
const compiler=process.env.HXZ_HOST_CXX||(process.platform==='win32'?path.join(root,'.runtime/review084/native-host-tools/ziglang/zig.exe'):'c++');
const zig=path.basename(compiler).startsWith('zig');
const fixture=path.join(root,'mobile/runtime/test/hxz-shared-frames084.cpp');
const binary=path.join(tmp,process.platform==='win32'?'shared-frames-check.exe':'shared-frames-check');
execFileSync(compiler,[...(zig?['c++']:[]),'-std=c++17','-Wall','-Wextra','-Werror','-I',include,'-I',native,fixture,'-o',binary],{windowsHide:true,stdio:'pipe',timeout:240000});
const result=execFileSync(binary,[],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000});
const scenarios=['exact-capacity','larger-capacity','insufficient-capacity','zero-size','error-sentinel','invalid-fd','zero-required','fd-zero','minimum-capacity','maximum-two-frames','maximum-insufficient','ashmem-st-size-zero'];
assert.deepEqual(result.trim().split(/\r?\n/),scenarios.map(name=>`PASS ${name}`));
console.log(JSON.stringify({passed:true,scenarios:scenarios.length,integration:'host and child validate both slots before mmap; no fstat capacity query',scope:'Actual production helper with mocked Android shared-memory size API; zero-st_size fixture rejects the old predicate and passes the helper. Does not establish vivo or Android device acceptance.'}));

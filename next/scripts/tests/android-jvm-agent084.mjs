import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-jvm-agent-'));
const jdk=process.env.HXZ_TEST_JAVA_HOME||'C:/Program Files/Java/jdk-21';
const zig=path.join(root,'.runtime/review084/native-host-tools/ziglang/zig.exe');
try {
await fs.writeFile(path.join(tmp,'dlfcn.h'),'#pragma once\n#define RTLD_NOW 2\n#define RTLD_GLOBAL 256\n');
await fs.writeFile(path.join(tmp,'unistd.h'),'#pragma once\n');
const binary=path.join(tmp,'agent.exe');
execFileSync(zig,['c++','-std=c++17','-Wall','-Wextra','-Werror','-Wno-format','-I',tmp,
  '-I',path.join(jdk,'include'),'-I',path.join(jdk,'include/win32'),
  '-I',path.join(root,'mobile/runtime/native'),
  path.join(root,'mobile/runtime/test/hxz-jvm-agent084.cpp'),'-o',binary],
  {windowsHide:true,stdio:'pipe',timeout:120000});
for(const scenario of ['one-agent','two-agents','no-agent','missing-jli','missing-instrument','broken-instrument'])
  console.log(execFileSync(binary,[scenario],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000}).trim());
console.log('Production JNI bootstrap: 6 boundary scenarios; mocked Android dlopen/JNI, no device test.');
} finally {
  assert.equal(path.dirname(tmp),path.resolve(os.tmpdir()));
  assert.ok(path.basename(tmp).startsWith('hxz-jvm-agent-'));
  await fs.rm(tmp,{recursive:true,force:true});
}

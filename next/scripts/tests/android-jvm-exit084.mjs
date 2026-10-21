import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const native=path.join(root,'mobile/runtime/native');
const temporaryRoot=path.resolve(os.tmpdir());
const tmp=await fs.mkdtemp(path.join(temporaryRoot,'hxz-jvm-exit-'));
try {
  const include=path.join(tmp,'include');
  await fs.mkdir(path.join(include,'android'),{recursive:true});
  await fs.mkdir(path.join(include,'sys'),{recursive:true});
  await fs.writeFile(path.join(include,'android/native_window.h'),'#pragma once\nstruct ANativeWindow;\n');
  await fs.writeFile(path.join(include,'sys/prctl.h'),'#pragma once\n#define PR_SET_PDEATHSIG 1\nint prctl(int,int);\n');
  await fs.writeFile(path.join(include,'unistd.h'),'#pragma once\nusing pid_t=int;\npid_t getppid();\n[[noreturn]] void _exit(int);\n');
  const compiler=process.env.HXZ_HOST_CXX||(process.platform==='win32'?path.join(root,'.runtime/review084/native-host-tools/ziglang/zig.exe'):'c++');
  const zig=path.basename(compiler).startsWith('zig');
  const fixture=path.join(root,'mobile/runtime/test/hxz-jvm-exit-host084.cpp');
  const binary=path.join(tmp,process.platform==='win32'?'executor-exit.exe':'executor-exit');
  execFileSync(compiler,[...(zig?['c++']:[]),'-std=c++17','-Wall','-Wextra','-Werror','-I',include,'-I',native,fixture,'-o',binary],
    {windowsHide:true,stdio:'pipe',timeout:120000});
  const scenarios=[
    {name:'normal',exit:0,closed:true,java:true},
    {name:'installer',exit:0,closed:false,java:true},
    {name:'java75',exit:75,closed:true,java:true},
    {name:'renderer67',exit:67,closed:true,java:false,error:'fixture renderer failure'},
    {name:'ipc66',exit:66,closed:false,java:false,error:'fixture IPC failure'},
    {name:'exception65',exit:65,closed:true,java:false,error:'fixture executor exception'},
  ];
  for(const scenario of scenarios){
    const result=spawnSync(binary,[scenario.name],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000});
    assert.ifError(result.error);
    assert.equal(result.signal,null,`${scenario.name}: executor must exit without a signal`);
    assert.equal(result.status,scenario.exit,`${scenario.name}: preserve the job's exit code`);
    assert.doesNotMatch(result.stderr,/STATIC-DESTRUCTOR/,`${scenario.name}: do not destroy globals while detached threads may still use them`);
    assert.match(result.stdout,new RegExp(`^BUFFERED:${scenario.name}\\r?\\n`),`${scenario.name}: flush buffered output before immediate exit`);
    assert.equal(result.stdout.includes('IPC-CLOSED'),scenario.closed,`${scenario.name}: close an established game IPC endpoint before exit`);
    assert.equal(result.stdout.includes('JAVA-CALLED'),scenario.java,`${scenario.name}: keep startup failure boundaries`);
    if(scenario.error)assert.ok(result.stderr.includes(scenario.error),`${scenario.name}: retain the failure diagnostic`);
  }
  console.log(JSON.stringify({passed:true,scenarios:scenarios.length,scope:'Production standalone executor entry with mocked Android/JVM boundaries; real child exit status, buffered stdio and static teardown sentinel. No Android device or HotSpot execution.'}));
} finally {
  assert.equal(path.dirname(path.resolve(tmp)),temporaryRoot);
  assert.ok(path.basename(tmp).startsWith('hxz-jvm-exit-'));
  await fs.rm(tmp,{recursive:true,force:true});
}

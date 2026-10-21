import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const native=path.join(root,'mobile/runtime/native');
const [entry,cmake]=await Promise.all(['hxz_jvm_exec.cpp','CMakeLists.txt'].map(name=>fs.readFile(path.join(native,name),'utf8')));
const cleanEntry=entry.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
const main=cleanEntry.slice(cleanEntry.indexOf('int main('));
const prepare=main.indexOf('hxz_prepare_vm_heap()');
assert(prepare>=0,'The standalone executor must prepare its own heap');
for(const later of ['hxz_read_job(','hxz_configure_renderer(','hxz_java(']){
  assert(main.indexOf(later)>prepare,`Heap compatibility must precede ${later}`);
}
assert.match(main,/if\s*\(\s*!\s*hxz_prepare_vm_heap\(\)\s*\)\s*(?:\{\s*)?return\s+69\s*;/,'Refuse startup when the heap remains incompatible');
const executable=cmake.match(/add_executable\s*\(\s*hxz_jvm_exec\s+([^)]*)\)/)?.[1];
assert(executable?.includes('hxz_vm_heap.cpp'),'Link the helper into the executor');
const shared=cmake.match(/add_library\s*\(\s*hxz_runtime\s+SHARED\s+([^)]*)\)/)?.[1];
assert(shared&&!shared.includes('hxz_vm_heap'),'Keep the ART-loaded runtime outside the heap workaround');

const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-vm-heap-'));
const include=path.join(tmp,'include');
await fs.mkdir(path.join(include,'android'),{recursive:true});
await fs.writeFile(path.join(include,'android/api-level.h'),`#pragma once
extern "C" int android_get_device_api_level();
`);
await fs.writeFile(path.join(include,'malloc.h'),`#pragma once
#define M_BIONIC_SET_HEAP_TAGGING_LEVEL (-204)
#define M_HEAP_TAGGING_LEVEL_NONE 0
extern "C" int mallopt(int,int);
`);
await fs.writeFile(path.join(include,'dlfcn.h'),`#pragma once
#define RTLD_DEFAULT nullptr
extern "C" void* dlsym(void*,const char*);
`);
const compiler=process.env.HXZ_HOST_CXX||(process.platform==='win32'?path.join(root,'.runtime/review084/native-host-tools/ziglang/zig.exe'):'c++');
const zig=path.basename(compiler).startsWith('zig');
const fixture=path.join(root,'mobile/runtime/test/hxz-vm-heap-host084.cpp');
const binary=path.join(tmp,process.platform==='win32'?'heap-check.exe':'heap-check');
execFileSync(compiler,[...(zig?['c++']:[]),'-std=c++17','-Wall','-Wextra','-Werror','-I',include,'-I',native,fixture,'-o',binary],{windowsHide:true,stdio:'pipe',timeout:240000});
const scenarios=['api28','api-unknown','api29','api30','api31','api36','public-failure','public-invalid-success','legacy-failure','legacy-unavailable','public-residual-tag','legacy-residual-tag','public-oom','legacy-oom'];
for(const scenario of scenarios){
  const result=execFileSync(binary,[scenario],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000});
  assert.equal(result.trim(),`PASS ${scenario}`);
}
console.log(JSON.stringify({passed:true,scenarios:scenarios.length,integration:'executor before job/renderer/JVM; excluded from ART runtime',scope:'Actual helper with mocked Bionic calls; residual tagged allocations are freed unchanged. Does not validate Android allocator internals or device acceptance.'}));

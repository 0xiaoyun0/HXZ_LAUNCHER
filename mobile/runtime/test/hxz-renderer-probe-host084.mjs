import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';

const native=path.resolve('mobile/runtime/native');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-renderer-probe-host-'));
await fs.writeFile(path.join(tmp,'dlfcn.h'),`#pragma once
#define RTLD_NOW 2
#define RTLD_LOCAL 0
extern "C" {void* dlopen(const char*,int);void* dlsym(void*,const char*);const char* dlerror();int dlclose(void*);}
`);
const compiler=process.env.HXZ_HOST_CXX||(process.platform==='win32'
  ?path.resolve('.runtime/review084/native-host-tools/ziglang/zig.exe'):'c++');
const executable=path.join(tmp,process.platform==='win32'?'probe.exe':'probe');
// Compile the production translation unit itself; no extracted or rewritten
// implementation and no test-only alternate renderer-probe logic is substituted.
execFileSync(compiler,[...(path.basename(compiler).startsWith('zig')?['c++']:[]),
  '-std=c++17','-Wall','-Wextra','-Werror','-I',tmp,'-I',native,
  path.join(native,'hxz_renderer_probe.cpp'),path.resolve('mobile/runtime/test/hxz-renderer-probe-host084.cpp'),
  '-o',executable],{stdio:'pipe',timeout:240000});

const cases=[
  ['success-3.3',0],['success-4.6',0],['pixel-low-bound',0],['pixel-high-bound',0],
  ['sanitized-fields',0],['truncated-field',0],
  ['version-3.2',85],['pixel-red',85],['pixel-green',85],['pixel-blue',85],['pixel-alpha',85],
  ['invalid-null',80],['invalid-relative',80],['load-failure',81],['create-failure',83],['binding-failure',84],
  ...['OSMesaCreateContextAttribs','OSMesaMakeCurrent','OSMesaDestroyContext','OSMesaGetProcAddress'].map(name=>['missing-context-'+name,82]),
  ...['glGetString','glGetIntegerv','glClearColor','glClear','glFinish','glReadPixels'].map(name=>['missing-gl-'+name,85]),
];
for(const [scenario,expectedCode] of cases){
  const run=spawnSync(executable,[scenario],{encoding:'utf8',timeout:10000});
  assert.ifError(run.error);
  assert.equal(run.status,expectedCode,`${scenario}: unexpected exit\n${run.stdout}\n${run.stderr}`);
  const lines=run.stdout.trim().split(/\r?\n/).filter(Boolean);
  const hasFields=expectedCode===0||scenario==='version-3.2'||/^pixel-(red|green|blue|alpha)$/.test(scenario);
  const expectedFields=hasFields?[
    'HXZ_GPU_VENDOR='+(scenario==='sanitized-fields'?'Mock Vendor Build A':'Mock Vendor'),
    'HXZ_GPU_RENDERER='+(scenario==='truncated-field'?'R'.repeat(256):'Mock Renderer'),
    'HXZ_GPU_VERSION='+(scenario==='version-3.2'?'3.2':scenario==='success-4.6'?'4.6':'3.3')+' Mock Driver',
    ...(expectedCode===0?['HXZ_GPU_FRAME_OK=1']:[]),
  ]:[];
  assert.deepEqual(lines,expectedFields,`${scenario}: incorrect protocol fields`);
  if(expectedCode===0)assert.equal(run.stderr,'',`${scenario}: success wrote an error`);
  else assert.match(run.stderr,/^HXZ GPU probe: /,`${scenario}: missing failure diagnostic`);
}
console.log(JSON.stringify({passed:true,cases:cases.length,
  scope:'Actual hxz_renderer_probe.cpp with mocked dlopen/dlsym and OSMesa/OpenGL boundaries; version/pixel rejection, cleanup and output protocol verified; no real driver or device acceptance'}));

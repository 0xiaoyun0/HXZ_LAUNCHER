import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

// Exercise the actual production entry point, mocking only the Android window
// boundary. No GPU, display, JVM, frame-rate, or device acceptance is implied.
const native=path.resolve('mobile/runtime/native');
const source=await fs.readFile(path.join(native,'hxz_glfw.cpp'),'utf8');
const start=source.indexOf('extern "C" int hxz_present_frame(');
assert(start>=0,'production hxz_present_frame entry point is missing');
let end=source.indexOf('{',start),depth=1;
while(depth&&++end<source.length){if(source[end]==='{')++depth;else if(source[end]==='}')--depth;}
assert.equal(depth,0,'production hxz_present_frame body is incomplete');
const present=source.slice(start,end+1);
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-frame-present-host-'));
await fs.writeFile(path.join(tmp,'hxz_frame_under_test.cpp'),present);
const compiler=process.env.HXZ_HOST_CXX||(process.platform==='win32'
  ?path.resolve('.runtime/review084/native-host-tools/ziglang/zig.exe'):'c++');
const executable=path.join(tmp,process.platform==='win32'?'present.exe':'present');
execFileSync(compiler,[...(path.basename(compiler).startsWith('zig')?['c++']:[]),
  '-std=c++17','-Wall','-Wextra','-Werror','-pthread','-I',tmp,'-I',native,
  path.resolve('mobile/runtime/test/hxz-frame-present-host084.cpp'),'-o',executable],
  {stdio:'pipe',timeout:240000});
try{
  const result=execFileSync(executable,process.argv.includes('--geometry-only')?['--geometry-only']:[],
    {encoding:'utf8',timeout:10000}).trim();
  console.log(JSON.stringify({passed:true,result,scope:'Extracted production hxz_present_frame; mocked ANativeWindow boundary only'}));
}catch(error){
  process.stderr.write(error.stdout?.toString()||'');
  process.stderr.write(error.stderr?.toString()||'');
  process.exitCode=typeof error.status==='number'?error.status:1;
}

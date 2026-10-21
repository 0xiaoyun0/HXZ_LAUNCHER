import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [jvm,exec,installer]=await Promise.all([
  'mobile/runtime/native/hxz_jvm.cpp',
  'mobile/runtime/native/hxz_jvm_exec.cpp',
  'mobile/runtime/src/main/java/top/hxzmc/runtime/InstallerPlan.java',
].map(file=>fs.readFile(path.join(root,file),'utf8')));
assert.equal((jvm.match(/hxz_finish_java\s*\(/g)||[]).length,1);
assert.match(jvm,/env->CallStaticVoidMethod\(main,method,argv\);\s*bool failed=exception\(env\);\s*if\(failed\)return 75;[\s\S]*?\[HXZ-JVM\] main-complete[\s\S]*?return hxz_finish_java\(env,vm,installerProcess,j\.mainClass\);/,
  'Shutdown helper must be called only after main returns without a Java exception');
assert.match(exec,/if\(argc!=2&&argc!=5\)/);
assert.match(exec,/hxz_java\(job,argc==2\)/,'Only the installer process invocation enables explicit processor shutdown');
const processor=installer.slice(installer.indexOf('int exit=host.runJava(job,'),installer.indexOf('for(File output:processor.generatedFiles)'));
assert.match(processor,/int exit=host\.runJava\(job,cancel,progress\);cancel\.check\(\);\s*if\(exit!=0\)throw new IOException\(/,
  'A nonzero processor exit must still fail installation');
assert.match(processor,/for\(Map\.Entry<File,String> output:processor\.outputs\.entrySet\(\)\)\s*if\(!new RuntimeDownloads\.FileSpec\(output\.getKey\(\),"",output\.getValue\(\),-1\)\.valid\(\)\)throw new IOException\(/,
  'Successful processor exit must still be followed by output hash validation');

const zig=process.env.HXZ_TEST_ZIG||path.join(root,'.runtime/review084/native-host-tools/ziglang',process.platform==='win32'?'zig.exe':'zig');
const javaHome=process.env.HXZ_TEST_JAVA_HOME||process.env.JAVA_HOME||(process.platform==='win32'?'C:/Program Files/Java/jdk-21':null);
assert.ok(javaHome,'Set HXZ_TEST_JAVA_HOME to a JDK with JNI headers');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-jvm-shutdown-'));
try {
  const binary=path.join(output,process.platform==='win32'?'shutdown.exe':'shutdown');
  execFileSync(zig,['c++','-std=c++17','-Wall','-Wextra','-Werror','-O0',
    '-I',path.join(javaHome,'include'),'-I',path.join(javaHome,'include',process.platform==='win32'?'win32':process.platform==='darwin'?'darwin':'linux'),
    '-I',path.join(root,'mobile/runtime/native'),path.join(root,'mobile/runtime/test/hxz-jvm-shutdown084.cpp'),'-o',binary],
    {windowsHide:true,stdio:'pipe',timeout:120000});
  const result=execFileSync(binary,[],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000}).trim();
  assert.match(result,/PASS JVM shutdown 12 scenarios$/);
  console.log(JSON.stringify({result,integrationChecks:4,scope:'Production JNI shutdown helper with mocked JNI tables and narrow source wiring assertions. No real JVM or Android-device repair claim.'}));
} finally {
  await fs.rm(output,{recursive:true,force:true});
}

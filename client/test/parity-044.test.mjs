import test from 'node:test';
import assert from 'node:assert/strict';
import {systemArchitecture,javaPathArgument} from '../src-electron/core/platform.mjs';
import {allowed,inspectJava} from '../src-electron/core/minecraft.mjs';
test('32-bit launcher retains 64-bit OS and Java architecture',async()=>{
  assert.equal(systemArchitecture({PROCESSOR_ARCHITECTURE:'x86',PROCESSOR_ARCHITEW6432:'AMD64'},'ia32'),'x64');
  assert.equal(systemArchitecture({PROCESSOR_ARCHITECTURE:'x86'},'ia32'),'ia32');
  assert.equal(allowed([{action:'allow',os:{arch:'amd64'}}],{},'x64'),true);
  assert.equal(allowed([{action:'allow',os:{arch:'x86'}}],{},'x64'),false);
  assert.equal(allowed([{action:'allow',os:{arch:'x86'}}],{},'ia32'),true);
  const path='F:\\hxzmc\\versions\\你好-新蒸程-1.7.2 幻想镇版\\updater';const arg=javaPathArgument(path);assert.match(arg,/^[\x00-\x7f]+$/);assert.equal(Buffer.from(arg.slice(5),'base64').toString('utf8'),path);
  if(process.env.JAVA_HOME){const j=await inspectJava(process.env.JAVA_HOME+'/bin/java.exe');assert.ok(['x64','ia32','arm64'].includes(j.architecture));}
});

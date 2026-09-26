import test from 'node:test';
import assert from 'node:assert/strict';
import {javaRequirement,selectJavaCandidate} from '../src-electron/core/java-policy.mjs';
import {errorEvidence,crashHints} from '../src-electron/core/diagnostics.mjs';
test('metadata wins, modern release fallback never silently uses Java 8',()=>{
 for(const [id,major] of [['1.12.2',8],['1.17.1',16],['1.20.1',17],['1.20.5',21],['1.21.1',21],['26.2',25]])assert.equal(javaRequirement({id}).major,major);
 assert.equal(javaRequirement({id:'my custom pack',javaVersion:{majorVersion:25}}).major,25);
 assert.equal(javaRequirement({id:'custom',inheritsFrom:'26.2'}).major,25);
 assert.throws(()=>javaRequirement({id:'custom'}),/不会猜测/);
 const options=[{path:'oracle',version:'25.0.2',major:25,architecture:'x64'},{path:'temurin',version:'21.0.3',major:21,architecture:'x64'},{path:'old',version:'1.8.0',major:8,architecture:'ia32'}];
 assert.equal(selectJavaCandidate(options,javaRequirement({id:'26.2'}),'x64').path,'oracle');
 assert.equal(selectJavaCandidate(options,javaRequirement({},{tool:true}),'x64').path,'oracle');
 assert.equal(selectJavaCandidate(options,javaRequirement({id:'1.20.1'}),'x64'),undefined);
});
test('actual agent-path failure and native architecture error produce actionable evidence',()=>{
 const text='Error occurred during initialization of VM\nagent library failed Agent_OnLoad: instrument\nError opening zip file or JAR manifest missing : C:\\Users\\Administrator\\AppData\\Roaming\\??????\\runtime\\authlib-injector.jar';
 assert.match(errorEvidence(text),/Agent_OnLoad/);
 assert(crashHints(text,1).some(h=>h.includes('路径编码损坏')));
 assert(crashHints('[LWJGL] Platform/architecture mismatch detected for module: org.lwjgl',1).some(h=>h.includes('位数不一致')));
 assert(crashHints('java.net.UnknownHostException: test.invalid',1).some(h=>h.includes('不能证明服务器停服')));
});

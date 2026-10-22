import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-loader-issues-')),java='C:/Program Files/Java/jdk-21/bin/';
// Read-only local NeoForge loader, matching the user's 1.21.1 installation.
const libraries=process.env.HXZ_TEST_MC_LIBRARIES||'D:/PCL/.minecraft/libraries';
const jars=['net/neoforged/fancymodloader/loader/4.0.44/loader-4.0.44.jar','net/neoforged/bus/8.0.5/bus-8.0.5.jar','cpw/mods/modlauncher/11.0.5/modlauncher-11.0.5.jar','cpw/mods/securejarhandler/3.0.8/securejarhandler-3.0.8.jar','org/apache/logging/log4j/log4j-api/2.24.1/log4j-api-2.24.1.jar','org/apache/logging/log4j/log4j-core/2.24.1/log4j-core-2.24.1.jar'].map(p=>path.join(libraries,p));
jars.push(path.join(libraries,'com/mojang/logging/1.2.7/logging-1.2.7.jar'),path.join(libraries,'org/slf4j/slf4j-api/2.0.9/slf4j-api-2.0.9.jar'));
for(const jar of jars)await fs.access(jar);
await fs.writeFile(path.join(tmp,'LoaderTarget.java'),`import net.neoforged.fml.*;import java.nio.file.*;
public class LoaderTarget {
 public static void main(String[] args)throws Exception{
  ModLoader.addLoadingIssue(ModLoadingIssue.error("fml.modloadingissue.failedtoloadmod","fixture_client").withAffectedPath(Paths.get("mods/fixture-client.jar")).withCause(new IllegalStateException("fixture initialization failed",new UnsatisfiedLinkError("fixture-native-library.so"))));
  System.out.println("READY");System.out.flush();for(int i=0;i<280;i++){Thread.sleep(50);if(ModLoader.getLoadingErrors().size()!=1)throw new AssertionError("Diagnostics mutated loader errors");}
 }
}`);
const cp=[tmp,...jars].join(path.delimiter);
execFileSync(java+'javac.exe',['--release','8','-encoding','UTF-8','-d',tmp,'mobile/game-probe/src/top/hxzmc/diagnostics/GameProbe.java'],{stdio:'pipe'});
execFileSync(java+'javac.exe',['-encoding','UTF-8','-cp',cp,'-d',tmp,path.join(tmp,'LoaderTarget.java')],{stdio:'pipe'});
await fs.writeFile(path.join(tmp,'MANIFEST.MF'),'Premain-Class: top.hxzmc.diagnostics.GameProbe\n\n');
execFileSync(java+'jar.exe',['cfm',path.join(tmp,'probe.jar'),path.join(tmp,'MANIFEST.MF'),'-C',tmp,'top/hxzmc/diagnostics'],{stdio:'pipe'});
const child=spawn(java+'java.exe',['-Dfile.encoding=UTF-8','-Dhxz.diagnosticDir='+tmp,'-javaagent:'+path.join(tmp,'probe.jar'),'-cp',cp,'LoaderTarget'],{windowsHide:true,stdio:'pipe'});
let output='',errors='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>errors+=c);
try{
 for(let i=0;i<40&&!output.includes('READY');i++)await new Promise(r=>setTimeout(r,100));
 assert.ok(output.includes('READY'),errors||'Loader fixture not ready');
 for(const detailed of [false,true]){
  const nonce=detailed?'12345678-loader-details':'12345678-ordinary-request';await fs.writeFile(path.join(tmp,'thread-request'),nonce+(detailed?'\nloader-errors':''));let text='';
  for(let i=0;i<40;i++){try{text=await fs.readFile(path.join(tmp,'threads.txt'),'utf8');}catch{}if(text.startsWith(nonce+'\n'))break;await new Promise(r=>setTimeout(r,100));}
  assert.ok(text.startsWith(nonce+'\n'),'Agent response missing');
  if(detailed){for(const expected of ['模组加载错误','fixture_client','mods','fixture-client.jar','fixture initialization failed','fixture-native-library.so'])assert.ok(text.includes(expected),'Original NeoForge issue missing: '+expected);}
  else assert.ok(!text.includes('fixture-native-library.so'),'Ordinary diagnostics must not inspect loading issues');
  assert.equal(text.split(/JVM 线程快照 [12]/).length,3);assert.ok(Buffer.byteLength(text,'utf8')<140000);
 }
 await new Promise(r=>setTimeout(r,150));assert.equal(child.exitCode,null,errors||'Diagnostics altered loader state');
 console.log('PASS real NeoForge FML 4.0.44: opt-in original issue, mod argument, path and nested cause; no error clearing');
}finally{child.kill();}

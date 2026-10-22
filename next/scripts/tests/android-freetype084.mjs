import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const activity=await fs.readFile(path.join(root,'mobile/android/app/src/main/java/top/hxzmc/community/game/GameRuntimeActivity.java'),'utf8');
const start=activity.indexOf('            if(plan.mainClass.startsWith("org.quiltmc."))');
const end=activity.indexOf('            String jna=jna(plan);',start);
assert.ok(start>0&&end>start,'Exercise the real game native-library argument block');
const block=activity.slice(start,end),out=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-freetype-'));
await fs.writeFile(path.join(out,'FreeTypeArgumentsTest.java'),`import java.io.*;import java.util.*;
public class FreeTypeArgumentsTest {
 static class Host {File resource(String s){return new File("/fixture/app_runtime",s);}}
 static class Plan {String mainClass="net.neoforged.bootstraploader.ClientBootstrap";}
 static List<String> arguments(String lwjgl,boolean directRenderer){Host host=new Host();Plan plan=new Plan();File renderer=new File("/fixture/renderer.so");List<String> extra=new ArrayList<>();${block}return extra;}
 public static void main(String[] args){int checks=0;for(String version:Arrays.asList("3.3.3","3.4.1"))for(boolean direct:Arrays.asList(true,false)){
  List<String> arguments=arguments(version,direct);long count=arguments.stream().filter(a->a.startsWith("-Dorg.lwjgl.freetype.libname=")).count();
  String expected="-Dorg.lwjgl.freetype.libname="+new File("/fixture/app_runtime","lwjgl/3.4.1/libfreetype.so");
  if(count!=1||!arguments.contains(expected))throw new AssertionError("Complete standalone FreeType must be selected exactly once for LWJGL "+version+" direct="+direct+": "+arguments);checks++;
 }System.out.println("PASS game FreeType selection: "+checks+" version/renderer combinations (production launch block)");}
}`);
const java=process.env.HXZ_TEST_JAVA_HOME||'C:/Program Files/Java/jdk-21';
execFileSync(path.join(java,'bin/javac.exe'),['-encoding','UTF-8','--release','8','-d',out,path.join(out,'FreeTypeArgumentsTest.java')],{windowsHide:true,stdio:'pipe'});
console.log(execFileSync(path.join(java,'bin/java.exe'),['-cp',out,'FreeTypeArgumentsTest'],{windowsHide:true,encoding:'utf8',stdio:'pipe'}).trim());

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const folder=await fs.mkdtemp(path.resolve('.runtime/private-storage084-'));
const physical=path.join(folder,'physical-app'),alias=path.join(folder,'android-system-alias');
await fs.mkdir(physical);await fs.symlink(physical,alias,process.platform==='win32'?'junction':'dir');
const host=await fs.readFile('mobile/android/app/src/main/java/top/hxzmc/community/game/AndroidEngineHost.java','utf8');
const activity=await fs.readFile('mobile/android/app/src/main/java/top/hxzmc/community/game/GameRuntimeActivity.java','utf8');
assert.ok(host.includes('storage=AppPrivateStorage.resolve(context.getFilesDir())'));
assert.ok(activity.includes('root=RuntimeFiles.inside(host.storage,"minecraft/.minecraft")'));
const source=`package top.hxzmc.community.game;
import java.io.*;import java.nio.file.*;import top.hxzmc.runtime.RuntimeFiles;import org.json.*;
public class PrivateStorageHarness {
 static void check(boolean condition,String message){if(!condition)throw new AssertionError(message);}
 public static void main(String[] a)throws Exception{
  File supplied=new File(a[0]);File resolved=a[2].equals("baseline")?supplied:AppPrivateStorage.resolve(supplied);
  File physical=new File(a[1]).toPath().toRealPath().toFile();
  check(resolved.equals(physical),"game preparation received the unresolved Android system-directory alias");
  RuntimeFiles.noLinks(resolved);
  File game=RuntimeFiles.inside(resolved,"minecraft/.minecraft"),version=RuntimeFiles.inside(game,"versions/HXZ-mod-1");
  File log=RuntimeFiles.inside(resolved,"minecraft/logs/preparation-latest.json");
  RuntimeFiles.writeJson(log,new JSONObject().put("phase","preparation"));
  File marker=RuntimeFiles.inside(version,"retry.json");RuntimeFiles.writeJson(marker,new JSONObject().put("ready",true));
  check(RuntimeFiles.json(marker).getBoolean("ready"),"metadata cannot be reopened");
  check(RuntimeFiles.json(log).getString("phase").equals("preparation"),"log path failed");
  check(RuntimeFiles.hash(marker,"SHA-256").length()==64,"resource validation failed");
  check(marker.toPath().startsWith(physical.toPath()),"write escaped the actual app directory");
  try{RuntimeFiles.inside(game,"../outside");throw new AssertionError("parent traversal accepted");}catch(IOException expected){}
  File again=AppPrivateStorage.resolve(supplied);check(again.equals(resolved),"retry changed storage location");
  System.out.println("PASS system directory alias resolution, game/instance/log preparation, metadata retry and traversal rejection");
 }
}`;
const file=path.join(folder,'PrivateStorageHarness.java');await fs.writeFile(file,source);
const java='C:/Program Files/Java/jdk-21/bin',json=path.resolve('.runtime/review084/lobby/json.jar');
execFileSync(path.join(java,'javac.exe'),['-encoding','UTF-8','-cp',json,'-d',folder,'mobile/android/app/src/main/java/top/hxzmc/community/game/AppPrivateStorage.java','mobile/runtime/src/main/java/top/hxzmc/runtime/RuntimeFiles.java',file],{windowsHide:true,stdio:'pipe'});
const mode=process.argv.includes('--baseline')?'baseline':'fixed';
try{console.log(execFileSync(path.join(java,'java.exe'),['-cp',folder+path.delimiter+json,'top.hxzmc.community.game.PrivateStorageHarness',alias,physical,mode],{windowsHide:true,encoding:'utf8',stdio:'pipe'}));}
catch(e){console.error(e.stderr?.toString()||e.message);process.exitCode=1;}
console.log('Evidence: '+folder);

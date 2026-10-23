import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const activity=await fs.readFile(path.join(root,'mobile/android/app/src/main/java/top/hxzmc/community/game/GameRuntimeActivity.java'),'utf8');
assert.ok(activity.indexOf('new GameCrashDiagnostics(run)')<activity.indexOf('process=builder.start()'),'Report snapshot must precede this game process');
assert.ok(activity.includes('gameDiagnostic=scrub(crashCapture.collect(log))'),'All captured report and runtime evidence must use the existing credential scrubber');
const technical=activity.slice(activity.indexOf('private String technical('),activity.indexOf('private void failed('));
assert.ok(technical.indexOf('out.append(gameDiagnostic)')<technical.indexOf('out.append("客户端适配'),'Runtime cause must precede large compatibility inventory');
assert.ok(technical.includes('host!=null&&!gameStarted'),'A previous installer processor is not this game failure');
// Execute the production scrubber without Android UI dependencies, including every new evidence source.
const scrub=activity.slice(activity.indexOf('    private String scrub('),activity.indexOf('    private String brief('));
const output=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-crash-diagnostics-'));
await fs.writeFile(path.join(output,'ScrubProbe.java'),`import java.util.*; import java.io.*; import top.hxzmc.runtime.GameCrashDiagnostics;
public class ScrubProbe {
  Set<String> secrets=new HashSet<>(Arrays.asList("refreshed-test-credential"));
  JSONObject request=new JSONObject();
  String clientModDiagnostic="",gameDiagnostic="",rendererDiagnostic="",memoryDiagnostic=""; boolean gameStarted=true; File diagnosticLog; Host host=new Host();
  static class Host { String processorDiagnostic(){return "PREVIOUS_PROCESSOR_DO_NOT_BLAME";} }
  static class Build { static String MANUFACTURER="Fixture",MODEL="Phone"; static class VERSION {static String RELEASE="35";} }
  static class BuildConfig { static String VERSION_NAME="0.8.4";static int VERSION_CODE=80408; }
  static class JSONObject { JSONObject optJSONObject(String key){return this;} String optString(String key){return key.equals("accessToken")?"original-test-credential":"";} }
  ${scrub}
  ${technical.replaceAll('top.hxzmc.community.BuildConfig','BuildConfig')}
  public static void main(String[] args){
    String raw="Crash: original-test-credential refreshed-test-credential\\nCaused by: ROOT_CAUSE\\nhttps://example.invalid/path?signature=private-query\\naccessToken=labelled-test-token\\n\\\"clientToken\\\":\\\"json-test-token\\\"\\nCommand line: --accessToken command-test-token\\nAuthorization: Bearer unknown-bearer-token\\nAuthorization: Basic unknown-basic-token\\n\\\"authorization\\\":\\\"Bearer unknown-json-token\\\"\\n";
    String clean=new ScrubProbe().scrub(raw);
    for(String secret:new String[]{"original-test-credential","refreshed-test-credential","private-query","labelled-test-token","json-test-token","command-test-token","unknown-bearer-token","unknown-basic-token","unknown-json-token"})if(clean.contains(secret))throw new AssertionError("credential leaked");
    if(!clean.contains("ROOT_CAUSE"))throw new AssertionError("cause removed");
    System.out.println("PASS production scrubber 10 checks");
    ScrubProbe probe=new ScrubProbe();StringBuilder mods=new StringBuilder(),frames=new StringBuilder();
    for(int i=0;i<2000;i++)mods.append("ordinary mod list entry\\n");
    for(int i=0;i<400;i++)frames.append("\\tat example.Crash.method(File.java:1)\\n");
    probe.clientModDiagnostic=mods.toString();probe.gameDiagnostic=probe.scrub("本次游戏崩溃报告\\nROOT_CAUSE\\n"+frames+"GAME_LOG_TAIL\\n"+raw);
    Throwable failure=null;for(int i=0;i<8;i++)failure=new IOException(mods.toString(),failure);
    String copied=probe.technical(failure);
    if(!copied.contains("ROOT_CAUSE")||!copied.contains("GAME_LOG_TAIL"))throw new AssertionError("large metadata displaced crash evidence");
    if(copied.contains("PREVIOUS_PROCESSOR_DO_NOT_BLAME"))throw new AssertionError("previous processor mixed with game failure");
    if(copied.length()>24576)throw new AssertionError("diagnostic output unbounded");
    if(copied.contains("private-query")||copied.contains("original-test-credential"))throw new AssertionError("copied diagnostic leaked credentials");
    System.out.println("PASS production technical diagnostic 5 checks");
  }
}`);
const home=process.env.HXZ_TEST_JAVA_HOME||process.env.JAVA_HOME||(process.platform==='win32'?'C:/Program Files/Java/jdk-22':null);
const executable=name=>home?path.join(home,'bin',name+(process.platform==='win32'?'.exe':'')):name;
execFileSync(executable('javac'),['-encoding','UTF-8','--release','8','-d',output,
  path.join(root,'mobile/runtime/src/main/java/top/hxzmc/runtime/GameCrashDiagnostics.java'),
  path.join(root,'mobile/runtime/test/GameCrashDiagnosticsTest.java'),path.join(output,'ScrubProbe.java')],{windowsHide:true,stdio:'pipe',timeout:30000});
for(const test of ['GameCrashDiagnosticsTest','ScrubProbe'])console.log(execFileSync(executable('java'),['-Dfile.encoding=UTF-8','-cp',output,test],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000}).trim());
console.log('PASS 4 activity wiring checks; filesystem fixtures and actual production scrubber only, no device/game execution.');

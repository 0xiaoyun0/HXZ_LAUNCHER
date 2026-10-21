// Execute AppUpdater's real source selection and signed-candidate loop without Android I/O.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const source=await fs.readFile('mobile/android/app/src/main/java/top/hxzmc/community/AppUpdater.java','utf8');
const urls=source.match(/    static final String REPO=[\s\S]*?(?=    private final CommunityApp app;)/)?.[0];
const check=source.match(/    synchronized JSONObject check\(\)\{[\s\S]*?(?=    synchronized JSONObject download\(\))/)?.[0];
assert.ok(urls&&check,'AppUpdater update-check boundary changed');
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-app-updater084-'));
try{
  const java=`import java.io.*;import java.nio.charset.StandardCharsets;import java.util.*;import java.util.concurrent.*;
class BuildConfig {static String VERSION_NAME="0.8.4";static int VERSION_CODE=80400;}
class CommunityApp {static byte[] bounded(InputStream in,int max)throws IOException{byte[] result=in.readAllBytes();if(result.length>max)throw new IOException("oversize");return result;}static String reason(Exception error){return error.getMessage();}}
class JSONObject {final long code;JSONObject(long code){this.code=code;}long getLong(String key){return code;}}
class Prefs {final Map<String,Object> values=new HashMap<>();boolean getBoolean(String key,boolean fallback){return (boolean)values.getOrDefault(key,fallback);}String getString(String key,String fallback){return (String)values.getOrDefault(key,fallback);}Editor edit(){return new Editor(values);}static class Editor{final Map<String,Object> values;Editor(Map<String,Object> values){this.values=values;}Editor putLong(String key,long value){values.put(key,value);return this;}Editor putString(String key,String value){values.put(key,value);return this;}void apply(){}}}
class DummyFile {boolean isFile(){return false;}boolean delete(){return true;}}
class Request {final String url;Request(String url){this.url=url;}static class Builder{String url;Builder url(String value){url=value;return this;}Builder header(String a,String b){return this;}Request build(){return new Request(url);}}}
class Response implements AutoCloseable {final int status;final String raw;Response(int status,String raw){this.status=status;this.raw=raw;}boolean isSuccessful(){return status==200;}int code(){return status;}Body body(){return new Body(raw);}public void close(){}static class Body{final String raw;Body(String raw){this.raw=raw;}InputStream byteStream(){return new ByteArrayInputStream(raw.getBytes(StandardCharsets.UTF_8));}}}
class Call {final Request request;final Map<String,Response> replies;Call(Request request,Map<String,Response> replies){this.request=request;this.replies=replies;}Response execute(){return replies.getOrDefault(request.url.split("\\\\?",2)[0],new Response(404,""));}void cancel(){}}
class Http {final Map<String,Response> replies;Http(Map<String,Response> replies){this.replies=replies;}Builder newBuilder(){return new Builder(replies);}static class Builder{final Map<String,Response> replies;Builder(Map<String,Response> replies){this.replies=replies;}Builder connectTimeout(long n,TimeUnit unit){return this;}Builder callTimeout(long n,TimeUnit unit){return this;}Http build(){return new Http(replies);}}Call newCall(Request request){return new Call(request,replies);}}
public class AppUpdateCheck {
${urls}
  final Map<String,Response> replies=new ConcurrentHashMap<>();final Http http=new Http(replies);final Prefs prefs=new Prefs();final DummyFile apk=new DummyFile();
  AppUpdateCheck(){prefs.values.put("autoDownload",false);}
  final Executor worker=Runnable::run;final Set<Call> checks=ConcurrentHashMap.newKeySet();boolean working,cancelled;long lastAttempt;JSONObject info;String phase="idle",message="";
  JSONObject state(){return info;}void set(String phase,String message){this.phase=phase;this.message=message;}void ensureActive()throws IOException{if(cancelled)throw new IOException("cancelled");}void finish(){working=false;}
  JSONObject verifyManifest(String raw)throws Exception{if(!raw.startsWith("signed:"))throw new IOException("invalid signature");return new JSONObject(Long.parseLong(raw.substring(7)));}
  void validateApk(DummyFile apk,JSONObject candidate){}void downloadNow(JSONObject candidate){throw new AssertionError("autoDownload was disabled");}
${check}
  void put(String version,String prefix,int status,String raw){String url=version.equals("latest")?MANIFEST:REPO+"releases/download/v"+version+"/android-latest.json";replies.put(prefix+url,new Response(status,raw));}
  void expect(long code,String expectedPhase){check();if(info==null||info.code!=code||!phase.equals(expectedPhase))throw new AssertionError("got "+(info==null?"null":info.code)+"/"+phase+", wanted "+code+"/"+expectedPhase);}
  public static void main(String[] args){
    if(manifestUrls("0.8.4").length!=2||!manifestUrls("0.8.4")[0].contains("/v0.8.4/")||!manifestUrls("0.8.4")[1].equals(MANIFEST))throw new AssertionError("current prerelease source missing");
    if(manifestUrls("0.8.3")[0].contains("/v0.8.4/"))throw new AssertionError("stable build queried prerelease");
    AppUpdateCheck t=new AppUpdateCheck();t.prefs.values.put("autoDownload",false);t.put("0.8.4","",200,"signed:80401");t.put("latest","",200,"signed:80300");t.expect(80401,"available");
    t=new AppUpdateCheck();t.put("0.8.4","",200,"invalid:99999");t.put("0.8.4","https://ghfast.top/",200,"signed:80401");t.put("latest","",200,"signed:80300");t.expect(80401,"available");
    t=new AppUpdateCheck();t.put("0.8.4","",200,"signed:80401");t.put("latest","",200,"signed:80402");t.expect(80402,"available");
    t=new AppUpdateCheck();t.put("0.8.4","",200,"signed:80400");t.put("latest","",200,"signed:80300");t.expect(80400,"latest");
    BuildConfig.VERSION_NAME="0.8.3";BuildConfig.VERSION_CODE=80300;t=new AppUpdateCheck();t.put("0.8.3","",200,"signed:80300");t.put("latest","",200,"signed:80300");t.put("0.8.4","",200,"signed:80401");t.expect(80300,"latest");
    System.out.println("PASS current-version feed, signed maximum, invalid signature rejection, mirror fallback, no downgrade and stable-build isolation");
  }
}`;
  const file=path.join(folder,'AppUpdateCheck.java');await fs.writeFile(file,java);
  const bin=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin'):'C:/Program Files/Java/jdk-21/bin';
  execFileSync(path.join(bin,'javac.exe'),['-encoding','UTF-8','-d',folder,file],{windowsHide:true,stdio:'pipe'});
  console.log(execFileSync(path.join(bin,'java.exe'),['-cp',folder,'AppUpdateCheck'],{windowsHide:true,encoding:'utf8'}).trim());
}finally{
  const absolute=path.resolve(folder),prefix=path.resolve(os.tmpdir())+path.sep+'hxz-app-updater084-';
  assert.ok(absolute.startsWith(prefix));await fs.rm(folder,{recursive:true,force:true});
}

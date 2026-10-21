// Execute GameEngine's real manifest search with a pure Java HTTP/signature boundary.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const source=await fs.readFile('mobile/android/app/src/main/java/top/hxzmc/community/GameEngine.java','utf8');
const helpers=source.match(/    private static String moduleNode\([\s\S]*?(?=    private JSONObject check\(\))/)?.[0];
const method=source.match(/    private JSONObject check\(\)throws Exception\{[\s\S]*?(?=    private boolean gameProcessRunning\(\))/)?.[0];
assert.ok(helpers&&method,'GameEngine manifest search boundary changed');
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-manifest084-'));
try{
  const java=`import java.io.*;import java.net.*;import java.nio.charset.StandardCharsets;import java.util.*;import java.util.concurrent.*;
class BuildConfig {static final String VERSION_NAME="0.8.4";}
class AppUpdater {static final String REPO="https://github.com/0xiaoyun0/HXZ_LAUNCHER/";}
class CommunityApp {static byte[] bounded(InputStream in,int max)throws IOException{byte[] out=in.readAllBytes();if(out.length>max)throw new IOException("oversize");return out;}}
class JSONObject {final String id;JSONObject(String id){this.id=id;}}
class Request {final String url;Request(String url){this.url=url;}static class Builder{String url;Builder url(String value){url=value;return this;}Builder header(String a,String b){return this;}Request build(){return new Request(url);}}}
class Response implements AutoCloseable {final int status;final String raw;Response(int status,String raw){this.status=status;this.raw=raw;}boolean isSuccessful(){return status==200;}int code(){return status;}Body body(){return new Body(raw);}public void close(){}static class Body{final String raw;Body(String raw){this.raw=raw;}InputStream byteStream(){return new ByteArrayInputStream(raw.getBytes(StandardCharsets.UTF_8));}}}
class Call {final Request request;final Map<String,Response> replies;Call(Request request,Map<String,Response> replies){this.request=request;this.replies=replies;}Response execute(){return replies.getOrDefault(request.url,new Response(404,""));}}
class Http {final Map<String,Response> replies;Http(Map<String,Response> replies){this.replies=replies;}Builder newBuilder(){return new Builder(replies);}Call newCall(Request request){return new Call(request,replies);}static class Builder{final Map<String,Response> replies;Builder(Map<String,Response> replies){this.replies=replies;}Builder callTimeout(long n,TimeUnit unit){return this;}Http build(){return new Http(replies);}}}
public class GameManifestCheck {
  final Map<String,Response> replies=new HashMap<>();final Http http=new Http(replies);Call transfer;boolean cancelled;String checkedEnvelope="";
  JSONObject active(){return null;}List<String> sources(){return Arrays.asList("","https://mirror.invalid/");}
  JSONObject verify(String raw)throws Exception{if(raw.equals("bad-signature"))throw new IOException("运行模块签名不匹配");if(raw.equals("incompatible"))throw new IOException("运行模块与当前社区版本不兼容，请先更新社区应用");if(raw.startsWith("good:"))return new JSONObject(raw.substring(5));throw new IOException("bad format");}
${helpers}
${method}
  void put(String path,String prefix,int status,String raw){replies.put(prefix+AppUpdater.REPO+path,new Response(status,raw));}
  void expectError(String text)throws Exception{try{check();throw new AssertionError("Expected failure");}catch(IOException e){if(!e.getMessage().contains(text))throw new AssertionError(e.getMessage());}}
  public static void main(String[] args)throws Exception{
    String fixed="releases/download/v0.8.4/game-runtime-latest.json",latest="releases/latest/download/game-runtime-latest.json";
    GameManifestCheck t=new GameManifestCheck();t.put(fixed,"",200,"bad-signature");t.put(fixed,"https://mirror.invalid/",200,"good:mirror");
    if(!t.check().id.equals("mirror"))throw new AssertionError("valid mirror was skipped after official signature failure");
    t=new GameManifestCheck();t.put(fixed,"",200,"bad-signature");t.expectError("固定版 0.8.4 清单校验失败（GitHub 官方：签名不匹配）");
    t=new GameManifestCheck();t.put(fixed,"",200,"incompatible");t.put(latest,"",200,"good:latest");
    if(!t.check().id.equals("latest"))throw new AssertionError("valid latest was skipped");
    t=new GameManifestCheck();t.expectError("固定版 0.8.4：GitHub 官方：HTTP 404；最新版：GitHub 官方：HTTP 404");
    t=new GameManifestCheck();t.put(fixed,"",200,"good:official");t.put(fixed,"https://mirror.invalid/",200,"good:mirror");
    if(!t.check().id.equals("official"))throw new AssertionError("official fixed version lost priority");
    System.out.println("PASS official signature failure falls through to mirror, terminal signature diagnosis, latest fallback, retryable 404 and official priority");
  }
}`;
  const file=path.join(folder,'GameManifestCheck.java');await fs.writeFile(file,java);
  const bin=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin'):'C:/Program Files/Java/jdk-21/bin';
  execFileSync(path.join(bin,'javac.exe'),['-encoding','UTF-8','-d',folder,file],{windowsHide:true,stdio:'pipe'});
  console.log(execFileSync(path.join(bin,'java.exe'),['-cp',folder,'GameManifestCheck'],{windowsHide:true,encoding:'utf8'}).trim());
}finally{
  const absolute=path.resolve(folder),prefix=path.resolve(os.tmpdir())+path.sep+'hxz-manifest084-';
  assert.ok(absolute.startsWith(prefix));await fs.rm(folder,{recursive:true,force:true});
}

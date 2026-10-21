import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=await fs.readFile(path.join(root,'mobile/android/app/src/main/java/top/hxzmc/community/CommunityApp.java'),'utf8');
const provider=await fs.readFile(path.join(root,'mobile/android/app/src/main/java/top/hxzmc/community/GameAccountProvider.java'),'utf8');
const activity=await fs.readFile(path.join(root,'mobile/android/app/src/main/java/top/hxzmc/community/game/GameRuntimeActivity.java'),'utf8');
assert.ok(provider.includes('Binder.getCallingUid()!=android.os.Process.myUid()'),'Account bridge remains private to this app UID');
assert.ok(provider.includes('app.gameLaunchCredentials(')&&activity.includes('bridge(validate?"launchAccount":"selectedAccount",query)'),'Game validation uses a separate provider operation');
assert.ok(activity.includes('private JSONObject account()throws Exception{return account(false);}'),'Settings account reads retain snapshot semantics');
assert.equal((activity.match(/account\(true\)/g)||[]).length,2,'Only preparation and final token refresh perform network validation');
const methods=source.slice(source.indexOf('    JSONObject gameCredentials()'),source.indexOf('    synchronized void saveCredentials('));
const hasLaunch=methods.includes('gameLaunchCredentials(');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-launch-auth-'));
await fs.writeFile(path.join(output,'LaunchAuthProbe.java'),`import java.io.*;import java.util.*;import java.util.concurrent.*;import org.json.*;
public class LaunchAuthProbe {
  static final String SKIN="https://skin.hxzmc.top/api/yggdrasil";
  final Object authLock=new Object(); JSONObject credentials=account("old-fixture-token","player-one");int calls,saves;
  final Queue<Object> responses=new ArrayDeque<>(); final List<String> urls=new ArrayList<>();
  CountDownLatch entered,release;
  static class HttpFailure extends IOException {final int status;HttpFailure(int status){this.status=status;}}
  static JSONObject obj(Object... values)throws Exception{JSONObject out=new JSONObject();for(int i=0;i<values.length;i+=2)out.put((String)values[i],values[i+1]);return out;}
  static JSONObject account(String token,String id){try{return obj("accessToken",token,"clientToken","fixture-client","selectedProfile",obj("id",id,"name","Fixture"));}catch(Exception e){throw new RuntimeException(e);}}
  Object request(String url,String method,JSONObject body,String bearer)throws Exception {
    calls++;urls.add(url);check(method.equals("POST")&&bearer.isEmpty(),"Authentication uses POST without community bearer");
    if(entered!=null){entered.countDown();if(!release.await(3,TimeUnit.SECONDS))throw new IOException("fixture timeout");}
    Object next=responses.remove();if(next instanceof Exception)throw (Exception)next;return next;
  }
  void saveCredentials(JSONObject next)throws Exception{saves++;credentials=new JSONObject(next.toString());}
  ${methods}
  JSONObject launch(String expected)throws Exception{return ${hasLaunch?'gameLaunchCredentials(expected)':'gameCredentials()'};}
  static void check(boolean pass,String message){if(!pass)throw new AssertionError(message);}
  static int checks;
  static void fails(LaunchAuthProbe app,String expected)throws Exception{try{app.launch(expected);throw new AssertionError("Invalid launch account accepted");}catch(IOException correct){checks++;}}
  public static void main(String[] args)throws Exception {
    LaunchAuthProbe valid=new LaunchAuthProbe();valid.responses.add(new JSONObject().put("ok",true));JSONObject copy=valid.launch("player-one");
    check(valid.calls==1&&valid.saves==0,"A game launch must validate the cached skin-site token");checks++;
    copy.put("accessToken","changed-copy");check(valid.credentials.getString("accessToken").equals("old-fixture-token"),"Caller cannot mutate cached credentials");checks++;
    LaunchAuthProbe expired=new LaunchAuthProbe();expired.responses.add(new HttpFailure(403));expired.responses.add(account("new-fixture-token","player-one"));JSONObject renewed=expired.launch("player-one");
    check(expired.calls==2&&expired.saves==1&&renewed.getString("accessToken").equals("new-fixture-token"),"Expired token refreshed and persisted once");checks++;
    check(expired.urls.equals(Arrays.asList(SKIN+"/authserver/validate",SKIN+"/authserver/refresh")),"Credentials are sent only to the fixed skin-site origin");checks++;
    LaunchAuthProbe offline=new LaunchAuthProbe();offline.responses.add(new IOException("offline"));fails(offline,"player-one");check(offline.calls==1&&offline.saves==0&&offline.credentials.getString("accessToken").equals("old-fixture-token"),"Network failure preserves credentials without refresh");checks++;
    LaunchAuthProbe unavailable=new LaunchAuthProbe();unavailable.responses.add(new HttpFailure(500));fails(unavailable,"player-one");check(unavailable.calls==1&&unavailable.saves==0,"Server failure does not masquerade as invalid credentials");checks++;
    LaunchAuthProbe mismatch=new LaunchAuthProbe();fails(mismatch,"other-player");check(mismatch.calls==0,"Switched role rejected before network");checks++;
    LaunchAuthProbe replaced=new LaunchAuthProbe();replaced.responses.add(new HttpFailure(403));replaced.responses.add(account("wrong-fixture-token","other-player"));fails(replaced,"player-one");check(replaced.saves==0,"Refresh cannot silently change selected role");checks++;
    LaunchAuthProbe invalidClient=new LaunchAuthProbe();invalidClient.responses.add(new HttpFailure(403));invalidClient.responses.add(account("new-fixture-token","player-one").put("clientToken","different-client"));fails(invalidClient,"player-one");check(invalidClient.saves==0,"Refresh cannot silently change client identity");checks++;
    LaunchAuthProbe rejected=new LaunchAuthProbe();rejected.responses.add(new HttpFailure(403));rejected.responses.add(new HttpFailure(403));fails(rejected,"player-one");check(rejected.saves==0&&rejected.credentials.has("accessToken"),"Rejected refresh stops launch while preserving stored credentials");checks++;
    LaunchAuthProbe malformed=new LaunchAuthProbe();malformed.responses.add(new HttpFailure(403));malformed.responses.add("malformed response");fails(malformed,"player-one");
    LaunchAuthProbe empty=new LaunchAuthProbe();empty.credentials=new JSONObject();fails(empty,"");check(empty.calls==0,"No token sends no auth request");checks++;
    LaunchAuthProbe concurrent=new LaunchAuthProbe();concurrent.responses.add(new HttpFailure(403));concurrent.responses.add(account("renewed-fixture-token","player-one"));concurrent.entered=new CountDownLatch(1);concurrent.release=new CountDownLatch(1);
    ExecutorService workers=Executors.newFixedThreadPool(2);try{
      Future<?> launch=workers.submit(()->{try{concurrent.launch("player-one");}catch(Exception e){throw new RuntimeException(e);}});
      check(concurrent.entered.await(3,TimeUnit.SECONDS),"Auth request entered");
      Future<?> logout=workers.submit(()->{synchronized(concurrent.authLock){concurrent.credentials=new JSONObject();}});
      concurrent.release.countDown();launch.get(3,TimeUnit.SECONDS);logout.get(3,TimeUnit.SECONDS);check(!concurrent.credentials.has("accessToken"),"Concurrent logout cannot be undone by a late refresh");checks++;
    }finally{workers.shutdownNow();}
    System.out.println("PASS launch account "+checks+" checks (production auth method, simulated transport; no live credentials/network)");
  }
}`);
const home=process.env.HXZ_TEST_JAVA_HOME||'C:/Program Files/Java/jdk-21';
const exe=name=>path.join(home,'bin',name+(process.platform==='win32'?'.exe':''));
const json=path.join(root,'.runtime/review084/lobby/json.jar');
execFileSync(exe('javac'),['-encoding','UTF-8','--release','8','-cp',json,'-d',output,path.join(output,'LaunchAuthProbe.java')],{windowsHide:true,stdio:'pipe',timeout:30000});
console.log(execFileSync(exe('java'),['-Dfile.encoding=UTF-8','-cp',output+path.delimiter+json,'LaunchAuthProbe'],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000}).trim());

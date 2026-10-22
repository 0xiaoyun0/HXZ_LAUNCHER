import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
const root=process.cwd(),tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-network-'));
const java='C:/Program Files/Java/jdk-21/bin/',json=path.join(root,'.runtime/review084/lobby/json.jar');
const app=await fs.readFile('mobile/android/app/src/main/java/top/hxzmc/community/CommunityApp.java','utf8');
const begin=app.slice(app.indexOf('    JSONObject beginGameSession('),app.indexOf('    private void persistGameSessionLease('));
const session=app.slice(app.indexOf('    String session()'),app.indexOf('    Object api('));
await fs.mkdir(path.join(tmp,'android/os'),{recursive:true});
await fs.writeFile(path.join(tmp,'android/os/SystemClock.java'),'package android.os;public class SystemClock {public static long now=1000;public static long elapsedRealtime(){return now;}}');
await fs.writeFile(path.join(tmp,'NetworkProbe.java'),`import java.util.*;import java.io.*;import org.json.*;import top.hxzmc.runtime.*;
public class NetworkProbe {
 final Object authLock=new Object();final GameSessionLease gameSessionLease=new GameSessionLease();JSONObject credentials=new JSONObject(),user;String token="",base="https://community.example";long expires;int refreshes,validations;
 static JSONObject obj(Object... a)throws Exception{JSONObject out=new JSONObject();for(int i=0;i<a.length;i+=2)out.put((String)a[i],a[i+1]);return out;}
 Object request(String url,String method,JSONObject body,String auth)throws Exception{refreshes++;return obj("credentials",obj("accessToken","rotated-"+refreshes,"clientToken","fixture-client","selectedProfile",obj("id","player")),"token","bearer","user",obj("id","player"));}
 void saveCredentials(JSONObject next){credentials=next;}
 void persistGameSessionLease(){}
 JSONObject gameLaunchCredentials(String uuid)throws Exception{validations++;return new JSONObject(credentials.toString());}
 ${begin}
 ${session}
 static void check(boolean ok,String text){if(!ok)throw new AssertionError(text);}
 public static void main(String[] args)throws Exception{
  String dns=GameDnsConfiguration.render(Arrays.asList("192.168.1.1","192.168.1.1","2001:db8::1","1.1.1.1\\nnameserver attacker","256.1.1.1",null),true);
  check(dns.equals("nameserver 192.168.1.1\\nnameserver 223.5.5.5\\nnameserver 119.29.29.29\\n"),"ordered, deduplicated, literal DNS config");
  check(GameDnsConfiguration.render(Collections.emptyList(),false).contains("nameserver 1.1.1.1"),"fallback config");
  GameSessionLease lease=new GameSessionLease();String id="12345678-1234-1234";lease.begin(id,100);check(lease.active(89999),"lease active");check(!lease.pulse("wrong",200),"wrong heartbeat rejected");check(lease.pulse(id,89000),"heartbeat extends lease");lease.end("wrong");check(lease.active(90001),"wrong close rejected");lease.end(id);check(!lease.active(90001),"matching close releases");lease.begin(id,100);check(!lease.active(90100),"dead game cannot pin forever");
  NetworkProbe app=new NetworkProbe();app.credentials=obj("accessToken","old","clientToken","fixture-client","selectedProfile",obj("id","player"));
  JSONObject game=app.beginGameSession("player",id);check(game.getString("accessToken").equals("rotated-1")&&app.refreshes==1&&app.validations==1,"community refresh must precede final game validation");
  app.expires=0;try{app.session();throw new AssertionError("running token rotated");}catch(IOException expected){}check(app.refreshes==1,"running game token stays valid");
  app.endGameSessionLease("wrong");try{app.session();throw new AssertionError("wrong close released lease");}catch(IOException expected){}
  app.endGameSessionLease(id);app.session();check(app.refreshes==2,"community refresh resumes after game exit");
  lease.restore(id,50000,1000);check(lease.active(49999),"process restart retains active lease");lease.restore(id,200000,1000);check(!lease.active(1000),"stale lease after reboot ignored");
  System.out.println("PASS DNS configuration, active game token race, lease expiry and ownership (production methods, simulated network)");
 }
}`);
execFileSync(java+'javac.exe',['--release','8','-encoding','UTF-8','-cp',json,'-d',tmp,path.join(tmp,'NetworkProbe.java'),path.join(tmp,'android/os/SystemClock.java'), 'mobile/runtime/src/main/java/top/hxzmc/runtime/GameDnsConfiguration.java','mobile/runtime/src/main/java/top/hxzmc/runtime/GameSessionLease.java'],{stdio:'pipe'});
console.log(execFileSync(java+'java.exe',['-cp',tmp+path.delimiter+json,'NetworkProbe'],{encoding:'utf8',stdio:'pipe'}).trim());
await fs.writeFile(path.join(tmp,'ProbeTarget.java'),`import java.util.concurrent.CountDownLatch;
public class ProbeTarget {
 static void deepSleep(int n)throws Exception{if(n==0)Thread.sleep(20000);else deepSleep(n-1);}
 public static void main(String[] args)throws Exception{
  Thread.currentThread().setName("SampleModLoader");
  for(int i=0;i<160;i++){Thread t=new Thread(()->{try{deepSleep(36);}catch(Exception ignored){}},String.format("AAA idle worker %03d",i));t.setDaemon(true);t.start();}
  Object left=new Object(),right=new Object();CountDownLatch ready=new CountDownLatch(2);
  Thread render=new Thread(()->{synchronized(left){ready.countDown();try{ready.await();}catch(Exception e){}synchronized(right){}}},"Render thread");
  Thread loader=new Thread(()->{synchronized(right){ready.countDown();try{ready.await();}catch(Exception e){}synchronized(left){}}},"Mod loading worker");
  render.setDaemon(true);loader.setDaemon(true);render.start();loader.start();
  ready.await();Thread.sleep(200);System.out.println("READY");System.out.flush();Thread.sleep(20000);
 }
}`);
execFileSync(java+'javac.exe',['--release','8','-encoding','UTF-8','-d',tmp,'mobile/game-probe/src/top/hxzmc/diagnostics/GameProbe.java',path.join(tmp,'ProbeTarget.java')],{stdio:'pipe'});
await fs.writeFile(path.join(tmp,'MANIFEST.MF'),'Premain-Class: top.hxzmc.diagnostics.GameProbe\n\n');
execFileSync(java+'jar.exe',['cfm',path.join(tmp,'probe.jar'),path.join(tmp,'MANIFEST.MF'),'-C',tmp,'top/hxzmc/diagnostics'],{stdio:'pipe'});
const child=spawn(java+'java.exe',['-Dhxz.diagnosticDir='+tmp,'-javaagent:'+path.join(tmp,'probe.jar'),'-cp',tmp,'ProbeTarget'],{windowsHide:true,stdio:'pipe'});
let errors='',ready='';child.stderr.on('data',chunk=>errors+=chunk);child.stdout.on('data',chunk=>ready+=chunk);
try{
 for(let i=0;i<50&&!ready.includes('READY');i++)await new Promise(r=>setTimeout(r,100));
 assert.ok(ready.includes('READY'),errors||'Thread fixture not ready');
 const nonce='12345678-test-request';await fs.writeFile(path.join(tmp,'thread-request'),nonce);let snapshot='';
 for(let i=0;i<45;i++){try{snapshot=await fs.readFile(path.join(tmp,'threads.txt'),'utf8');}catch{}if(snapshot.startsWith(nonce+'\n'))break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(snapshot.startsWith(nonce+'\n'),errors||'JVM snapshot response missing');
 const samples=snapshot.split(/JVM 线程快照 [12]/).slice(1);assert.equal(samples.length,2);
 for(const sample of samples){
  for(const name of ['Render thread','Mod loading worker','SampleModLoader'])assert.ok(sample.includes('"'+name+'"'),'Key thread missing from an independent snapshot: '+name);
  assert.ok(sample.includes('锁持有者'),'Lock owner is missing');assert.ok(sample.includes('Java 锁循环'),'Actual JVM lock-cycle evidence is missing');
 }
 assert.ok(snapshot.includes('ProbeTarget.main'));assert.ok(Buffer.byteLength(snapshot,'utf8')<125000,'Snapshot response exceeds the Android reader byte budget');
 console.log('PASS actual HotSpot: 160 idle workers cannot displace key threads in either sample; lock owners, detected lock cycle and UTF-8 byte budget');
}finally{child.kill();}

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-recovery-'));
const java='C:/Program Files/Java/jdk-21/bin/', json=path.resolve('.runtime/review084/lobby/json.jar');
const app=await fs.readFile('mobile/android/app/src/main/java/top/hxzmc/community/CommunityApp.java','utf8');
const between=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end));
const session=between('    String session()','    Object api(');
const begin=between('    JSONObject beginGameSession(','    /** Only our game Activity');
const helpers=between('    private boolean reconcileGameSession()','    private void persistGameSessionLease(');
const cache=between('    private void restoreCommunitySession()','    Object login(');
const owner=between('    private Boolean gameOwnerAlive()','    private boolean reconcileGameSession()');
const monitor=between('    private final Runnable gameRecovery =','    private final Runnable heartbeat');
await fs.mkdir(path.join(tmp,'android/os'),{recursive:true});
await fs.writeFile(path.join(tmp,'android/os/SystemClock.java'),'package android.os;public class SystemClock {public static long now=1000;public static long elapsedRealtime(){return now;}}');
await fs.writeFile(path.join(tmp,'android/os/Binder.java'),'package android.os;public class Binder {public static int getCallingPid(){return 200;}}');
await fs.writeFile(path.join(tmp,'android/os/Process.java'),'package android.os;public class Process {public static int myUid(){return 100;}public static int myPid(){return 10;}}');
await fs.mkdir(path.join(tmp,'android/app'),{recursive:true});
await fs.writeFile(path.join(tmp,'android/app/ActivityManager.java'),`package android.app;import java.util.*;public class ActivityManager {public List<RunningAppProcessInfo> processes=new ArrayList<>();public List<RunningAppProcessInfo> getRunningAppProcesses(){return processes;}public static class RunningAppProcessInfo {public int uid,pid;public String processName;public RunningAppProcessInfo(int uid,int pid,String name){this.uid=uid;this.pid=pid;this.processName=name;}}}`);
await fs.writeFile(path.join(tmp,'OwnerProbe.java'),`import android.app.ActivityManager;import java.util.*;public class OwnerProbe {
 static final String ACTIVITY_SERVICE="activity";final ActivityManager manager=new ActivityManager();int gameSessionOwnerPid=20;
 Object getSystemService(String name){return manager;}String getPackageName(){return "top.hxzmc.community";}
 ${owner}
 void add(int uid,int pid,String name){manager.processes.add(new ActivityManager.RunningAppProcessInfo(uid,pid,name));}
 static void check(boolean ok,String reason){if(!ok)throw new AssertionError(reason);}
 public static void main(String[] args){
  OwnerProbe p=new OwnerProbe();p.add(100,10,"top.hxzmc.community");check(Boolean.FALSE.equals(p.gameOwnerAlive()),"Cleared game detected");
  p.add(100,21,"top.hxzmc.community:game");check(Boolean.FALSE.equals(p.gameOwnerAlive()),"A replacement game process cannot inherit old owner protection");
  p.add(100,20,"top.hxzmc.community:game");check(Boolean.TRUE.equals(p.gameOwnerAlive()),"Exact owner detected");
  p.manager.processes.remove(2);p.add(999,20,"top.hxzmc.community:game");check(Boolean.FALSE.equals(p.gameOwnerAlive()),"Other UID is not our owner");
  p.manager.processes.remove(1);p.add(100,20,"top.hxzmc.community:jvm");check(Boolean.FALSE.equals(p.gameOwnerAlive()),"Orphan JVM cannot pin community auth");
  p.manager.processes=null;check(p.gameOwnerAlive()==null,"Unavailable OS query is unknown, not dead");
  p.manager.processes=new ArrayList<>();check(p.gameOwnerAlive()==null,"Restricted process inventory is unknown");
  System.out.println("PASS 7 production process ownership checks");
 }
}`);
await fs.writeFile(path.join(tmp,'MonitorProbe.java'),`import java.util.concurrent.*;import top.hxzmc.runtime.GameSessionLease;public class MonitorProbe {
 final Object authLock=new Object();final ExecutorService jobs=Executors.newSingleThreadExecutor();final GameSessionLease gameSessionLease=new GameSessionLease();final Handler main=new Handler();
 static class Handler{void postDelayed(Runnable r,long delay){}}
 boolean reconcileGameSession(){return false;}void resumeCommunityAfterGame(){}
 ${monitor}
 public static void main(String[] args)throws Exception{MonitorProbe p=new MonitorProbe();ExecutorService ui=Executors.newSingleThreadExecutor();try{
  synchronized(p.authLock){ui.submit(p.gameRecovery).get(500,TimeUnit.MILLISECONDS);}
  System.out.println("PASS game recovery timer never waits for network authentication lock on UI thread");
 }finally{ui.shutdownNow();p.jobs.shutdownNow();}}
}`);
await fs.writeFile(path.join(tmp,'RecoveryProbe.java'),`import java.io.*;import java.util.*;import org.json.*;import top.hxzmc.runtime.*;
public class RecoveryProbe {
 final Object authLock=new Object();final GameSessionLease gameSessionLease=new GameSessionLease();
 JSONObject credentials,user=new JSONObject();String token="",base="https://community.example";long expires;int refreshes,retries,connects,persisted,gameSessionOwnerPid;Boolean ownerAlive=false;
 final Vault communityVault=new Vault();final Handler main=new Handler();final Runnable retry=()->{},gameRecovery=()->{};
 static class Handler {final List<Runnable> pending=new ArrayList<>();void post(Runnable r){pending.add(r);}void postDelayed(Runnable r,long delay){}void removeCallbacks(Runnable r){}void drain(){List<Runnable> copy=new ArrayList<>(pending);pending.clear();for(Runnable r:copy)r.run();}}
 static class Vault {JSONObject saved=new JSONObject();boolean broken;JSONObject read()throws Exception{if(broken)throw new IOException("corrupt fixture");return new JSONObject(saved.toString());}void write(JSONObject data)throws Exception{saved=new JSONObject(data.toString());}void clear(){saved=new JSONObject();}}
 RecoveryProbe()throws Exception{credentials=obj("accessToken","skin-fixture","clientToken","client","selectedProfile",obj("id","player"));}
 static JSONObject obj(Object... a)throws Exception{JSONObject o=new JSONObject();for(int i=0;i<a.length;i+=2)o.put((String)a[i],a[i+1]);return o;}
 Object request(String a,String b,JSONObject c,String d)throws Exception{refreshes++;return obj("credentials",credentials,"token","new-bearer","user",obj("id","player"));}
 void saveCredentials(JSONObject value){credentials=value;}
 void persistGameSessionLease(){persisted++;}
 Boolean gameOwnerAlive(){return ownerAlive;}
 JSONObject gameLaunchCredentials(String id){return credentials;}
 void connect(){connects++;}
 ${begin}
 ${helpers}
 ${cache}
 ${session}
 static int checks;static void check(boolean condition,String reason){checks++;if(!condition)throw new AssertionError(reason);}
 static RecoveryProbe running()throws Exception{RecoveryProbe app=new RecoveryProbe();app.ownerAlive=true;app.gameSessionLease.restore("12345678-1234-1234",50000,1000);return app;}
 static void blocked(RecoveryProbe app)throws Exception{try{app.session();throw new AssertionError("Live game skin token was rotated");}catch(IOException expected){}check(app.refreshes==0,"No auth refresh during live game");}
 public static void main(String[] args)throws Exception{
  String id="12345678-1234-1234";
  RecoveryProbe app=running();app.ownerAlive=false;
  check(app.session().equals("new-bearer")&&app.refreshes==1,"Cleared game must reconnect immediately, without waiting 90 seconds");
  check(app.gameSessionLease.id().isEmpty()&&app.persisted>0,"Dead lease removed from persistent state");
  app=running();blocked(app);app.endGameSessionLease("wrong");blocked(app);
  check(app.main.pending.isEmpty(),"Stale close cannot reconnect or release another game");
  app.retries=7;app.endGameSessionLease(id);app.main.drain();
  check(app.connects==1&&app.retries==0,"Matching exit reconnects immediately, clears old retry backoff");
  check(app.session().equals("new-bearer"),"Refresh resumes after real exit");
  app=running();app.expires=System.currentTimeMillis()+300000;app.token="cached-bearer";app.user=obj("id","player");app.persistCommunitySession();
  JSONObject saved=app.communityVault.read();app.token="";app.expires=0;app.restoreCommunitySession();
  check(app.session().equals("cached-bearer")&&app.refreshes==0,"Community process restart reuses encrypted bearer without rotating live game skin credentials");
  check(app.user.getString("id").equals("player"),"Restored user state");
  for(String field:Arrays.asList("base","profile","client")){
   app.communityVault.write(saved);app.communityVault.saved.put(field,"other");app.token="";app.restoreCommunitySession();
   check(app.token.isEmpty()&&app.communityVault.saved.length()==0,"Cache must bind to "+field);
  }
  app.communityVault.write(saved);app.communityVault.saved.put("expires",System.currentTimeMillis()-1);app.token="";app.restoreCommunitySession();check(app.token.isEmpty(),"Expired cache ignored");
  app.communityVault.write(saved);app.clearCommunitySession();check(app.token.isEmpty()&&app.communityVault.saved.length()==0,"Revoked cache cannot return after restart");
  app.communityVault.broken=true;app.restoreCommunitySession();check(app.communityVault.saved.length()==0,"Corrupt encrypted cache removed");
  GameSessionLease lease=new GameSessionLease();lease.restore(id,50000,1000,false);check(lease.id().isEmpty(),"Dead owner cleared at startup");
  lease.restore(id,100,1000,true);check(lease.active(1001),"Live owner survives overdue heartbeat");
  check(!lease.reconcile(null,2000)&&lease.active(2000),"Unknown OS process query preserves bounded protection");
  check(lease.reconcile(null,92000)&&lease.id().isEmpty(),"Unknown state cannot pin authentication indefinitely");
  lease.restore(id,50000,1000,null);check(!lease.reconcile(true,51000)&&lease.active(51000),"Known live game extends protection past heartbeat deadline");
  check(lease.reconcile(false,52000),"Confirmed owner death immediately releases");
  System.out.println("PASS "+checks+" game recovery checks using production authentication, lease, encrypted-cache lifecycle and reconnect methods");
 }
}`);
try{
 execFileSync(java+'javac.exe',['--release','8','-encoding','UTF-8','-cp',json,'-d',tmp,path.join(tmp,'RecoveryProbe.java'),path.join(tmp,'OwnerProbe.java'),path.join(tmp,'MonitorProbe.java'),path.join(tmp,'android/app/ActivityManager.java'),path.join(tmp,'android/os/Process.java'),path.join(tmp,'android/os/SystemClock.java'),path.join(tmp,'android/os/Binder.java'),'mobile/runtime/src/main/java/top/hxzmc/runtime/GameSessionLease.java'],{stdio:'pipe'});
 console.log(execFileSync(java+'java.exe',['-Dfile.encoding=UTF-8','-Dstdout.encoding=UTF-8','-Dstderr.encoding=UTF-8','-cp',tmp+path.delimiter+json,'RecoveryProbe'],{encoding:'utf8',stdio:'pipe'}).trim());
 console.log(execFileSync(java+'java.exe',['-Dfile.encoding=UTF-8','-cp',tmp,'OwnerProbe'],{encoding:'utf8',stdio:'pipe'}).trim());
 console.log(execFileSync(java+'java.exe',['-Dfile.encoding=UTF-8','-cp',tmp,'MonitorProbe'],{encoding:'utf8',stdio:'pipe'}).trim());
} catch(e){console.error(e.stderr?.toString()||e.message);process.exitCode=1;}
finally{await fs.rm(tmp,{recursive:true,force:true});}

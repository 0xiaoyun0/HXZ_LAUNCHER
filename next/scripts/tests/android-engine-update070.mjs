// Exercise the actual GameEngine.state() body with minimal Android boundary stubs.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const source=await fs.readFile('mobile/android/app/src/main/java/top/hxzmc/community/GameEngine.java','utf8');
const state=source.match(/    synchronized JSONObject state\(\)\{[\s\S]*?(?=\n    private synchronized void publish)/)?.[0];
if(!state)throw Error('State method boundary changed');
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-engine-update-'));
try{
 const java=`import java.util.*;
class JSONObject extends HashMap<String,Object>{long optLong(String key){return ((Number)getOrDefault(key,0L)).longValue();}}
class PackageInfo{long build;String versionName="0.7.0";long getLongVersionCode(){return build;}}
class PackageManager{static final int SIGNATURE_MATCH=0;int signatures=0;int checkSignatures(String a,String b){return signatures;}}
class CommunityApp{PackageManager pm=new PackageManager();PackageManager getPackageManager(){return pm;}String getPackageName(){return "top.hxzmc.community";}static JSONObject obj(Object...args){JSONObject r=new JSONObject();for(int i=0;i<args.length;i+=2)r.put((String)args[i],args[i+1]);return r;}}
class Prefs{boolean getBoolean(String k,boolean fallback){return fallback;}}
class CachedFile{boolean exists=true;boolean isFile(){return exists;}}
public class EngineUpdateCheck{
 final CommunityApp app=new CommunityApp();final CachedFile apk=new CachedFile();final Prefs prefs=new Prefs();final String PACKAGE="top.hxzmc.gameengine";String phase="idle",message="";long received,total;boolean busy;JSONObject manifest=new JSONObject();PackageInfo current=new PackageInfo();
 boolean supported(){return true;}PackageInfo installed(){return current;}
${state}
 void expect(boolean ready,String message){if(!Boolean.valueOf(ready).equals(state().get("ready")))throw new AssertionError(message);}
 public static void main(String[] args){EngineUpdateCheck e=new EngineUpdateCheck();e.current.build=70000;e.manifest.put("versionCode",70000L);e.expect(false,"Installed cached APK must expose check-update, not reinstall");e.manifest.put("versionCode",70001L);e.expect(true,"A newer downloaded component must remain installable");e.current.build=70001;e.expect(false,"After install, return to check-update");e.current=null;e.expect(true,"First install still available");e.apk.exists=false;e.expect(false,"No APK cannot be installed");e.apk.exists=true;e.manifest=null;e.expect(false,"Invalid cached metadata must trigger a fresh check");System.out.println("PASS component update state: installed cache, newer download, return from install, first install, missing and invalid cache");}
}`;
 await fs.writeFile(path.join(folder,'EngineUpdateCheck.java'),java);
 const bin=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin'):'C:/Program Files/Java/jdk-21/bin';
 execFileSync(path.join(bin,'javac.exe'),['-d',folder,path.join(folder,'EngineUpdateCheck.java')],{windowsHide:true,stdio:'pipe'});
 console.log(execFileSync(path.join(bin,'java.exe'),['-cp',folder,'EngineUpdateCheck'],{windowsHide:true,encoding:'utf8'}).trim());
}finally{const target=path.resolve(folder),allowed=path.resolve(os.tmpdir())+path.sep+'hxz-engine-update-';if(!target.startsWith(allowed))throw Error('Unexpected test cleanup target');await fs.rm(target,{recursive:true,force:true});}

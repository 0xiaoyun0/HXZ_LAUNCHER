import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve('.'),dir=await fs.mkdtemp(path.join(root,'.runtime/room084-'));
const fixture=path.join(dir,'instance');await fs.mkdir(path.join(fixture,'mods'),{recursive:true});
for(const [name,value] of Object.entries({'z.jar':'last','a.jar':'first','disabled.jar.disabled':'ignored','readme.txt':'ignored'}))await fs.writeFile(path.join(fixture,'mods',name),value);
const sha=value=>createHash('sha256').update(value).digest('hex');const expected=sha([sha('first'),sha('last')].sort().join('\n'));
const sources={
 'android/os/Bundle.java':'package android.os; public class Bundle extends java.util.HashMap<String,Object>{public void putString(String k,String v){put(k,v);}public void putInt(String k,int v){put(k,v);}public void putBoolean(String k,boolean v){put(k,v);}public String getString(String k,String d){return containsKey(k)?String.valueOf(get(k)):d;}public String getString(String k){return getString(k,null);}public boolean getBoolean(String k){return Boolean.TRUE.equals(get(k));}}',
 'android/net/Uri.java':'package android.net; public class Uri{public static Uri parse(String s){return new Uri();}}',
 'android/content/ContentResolver.java':'package android.content; public class ContentResolver{public static android.os.Bundle last;public android.os.Bundle call(android.net.Uri u,String m,String a,android.os.Bundle b){last=b;return new android.os.Bundle();}}',
 'android/content/res/AssetManager.java':'package android.content.res;public class AssetManager{public java.io.InputStream open(String p){return new java.io.ByteArrayInputStream(new byte[]{1,2,3});}public String[] list(String p){return new String[0];}}',
 'android/content/SharedPreferences.java':'package android.content;public class SharedPreferences{public static String root="";public String getString(String k,String d){return root;}}',
 'android/content/Context.java':'package android.content;public class Context{public static final int MODE_PRIVATE=0;public static String packageName="top.hxzmc.community";public String getPackageName(){return packageName;}public SharedPreferences getSharedPreferences(String n,int m){return new SharedPreferences();}public Context getApplicationContext(){return this;}public ContentResolver getContentResolver(){return new ContentResolver();}public android.content.res.AssetManager getAssets(){return new android.content.res.AssetManager();}public java.io.File getFilesDir(){return new java.io.File(System.getProperty("test.files"));}}',
 'com/tungsten/fcl/FCLApp.java':'package com.tungsten.fcl;public class FCLApp{public static android.content.Context getAppContext(){return new android.content.Context();}}',
 'com/tungsten/fcl/setting/VersionSetting.java':'package com.tungsten.fcl.setting;public class VersionSetting{private String args="";public String getJavaArgs(){return args;}public void setJavaArgs(String s){args=s;}}',
 'com/tungsten/fclauncher/utils/FCLPath.java':'package com.tungsten.fclauncher.utils;public class FCLPath{public static java.io.File getLatestGameLog(){return new java.io.File("missing");}}',
 'org/json/JSONObject.java':`package org.json;public class JSONObject extends java.util.HashMap<String,Object>{public JSONObject put(String k,Object v){super.put(k,v);return this;}public String getString(String k){return String.valueOf(get(k));}public int getInt(String k){return ((Number)get(k)).intValue();}public String optString(String k){return optString(k,"");}public String optString(String k,String d){return containsKey(k)?String.valueOf(get(k)):d;}public int optInt(String k,int d){return containsKey(k)?((Number)get(k)).intValue():d;}public boolean optBoolean(String k){return optBoolean(k,false);}public boolean optBoolean(String k,boolean d){return containsKey(k)?Boolean.TRUE.equals(get(k)):d;}}`,
 'RoomTest.java':`import java.nio.file.*;import org.json.JSONObject;import com.tungsten.fcl.hxz.HxzRooms;public class RoomTest{
 static void fail(RunnableWithException f)throws Exception{try{f.run();throw new AssertionError("accepted invalid room");}catch(java.io.IOException expected){}}
 interface RunnableWithException{void run()throws Exception;}
 public static void main(String[] a)throws Exception{
  Path root=Paths.get(a[0]);JSONObject game=HxzRooms.describe(root,"1.21.1","neoforge","21.1.250","HXZ-mod-1");
  if(!game.getString("mods").equals(a[1])||game.getInt("modCount")!=2)throw new AssertionError("PC fingerprint mismatch");
  if(!HxzRooms.joinAddress(new JSONObject().put("joinServer","127.0.0.1:25565"),"server").equals("127.0.0.1:25565"))throw new AssertionError();
  for(String bad:new String[]{"127.0.0.1:0","127.0.0.1:65536","127.0.0.2:3","example.com:3","127.0.0.1:3/path"})fail(()->HxzRooms.joinAddress(new JSONObject().put("joinServer",bad),"server"));
  JSONObject other=new JSONObject();other.putAll(game);other.put("mods","different").put("platform","desktop");HxzRooms.validate(game,other,s->{});
  other.put("platform","android");fail(()->HxzRooms.validate(game,other,s->{}));
  other.put("platform","desktop").put("preset","custom");fail(()->HxzRooms.validate(game,other,s->{}));
  other.put("preset","HXZ-mod-1").put("minecraft","1.20.1");fail(()->HxzRooms.validate(game,other,s->{}));
  Class<?> session=Class.forName("com.tungsten.fcl.hxz.HxzRooms$Session");java.lang.reflect.Constructor<?> c=session.getDeclaredConstructors()[0];c.setAccessible(true);Object instance=c.newInstance(new android.content.Context(),root,25565);
  java.lang.reflect.Method start=session.getDeclaredMethod("start");start.setAccessible(true);try{start.invoke(instance);throw new AssertionError("host opened without active room");}catch(java.lang.reflect.InvocationTargetException denied){if(!(denied.getCause() instanceof java.io.IOException))throw denied;}if(Files.exists(root.resolve(".hxzl/direct-lobby.properties")))throw new AssertionError("unauthorized control file written");
  java.lang.reflect.Method accept=session.getDeclaredMethod("accept",String.class);accept.setAccessible(true);accept.invoke(instance,"[INFO] [HXZ-DIRECT] READY 25565");if(!android.content.ContentResolver.last.getBoolean("ready"))throw new AssertionError("ready not reported");
  accept.invoke(instance,"[HXZ-DIRECT] WAITING");if(android.content.ContentResolver.last.getBoolean("ready"))throw new AssertionError("world exit not reported");
  accept.invoke(instance,"[HXZ-DIRECT] ERROR failed");if(!"failed".equals(android.content.ContentResolver.last.getString("error")))throw new AssertionError("error not reported");
  System.out.println("PASS PC/Android identical mod fingerprint, loopback-only join, managed cross-platform adaptation, strict unknown/android mismatches, fail-closed host authorization, actual agent log status parser");
 }
}`
};
sources['RuntimeAssetsTest.java']=`import java.nio.file.*;import java.io.*;import com.tungsten.fcl.hxz.HxzRuntimeAssets;public class RuntimeAssetsTest{
 static void reject(String path)throws Exception{try(InputStream ignored=HxzRuntimeAssets.open(path)){throw new AssertionError("accepted unsafe runtime path");}catch(IOException expected){}}
 public static void main(String[] args)throws Exception{
  Path files=Paths.get(System.getProperty("test.files")),generation=files.resolve("modules/one");Files.createDirectories(generation.resolve("app_runtime/java/jre21"));Files.write(generation.resolve("app_runtime/java/jre21/version"),new byte[]{42});
  android.content.SharedPreferences.root=generation.toString();
  try(InputStream input=HxzRuntimeAssets.open("/assets/app_runtime/java/jre21/version")){if(input.read()!=42)throw new AssertionError("wrong generation");}
  reject("app_runtime/../../escape");reject("/app_runtime/java/jre21/version");
  android.content.SharedPreferences.root=files.resolveSibling("outside").toString();reject("app_runtime/java/jre21/version");
  android.content.SharedPreferences.root="";reject("app_runtime/java/jre21/version");
  android.content.Context.packageName="top.hxzmc.gameengine";try(InputStream input=HxzRuntimeAssets.open("/assets/app_runtime/java/jre21/version")){if(input.read()!=1)throw new AssertionError("legacy asset fallback broken");}
  System.out.println("PASS real runtime asset seam: activated private generation, traversal/absolute/outside/missing rejection, standalone APK fallback");
 }
}`;
for(const [name,value] of Object.entries(sources)){await fs.mkdir(path.dirname(path.join(dir,name)),{recursive:true});await fs.writeFile(path.join(dir,name),value);}
const jdk='C:/Program Files/Java/jdk-21/bin/';
execFileSync(jdk+'javac.exe',['-encoding','UTF-8','-d',dir,...Object.keys(sources).map(name=>path.join(dir,name)),...['HxzRooms.java','HxzRuntimeAssets.java'].map(name=>path.join(root,'mobile/game-engine/src/com/tungsten/fcl/hxz',name))],{windowsHide:true,stdio:'pipe'});
process.stdout.write(execFileSync(jdk+'java.exe',['-cp',dir,'RoomTest',fixture,expected],{windowsHide:true,encoding:'utf8'}));
process.stdout.write(execFileSync(jdk+'java.exe',['-Dtest.files='+path.join(dir,'private'),'-cp',dir,'RuntimeAssetsTest'],{windowsHide:true,encoding:'utf8'}));

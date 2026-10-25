import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const dir=path.resolve('.runtime/review084/downloads/java-nodes'),jdk=path.join(process.env.JAVA_HOME||'C:/Program Files/Java/jdk-21','bin');
const cp=[path.resolve('resources/installer/game-installer.jar'),path.resolve('resources/hxzup/updater-1.0.3.jar')].join(path.delimiter);
await fs.mkdir(dir,{recursive:true});
await fs.writeFile(dir+'/Nodes084.java',`package up.hxz;
import java.nio.file.*;import java.util.*;import java.lang.reflect.*;import com.google.gson.*;
public class Nodes084 {
 public static void main(String[] args)throws Exception{
  System.setProperty("hxz.launcher.official","true");Path root=Paths.get(args[0]);JsonObject config=new JsonObject();config.addProperty("gameDir",root.resolve("game").toString());
  GameInstaller installer=new GameInstaller(root.resolve("game/versions/test/updater"),config,new Network(2,0,32));
  Method method=GameInstaller.class.getDeclaredMethod("sources",String.class);method.setAccessible(true);
  String coordinate="/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar",raw="https://libraries.minecraft.net"+coordinate;
  List<String> desktop=(List<String>)method.invoke(installer,raw),android=AndroidDownloadSources.expand(Arrays.asList(raw));
  for(List<String> urls:Arrays.asList(desktop,android)){
   if(!urls.get(0).equals(raw)||urls.size()!=20)throw new AssertionError("Expected complete 20-source same-coordinate candidates: "+urls);
   for(String url:urls)if(!url.endsWith(coordinate))throw new AssertionError("Coordinate changed: "+url);
   if(!urls.contains("https://maven.reposilite.com/maven-central"+coordinate))throw new AssertionError("Last configured mirror was truncated");
  }
  for(String url:Arrays.asList("https://maven.fabricmc.net/net/fabricmc/fabric-loader/0.16.0/fabric-loader-0.16.0.jar","https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-loader/0.26.4/quilt-loader-0.26.4.jar")){
   for(List<String> urls:Arrays.asList((List<String>)method.invoke(installer,url),AndroidDownloadSources.expand(Arrays.asList(url)))){
    if(urls.stream().noneMatch(u->u.contains("repo.spongepowered.org")))throw new AssertionError("Loader cache missing");
    if(urls.stream().anyMatch(u->u.contains("googleapis.com")||u.contains("aliyun")))throw new AssertionError("Loader copied to generic Central");
   }
  }
  String auth="https://authlib-injector.yushi.moe/artifact/56/authlib-injector-1.2.8.jar",release="https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.8/authlib-injector-1.2.8.jar";
  for(List<String> urls:Arrays.asList((List<String>)method.invoke(installer,auth),AndroidDownloadSources.expand(Arrays.asList(auth))))if(!urls.contains(release)||!urls.contains("https://ghproxy.net/"+release))throw new AssertionError("Exact authlib release mapping missing");
  for(String privateURL:Arrays.asList(raw+"?token=private","https://user:private@libraries.minecraft.net"+coordinate,raw+"#private","https://authlib-injector.yushi.moe/artifact/latest.json")){
   if(!method.invoke(installer,privateURL).equals(Arrays.asList(privateURL))||!AndroidDownloadSources.expand(Arrays.asList(privateURL)).equals(Arrays.asList(privateURL)))throw new AssertionError("Private URL or checksum authority expanded");
  }
  System.out.println("PASS freshly compiled Java 8 desktop/Android: 20 untruncated same-file sources, typed loader caches, pinned authlib release, credential and checksum-authority isolation");
 }
}`);
execFileSync(path.join(jdk,'javac.exe'),['--release','8','-encoding','UTF-8','-cp',cp,'-d',dir,dir+'/Nodes084.java',path.resolve('resources/installer/src/up/hxz/Network.java'),path.resolve('resources/installer/src/up/hxz/GameInstaller.java'),path.resolve('mobile/game-engine/src/up/hxz/AndroidDownloadSources.java')],{windowsHide:true,stdio:'pipe'});
console.log(execFileSync(path.join(jdk,'java.exe'),['-cp',dir+path.delimiter+cp,'up.hxz.Nodes084',dir],{windowsHide:true,encoding:'utf8'}).trim());

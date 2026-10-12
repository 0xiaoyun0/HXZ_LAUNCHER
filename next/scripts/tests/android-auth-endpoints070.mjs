import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=path.resolve('.runtime/fcl-source/FoldCraftLauncher-efe4dcc5dbc78c55be177c330239e12845ae7ccf/FCL/src/main/java');
const dir=await fs.mkdtemp(path.resolve('.runtime/android-auth-check-'));
const gson=path.resolve('.runtime/build-tools/gradle-8.14.4/lib/gson-2.10.jar'),jdk='C:/Program Files/Java/jdk-21/bin/';
try {
 const preparation=await fs.readFile('mobile/game-engine/src/com/tungsten/fcl/hxz/HxzPreparation.java','utf8');
 const root=preparation.match(/storage.put\("serverBaseURL","([^"]+)"\)/)?.[1] || 'https://skin.hxzmc.top/api/yggdrasil';
 await fs.writeFile(dir+'/NetworkUtils.java','package com.tungsten.fclcore.util.io;public class NetworkUtils{public static java.net.URL toURL(String s){try{return new java.net.URL(s);}catch(Exception e){throw new IllegalArgumentException(e);}}}');
 await fs.writeFile(dir+'/Endpoints.java',`import com.tungsten.fclcore.auth.authlibinjector.AuthlibInjectorProvider;import java.util.*;public class Endpoints{public static void main(String[]a)throws Exception{for(String root:new String[]{a[0],a[0]+"/"}){AuthlibInjectorProvider p=new AuthlibInjectorProvider(root);String base="https://skin.hxzmc.top/api/yggdrasil/";List<String> actual=Arrays.asList(p.getAuthenticationURL().toString(),p.getValidationURL().toString(),p.getRefreshmentURL().toString(),p.getProfilePropertiesURL(new UUID(0,0)).toString());List<String> wanted=Arrays.asList(base+"authserver/authenticate",base+"authserver/validate",base+"authserver/refresh",base+"sessionserver/session/minecraft/profile/00000000000000000000000000000000");if(!actual.equals(wanted))throw new AssertionError("Skin authentication endpoints are malformed: "+actual);}System.out.println("PASS real FCL authentication/refresh/skin routes with or without trailing slash");}}`);
 const files=['auth/AuthenticationException.java','auth/yggdrasil/YggdrasilProvider.java','auth/authlibinjector/AuthlibInjectorProvider.java','util/gson/UUIDTypeAdapter.java'].map(f=>path.join(base,'com/tungsten/fclcore',f));
 execFileSync(jdk+'javac.exe',['--release','8','-cp',gson,'-d',dir,...files,dir+'/NetworkUtils.java',dir+'/Endpoints.java'],{windowsHide:true,stdio:'pipe'});
 console.log(execFileSync(jdk+'java.exe',['-cp',dir+path.delimiter+gson,'Endpoints',root],{windowsHide:true,encoding:'utf8'}).trim());
}finally{assert.ok(dir.startsWith(path.resolve('.runtime')+path.sep+'android-auth-check-'));await fs.rm(dir,{recursive:true,force:true});}

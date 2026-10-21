import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import yazl from 'yazl';
const dir=await fs.mkdtemp(path.resolve('.runtime/module-store084-'));
const java=process.env.JAVA_HOME||'C:/Program Files/Java/jdk-21';
const json=path.resolve('.runtime/review084/lobby/json.jar');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const data=Buffer.from('A signed runtime resource, not an APK.');
const entry='app_runtime/java21/release';
const harness=`package top.hxzmc.community;
import java.io.*;import java.nio.file.*;import org.json.*;
public class ModuleHarness {
 public static void main(String[] a)throws Exception {
  JSONObject m=new JSONObject(new String(Files.readAllBytes(Paths.get(a[1])),"UTF-8"));
  File root=new File(a[2]);root.mkdirs();
  try {File result=GameRuntimeStore.extract(new File(a[0]),root,m,()->a[3].equals("cancel"));if(!GameRuntimeStore.validDeep(result,m))throw new Exception("not valid");if(a[3].equals("tamper")){Path file=result.toPath().resolve("app_runtime/java21/release");byte[] changed=Files.readAllBytes(file);changed[0]^=1;file.toFile().setWritable(true,true);Files.write(file,changed);if(GameRuntimeStore.validDeep(result,m))throw new Exception("same-size corruption accepted");System.out.println("TAMPER-REJECT");}else if(a[3].equals("tamperModule")){Path file=result.toPath().resolve("module.json");JSONObject changed=new JSONObject(new String(Files.readAllBytes(file),"UTF-8"));changed.put("renderers",new JSONArray().put(new JSONObject().put("id","untrusted")));file.toFile().setWritable(true,true);Files.write(file,changed.toString().getBytes("UTF-8"));Path stamp=result.toPath().resolve("verified.json");Files.write(stamp,new JSONObject(new String(Files.readAllBytes(stamp),"UTF-8")).put("moduleSha256",GameRuntimeStore.sha(file.toFile())).toString().getBytes("UTF-8"));if(GameRuntimeStore.validDeep(result,m))throw new Exception("modified module manifest accepted");System.out.println("MODULE-TAMPER-REJECT");}else System.out.println("OK");}
  catch(Exception e){System.out.println("REJECT "+e.getClass().getSimpleName());}
  try(java.util.stream.Stream<Path> files=Files.list(root.toPath())){if(files.anyMatch(p->p.getFileName().toString().startsWith("pending-")))throw new Exception("staging leaked");}
 }
}`;
await fs.writeFile(path.join(dir,'ModuleHarness.java'),harness);
execFileSync(path.join(java,'bin/javac.exe'),['-encoding','UTF-8','-cp',json,'-d',dir,'mobile/android/app/src/main/java/top/hxzmc/community/GameRuntimeStore.java',path.join(dir,'ModuleHarness.java')],{stdio:'pipe'});
let count=0;
async function test(name,change={},expected='REJECT'){
 const zip=new yazl.ZipFile();
 const meta={schema:1,kind:'hxz-runtime-assets',interfaceVersion:1,abi:'arm64-v8a',minSdk:29,versionCode:80400,files:[{path:entry,size:data.length,sha256:sha(data)}]};
 if(change.badSize)meta.files[0].size--;
 if(change.badHash)meta.files[0].sha256='0'.repeat(64);
 const moduleBytes=Buffer.from(JSON.stringify(meta));zip.addBuffer(moduleBytes,'module.json');
 if(!change.missing)zip.addBuffer(data,entry);
 if(change.extra)zip.addBuffer(data,'app_runtime/extra');
 if(change.duplicateCase)zip.addBuffer(data,entry.toUpperCase());
 const file=path.join(dir,name+'.zip');const out=createWriteStream(file);const finished=new Promise((resolve,reject)=>{out.on('close',resolve);out.on('error',reject);zip.outputStream.on('error',reject);});zip.outputStream.pipe(out);zip.end();await finished;
 const bytes=await fs.readFile(file);const outer={versionCode:80400,size:bytes.length,sha256:change.outerHash?'0'.repeat(64):sha(bytes),moduleSha256:change.moduleHash?'0'.repeat(64):sha(moduleBytes)};
 if(change.missingModuleHash)delete outer.moduleSha256;
 const manifest=path.join(dir,name+'.json');await fs.writeFile(manifest,JSON.stringify(outer));
 const root=path.join(dir,name==='repeat-valid'?'valid-install':name+'-install');await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'previous-module-sentinel'),'preserve');
 const result=execFileSync(path.join(java,'bin/java.exe'),['-cp',dir+path.delimiter+json,'top.hxzmc.community.ModuleHarness',file,manifest,root,change.cancel?'cancel':change.tamper?'tamper':change.tamperModule?'tamperModule':'run'],{encoding:'utf8'}).trim();
 assert.ok(result.startsWith(expected),name+': '+result);assert.equal(await fs.readFile(path.join(root,'previous-module-sentinel'),'utf8'),'preserve');count++;
}
await test('valid',{},'OK');await test('repeat-valid',{},'OK');
for(const type of ['outerHash','moduleHash','missingModuleHash','badHash','badSize','missing','extra','duplicateCase','cancel'])await test(type,{[type]:true});
await test('same-size-corruption',{tamper:true},'TAMPER-REJECT');
await test('module-plus-stamp-corruption',{tamperModule:true},'MODULE-TAMPER-REJECT');
await fs.writeFile(path.join(dir,'result.json'),JSON.stringify({passed:count,scope:'Actual GameRuntimeStore, JVM filesystem and ZIP extraction; no Android device'},null,2));
console.log(JSON.stringify({passed:count,evidence:dir}));

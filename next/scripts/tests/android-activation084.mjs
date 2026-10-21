// Execute the real activation method and resource store under a system directory alias.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import yazl from 'yazl';

const folder=await fs.mkdtemp(path.resolve('.runtime/activation084-'));
const java='C:/Program Files/Java/jdk-21/bin',json=path.resolve('.runtime/review084/lobby/json.jar');
const source=await fs.readFile(process.argv[2]||'mobile/android/app/src/main/java/top/hxzmc/community/GameEngine.java','utf8');
let active=source.slice(source.indexOf('    private synchronized JSONObject active()'),source.indexOf('    synchronized JSONObject state()')).replaceAll('android.os.SystemClock.elapsedRealtime()','100000L');
if(!active.includes('JSONObject active()'))throw Error('Activation method unavailable');
if(!active.includes('void activate(')){
 const block=source.match(/String activation=new JSONObject\(\)\.put\("envelope",checkedEnvelope\)[\s\S]*?if\(active\(\)==null\)throw new IOException\([^\n]+/)[0];
 active+='\n private synchronized void activate(File root)throws Exception{'+block+'\n}\n';
}
const real=path.join(folder,'real-app-data'),alias=path.join(folder,'system-app-alias');
await fs.mkdir(real,{recursive:true});await fs.symlink(real,alias,process.platform==='win32'?'junction':'dir');
const sha=b=>createHash('sha256').update(b).digest('hex');
const data=Buffer.from('verified resource'),entry='app_runtime/java/21/release';
const module=Buffer.from(JSON.stringify({schema:1,kind:'hxz-runtime-assets',interfaceVersion:1,abi:'arm64-v8a',files:[{path:entry,size:data.length,sha256:sha(data)}]}));
const zip=new yazl.ZipFile();zip.addBuffer(module,'module.json');zip.addBuffer(data,entry);
const archive=path.join(folder,'module.zip'),out=createWriteStream(archive);
const done=new Promise((resolve,reject)=>{out.on('close',resolve);out.on('error',reject);zip.outputStream.on('error',reject);});zip.outputStream.pipe(out);zip.end();await done;
const zipped=await fs.readFile(archive),outer={versionCode:80400,size:zipped.length,sha256:sha(zipped),moduleSha256:sha(module)};
await fs.writeFile(path.join(folder,'outer.json'),JSON.stringify(outer));
const harness=`package top.hxzmc.community;
import java.io.*;import java.nio.file.*;import org.json.*;
class CommunityApp {static String reason(Exception e){return e.getMessage();}}
public class ActivationHarness {
 static class Prefs {String activation="{}";String getString(String key,String fallback){return activation;}Editor edit(){return new Editor();}class Editor{String pending;Editor putString(String key,String value){pending=value;return this;}boolean commit(){activation=pending;return true;}}}
 final Prefs prefs=new Prefs();final File modules;String activeKey="",activeFailure="",checkedEnvelope="";long activeChecked;JSONObject activeValue;
 ActivationHarness(File modules){this.modules=modules;}
 JSONObject verify(String envelope)throws Exception{return new JSONObject(envelope);}
${active}
 void use(File root,JSONObject m)throws Exception{checkedEnvelope=m.toString();prefs.activation=new JSONObject().put("envelope",checkedEnvelope).put("root",root.getAbsolutePath()).toString();activeKey="";}
 static void require(boolean value,String detail){if(!value)throw new AssertionError(detail);}
 public static void main(String[] a)throws Exception{
  JSONObject m=new JSONObject(Files.readString(Paths.get(a[1])));
  File modules=new File(a[2],"runtime-modules");modules.mkdirs();
  File root=GameRuntimeStore.extract(new File(a[0]),modules,m,()->false);
  ActivationHarness t=new ActivationHarness(modules);t.use(root,m);
  System.out.println("stored="+root.getAbsolutePath()+"; canonical="+root.getCanonicalPath());
  require(t.active()!=null,"runtime activation rejected a complete module through the system app-data alias: "+t.activeFailure);
  Path resource=root.toPath().resolve("${entry}");byte[] original=Files.readAllBytes(resource);resource.toFile().setWritable(true,true);Files.delete(resource);
  t.activeKey="";require(t.active()==null,"missing runtime resource accepted");
  Files.write(resource,original);resource.toFile().setReadOnly();
  t.activate(root);require(t.active()!=null,"successful retry reused cached activation failure");
  resource.toFile().setWritable(true,true);Files.write(resource,new byte[]{0});
  File repaired=GameRuntimeStore.extract(new File(a[0]),modules,m,()->false);t.activate(repaired);
  require(GameRuntimeStore.validDeep(repaired,m)&&t.active()!=null,"damaged extraction was not rebuilt from the complete archive");
  ActivationHarness restarted=new ActivationHarness(modules);restarted.use(root,m);require(restarted.active()!=null,"restart lost activation");
  t.use(new File(a[3]),m);require(t.active()==null,"outside application module root accepted");
  Path moduleFile=new File(root,"module.json").toPath();moduleFile.toFile().setWritable(true,true);Files.writeString(moduleFile,"{}");t.use(root,m);require(t.active()==null,"tampered module accepted");
  System.out.println("PASS retry cache invalidation, damaged extraction recovery, restart, containment and tamper rejection");
 }
}`;
const file=path.join(folder,'ActivationHarness.java');await fs.writeFile(file,harness);
execFileSync(path.join(java,'javac.exe'),['-encoding','UTF-8','-cp',json,'-d',folder,'mobile/android/app/src/main/java/top/hxzmc/community/GameRuntimeStore.java',file],{windowsHide:true,stdio:'pipe'});
const args=['-Dstdout.encoding=UTF-8','-Dstderr.encoding=UTF-8','-cp',folder+path.delimiter+json,'top.hxzmc.community.ActivationHarness',archive,path.join(folder,'outer.json'),alias,real];
try{console.log(execFileSync(path.join(java,'java.exe'),args,{windowsHide:true,encoding:'utf8',stdio:'pipe'}));}
catch(e){console.error(e.stdout?.toString()||'');console.error(e.stderr?.toString()||'');process.exitCode=1;}
console.log('Evidence: '+folder);

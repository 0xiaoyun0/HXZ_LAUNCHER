import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const production=await fs.readFile(path.join(root,'mobile/android/app/src/main/java/top/hxzmc/community/game/AndroidEngineHost.java'),'utf8');
const job=production.slice(production.indexOf('    File job('),production.indexOf('    @Override public int runJava('));
const field=production.slice(production.indexOf('    static void field('),production.indexOf('    File job('));
assert.ok(job.includes('HXZJVM01'),'Exercise the actual Android job serialization');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-jni-arguments-'));
const helper=path.join(root,'mobile/runtime/src/main/java/top/hxzmc/runtime/JvmLaunchArguments.java');
const extra=[];try{await fs.access(helper);extra.push(helper);}catch{}
await fs.writeFile(path.join(output,'AndroidJobProbe.java'),`import java.io.*; import java.nio.charset.StandardCharsets; import java.nio.file.Files; import java.util.*; import top.hxzmc.runtime.*; import top.hxzmc.runtime.EngineHost.JavaJob;
public class AndroidJobProbe {
  final File directory; final Context context;
  AndroidJobProbe(File directory){this.directory=directory;this.context=new Context(directory);}
  static class Context { final File cache;Context(File cache){this.cache=cache;} File getCacheDir(){return cache;} }
  File javaHome(int major){return directory;}
  ${field}
  ${job}
  static String read(DataInputStream in)throws IOException{byte[] bytes=new byte[in.readInt()];in.readFully(bytes);return new String(bytes,StandardCharsets.UTF_8);}
  List<String> arguments(List<String> input)throws Exception {
    File file=job(new JavaJob(21,"example.Main",directory,Arrays.asList(new File(directory,"fallback.jar")),input,Collections.emptyList()),Collections.emptyList(),Collections.emptyList());
    try(DataInputStream in=new DataInputStream(new FileInputStream(file))){in.skipBytes(8);read(in);read(in);read(in);int size=Integer.parseInt(read(in));List<String> result=new ArrayList<>();for(int i=0;i<size;i++)result.add(read(in));return result;}
    finally{java.nio.file.Files.delete(file.toPath());}
  }
  static void check(boolean pass,String message){if(!pass)throw new AssertionError(message);}
  public static void main(String[] args)throws Exception{
    AndroidJobProbe host=new AndroidJobProbe(new File(args[0]));
    List<String> result=host.arguments(Arrays.asList("--enable-native-access","ALL-UNNAMED","--upgrade-module-path","modules with spaces","--add-opens","java.base/java.lang=ALL-UNNAMED","--module-path","module path","-Xmx1024M"));
    check(result.contains("--enable-native-access=ALL-UNNAMED"),"Native access option must be a single JNI option");
    check(result.contains("--upgrade-module-path=modules with spaces"),"Upgrade module path must be a single JNI option");
    check(result.contains("--add-opens=java.base/java.lang=ALL-UNNAMED"),"Existing opens normalization preserved");
    check(result.contains("--module-path=module path"),"Spaces remain inside their token");
    check(result.contains("-Xmx1024M"),"Heap option preserved");
    result=host.arguments(Arrays.asList("--class-path=custom classpath"));
    check(result.contains("-Djava.class.path=custom classpath"),"Equals classpath must become JNI system property");
    check(result.stream().filter(x->x.startsWith("-Djava.class.path=")).count()==1,"Explicit classpath must suppress fallback");
    for(String option:Arrays.asList("--enable-native-access","--upgrade-module-path","-cp")){
      try{host.arguments(Arrays.asList(option));throw new AssertionError("Missing option value accepted");}catch(IOException expected){}
    }
    long before;try(java.util.stream.Stream<java.nio.file.Path> files=java.nio.file.Files.list(host.directory.toPath())){before=files.count();}
    try{host.job(new JavaJob(21,"example.Main",host.directory,Collections.emptyList(),Collections.emptyList(),Arrays.asList("fake-access-token", "invalid"+(char)0)),Collections.emptyList(),Collections.emptyList());throw new AssertionError("Invalid field accepted");}catch(IOException expected){}
    try(java.util.stream.Stream<java.nio.file.Path> files=java.nio.file.Files.list(host.directory.toPath())){check(files.count()==before,"Failed request serialization must remove its partial credential file");}
    System.out.println("PASS Android JNI job arguments 11 checks (production serializer; no device/JNI execution)");
  }
}`);
const home=process.env.HXZ_TEST_JAVA_HOME||'C:/Program Files/Java/jdk-21';
const executable=name=>path.join(home,'bin',name+(process.platform==='win32'?'.exe':''));
execFileSync(executable('javac'),['-encoding','UTF-8','--release','8','-d',output,path.join(root,'mobile/runtime/src/main/java/top/hxzmc/runtime/EngineHost.java'),...extra,path.join(root,'mobile/runtime/src/main/java/top/hxzmc/runtime/JavaRuntimeMetadata.java'),path.join(root,'mobile/runtime/test/JavaRuntimeMetadataTest.java'),path.join(output,'AndroidJobProbe.java')],{windowsHide:true,stdio:'pipe',timeout:30000});
console.log(execFileSync(executable('java'),['-Dfile.encoding=UTF-8','-cp',output,'AndroidJobProbe',output],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000}).trim());
const runtimes=[];for(const major of ['21','25']){const home=path.join(root,'.runtime/hxz-runtime-upstream/input/app_runtime/java',major);try{await fs.access(path.join(home,'release'));runtimes.push(home);}catch{}}
console.log(execFileSync(executable('java'),['-Dfile.encoding=UTF-8','-cp',output,'JavaRuntimeMetadataTest',...runtimes],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000}).trim());

package up.hxz;

import com.google.gson.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.io.*;

public final class AndroidAdaptationCheck {
    static void check(boolean value,String name){if(!value)throw new AssertionError(name);}
    public static void main(String[] args)throws Exception {
        Path root=Paths.get(args[1]);Files.createDirectories(root);
        if(args[0].equals("basic")){
            check(InstallerRuntime.forGame("1.21.1")==21,"NeoForge 1.21.1 JRE");
            check(InstallerRuntime.forGame("26.2")==25,"26.2 JRE");
            check(InstallerRuntime.forGame("1.16.5")==8,"legacy JRE");
            check(InstallerRuntime.heapMB(12L*1024*1024*1024)==2048,"bounded heap");
            Path dir=root.resolve("versions/demo");Files.createDirectories(dir);
            AndroidInstallState state=new AndroidInstallState(root,"demo","1.21.1:neoforge:21.1.250");
            Files.write(dir.resolve("demo.json"),"{}".getBytes(StandardCharsets.UTF_8));
            check(!state.complete(),"a JSON is not a completed installation");
            Files.write(dir.resolve("demo.jar"),new byte[]{1,2,3});check(!state.complete(),"missing receipt");
            state.finish();check(state.complete(),"successful receipt");state.begin();check(!state.complete(),"failed reinstall is resumable");state.finish();
            check(!new AndroidInstallState(root,"demo","1.21.1:neoforge:21.1.251").complete(),"loader changed");
            Files.write(dir.resolve("demo.json"),"{\"broken\":true}".getBytes(StandardCharsets.UTF_8));check(!state.complete(),"changed version descriptor");
            Path log=root.resolve("中文安装.log");InstallerLogReader reader=new InstallerLogReader();byte[] word="处理器完成\n".getBytes(StandardCharsets.UTF_8);
            Files.write(log,Arrays.copyOfRange(word,0,2));check(reader.read(log.toFile(),false).isEmpty(),"partial UTF8 retained");
            Files.write(log,Arrays.copyOfRange(word,2,word.length),StandardOpenOption.APPEND);check(reader.read(log.toFile(),false).equals(Arrays.asList("处理器完成")),"UTF8 boundary");
            Files.write(log,"新\n".getBytes(StandardCharsets.UTF_8));check(reader.read(log.toFile(),false).equals(Arrays.asList("新")),"truncated log reset");
            byte[] huge=new byte[2*1024*1024];Arrays.fill(huge,(byte)'x');Files.write(log,huge);InstallerLogReader bounded=new InstallerLogReader();check(bounded.read(log.toFile(),true).get(0).length()<=32768,"bounded log memory");
        } else if(args[0].equals("download")){
            final long[] bytes={0};Path downloaded=AndroidDownloads.download(Arrays.asList(args[2]+"/missing",args[2]+"/resume"),root,args[3],(done,total,received)->bytes[0]+=received);
            check(IO.hash(downloaded).equals(args[3]),"resumed payload SHA1");check(bytes[0]>0,"byte progress");
        } else if(args[0].equals("compat")){
            AndroidCompatibility.configure(Files.newInputStream(Paths.get(args[2])));
            JsonObject profile=JsonParser.parseString("{\"gameVersion\":\"1.21.1\",\"loader\":{\"type\":\"vanilla\",\"version\":\"\"}}").getAsJsonObject();
            try(AndroidCompatibility.Session session=AndroidCompatibility.open(root,"nggl4es",System.out::println)){
                AndroidPack.preflight(Arrays.asList(args[3]),System.out::println);
                AndroidPack.update(root,Arrays.asList(args[3]),profile,System.out::println);session.reconcile();
                check(!Files.exists(root.resolve("mods/输入法.jar")),"bad native component isolated");
                check(Files.isRegularFile(root.resolve("mods/航空学.jar")),"gameplay mod retained");
                check(Files.isRegularFile(root.resolve("updater/android-compatibility/"+args[4]+".jar.disabled")),"recoverable backup");
            }
            try(InputStream signal=new java.net.URL(args[3]+"/phase-zink").openStream()){signal.read();}
            try(AndroidCompatibility.Session session=AndroidCompatibility.open(root,"zink",System.out::println)){
                session.reconcile();check(Files.isRegularFile(root.resolve("mods/输入法.jar")),"renderer rule no longer applies, restore file");
                AndroidPack.update(root,Arrays.asList(args[3]),profile,System.out::println);session.reconcile();
                Path marker;try(java.util.stream.Stream<Path> all=Files.walk(root.resolve("updater"))){marker=all.filter(p->p.getFileName().toString().equals("local-version.json")).findFirst().orElseThrow(()->new IOException("missing updater version receipt"));}
                check(IO.str(IO.read(marker),"androidCompatibility","").endsWith(":zink"),"same pack version refreshes changed compatibility");
            }
        } else if(args[0].equals("audit")){
            AndroidCompatibility.configure(Files.newInputStream(Paths.get(args[2])));
            try(AndroidCompatibility.Session session=AndroidCompatibility.open(root,args[4],System.out::println)){
                JsonArray files=AndroidPaths.manifest(IO.read(Paths.get(args[3])).getAsJsonArray("files"));JsonArray kept=session.filter(files);
                check(kept.size()>0&&kept.size()<files.size(),"real pack compatibility rules");
                System.out.println("Exact catalog: "+files.size()+" -> "+kept.size()+" files / "+args[4]);
            }
        } else if(args[0].equals("native")){
            Files.createDirectories(root.resolve("mods"));Files.copy(Paths.get(args[2]),root.resolve("mods/中文物理模组.jar"));
            try(AndroidCompatibility.Session session=AndroidCompatibility.open(root,"zink",System.out::println)){
                AndroidNativeFix.apply(root,Files.newInputStream(Paths.get(args[3])),System.out::println);
                Path installed=root.resolve("mods/hxz-android-sable-2.0.3.jar");check(Files.isRegularFile(installed),"renamed Sable is recognized by content");
                check(IO.hash(installed).equals(IO.hash(Paths.get(args[3]))),"bundled verified patch");
                Files.move(installed,root.resolve("mods/中文补丁.jar"));AndroidNativeFix.apply(root,Files.newInputStream(Paths.get(args[3])),System.out::println);
                check(!Files.exists(installed),"renamed adapter is not duplicated");
            }
        } else if(args[0].equals("guard")){
            AndroidCompatibility.configure(Files.newInputStream(Paths.get(args[2])));boolean rejected=false;
            try(AndroidCompatibility.Session session=AndroidCompatibility.open(root,"nggl4es",System.out::println)){
                AndroidPack.preflight(Arrays.asList(args[3]),System.out::println);
            }catch(IOException expected){rejected=expected.getMessage().contains("必须依赖");}
            check(rejected,"required gameplay dependency blocks incompatible rule");
            check(Files.isRegularFile(root.resolve("mods/输入法.jar")),"dependency guard does not remove originals");
        }
        System.out.println("PASS "+args[0]);
    }
}

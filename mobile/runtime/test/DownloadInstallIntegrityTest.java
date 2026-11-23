package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;

/** Protocol regressions for downloaded libraries and interrupted installer recovery. */
public final class DownloadInstallIntegrityTest {
    private static int passed;
    private static void check(boolean value,String message) {if(!value)throw new AssertionError(message);passed++;}
    private static byte[] jar()throws Exception {
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        try(JarOutputStream out=new JarOutputStream(bytes)){out.putNextEntry(new JarEntry("fixture.txt"));out.write(1);out.closeEntry();}
        return bytes.toByteArray();
    }
    private static void write(File file,byte[] bytes)throws Exception {Files.createDirectories(file.getParentFile().toPath());Files.write(file.toPath(),bytes);}
    private static void entry(JarOutputStream out,String name,String body)throws Exception {out.putNextEntry(new JarEntry(name));out.write(body.getBytes(StandardCharsets.UTF_8));out.closeEntry();}
    private static GamePreparation.Context context(File root)throws Exception {
        return new GamePreparation.Context(RuntimeFiles.inside(root,"versions/instance"),RuntimeFiles.inside(root,"natives"),"Player","uuid","token","legacy","","",1024,800,600,Collections.emptyMap());
    }
    private static void libraries()throws Exception {
        File root=Files.createTempDirectory("hxz-library-integrity-").toFile();byte[] good=jar(),html="<html>upstream unavailable</html>".getBytes(StandardCharsets.UTF_8);List<String> contacts=new ArrayList<>();
        RuntimeDownloads downloads=new RuntimeDownloads((url,offset)->{contacts.add(url);byte[] body=url.contains("mirror")?good:html;return new RuntimeDownloads.Response(200,body.length,null,new ByteArrayInputStream(body),null);},url->Collections.singletonList("https://mirror.example/library.jar"));
        GamePreparation game=new GamePreparation(root,downloads);JSONObject metadata=new JSONObject().put("libraries",new JSONArray().put(new JSONObject().put("name","fixture:library:1").put("url","https://official.example/")));
        RuntimeDownloads.FileSpec library=game.libraries(metadata,context(root)).get(0);
        downloads.fetch(library,new EngineHost.Cancellation(),null);
        check(contacts.size()==2&&contacts.get(1).contains("mirror"),"HTTP 200 HTML library must fall through to a valid archive mirror");
        check(Arrays.equals(Files.readAllBytes(library.file.toPath()),good)&&library.valid(),"Only the valid JAR may become active");
        write(library.file,html);RuntimeDownloads.pin(library.file);
        check(!library.valid(),"A previously pinned error page must fail library inspection");
        contacts.clear();downloads.fetch(library,new EngineHost.Cancellation(),null);
        check(contacts.size()==2&&library.valid(),"Pinned invalid archive must be repaired using the next source");
        // Non-archive Maven artifacts, including Mojang mappings, retain ordinary integrity rules.
        JSONObject mappings=new JSONObject().put("libraries",new JSONArray().put(new JSONObject().put("name","fixture:mappings:1@txt").put("url","https://official.example/")));
        RuntimeDownloads.FileSpec text=game.libraries(mappings,context(root)).get(0);downloads.fetch(text,new EngineHost.Cancellation(),null);
        check(text.valid(),"Non-archive Maven artifacts must remain supported");
    }
    private static void recovery()throws Exception {
        File root=Files.createTempDirectory("hxz-processor-recovery-").toFile();GamePreparation.Context context=context(root);byte[] gameJar=jar();
        File client=RuntimeFiles.inside(root,"versions/1.21.1/1.21.1.jar");write(client,gameJar);
        JSONObject vanilla=new JSONObject().put("id","1.21.1").put("mainClass","fixture.Game").put("javaVersion",new JSONObject().put("majorVersion",21)).put("libraries",new JSONArray())
                .put("downloads",new JSONObject().put("client",new JSONObject().put("url","https://official.example/client").put("sha1",RuntimeFiles.hash(client,"SHA-1")).put("size",client.length())));
        File metadata=RuntimeFiles.inside(root,"versions/1.21.1/1.21.1.json");RuntimeFiles.writeJson(metadata,vanilla);RuntimeDownloads.pin(metadata);
        File processor=RuntimeFiles.inside(root,"libraries/"+RuntimeFiles.maven("fixture:processor:1"));Manifest manifest=new Manifest();manifest.getMainAttributes().putValue("Manifest-Version","1.0");manifest.getMainAttributes().putValue("Main-Class","fixture.Processor");
        Files.createDirectories(processor.getParentFile().toPath());try(JarOutputStream out=new JarOutputStream(new FileOutputStream(processor),manifest)){entry(out,"fixture.txt","processor");}RuntimeDownloads.pin(processor);
        File output=RuntimeFiles.inside(root,"generated/result.txt"),reference=RuntimeFiles.inside(root,"reference.txt");byte[] expected="repaired-output".getBytes(StandardCharsets.UTF_8);write(reference,expected);write(output,"corrupt-output".getBytes(StandardCharsets.UTF_8));RuntimeDownloads.pin(output);
        JSONObject profile=new JSONObject().put("minecraft","1.21.1").put("json","/version.json")
                .put("data",new JSONObject().put("OUT",new JSONObject().put("client","{ROOT}/generated/result.txt")))
                .put("libraries",new JSONArray().put(new JSONObject().put("name","fixture:processor:1").put("downloads",new JSONObject().put("artifact",new JSONObject().put("url","").put("sha1",RuntimeFiles.hash(processor,"SHA-1")).put("size",processor.length())))))
                .put("processors",new JSONArray().put(new JSONObject().put("jar","fixture:processor:1").put("args",new JSONArray().put("--output").put("{OUT}"))
                        .put("outputs",new JSONObject().put("{OUT}","'"+RuntimeFiles.hash(reference,"SHA-1")+"'"))));
        File installer=new File(root,"installer.jar");try(JarOutputStream out=new JarOutputStream(new FileOutputStream(installer))){entry(out,"install_profile.json",profile.toString());entry(out,"version.json",new JSONObject().put("id","loader").put("inheritsFrom","1.21.1").toString());}
        RuntimeDownloads downloads=new RuntimeDownloads((url,offset)->{throw new AssertionError("Unexpected download "+url);},null);
        int[] calls={0};EngineHost host=(job,cancel,progress)->{calls[0]++;check(!output.exists(),"Corrupt declared output must be removed before a processor that refuses overwrite");check(!new File(output.getPath()+".hxz-sha256").exists(),"Old output integrity receipt must be removed");write(output,expected);return 0;};
        InstallerPlan plan=InstallerPlan.read(installer,root,"1.21.1",21,context);plan.execute("instance",host,downloads,context,new EngineHost.Cancellation(),null);
        check(calls[0]==1&&Arrays.equals(Files.readAllBytes(output.toPath()),expected),"Corrupt processor output must be repaired");
        check(new GamePreparation(root,downloads).inspect("instance",context).complete,"Recovered installation must pass the real completeness inspection");
        plan.execute("instance",host,downloads,context,new EngineHost.Cancellation(),null);
        check(calls[0]==1,"Valid processor output must remain reusable");
    }
    private static void explicitClasspath()throws Exception {
        File root=Files.createTempDirectory("hxz-explicit-classpath-").toFile();GamePreparation game=new GamePreparation(root,new RuntimeDownloads((url,offset)->{throw new AssertionError("Unexpected network");},null));
        for(String option:Arrays.asList("--class-path=/custom/library.jar","-Djava.class.path=/custom/library.jar")) {
            JSONObject metadata=new JSONObject().put("id","1.21.1").put("mainClass","fixture.Game").put("javaVersion",new JSONObject().put("majorVersion",21))
                    .put("arguments",new JSONObject().put("jvm",new JSONArray().put(option)));
            LaunchPlan plan=game.launch("instance",metadata,context(root));
            check(plan.jvmArguments.contains(option)&&!plan.jvmArguments.contains("-cp"),"Explicit JVM classpath must not be overridden by an appended default: "+option);
        }
    }
    private static void cancelledFailure()throws Exception {
        File root=Files.createTempDirectory("hxz-cancelled-download-").toFile();EngineHost.Cancellation cancel=new EngineHost.Cancellation();int[] calls={0};
        RuntimeDownloads downloads=new RuntimeDownloads((url,offset)->{if(++calls[0]==5)cancel.cancel();throw new IOException("socket closed");},null);
        try {downloads.fetch(new RuntimeDownloads.FileSpec(new File(root,"file.bin"),"https://official.example/file","",-1),cancel,null);throw new AssertionError("Download unexpectedly succeeded");}
        catch(java.util.concurrent.CancellationException expected){check(calls[0]==5,"Cancellation concurrent with the final I/O failure must retain cancellation semantics");}
    }
    private static void legacyForge()throws Exception {
        File root=Files.createTempDirectory("hxz-legacy-forge-").toFile();GamePreparation.Context context=context(root);byte[] payload=jar();
        File client=RuntimeFiles.inside(root,"versions/1.7.10/1.7.10.jar");write(client,payload);
        JSONObject vanilla=new JSONObject().put("id","1.7.10").put("mainClass","fixture.Game").put("libraries",new JSONArray())
                .put("downloads",new JSONObject().put("client",new JSONObject().put("url","https://official.example/client").put("sha1",RuntimeFiles.hash(client,"SHA-1")).put("size",client.length())));
        File metadata=RuntimeFiles.inside(root,"versions/1.7.10/1.7.10.json");RuntimeFiles.writeJson(metadata,vanilla);RuntimeDownloads.pin(metadata);
        String coordinate="net.minecraftforge:forge:1.7.10-fixture";
        JSONObject version=new JSONObject().put("id","legacy-forge").put("inheritsFrom","1.7.10").put("mainClass","net.minecraft.launchwrapper.Launch")
                .put("minecraftArguments","--tweakClass cpw.mods.fml.common.launcher.FMLTweaker").put("libraries",new JSONArray().put(new JSONObject().put("name",coordinate).put("url","https://maven.minecraftforge.net/")));
        JSONObject profile=new JSONObject().put("install",new JSONObject().put("minecraft","1.7.10").put("path",coordinate).put("filePath","forge-universal.jar")).put("versionInfo",version);
        File installer=new File(root,"legacy-installer.jar");legacyArchive(installer,profile,payload);
        RuntimeDownloads downloads=new RuntimeDownloads((url,offset)->{throw new AssertionError("Embedded Forge core must not be downloaded: "+url);},null);
        InstallerPlan plan=InstallerPlan.read(installer,root,"1.7.10",8,context);
        check(plan.processors.isEmpty(),"Legacy embedded-core installers must not invent processors");
        plan.execute("instance",(job,cancel,progress)->{throw new AssertionError("Legacy Forge must not run a processor");},downloads,context,new EngineHost.Cancellation(),null);
        GamePreparation game=new GamePreparation(root,downloads);check(game.inspect("instance",context).complete,"Legacy Forge installation must publish verified complete metadata");
        File core=RuntimeFiles.inside(root,"libraries/"+RuntimeFiles.maven(coordinate));check(Arrays.equals(Files.readAllBytes(core.toPath()),payload),"Legacy universal JAR must be activated at its Maven coordinate");
        check(game.prepare("instance",context,new EngineHost.Cancellation(),null).gameArguments.contains("cpw.mods.fml.common.launcher.FMLTweaker"),"Legacy Forge tweak argument must reach the launch plan");
        profile.getJSONObject("install").put("filePath","../escape.jar");legacyArchive(installer,profile,payload);
        try{InstallerPlan.read(installer,root,"1.7.10",8,context);throw new AssertionError("Legacy archive traversal accepted");}catch(IOException expected){passed++;}
        profile.getJSONObject("install").put("filePath","forge-universal.jar").put("minecraft","1.12.2");legacyArchive(installer,profile,payload);
        try{InstallerPlan.read(installer,root,"1.7.10",8,context);throw new AssertionError("Legacy Minecraft mismatch accepted");}catch(IOException expected){passed++;}
    }
    private static void legacyArchive(File file,JSONObject profile,byte[] core)throws Exception {
        try(JarOutputStream out=new JarOutputStream(new FileOutputStream(file))){entry(out,"install_profile.json",profile.toString());out.putNextEntry(new JarEntry("forge-universal.jar"));out.write(core);out.closeEntry();}
    }
    private static void officialInstallers(String directory)throws Exception {
        File fixture=new File(directory);File root=Files.createTempDirectory("hxz-official-forge-profile-").toFile();GamePreparation.Context context=context(root);
        File old=new File(fixture,"forge-1.7.10-installer.jar");if(old.isFile()) {
            InstallerPlan plan=InstallerPlan.read(old,root,"1.7.10",8,context);
            check(plan.processors.isEmpty()&&plan.dependencies().size()==18,"Official Forge 1.7.10 profile must expose all 18 declared dependencies without processors");
            check(plan.versionMetadata().getString("mainClass").equals("net.minecraft.launchwrapper.Launch"),"Official legacy Forge main class must survive planning");
        }
        File newer=new File(fixture,"forge-1.12.2-installer.jar");if(newer.isFile()) {
            InstallerPlan plan=InstallerPlan.read(newer,root,"1.12.2",8,context);
            check(plan.processors.isEmpty()&&plan.dependencies().size()==2,"Official Forge 1.12.2 modern profile must retain its MCP ZIP and bundled core dependencies");
        }
    }
    public static void main(String[] args)throws Exception {
        List<String> errors=new ArrayList<>();try{libraries();}catch(Throwable e){errors.add("libraries: "+e);}
        try{recovery();}catch(Throwable e){errors.add("recovery: "+e);}
        try{explicitClasspath();}catch(Throwable e){errors.add("classpath: "+e);}
        try{cancelledFailure();}catch(Throwable e){errors.add("cancellation: "+e);}
        try{legacyForge();}catch(Throwable e){errors.add("legacy Forge: "+e);}
        if(args.length>0)try{officialInstallers(args[0]);}catch(Throwable e){errors.add("official Forge fixtures: "+e);}
        if(!errors.isEmpty())throw new AssertionError(errors.toString());
        System.out.println("PASS DownloadInstallIntegrity "+passed+" checks");
    }
}

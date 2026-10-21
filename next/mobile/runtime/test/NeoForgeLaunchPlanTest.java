package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;

/** Regression for an inherited client jar entering NeoForge's bootstrap module scan. */
public final class NeoForgeLaunchPlanTest {
    private static int checks;
    private static void check(String name,boolean condition) {
        if(!condition)throw new AssertionError(name);
        checks++;
    }
    private static JSONObject loaderFixture()throws Exception {
        // NeoForge 21.1.251 version.json: version_name is the installed profile id.
        return new JSONObject().put("id","neoforge-21.1.251").put("inheritsFrom","1.21.1")
                .put("mainClass","cpw.mods.bootstraplauncher.BootstrapLauncher")
                .put("libraries",new JSONArray().put(new JSONObject().put("name","net.neoforged.fancymodloader:loader:4.0.44")))
                .put("arguments",new JSONObject().put("jvm",new JSONArray().put("-DignoreList=client-extra,${version_name}.jar")));
    }
    private static JSONObject loaderFromInstaller(File installer)throws Exception {
        try(JarFile archive=new JarFile(installer);InputStream in=archive.getInputStream(archive.getJarEntry("version.json"));ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] buffer=new byte[8192];int count;while((count=in.read(buffer))!=-1)out.write(buffer,0,count);
            return new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));
        }
    }
    private static String ignoreList(LaunchPlan plan) {
        String value="";for(String arg:plan.jvmArguments)if(arg.startsWith("-DignoreList="))value=arg.substring("-DignoreList=".length());
        return value;
    }
    public static void main(String[] args)throws Exception {
        File root=Files.createTempDirectory("hxz-neoforge-launch-").toFile();
        GamePreparation preparation=new GamePreparation(root,new RuntimeDownloads((url,offset)->{throw new IOException("No network expected");},null));
        GamePreparation.Context context=new GamePreparation.Context(new File(root,"versions/HXZ-mod-2"),new File(root,"natives"),
                "test","test","test","msa","","",1024,1280,720,Collections.emptyMap());
        JSONObject vanilla=new JSONObject().put("id","1.21.1").put("mainClass","net.minecraft.client.main.Main")
                .put("javaVersion",new JSONObject().put("majorVersion",21)).put("libraries",new JSONArray())
                .put("downloads",new JSONObject().put("client",new JSONObject().put("url","https://example.invalid/client.jar").put("size",0)))
                .put("arguments",new JSONObject().put("jvm",new JSONArray().put("-cp").put("${classpath}")));
        RuntimeFiles.writeJson(new File(root,"versions/1.21.1/1.21.1.json"),vanilla);
        JSONObject loader=args.length==0?loaderFixture():loaderFromInstaller(new File(args[0]));
        loader.put("id","HXZ-mod-2");
        RuntimeFiles.writeJson(new File(root,"versions/HXZ-mod-2/HXZ-mod-2.json"),loader);
        JSONObject inherited=preparation.readVersion("HXZ-mod-2");
        File vanillaJar=new File(root,"versions/1.21.1/1.21.1.jar");
        LaunchPlan plan=preparation.launch("HXZ-mod-2",inherited,context);
        check("inherited client jar is excluded from BootstrapLauncher module scanning (prevents _1._21._1/minecraft split packages)",
                Arrays.asList(ignoreList(plan).split(",")).contains("1.21.1.jar"));
        check("existing NeoForge ignores are preserved",Arrays.asList(ignoreList(plan).split(",")).containsAll(Arrays.asList("client-extra","HXZ-mod-2.jar")));
        check("vanilla jar remains available on the client classpath",plan.classpath.contains(vanillaJar));
        check("NeoForge libraries remain on the client classpath",plan.classpath.stream().anyMatch(f->f.getName().equals("loader-4.0.44.jar")));
        check("JVM classpath and typed plan agree",plan.jvmArguments.get(plan.jvmArguments.indexOf("-cp")+1).contains(vanillaJar.getAbsolutePath()));
        check("vanilla installation still requires its client jar",preparation.files(inherited,null,context).stream().anyMatch(f->f.file.equals(vanillaJar)));
        LaunchPlan plain=preparation.launch("1.21.1",vanilla,context);
        check("vanilla keeps its client jar without bootstrap ignores",plain.classpath.contains(vanillaJar)&&ignoreList(plain).isEmpty());
        JSONObject fabric=GamePreparation.merge(vanilla,new JSONObject().put("id","fabric").put("jar","1.21.1").put("mainClass","net.fabricmc.loader.impl.launch.knot.KnotClient"));
        LaunchPlan fabricPlan=preparation.launch("fabric",fabric,context);
        check("Fabric keeps its client jar without bootstrap ignores",fabricPlan.classpath.contains(vanillaJar)&&ignoreList(fabricPlan).isEmpty());
        System.out.println("NeoForge launch plan: "+checks+" checks passed"+(args.length==0?" (minimal fixture)":" (installer version.json)"));
    }
}

package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.jar.*;
import java.net.*;
import java.util.concurrent.atomic.*;
import java.util.concurrent.*;
import com.sun.net.httpserver.*;

/** JVM protocol tests only; this does not assert an Android JVM/game/rendering works. */
public final class RuntimeCoreTest {
    private static int passed;
    private static final List<String> checks=new ArrayList<>();
    interface Checked {void run()throws Exception;}
    static void check(String name,boolean condition){if(!condition)throw new AssertionError(name);passed++;checks.add(name);}
    static void rejects(String name,Checked action)throws Exception {try{action.run();}catch(Exception expected){check(name,true);return;}throw new AssertionError("Accepted: "+name);}
    static String digest(byte[] bytes,String algorithm)throws Exception {StringBuilder result=new StringBuilder();for(byte b:MessageDigest.getInstance(algorithm).digest(bytes))result.append(String.format(Locale.ROOT,"%02x",b&255));return result.toString();}
    static void bytes(File file,byte[] content)throws Exception {Files.createDirectories(file.getParentFile().toPath());Files.write(file.toPath(),content);}
    static void metadata(File root,String id,JSONObject json)throws Exception {File file=RuntimeFiles.inside(root,"versions/"+id+"/"+id+".json");RuntimeFiles.writeJson(file,json);RuntimeDownloads.pin(file);}
    static GamePreparation.Context context(File root)throws Exception {return new GamePreparation.Context(RuntimeFiles.inside(root,"versions/instance"),RuntimeFiles.inside(root,".engine/natives"),"测试玩家","1234","secret$\\token","msa","xuid","client",1024,1280,720,Collections.singletonMap("has_custom_resolution",true));}
    static RuntimeDownloads mockDownloads(Map<String,byte[]> content){return new RuntimeDownloads((url,offset)->{
        byte[] body=content.get(url);if(body==null)throw new IOException("Unexpected network request "+url);
        int start=(int)offset;return new RuntimeDownloads.Response(start>0?206:200,body.length-start,start>0?"bytes "+start+"-"+(body.length-1)+"/"+body.length:null,new ByteArrayInputStream(body,start,body.length-start),null);
    },null);}
    static JSONObject base(byte[] client)throws Exception {return new JSONObject().put("id","1.21.1").put("mainClass","net.minecraft.client.main.Main")
            .put("javaVersion",new JSONObject().put("majorVersion",21)).put("libraries",new JSONArray())
            .put("downloads",new JSONObject().put("client",new JSONObject().put("url","https://official.example/client").put("sha1",digest(client,"SHA-1")).put("size",client.length)))
            .put("arguments",new JSONObject().put("jvm",new JSONArray().put("-cp").put("${classpath}"))
                    .put("game",new JSONArray().put("--username").put("${auth_player_name}").put("--accessToken").put("${auth_access_token}")
                            .put(new JSONObject().put("rules",new JSONArray().put(new JSONObject().put("action","allow").put("features",new JSONObject().put("has_custom_resolution",true))))
                                    .put("value",new JSONArray().put("--width").put("${resolution_width}")))));}
    public static void main(String[] args)throws Exception {
        File output=new File(args[0]);Files.createDirectories(output.toPath());File root=Files.createTempDirectory(output.toPath(),"game-").toFile();GamePreparation.Context context=context(root);
        check("metadata Java 21",GamePreparation.javaMajor(new JSONObject().put("id","renamed").put("javaVersion",new JSONObject().put("majorVersion",21)))==21);
        check("metadata Java 25",GamePreparation.javaMajor(new JSONObject().put("id","1.21.1").put("javaVersion",new JSONObject().put("majorVersion",25)))==25);
        check("PC release Java fallback",GamePreparation.javaMajor(new JSONObject().put("id","26.2"))==25&&GamePreparation.javaMajor(new JSONObject().put("id","1.20.5"))==21);
        rejects("unknown version cannot guess Java 8",()->GamePreparation.javaMajor(new JSONObject().put("id","my-instance")));
        rejects("path traversal rejected",()->RuntimeFiles.inside(root,"libraries/../../escape"));
        rejects("Maven traversal rejected",()->RuntimeFiles.maven("x:y:../z"));
        JSONArray rules=new JSONArray().put(new JSONObject().put("action","allow").put("os",new JSONObject().put("name","linux")))
                .put(new JSONObject().put("action","disallow").put("os",new JSONObject().put("arch","aarch64")));
        check("last matching Mojang rule wins",!GamePreparation.allowed(rules,context));
        check("missing feature matches false",GamePreparation.allowed(new JSONArray().put(new JSONObject().put("action","allow").put("features",new JSONObject().put("missing",false))),context));
        rejects("unresolved placeholder fails closed",()->GamePreparation.replace("${unknown}",Collections.emptyMap()));
        check("replacement treats dollar and slash literally",GamePreparation.replace("${token}",Collections.singletonMap("token","$1\\a")).equals("$1\\a"));
        check("legacy tokenization preserves quoted spaces",GamePreparation.tokens("--name 'a b' \"\"").equals(Arrays.asList("--name","a b","")));
        rejects("unclosed legacy quote rejected",()->GamePreparation.tokens("--name 'bad"));
        JSONObject parent=new JSONObject().put("libraries",new JSONArray().put(new JSONObject().put("name","g:a:1")).put(new JSONObject().put("name","g:a:1:all")))
                .put("arguments",new JSONObject().put("game",new JSONArray().put("parent")));
        JSONObject child=new JSONObject().put("libraries",new JSONArray().put(new JSONObject().put("name","g:a:2")))
                .put("arguments",new JSONObject().put("game",new JSONArray().put("child")));
        JSONObject merged=GamePreparation.merge(parent,child);
        check("inheritance overrides artifact version and preserves classifier",merged.getJSONArray("libraries").length()==2&&merged.getJSONArray("libraries").getJSONObject(0).getString("name").equals("g:a:2"));
        check("inheritance appends parent then child arguments",merged.getJSONObject("arguments").getJSONArray("game").toString().equals("[\"parent\",\"child\"]"));
        byte[] client="client-fixture".getBytes(StandardCharsets.UTF_8);Map<String,byte[]> network=new HashMap<>();network.put("https://official.example/client",client);
        GamePreparation preparation=new GamePreparation(root,mockDownloads(network));JSONObject vanilla=base(client);metadata(root,"1.21.1",vanilla);
        check("metadata JSON alone is incomplete",!preparation.inspect("1.21.1",context).complete);
        preparation.ensureFiles(vanilla,context,new EngineHost.Cancellation(),null);
        check("hash-verified client install is complete",preparation.inspect("1.21.1",context).complete);
        LaunchPlan launch=preparation.prepare("1.21.1",context,new EngineHost.Cancellation(),null);
        check("typed launch preserves account argument without shell escaping",launch.gameArguments.contains("secret$\\token")&&launch.gameArguments.contains("测试玩家"));
        check("launch supplies classpath and exact Java requirement",launch.javaMajor==21&&launch.jvmArguments.contains("-cp")&&launch.classpath.size()==1);
        check("plan diagnostic does not expose credentials",!launch.toString().contains("secret"));
        metadata(root,"loader",new JSONObject().put("id","loader").put("inheritsFrom","1.21.1").put("mainClass","a.Loader"));
        check("inherited loader keeps vanilla jar",preparation.readVersion("loader").getString("jar").equals("1.21.1"));
        metadata(root,"cycle-a",new JSONObject().put("id","cycle-a").put("inheritsFrom","cycle-b"));metadata(root,"cycle-b",new JSONObject().put("id","cycle-b").put("inheritsFrom","cycle-a"));
        rejects("inheritance cycle rejected",()->preparation.readVersion("cycle-a"));
        File clientFile=RuntimeFiles.inside(root,"versions/1.21.1/1.21.1.jar");bytes(clientFile,"corrupt".getBytes(StandardCharsets.UTF_8));
        check("client corruption detected",!preparation.inspect("1.21.1",context).complete);preparation.ensureFiles(vanilla,context,new EngineHost.Cancellation(),null);
        byte[] asset="asset".getBytes(StandardCharsets.UTF_8);String assetHash=digest(asset,"SHA-1");
        JSONObject index=new JSONObject().put("virtual",true).put("map_to_resources",true).put("objects",new JSONObject().put("sounds/test.ogg",new JSONObject().put("hash",assetHash).put("size",asset.length)));
        byte[] indexBytes=index.toString().getBytes(StandardCharsets.UTF_8);network.put("https://official.example/index",indexBytes);network.put("https://resources.download.minecraft.net/"+assetHash.substring(0,2)+"/"+assetHash,asset);
        vanilla.put("assetIndex",new JSONObject().put("id","test-assets").put("url","https://official.example/index").put("sha1",digest(indexBytes,"SHA-1")).put("size",indexBytes.length));metadata(root,"1.21.1",vanilla);
        check("asset index absent is incomplete",!preparation.inspect("1.21.1",context).complete);preparation.ensureFiles(vanilla,context,new EngineHost.Cancellation(),null);
        check("assets and legacy maps verified",preparation.inspect("1.21.1",context).complete);
        Files.delete(RuntimeFiles.inside(context.run,"resources/sounds/test.ogg").toPath());check("missing legacy mapped asset is incomplete",!preparation.inspect("1.21.1",context).complete);
        preparation.ensureFiles(vanilla,context,new EngineHost.Cancellation(),null);
        testDownloads(output);testInstaller(root,context,preparation,network,vanilla);
        List<ServerPresets.Preset> defaults=ServerPresets.defaults();check("three canonical server presets",defaults.size()==3&&defaults.get(0).id.equals("HXZ-survival")&&defaults.get(2).profileSource.equals("hxzup"));
        JSONArray invalid=new JSONArray();for(ServerPresets.Preset p:defaults)invalid.put(p.json());invalid.getJSONObject(1).put("updateUrls",new JSONArray().put("https://user:pass@example.org"));
        rejects("preset credential URL rejected",()->ServerPresets.read(invalid));
        List<String> contacts=new ArrayList<>();HxzupPlan.Source maintenance=HxzupPlan.readSource(Arrays.asList("https://first.example","https://second.example"),true,(url,timeout,cancel)->{contacts.add(url);return new JSONObject().put("maintenance",true);},new EngineHost.Cancellation());
        check("HXZUP maintenance authoritative; no fallback or profile fetch",maintenance.maintenance()&&contacts.size()==1);
        HxzupPlan.Source selected=HxzupPlan.readSource(Arrays.asList("https://bad.example","https://good.example"),true,(url,timeout,cancel)->{if(url.startsWith("https://bad"))throw new IOException("offline");return url.endsWith("version.json")?new JSONObject().put("version","v1"):new JSONObject().put("gameVersion","1.21.1");},new EngineHost.Cancellation());
        check("HXZUP status and game profile share selected source",selected.base.equals("https://good.example")&&selected.gameProfile.getString("gameVersion").equals("1.21.1"));
        CountDownLatch blocked=new CountDownLatch(1),interrupted=new CountDownLatch(1);long started=System.nanoTime();
        try {HxzupPlan.readSource(Collections.singletonList("https://deadline.example"),true,(url,timeout,cancel)->{
            if(url.endsWith("version.json"))return new JSONObject().put("version","v1");try{blocked.await();return new JSONObject();}finally{interrupted.countDown();}
        },new EngineHost.Cancellation(),120,120);throw new AssertionError("Deadline accepted stalled reader");}
        catch(HxzupPlan.SourceUnavailableException expected){check("metadata total deadline interrupts stalled profile reader",expected.networkOnly&&TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-started)<2000&&interrupted.await(1,TimeUnit.SECONDS));}
        finally {blocked.countDown();}
        testServerPreparation(output,args.length>3?new File(args[3]):null);
        if(args.length>1&&!args[1].equals("-")) {
            File fixtures=new File(args[1]);JSONObject official21=RuntimeFiles.json(new File(fixtures,"mojang-1.21.1.json")),official25=RuntimeFiles.json(new File(fixtures,"mojang-26.2.json"));
            check("official Mojang fixture Java 21/25",GamePreparation.javaMajor(official21)==21&&GamePreparation.javaMajor(official25)==25);
            JSONObject fabric=RuntimeFiles.json(new File(fixtures,"fabric-profile.json"));JSONObject fabricMerged=GamePreparation.merge(official21,fabric);fabricMerged.put("jar","1.21.1");
            LaunchPlan fabricLaunch=preparation.launch("fabric-fixture",fabricMerged,context);
            check("official Fabric profile merges into launch plan",fabricLaunch.mainClass.contains("fabric")&&fabricLaunch.classpath.size()>20);
        }
        if(args.length>2&&!args[2].equals("-")) {
            InstallerPlan neo=InstallerPlan.read(new File(args[2]),root,"1.21.1",21,context);
            check("real NeoForge client processor selection",neo.processors.size()==6&&neo.processors.stream().noneMatch(p->p.arguments.contains("BUNDLER_EXTRACT")));
            check("real NeoForge Maven extension and archive data",neo.data().get("MAPPINGS").endsWith("mappings.txt")&&neo.data().get("BINPATCH").endsWith("client.lzma"));
            check("real NeoForge generates tracked runtime files",neo.processors.stream().anyMatch(p->!p.generatedFiles.isEmpty()));
            JSONObject neoMerged=GamePreparation.merge(vanilla,neo.versionMetadata());neoMerged.put("jar","1.21.1");LaunchPlan neoLaunch=preparation.launch("neo",neoMerged,context);
            check("real NeoForge module path substitution",neoLaunch.jvmArguments.contains("-p")&&neoLaunch.jvmArguments.stream().noneMatch(s->s.contains("${")));
        }
        JSONObject report=new JSONObject().put("passed",passed).put("checks",new JSONArray(checks)).put("scope","JVM metadata/download/installer protocol; no Android device or game runtime test");
        RuntimeFiles.writeJson(new File(output,"results.json"),report);System.out.println(report.toString(2));
    }
    static void testDownloads(File output)throws Exception {
        output=Files.createTempDirectory(output.toPath(),"downloads-").toFile();
        byte[] payload="download-payload".getBytes(StandardCharsets.UTF_8);File file=new File(output,"fallback.bin");List<String> urls=new ArrayList<>();
        RuntimeDownloads downloads=new RuntimeDownloads((url,offset)->{urls.add(url);return new RuntimeDownloads.Response(url.contains("official")?503:200,payload.length,null,new ByteArrayInputStream(payload),null);},url->Collections.singletonList("https://mirror.example/file"));
        downloads.fetch(new RuntimeDownloads.FileSpec(file,"https://official.example/file",digest(payload,"SHA-1"),payload.length),new EngineHost.Cancellation(),null);
        check("official-first equivalent mirror fallback",urls.size()==2&&urls.get(0).contains("official")&&Arrays.equals(Files.readAllBytes(file.toPath()),payload));
        File bad=new File(output,"old.bin");bytes(bad,"old".getBytes(StandardCharsets.UTF_8));
        rejects("bad digest rejects replacement",()->downloads.fetch(new RuntimeDownloads.FileSpec(bad,"https://official.example/file",digest("wrong".getBytes(StandardCharsets.UTF_8),"SHA-1"),payload.length),new EngineHost.Cancellation(),null));
        check("failed download preserves previous target",new String(Files.readAllBytes(bad.toPath()),StandardCharsets.UTF_8).equals("old"));
        File resumed=new File(output,"resumed.bin");List<Long> offsets=new ArrayList<>();
        RuntimeDownloads ranged=new RuntimeDownloads((url,offset)->{offsets.add(offset);InputStream stream=new ByteArrayInputStream(payload,(int)offset,payload.length-(int)offset){@Override public synchronized int read(byte[] b,int off,int length){return super.read(b,off,Math.min(length,2));}};
            return new RuntimeDownloads.Response(offset>0?206:200,payload.length-offset,offset>0?"bytes "+offset+"-"+(payload.length-1)+"/"+payload.length:null,stream,null);},null);
        RuntimeDownloads.FileSpec spec=new RuntimeDownloads.FileSpec(resumed,"https://resume.example/file",digest(payload,"SHA-1"),payload.length);EngineHost.Cancellation cancel=new EngineHost.Cancellation();
        rejects("download cancellation propagates",()->ranged.fetch(spec,cancel,(phase,item,done,total)->cancel.cancel()));
        ranged.fetch(spec,new EngineHost.Cancellation(),null);check("cancelled partial resumes with Range",offsets.size()==2&&offsets.get(1)>0&&spec.valid());
        File hashless=new File(output,"hashless.bin");mockDownloads(Collections.singletonMap("https://hashless.example/file",payload)).fetch(new RuntimeDownloads.FileSpec(hashless,"https://hashless.example/file","",-1),new EngineHost.Cancellation(),null);
        bytes(hashless,"corrupt".getBytes(StandardCharsets.UTF_8));check("hashless receipt detects later corruption",!new RuntimeDownloads.FileSpec(hashless,"https://hashless.example/file","",-1).valid());
        AtomicInteger attempts=new AtomicInteger();File retry=new File(output,"retry.bin");
        RuntimeDownloads transientDownloads=new RuntimeDownloads((url,offset)->new RuntimeDownloads.Response(attempts.incrementAndGet()<3?503:200,payload.length,null,new ByteArrayInputStream(payload),null),null);
        transientDownloads.fetch(new RuntimeDownloads.FileSpec(retry,"https://transient.example/file",digest(payload,"SHA-1"),payload.length),new EngineHost.Cancellation(),null);
        check("transient source retries to success within five attempts",attempts.get()==3);
        AtomicInteger absent=new AtomicInteger();RuntimeDownloads missing=new RuntimeDownloads((url,offset)->{absent.incrementAndGet();return new RuntimeDownloads.Response(404,0,null,new ByteArrayInputStream(new byte[0]),null);},null);
        rejects("permanent 404 fails",()->missing.fetch(new RuntimeDownloads.FileSpec(new File(retry.getParentFile(),"missing.bin"),"https://missing.example/file","",-1),new EngineHost.Cancellation(),null));
        check("permanent 404 is tried once",absent.get()==1);
        AtomicInteger active=new AtomicInteger(),maximum=new AtomicInteger();List<RuntimeDownloads.FileSpec> parallel=new ArrayList<>();
        for(int i=0;i<20;i++)parallel.add(new RuntimeDownloads.FileSpec(new File(output,"parallel-"+i+".bin"),"https://parallel.example/"+i,digest(payload,"SHA-1"),payload.length));
        RuntimeDownloads concurrent=new RuntimeDownloads((url,offset)->{int running=active.incrementAndGet();maximum.accumulateAndGet(running,Math::max);
            InputStream stream=new ByteArrayInputStream(payload){@Override public synchronized int read(byte[] b,int off,int length){Thread.yield();return super.read(b,off,length);}};
            return new RuntimeDownloads.Response(200,payload.length,null,stream,()->active.decrementAndGet());},null,4);
        concurrent.fetchAll(parallel,new EngineHost.Cancellation(),null);check("bounded parallel download workers",maximum.get()<=4&&maximum.get()>1&&active.get()==0);
        DownloadMirrors routes=new DownloadMirrors();check("complete Central fallback routes retained",routes.alternatives("https://libraries.minecraft.net/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar").size()==19);
        check("NeoForge uses only type-specific proxies",routes.alternatives("https://maven.neoforged.net/releases/net/neoforged/neoforge/1/neoforge-1.jar").size()==2);
        check("query URLs do not cross origins",routes.alternatives("https://libraries.minecraft.net/file.jar?secret=1").isEmpty());
        testHttpDownloadFailures(output,payload);
    }
    static void testHttpDownloadFailures(File output,byte[] payload)throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);CountDownLatch release=new CountDownLatch(1);AtomicInteger absent=new AtomicInteger(),transientErrors=new AtomicInteger(),stalls=new AtomicInteger();
        ExecutorService threads=Executors.newFixedThreadPool(6,r->{Thread t=new Thread(r,"fixture-download-http");t.setDaemon(true);return t;});server.setExecutor(threads);
        server.createContext("/",exchange->{String path=exchange.getRequestURI().getPath();try {
            if(path.equals("/missing")){absent.incrementAndGet();exchange.sendResponseHeaders(404,-1);}
            else if(path.equals("/unavailable")){transientErrors.incrementAndGet();exchange.sendResponseHeaders(503,-1);}
            else {stalls.incrementAndGet();exchange.sendResponseHeaders(200,payload.length);exchange.getResponseBody().write(payload[0]);exchange.getResponseBody().flush();release.await();}
        }catch(Exception ignored){}finally {exchange.close();}});server.start();
        try {
            String base="http://127.0.0.1:"+server.getAddress().getPort();RuntimeDownloads actual=new RuntimeDownloads(new RuntimeDownloads.UrlConnectionHttp(75,75),null);
            File target=new File(output,"actual-http.bin");byte[] previous="original".getBytes(StandardCharsets.UTF_8);bytes(target,previous);
            rejects("real download HTTP 404 fails without retry",()->actual.fetch(new RuntimeDownloads.FileSpec(target,base+"/missing",digest(payload,"SHA-1"),payload.length),new EngineHost.Cancellation(),null));check("real HTTP 404 source contacted once",absent.get()==1);
            rejects("real download HTTP 503 stops after five attempts",()->actual.fetch(new RuntimeDownloads.FileSpec(target,base+"/unavailable",digest(payload,"SHA-1"),payload.length),new EngineHost.Cancellation(),null));check("real HTTP transient retry cap is five",transientErrors.get()==5);
            long start=System.nanoTime();rejects("real stalled download body times out",()->actual.fetch(new RuntimeDownloads.FileSpec(target,base+"/stall",digest(payload,"SHA-1"),payload.length),new EngineHost.Cancellation(),null));
            check("real stalled download exits bounded and preserves target",stalls.get()==5&&TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start)<3000&&Arrays.equals(previous,Files.readAllBytes(target.toPath())));
        }finally {release.countDown();server.stop(0);threads.shutdownNow();}
    }
    static void testServerPreparation(File output,File hxzupTool)throws Exception {
        File root=Files.createTempDirectory(output.toPath(),"server-").toFile();byte[] client="orchestrated-client".getBytes(StandardCharsets.UTF_8);JSONObject vanilla=base(client);
        byte[] versionBytes=vanilla.toString().getBytes(StandardCharsets.UTF_8);JSONObject manifest=new JSONObject().put("versions",new JSONArray().put(new JSONObject().put("id","1.21.1").put("url","https://official.example/version.json").put("sha1",digest(versionBytes,"SHA-1"))));
        Map<String,byte[]> content=new HashMap<>();content.put(GamePreparation.MANIFEST,manifest.toString().getBytes(StandardCharsets.UTF_8));content.put("https://official.example/version.json",versionBytes);content.put("https://official.example/client",client);
        RuntimeDownloads downloads=mockDownloads(content);JSONArray presets=new JSONArray();for(ServerPresets.Preset p:ServerPresets.defaults())presets.put(p.json());
        JSONObject first=presets.getJSONObject(0);first.put("version","1.21.1").put("loader","").put("fabricAPI",false).put("autoUpdate",false);
        ServerPresets.Preset preset=ServerPresets.read(presets).get(0);GamePreparation.Context context=new GamePreparation.Context(RuntimeFiles.inside(root,"versions/HXZ-survival"),RuntimeFiles.inside(root,".engine/natives"),"Test","uuid","token","msa","","",512,800,600,Collections.emptyMap());
        ServerPreparation service=new ServerPreparation(root,downloads,null,(url,timeout,cancel)->{throw new IOException("Unexpected source request");});
        LaunchPlan launched=service.prepare(preset,context,(job,c,p)->{throw new IOException("Unexpected Java task");},new EngineHost.Cancellation(),null);
        check("single preset entry installs manual game and returns verified launch",launched.versionId.equals("HXZ-survival")&&launched.javaMajor==21);
        check("preset auto-join assembled in core",launched.gameArguments.contains("--server")&&launched.gameArguments.contains("s1.hxzmc.top"));
        LaunchPlan room=service.prepare(preset,context,(job,c,p)->{throw new IOException("Unexpected Java task");},new EngineHost.Cancellation(),null,false);
        check("room flow can suppress preset auto-join",!room.gameArguments.contains("--server"));
        LaunchPlan augmented=room.withAdditionalArguments(Collections.singletonList("-javaagent:auth.jar=https://skin.example"),Arrays.asList("--server","127.0.0.1"));
        check("prepared account and room args append as tokens",augmented.jvmArguments.contains("-javaagent:auth.jar=https://skin.example")&&augmented.gameArguments.contains("127.0.0.1"));
        if(hxzupTool!=null) {
            byte[] pack="real-hxzup-rule-fixture".getBytes(StandardCharsets.UTF_8);String sha1=digest(pack,"SHA-1");
            JSONObject profile=new JSONObject().put("gameVersion","1.21.1").put("loader",new JSONObject().put("type","").put("version",""));
            Map<String,byte[]> responses=new HashMap<>();responses.put("/version.json",new JSONObject().put("version","fixture-v1").toString().getBytes(StandardCharsets.UTF_8));
            responses.put("/game-profile.json",profile.toString().getBytes(StandardCharsets.UTF_8));
            responses.put("/manifest.json",new JSONObject().put("files",new JSONArray().put(new JSONObject().put("path","1/config/runtime-fixture.txt").put("sha1",sha1).put("fileSize",pack.length))).toString().getBytes(StandardCharsets.UTF_8));
            responses.put("/action.json",new JSONObject().put("rules",new JSONObject().put("global",new JSONObject().put("file","check_and_overwrite").put("directory","permissive"))).toString().getBytes(StandardCharsets.UTF_8));
            responses.put("/changelog.json","{}".getBytes(StandardCharsets.UTF_8));responses.put("/1/config/runtime-fixture.txt",pack);
            HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
            AtomicInteger fault=new AtomicInteger();
            server.createContext("/",exchange->{int mode=fault.get();byte[] response=mode==3?"{invalid".getBytes(StandardCharsets.UTF_8):mode==4?"{\"maintenance\":true}".getBytes(StandardCharsets.UTF_8):responses.get(exchange.getRequestURI().getPath());if(response==null)response=new byte[0];exchange.sendResponseHeaders(mode==1?503:mode==2?401:response.length==0?404:200,response.length);try(OutputStream out=exchange.getResponseBody()){out.write(response);}});server.start();
            try {
                first.put("autoUpdate",true).put("updateUrls",new JSONArray().put("http://127.0.0.1:"+server.getAddress().getPort()));ServerPresets.Preset updatePreset=ServerPresets.read(presets).get(0);
                ServerPreparation updater=new ServerPreparation(root,downloads,hxzupTool);AtomicInteger calls=new AtomicInteger();
                EngineHost real=(job,c,p)->{calls.incrementAndGet();List<String> command=new ArrayList<>();command.add(new File(System.getProperty("java.home"),"bin/java").getAbsolutePath());command.addAll(job.jvmArguments);command.add("-cp");command.add(job.classpath.get(0).getAbsolutePath());command.add(job.mainClass);command.addAll(job.arguments);
                    return new ProcessBuilder(command).directory(job.workingDirectory).inheritIO().start().waitFor();};
                LaunchPlan after=updater.prepare(updatePreset,context,real,new EngineHost.Cancellation(),null);
                check("single entry executes real existing HXZUP transaction",calls.get()==1&&Arrays.equals(Files.readAllBytes(RuntimeFiles.inside(context.run,"config/runtime-fixture.txt").toPath()),pack)&&after.versionId.equals(preset.id));
                check("HXZUP portable guard leaves game installation independent",RuntimeFiles.json(RuntimeFiles.inside(context.run,"updater/portable.json")).getString("gameVersion").equals("1.21.1"));
                first.put("profileSource","hxzup");ServerPresets.Preset cachedPreset=ServerPresets.read(presets).get(0);
                fault.set(1);List<String> phases=new ArrayList<>();long start=System.nanoTime();
                LaunchPlan offline=updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),(phase,item,done,total)->phases.add(phase));
                check("real HTTP 503 launches complete cached pack without running updater",offline.versionId.equals(preset.id)&&calls.get()==1&&phases.contains("offline")&&TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start)<2500);
                File localManifest=RuntimeFiles.inside(context.run,"updater/.updater/local-manifest.json"),receipt=RuntimeFiles.inside(context.run,"updater/.updater/local-completion.json");
                byte[] manifestBackup=Files.readAllBytes(localManifest.toPath()),receiptBackup=Files.readAllBytes(receipt.toPath());JSONObject legacy=RuntimeFiles.json(localManifest);
                File mod=RuntimeFiles.inside(context.run,"mods/fixture.jar");bytes(mod,pack);legacy.getJSONArray("files").put(new JSONObject().put("path","1/mods/fixture.jar").put("sha1",sha1).put("fileSize",pack.length));RuntimeFiles.writeJson(localManifest,legacy);Files.delete(receipt.toPath());
                check("complete older pack without receipt validates real manifest JAR hashes",updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null).versionId.equals(preset.id));
                bytes(mod,new byte[]{1});rejects("offline rejects corrupted cached mod JAR",()->updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null));
                Files.delete(mod.toPath());rejects("offline rejects missing cached mod JAR",()->updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null));bytes(localManifest,manifestBackup);bytes(receipt,receiptBackup);
                File cachedConfig=RuntimeFiles.inside(context.run,"config/runtime-fixture.txt");Files.delete(cachedConfig.toPath());
                rejects("offline rejects missing synchronized pack file",()->updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null));bytes(cachedConfig,pack);
                first.put("updateRequired",true);ServerPresets.Preset required=ServerPresets.read(presets).get(0);
                rejects("HTTP unavailable cannot bypass required update",()->updater.prepare(required,context,real,new EngineHost.Cancellation(),null));first.put("updateRequired",false);
                File pending=RuntimeFiles.inside(context.run,"updater/.updater/transaction.json");RuntimeFiles.writeJson(pending,new JSONObject());
                rejects("offline rejects pending updater transaction",()->updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null));Files.delete(pending.toPath());
                fault.set(2);rejects("real HTTP 401 is not treated as network offline",()->updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null));
                fault.set(3);rejects("malformed reachable metadata is not treated as offline",()->updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null));
                fault.set(4);check("authoritative maintenance launches verified cached pack",updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null).versionId.equals(preset.id)&&calls.get()==1);
                Files.delete(cachedConfig.toPath());rejects("maintenance cannot bypass incomplete local pack",()->updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null));bytes(cachedConfig,pack);
                EngineHost.Cancellation cancelled=new EngineHost.Cancellation();
                ServerPreparation cancelling=new ServerPreparation(root,downloads,hxzupTool,(url,timeout,c)->{cancelled.cancel();c.check();return new JSONObject();});
                rejects("source cancellation never falls back to cached launch",()->cancelling.prepare(cachedPreset,context,real,cancelled,null));
                File clientJar=RuntimeFiles.inside(root,"versions/1.21.1/1.21.1.jar");byte[] oldClient=Files.readAllBytes(clientJar.toPath());bytes(clientJar,new byte[]{1});fault.set(1);
                rejects("network outage cannot bypass incomplete game installation",()->updater.prepare(cachedPreset,context,real,new EngineHost.Cancellation(),null));bytes(clientJar,oldClient);
                testStalledMetadata(root,downloads,hxzupTool,context,cachedPreset,real);
            }finally{server.stop(0);}
        }
    }
    static void testStalledMetadata(File root,RuntimeDownloads downloads,File tool,GamePreparation.Context context,ServerPresets.Preset preset,EngineHost host)throws Exception {
        HttpServer stalled=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);CountDownLatch release=new CountDownLatch(1),secondRequest=new CountDownLatch(1);AtomicInteger requests=new AtomicInteger();
        ExecutorService threads=Executors.newFixedThreadPool(2,r->{Thread t=new Thread(r,"fixture-http");t.setDaemon(true);return t;});stalled.setExecutor(threads);
        stalled.createContext("/",exchange->{int request=requests.incrementAndGet();try{exchange.sendResponseHeaders(200,128);exchange.getResponseBody().write('{');exchange.getResponseBody().flush();if(request==2)secondRequest.countDown();release.await();}catch(Exception ignored){}finally{exchange.close();}});stalled.start();
        try {
            JSONObject configured=preset.json();configured.put("updateUrls",new JSONArray().put("http://127.0.0.1:"+stalled.getAddress().getPort()));
            JSONArray definitions=new JSONArray();definitions.put(configured);for(ServerPresets.Preset item:ServerPresets.defaults())if(!item.id.equals(preset.id))definitions.put(item.json());
            ServerPresets.Preset local=ServerPresets.read(definitions).get(0);HxzupPlan.MetadataReader reader=HxzupPlan.httpReader();
            ServerPreparation preparation=new ServerPreparation(root,downloads,tool,(url,timeout,cancel)->reader.get(url,Math.min(75,timeout),cancel));
            long start=System.nanoTime();LaunchPlan plan=preparation.prepare(local,context,host,new EngineHost.Cancellation(),null);
            check("real stalled HTTP body times out and launches complete cache",requests.get()==1&&plan.versionId.equals(preset.id)&&TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start)<2500);
            EngineHost.Cancellation cancelled=new EngineHost.Cancellation();Thread canceller=new Thread(()->{try{if(secondRequest.await(2,TimeUnit.SECONDS))cancelled.cancel();}catch(InterruptedException e){Thread.currentThread().interrupt();}},"fixture-cancel");canceller.setDaemon(true);canceller.start();
            start=System.nanoTime();try {new ServerPreparation(root,downloads,tool).prepare(local,context,host,cancelled,null);throw new AssertionError("Cancelled stalled request launched cache");}
            catch(CancellationException expected){check("real stalled source cancellation returns without cache fallback",cancelled.isCancelled()&&TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start)<2000);}
            finally {canceller.interrupt();canceller.join(1000);}
        }finally {release.countDown();stalled.stop(0);threads.shutdownNow();}
    }
    static void testInstaller(File root,GamePreparation.Context context,GamePreparation preparation,Map<String,byte[]> network,JSONObject vanilla)throws Exception {
        File processor=new File(root,"fixture-processor.jar");Manifest manifest=new Manifest();manifest.getMainAttributes().putValue("Manifest-Version","1.0");manifest.getMainAttributes().putValue("Main-Class",FixtureProcessor.class.getName());
        try(JarOutputStream jar=new JarOutputStream(new FileOutputStream(processor),manifest)) {
            String name=FixtureProcessor.class.getName().replace('.','/')+".class";jar.putNextEntry(new JarEntry(name));
            try(InputStream in=RuntimeCoreTest.class.getClassLoader().getResourceAsStream(name)){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)jar.write(buffer,0,n);}jar.closeEntry();
        }
        byte[] result="done".getBytes(StandardCharsets.UTF_8);String hash=digest(result,"SHA-1");String coordinate="fixture:processor:1";
        JSONObject profile=new JSONObject().put("minecraft","1.21.1").put("json","/version.json").put("data",new JSONObject().put("FORWARD",new JSONObject().put("client","{OUT}"))
                .put("OUT",new JSONObject().put("client","[fixture:generated:1@bin]")))
                .put("libraries",new JSONArray().put(new JSONObject().put("name",coordinate).put("downloads",new JSONObject().put("artifact",new JSONObject().put("path",RuntimeFiles.maven(coordinate)).put("url","").put("sha1",RuntimeFiles.hash(processor,"SHA-1")).put("size",processor.length())))))
                .put("processors",new JSONArray().put(new JSONObject().put("jar",coordinate).put("sides",new JSONArray().put("server")))
                        .put(new JSONObject().put("jar",coordinate).put("args",new JSONArray().put("--output").put("{FORWARD}").put("--text").put("done"))
                                .put("outputs",new JSONObject().put("{OUT}","'"+hash+"'"))));
        JSONObject version=new JSONObject().put("id","fixture-loader").put("inheritsFrom","1.21.1").put("mainClass","fixture.Main");File archive=new File(root,"fixture-installer.jar");
        try(JarOutputStream jar=new JarOutputStream(new FileOutputStream(archive))) {
            for(String name:Arrays.asList("install_profile.json","version.json","maven/"+RuntimeFiles.maven(coordinate))) {
                jar.putNextEntry(new JarEntry(name));byte[] body=name.equals("install_profile.json")?profile.toString().getBytes(StandardCharsets.UTF_8):name.equals("version.json")?version.toString().getBytes(StandardCharsets.UTF_8):Files.readAllBytes(processor.toPath());jar.write(body);jar.closeEntry();
            }
        }
        InstallerPlan plan=InstallerPlan.read(archive,root,"1.21.1",21,context);check("installer forward data refs resolve and server side skipped",plan.processors.size()==1&&plan.data().get("FORWARD").equals(plan.data().get("OUT")));
        EngineHost.Cancellation cancel=new EngineHost.Cancellation();
        rejects("zero exit without output cannot complete installer",()->plan.execute("fixture-installed",(job,c,p)->0,mockDownloads(network),context,cancel,null));
        check("failed installer leaves pending marker",RuntimeFiles.inside(root,"versions/fixture-installed/.hxz-install-pending.json").isFile());
        rejects("nonzero processor exit rejected",()->plan.execute("fixture-installed",(job,c,p)->17,mockDownloads(network),context,cancel,null));
        int[] calls={0};EngineHost real=(job,c,p)-> {
            calls[0]++;List<String> command=new ArrayList<>();command.add(new File(System.getProperty("java.home"),"bin/java").getAbsolutePath());command.addAll(job.jvmArguments);command.add("-cp");List<String> cp=new ArrayList<>();for(File file:job.classpath)cp.add(file.getAbsolutePath());command.add(String.join(File.pathSeparator,cp));command.add(job.mainClass);command.addAll(job.arguments);
            return new ProcessBuilder(command).directory(job.workingDirectory).inheritIO().start().waitFor();
        };
        plan.execute("fixture-installed",real,mockDownloads(network),context,cancel,null);
        check("real child JVM processor output verified and activated",calls[0]==1&&preparation.inspect("fixture-installed",context).complete);
        File generated=new File(plan.data().get("OUT"));Files.delete(generated.toPath());
        check("deleted generated output makes install incomplete",!preparation.inspect("fixture-installed",context).complete);
        plan.execute("fixture-installed",real,mockDownloads(network),context,cancel,null);check("installer resumes and repairs deleted output",calls[0]==2&&preparation.inspect("fixture-installed",context).complete);
        profile.getJSONObject("data").put("OUT",new JSONObject().put("client","{FORWARD}"));
        // A separate fixture proves cyclic data detection before any processor can run.
        File cyclic=new File(root,"cyclic-installer.jar");try(JarOutputStream jar=new JarOutputStream(new FileOutputStream(cyclic))){for(String name:Arrays.asList("install_profile.json","version.json")){jar.putNextEntry(new JarEntry(name));jar.write((name.equals("install_profile.json")?profile:version).toString().getBytes(StandardCharsets.UTF_8));jar.closeEntry();}}
        rejects("installer cyclic data rejected before execution",()->InstallerPlan.read(cyclic,root,"1.21.1",21,context));
    }
    public static final class FixtureProcessor {
        public static void main(String[] args)throws Exception {File output=new File(args[1]);Files.createDirectories(output.getParentFile().toPath());Files.write(output.toPath(),args[3].getBytes(StandardCharsets.UTF_8));}
    }
}

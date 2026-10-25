package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.jar.*;
import com.sun.net.httpserver.*;

/** Own synthetic metadata/transaction fixtures plus real project HXZUP child JVM. No device or game execution. */
public final class ClientModCompatibilityTest {
    static final List<String> checks=new ArrayList<>();static File output;
    interface Checked{void run()throws Exception;}
    static void check(String name,boolean yes){if(!yes)throw new AssertionError(name);checks.add(name);}
    static void rejects(String name,Checked action)throws Exception{try{action.run();}catch(Exception expected){check(name,true);return;}throw new AssertionError(name);}
    static File fresh()throws Exception{return Files.createTempDirectory(output.toPath(),"mods-").toFile();}
    static void put(File file,byte[] bytes)throws Exception{Files.createDirectories(file.getParentFile().toPath());Files.write(file.toPath(),bytes);}
    static byte[] jar(String id,String depends,boolean content,boolean nested)throws Exception{
        Map<String,String> rows=new LinkedHashMap<>();JSONObject metadata=new JSONObject().put("schemaVersion",1).put("id",id).put("version","1.0").put("environment","client");
        if(depends!=null)metadata.put("depends",new JSONObject().put(depends,"*"));if(nested)metadata.put("jars",new JSONArray().put(new JSONObject().put("file","META-INF/jars/library.jar")));rows.put("fabric.mod.json",metadata.toString());if(content)rows.put("data/example/recipes/item.json","{}");if(nested)rows.put("META-INF/jars/library.jar","not a valid nested fixture");return archive(rows);
    }
    static byte[] archive(Map<String,String> rows)throws Exception{ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(JarOutputStream zip=new JarOutputStream(bytes)){for(Map.Entry<String,String> row:rows.entrySet()){JarEntry entry=new JarEntry(row.getKey());entry.setTime(0);zip.putNextEntry(entry);zip.write(row.getValue().getBytes(StandardCharsets.UTF_8));zip.closeEntry();}}return bytes.toByteArray();}
    static byte[] bundle(String id,byte[] child,boolean jarjar)throws Exception {
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(JarOutputStream zip=new JarOutputStream(bytes)) {
            Map<String,byte[]> rows=new LinkedHashMap<>();String nested="META-INF/jars/library.jar";
            if(jarjar){rows.put("META-INF/neoforge.mods.toml",("[[mods]]\nmodId=\""+id+"\"\n").getBytes(StandardCharsets.UTF_8));rows.put("META-INF/jarjar/metadata.json",new JSONObject().put("jars",new JSONArray().put(new JSONObject().put("path",nested))).toString().getBytes(StandardCharsets.UTF_8));}
            else rows.put("fabric.mod.json",new JSONObject().put("id",id).put("version","1").put("environment","client").put("jars",new JSONArray().put(new JSONObject().put("file",nested))).toString().getBytes(StandardCharsets.UTF_8));
            rows.put(nested,child);for(Map.Entry<String,byte[]> row:rows.entrySet()){JarEntry entry=new JarEntry(row.getKey());entry.setTime(0);zip.putNextEntry(entry);zip.write(row.getValue());zip.closeEntry();}
        }return bytes.toByteArray();
    }
    static void metadataFixtures(byte[] bad)throws Exception {
        byte[] library=archive(Collections.singletonMap("META-INF/MANIFEST.MF","Manifest-Version: 1.0\r\nFMLModType: LIBRARY\r\n\r\n"));
        for(boolean jarjar:new boolean[]{false,true}) {
            File simple=fresh();put(mod(simple,"reviewed"),bad);put(mod(simple,"other"),bundle("other",library,jarjar));
            check((jarjar?"JarJar":"Fabric")+" fully parsed ordinary nested library does not block another rule",scanner(simple,bad).scanAndQuarantine(cancel(),null).disabled==1);
            File dependent=fresh();put(mod(dependent,"reviewed"),bad);put(mod(dependent,"outer"),bundle("outer",jar("nested_dep","client_fixture",false,false),jarjar));
            check((jarjar?"JarJar":"Fabric")+" nested required dependency protects candidate",scanner(dependent,bad).scanAndQuarantine(cancel(),null).disabled==0);
        }
        byte[] bundledCandidate=bundle("client_fixture",library,false);File candidate=fresh();put(mod(candidate,"reviewed-bundle"),bundledCandidate);
        check("candidate containing even ordinary nested library is retained",scanner(candidate,bundledCandidate).scanAndQuarantine(cancel(),null).disabled==0);
        byte[] deep=library;for(int i=0;i<6;i++)deep=bundle("nested"+i,deep,false);File depth=fresh();put(mod(depth,"reviewed"),bad);put(mod(depth,"deep"),deep);
        check("nested recursion budget reports unknown and protects candidate",scanner(depth,bad).dryRun(cancel(),null).findings.stream().anyMatch(x->x.decision.equals("unknown"))&&scanner(depth,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File inline=fresh();put(mod(inline,"reviewed"),bad);put(mod(inline,"inline"),archive(Collections.singletonMap("META-INF/neoforge.mods.toml","mods = [\n{modId='inline_mod',description=\"A # quoted description\"},\n]\n[dependencies]\ninline_mod = [ {modId='client_fixture',type='required',mc-publish={ignore=true}}, ]\n")));
        check("inline TOML arrays preserve actual dependency graph",scanner(inline,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File extras=fresh();put(mod(extras,"reviewed"),bad);Map<String,String> rows=new LinkedHashMap<>();rows.put("META-INF/neoforge.mods.toml","[[mods]] # comment\nmodId='retained'\nauthors = '''first\nsecond'''\n[[dependencies.\"retained\"]]\nmodId='minecraft'\n[dependencies.\"retained\".mc-publish]\nignore = true\n");rows.put("META-INF/mods.toml","[[mods]]\nmodId='${mod_id}'\n");rows.put("assets/test/Model.txt","upper");rows.put("assets/test/model.txt","lower");put(mod(extras,"tooling"),archive(rows));
        check("NeoForge metadata precedes inactive legacy template and resource case variants",scanner(extras,bad).scanAndQuarantine(cancel(),null).disabled==1);
        File quoted=fresh();put(mod(quoted,"reviewed"),bad);put(mod(quoted,"quoted"),archive(Collections.singletonMap("META-INF/neoforge.mods.toml","[[mods]]\nmodId='quoted'\n[[\"dependencies.quoted\"]]\nmodId='client_fixture'\n")));
        check("whole quoted dependency table paths are conservatively collected",scanner(quoted,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File malformed=fresh();put(mod(malformed,"reviewed"),bad);put(mod(malformed,"missing-id"),archive(Collections.singletonMap("META-INF/neoforge.mods.toml","[[mods]]\nmodId='retained'\n[[dependencies.retained]]\ntype='required'\n")));
        check("dependency row missing modId remains unknown",scanner(malformed,bad).dryRun(cancel(),null).findings.stream().anyMatch(x->x.decision.equals("unknown"))&&scanner(malformed,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File unregistered=fresh();put(mod(unregistered,"reviewed"),bad);put(new File(unregistered,"mods/arbitrary.jar.disabled"),bad);ClientModCompatibility registered=scanner(unregistered,bad);registered.scanAndQuarantine(cancel(),null);
        check("unregistered disabled files never enter validated room identity",registered.validatedQuarantine(cancel()).size()==1);
        File beforeMove=fresh();put(mod(beforeMove,"reviewed"),bad);ClientModCompatibility transaction=scanner(beforeMove,bad);EngineHost.Cancellation stop=cancel();
        rejects("cancellation before rename returns no completed scan",()->transaction.scanAndQuarantine(stop,(stage,message,current,total)->{if(current==0)stop.cancel();}));
        check("cancellation before rename preserves original and retry recovers journal",mod(beforeMove,"reviewed").isFile()&&transaction.scanAndQuarantine(cancel(),null).disabled==1);
    }
    static ClientModCompatibility scanner(File instance,byte[]... artifacts)throws Exception{List<ClientModCompatibility.Rule> rules=new ArrayList<>();for(int i=0;i<artifacts.length;i++){File tmp=File.createTempFile("rule-",".jar",output);put(tmp,artifacts[i]);try(JarFile jar=new JarFile(tmp)){JSONObject metadata=new JSONObject(new String(read(jar.getInputStream(jar.getEntry("fabric.mod.json"))),StandardCharsets.UTF_8));rules.add(new ClientModCompatibility.Rule("test-"+i,RuntimeFiles.hash(tmp,"SHA-256"),Collections.singleton(metadata.getString("id")),"Fixture-only Android incompatibility","https://example.invalid/fixture-client-only-evidence"));}}return new ClientModCompatibility(instance,rules);}
    static void renderingBundles()throws Exception {
        byte[] api=jar("shared_api",null,false,false),bundle=bundle("client_fixture",api,true);
        File hashFile=File.createTempFile("reviewed-render-",".jar",output);put(hashFile,bundle);
        ClientModCompatibility.Rule rule=new ClientModCompatibility.Rule("render-fixture",RuntimeFiles.hash(hashFile,"SHA-256"),Arrays.asList("client_fixture","shared_api"),"Reviewed client render bundle","https://example.invalid/render-evidence");
        rule.reviewedRender=true;rule.ownedIds=Collections.singleton("client_fixture");
        for(String type:new String[]{"optional","incompatible","required","future-unknown"}) {
            File dir=fresh();put(mod(dir,"render"),bundle);put(mod(dir,"api-provider"),api);
            put(mod(dir,"content"),archive(Collections.singletonMap("META-INF/neoforge.mods.toml","[[mods]]\nmodId='content'\n[[dependencies.content]]\nmodId='client_fixture'\ntype='"+type+"'\n")));
            ClientModCompatibility scanner=new ClientModCompatibility(dir,Collections.singletonList(rule));
            int expected=Arrays.asList("optional","incompatible").contains(type)?1:0;
            check("reviewed renderer honors dependency type "+type,scanner.scanAndQuarantine(cancel(),null).disabled==expected);
            if(expected==1){check("reviewed bundle room identity revalidates",scanner.validatedQuarantine(cancel()).size()==1);scanner.restoreAll(cancel());check("reviewed bundle restore keeps shared API",mod(dir,"render").isFile()&&mod(dir,"api-provider").isFile());}
        }
        File missing=fresh();put(mod(missing,"render"),bundle);put(mod(missing,"consumer"),jar("content","shared_api",true,false));
        check("shared library must retain another provider",new ClientModCompatibility(missing,Collections.singletonList(rule)).scanAndQuarantine(cancel(),null).disabled==0);
        File shared=fresh();put(mod(shared,"render"),bundle);put(mod(shared,"provider"),api);put(mod(shared,"consumer"),jar("content","shared_api",true,false));
        ClientModCompatibility group=new ClientModCompatibility(shared,Collections.singletonList(rule));
        check("shared library alternative provider permits bundle isolation",group.scanAndQuarantine(cancel(),null).disabled==1);
        try(ClientModCompatibility.Session session=group.beforePreparation(cancel())){check("HXZUP sees original rendering bundle",mod(shared,"render").isFile());session.finish(cancel(),null);}
        check("render bundle re-isolates after HXZUP",!mod(shared,"render").exists()&&group.validatedQuarantine(cancel()).size()==1);
    }
    static byte[] read(InputStream in)throws Exception{try(InputStream close=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);return out.toByteArray();}}
    static File mod(File instance,String name)throws Exception{return RuntimeFiles.inside(instance,"mods/"+name+".jar");}
    static File state(File instance)throws Exception{return RuntimeFiles.inside(instance,".hxz/client-mods/state.json");}
    static EngineHost.Cancellation cancel(){return new EngineHost.Cancellation();}
    public static void main(String[] args)throws Exception{
        output=new File(args[0]);Files.createDirectories(output.toPath());byte[] bad=jar("client_fixture",null,false,false);File instance=fresh();File original=mod(instance,"known");put(original,bad);ClientModCompatibility scanner=scanner(instance,bad);
        ClientModCompatibility.Report first=scanner.scanAndQuarantine(cancel(),null);check("exact reviewed artifact quarantined",first.disabled==1&&!original.exists());
        check("report has reasons and evidence",first.toJson().getJSONArray("findings").getJSONObject(0).getString("evidence").startsWith("https://")&&first.summary().contains("1"));
        List<ClientModCompatibility.QuarantinedFile> saved=scanner.validatedQuarantine(cancel());check("room identity receives actual preserved bytes",saved.size()==1&&saved.get(0).relativePath.equals("mods/known.jar")&&Arrays.equals(Files.readAllBytes(saved.get(0).file.toPath()),bad));
        check("repeat preflight preserves one original and one journal entry",scanner.scanAndQuarantine(cancel(),null).disabled==1&&RuntimeFiles.json(state(instance)).getJSONArray("entries").length()==1&&scanner.validatedQuarantine(cancel()).size()==1);
        try(ClientModCompatibility.Session session=scanner.beforePreparation(cancel())) {check("updater scope restores original",original.isFile());}
        check("failed preparation scope retains recoverable original",original.isFile()&&scanner.validatedQuarantine(cancel()).isEmpty());scanner.scanAndQuarantine(cancel(),null);
        JSONObject journal=RuntimeFiles.json(state(instance));journal.getJSONArray("entries").getJSONObject(0).put("status","moving");RuntimeFiles.writeJson(state(instance),journal);
        check("crash after quarantine rename recovers",scanner.scanAndQuarantine(cancel(),null).disabled==1&&scanner.validatedQuarantine(cancel()).size()==1);
        saved=scanner.validatedQuarantine(cancel());Files.move(saved.get(0).file.toPath(),original.toPath());journal=RuntimeFiles.json(state(instance));journal.getJSONArray("entries").getJSONObject(0).put("status","restoring");RuntimeFiles.writeJson(state(instance),journal);
        check("crash after restoration rename recovers",scanner.scanAndQuarantine(cancel(),null).disabled==1);
        scanner.restoreAll(cancel());check("manual restore returns original",original.isFile()&&scanner.validatedQuarantine(cancel()).isEmpty());check("manual restore preference prevents redisable",scanner.scanAndQuarantine(cancel(),null).disabled==0&&original.isFile());
        File unknownDir=fresh();put(mod(unknownDir,"unreviewed"),bad);check("default built-ins never trust synthetic test evidence",new ClientModCompatibility(unknownDir).scanAndQuarantine(cancel(),null).disabled==0);
        File contentDir=fresh();byte[] content=jar("content_fixture",null,true,false);put(mod(contentDir,"content"),content);check("content data blocks even a matching fixture rule",scanner(contentDir,content).scanAndQuarantine(cancel(),null).disabled==0);
        File dependencyDir=fresh();put(mod(dependencyDir,"known"),bad);put(mod(dependencyDir,"required-content"),jar("retained_content","client_fixture",true,false));check("retained content dependency protects reviewed mod",scanner(dependencyDir,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File unknown=fresh();put(mod(unknown,"known"),bad);put(mod(unknown,"unknown"),archive(Collections.singletonMap("example.txt","unknown metadata")));check("unknown mod metadata prevents unsafe graph assumptions",scanner(unknown,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File duplicate=fresh();put(mod(duplicate,"known"),bad);put(mod(duplicate,"same-id"),bad);check("duplicate mod id prevents quarantine",scanner(duplicate,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File nested=fresh();put(mod(nested,"known"),bad);put(mod(nested,"nested"),jar("nested_fixture",null,false,true));check("unresolved nested jars preserve all possible dependencies",scanner(nested,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File toml=fresh();put(mod(toml,"known"),bad);put(mod(toml,"neo-content"),archive(Collections.singletonMap("META-INF/neoforge.mods.toml","modLoader=\"javafml\"\n[[mods]]\nmodId=\"retained\"\n[[dependencies.retained]]\nmodId=\"client_fixture\"\ntype=\"required\"\nside=\"BOTH\"\n")));check("NeoForge dependency protects client candidate",scanner(toml,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File chain=fresh();byte[] other=jar("second_client","client_fixture",false,false);put(mod(chain,"a"),bad);put(mod(chain,"b"),other);put(mod(chain,"content"),jar("content","second_client",true,false));check("dependency protection reaches fixed point",scanner(chain,bad,other).scanAndQuarantine(cancel(),null).disabled==0);
        File together=fresh();put(mod(together,"a"),bad);put(mod(together,"b"),other);check("reviewed client-only dependency group may be disabled together",scanner(together,bad,other).scanAndQuarantine(cancel(),null).disabled==2);
        File altered=fresh();byte[] alternate=jar("client_fixture","minecraft",false,false);put(mod(altered,"different-bytes"),alternate);check("same filename and mod id without exact hash never matches",scanner(altered,bad).scanAndQuarantine(cancel(),null).disabled==0);
        File conflict=fresh();File conflictOriginal=mod(conflict,"known");put(conflictOriginal,bad);ClientModCompatibility conflictScanner=scanner(conflict,bad);conflictScanner.scanAndQuarantine(cancel(),null);byte[] user=jar("user_replacement",null,false,false);put(conflictOriginal,user);conflictScanner.restoreAll(cancel());check("restore never overwrites user replacement",Arrays.equals(Files.readAllBytes(conflictOriginal.toPath()),user));check("occupied original cannot add preserved file to room fingerprint",conflictScanner.validatedQuarantine(cancel()).isEmpty());
        File corrupt=fresh();put(mod(corrupt,"known"),bad);ClientModCompatibility corruptScanner=scanner(corrupt,bad);corruptScanner.scanAndQuarantine(cancel(),null);File backup=corruptScanner.validatedQuarantine(cancel()).get(0).file;byte[] damaged=Files.readAllBytes(backup.toPath());damaged[damaged.length-1]^=1;put(backup,damaged);check("corrupt backup cannot synthesize digest",corruptScanner.validatedQuarantine(cancel()).isEmpty());rejects("corrupt backup stops unsafe restoration",()->corruptScanner.scanAndQuarantine(cancel(),null));check("corrupt evidence is preserved for recovery",backup.isFile()&&!mod(corrupt,"known").exists());
        File forged=fresh();put(mod(forged,"known"),bad);ClientModCompatibility forgedScanner=scanner(forged,bad);forgedScanner.scanAndQuarantine(cancel(),null);journal=RuntimeFiles.json(state(forged));journal.getJSONArray("entries").getJSONObject(0).put("backup","../../user.jar");RuntimeFiles.writeJson(state(forged),journal);rejects("forged backup traversal rejected",()->forgedScanner.validatedQuarantine(cancel()));
        File canceled=fresh();put(mod(canceled,"known"),bad);EngineHost.Cancellation stop=cancel();stop.cancel();rejects("cancellation is propagated",()->scanner(canceled,bad).scanAndQuarantine(stop,null));check("cancellation preserves original bytes",Arrays.equals(Files.readAllBytes(mod(canceled,"known").toPath()),bad));
        File obsolete=fresh();put(mod(obsolete,"known"),bad);ClientModCompatibility old=scanner(obsolete,bad);old.scanAndQuarantine(cancel(),null);ClientModCompatibility removedRule=new ClientModCompatibility(obsolete);check("removed rule does not validate stale quarantine",removedRule.validatedQuarantine(cancel()).isEmpty());check("removed rule restores preserved original",removedRule.scanAndQuarantine(cancel(),null).disabled==0&&mod(obsolete,"known").isFile());
        metadataFixtures(bad);renderingBundles();
        if(args.length>1)testUpdater(new File(args[1]),bad);
        JSONObject results=new JSONObject().put("passed",checks.size()).put("checks",new JSONArray(checks)).put("scope","Synthetic mod metadata and private filesystem transactions; real project HXZUP child JVM on loopback. No Android device or game launch.");RuntimeFiles.writeJson(new File(output,"results.json"),results);System.out.println(results.toString(2));
    }
    static void testUpdater(File tool,byte[] bad)throws Exception{
        File root=fresh();byte[] client="fixture-client".getBytes(StandardCharsets.UTF_8);
        JSONObject vanilla=new JSONObject().put("id","1.21.1").put("mainClass","net.minecraft.client.main.Main").put("javaVersion",new JSONObject().put("majorVersion",21)).put("libraries",new JSONArray()).put("downloads",new JSONObject().put("client",new JSONObject().put("url","https://fixture.invalid/client").put("sha1",sha1(client)).put("size",client.length))).put("arguments",new JSONObject().put("jvm",new JSONArray().put("-cp").put("${classpath}")).put("game",new JSONArray()));
        byte[] version=vanilla.toString().getBytes(StandardCharsets.UTF_8);Map<String,byte[]> game=new HashMap<>();game.put(GamePreparation.MANIFEST,new JSONObject().put("versions",new JSONArray().put(new JSONObject().put("id","1.21.1").put("url","https://fixture.invalid/version").put("sha1",sha1(version)))).toString().getBytes(StandardCharsets.UTF_8));game.put("https://fixture.invalid/version",version);game.put("https://fixture.invalid/client",client);
        RuntimeDownloads downloads=new RuntimeDownloads((url,offset)->{byte[] bytes=game.get(url);if(bytes==null)throw new IOException(url);return new RuntimeDownloads.Response(200,bytes.length,null,new ByteArrayInputStream(bytes),null);},null);
        Map<String,byte[]> responses=new HashMap<>();responses.put("/version.json","{\"version\":\"v1\"}".getBytes(StandardCharsets.UTF_8));responses.put("/game-profile.json","{\"gameVersion\":\"1.21.1\",\"loader\":{\"type\":\"\",\"version\":\"\"}}".getBytes(StandardCharsets.UTF_8));responses.put("/manifest.json",new JSONObject().put("files",new JSONArray().put(new JSONObject().put("path","1/mods/known.jar").put("sha1",sha1(bad)).put("fileSize",bad.length))).toString().getBytes(StandardCharsets.UTF_8));responses.put("/action.json","{\"rules\":{\"global\":{\"file\":\"check_and_overwrite\",\"directory\":\"permissive\"}}}".getBytes(StandardCharsets.UTF_8));responses.put("/changelog.json","{}".getBytes(StandardCharsets.UTF_8));responses.put("/1/mods/known.jar",bad);
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);AtomicInteger fetched=new AtomicInteger(),mode=new AtomicInteger(),jobs=new AtomicInteger();server.createContext("/",exchange->{String path=exchange.getRequestURI().getPath();byte[] bytes=responses.get(path);if(bytes==null)bytes=new byte[0];if(path.equals("/1/mods/known.jar"))fetched.incrementAndGet();if(mode.get()==2&&path.equals("/version.json"))bytes="{\"maintenance\":true}".getBytes(StandardCharsets.UTF_8);exchange.sendResponseHeaders(mode.get()==1?503:bytes.length==0?404:200,bytes.length);try(OutputStream out=exchange.getResponseBody()){out.write(bytes);}});server.start();
        try {
            JSONArray presets=new JSONArray();for(ServerPresets.Preset preset:ServerPresets.defaults())presets.put(preset.json());presets.getJSONObject(0).put("version","1.21.1").put("loader","").put("fabricAPI",false).put("autoJoin",false).put("updateUrls",new JSONArray().put("http://127.0.0.1:"+server.getAddress().getPort()));ServerPresets.Preset preset=ServerPresets.read(presets).get(0);
            GamePreparation.Context context=new GamePreparation.Context(RuntimeFiles.inside(root,"versions/"+preset.id),RuntimeFiles.inside(root,"natives"),"Test","uuid","token","msa","","",512,800,600,Collections.emptyMap());ClientModCompatibility compatibility=scanner(context.run,bad);ServerPreparation service=new ServerPreparation(root,downloads,tool);AtomicInteger reported=new AtomicInteger();
            EngineHost host=(job,c,p)->{jobs.incrementAndGet();List<String> command=new ArrayList<>();command.add(new File(System.getProperty("java.home"),"bin/java.exe").getAbsolutePath());command.addAll(job.jvmArguments);command.add("-cp");command.add(job.classpath.get(0).getAbsolutePath());command.add(job.mainClass);command.addAll(job.arguments);File log=new File(output,"updater-"+jobs.get()+".log");Process child=new ProcessBuilder(command).directory(job.workingDirectory).redirectErrorStream(true).redirectOutput(log).start();if(!child.waitFor(30,TimeUnit.SECONDS)){child.destroyForcibly();throw new IOException("Updater fixture timeout");}return child.exitValue();};
            service.prepare(preset,context,host,cancel(),null,false,compatibility,report->reported.set(report.disabled));check("real HXZUP install ends with quarantine and report",reported.get()==1&&fetched.get()==1&&jobs.get()==1&&!mod(context.run,"known").exists());
            service.prepare(preset,context,host,cancel(),null,false,compatibility,null);check("next real HXZUP hash check sees restored bytes and does not redownload",jobs.get()==2&&fetched.get()==1&&compatibility.validatedQuarantine(cancel()).size()==1&&!mod(context.run,"known").exists());
            mode.set(1);service.prepare(preset,context,host,cancel(),null,false,compatibility,null);check("network outage validates restored pack then requarantines",jobs.get()==2&&compatibility.validatedQuarantine(cancel()).size()==1);
            mode.set(2);service.prepare(preset,context,host,cancel(),null,false,compatibility,null);check("maintenance validates original manifest before quarantine",jobs.get()==2&&!mod(context.run,"known").exists());
            mode.set(0);rejects("failed updater never returns launch plan",()->service.prepare(preset,context,(job,c,p)->9,cancel(),null,false,compatibility,null));check("updater failure retains original safely",mod(context.run,"known").isFile());service.prepare(preset,context,host,cancel(),null,false,compatibility,null);check("next preparation recovers after updater failure",compatibility.validatedQuarantine(cancel()).size()==1);
        }finally{server.stop(0);}
    }
    static String sha1(byte[] bytes)throws Exception{File file=File.createTempFile("digest-",".tmp",output);put(file,bytes);return RuntimeFiles.hash(file,"SHA-1");}
}

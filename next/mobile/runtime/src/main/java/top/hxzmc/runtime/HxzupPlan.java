package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
import java.net.*;
import java.util.concurrent.*;

/** Reuses the project's HXZUP rule/transaction engine; game installation belongs to GamePreparation. */
public final class HxzupPlan {
    public interface MetadataReader {JSONObject get(String url,int timeoutMillis,EngineHost.Cancellation cancel)throws Exception;}
    public static final class SourceUnavailableException extends IOException {
        public final boolean networkOnly;
        SourceUnavailableException(boolean networkOnly,Exception cause){super("All HXZUP sources unavailable or invalid",cause);this.networkOnly=networkOnly;}
    }
    private static final class StatusException extends IOException {
        final int status;StatusException(int status){super("HTTP "+status);this.status=status;}
    }
    // A broken DNS/provider must not hold preparation indefinitely. Daemon workers are bounded;
    // the socket reader still has its own timeout and closes its connection when it unwinds.
    private static final ExecutorService METADATA=new ThreadPoolExecutor(0,4,10,TimeUnit.SECONDS,new SynchronousQueue<Runnable>(),r->{Thread t=new Thread(r,"hxz-source-check");t.setDaemon(true);return t;});
    private static JSONObject boundedRead(MetadataReader reader,String url,int budget,EngineHost.Cancellation parent)throws Exception {
        EngineHost.Cancellation child=new EngineHost.Cancellation(parent);Future<JSONObject> task;
        try {task=METADATA.submit(()->reader.get(url,budget,child));}
        catch(RejectedExecutionException e){throw new SocketTimeoutException("Update source check workers are busy");}
        long deadline=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(budget);boolean complete=false;
        try {for(;;) {parent.check();long remaining=deadline-System.nanoTime();if(remaining<=0)throw new SocketTimeoutException("Update source check deadline exceeded");
            try {JSONObject result=task.get(Math.min(remaining,TimeUnit.MILLISECONDS.toNanos(100)),TimeUnit.NANOSECONDS);complete=true;return result;}
            catch(TimeoutException ignored){}catch(ExecutionException e){Throwable cause=e.getCause();if(cause instanceof Exception)throw (Exception)cause;throw new IOException("Update source reader failed",cause);}
            catch(InterruptedException e){Thread.currentThread().interrupt();parent.check();throw e;}
        }}finally {if(!complete){child.cancel();task.cancel(true);}}
    }
    private static boolean unavailable(Exception error) {
        for(Throwable cause=error;cause!=null;cause=cause.getCause()) {
            if(cause instanceof StatusException){int status=((StatusException)cause).status;return status==408||status==429||status>=500;}
            if(cause instanceof SocketException||cause instanceof SocketTimeoutException||cause instanceof UnknownHostException||cause instanceof EOFException||cause instanceof javax.net.ssl.SSLException)return true;
        }return false;
    }
    public static final class Source {
        public final String base;public final JSONObject status,gameProfile;
        Source(String base,JSONObject status,JSONObject profile){this.base=base;this.status=status;gameProfile=profile;}
        public boolean maintenance(){return status.optBoolean("maintenance");}
    }
    public final File root,instance,updater;
    private final File tool;
    private final JSONObject profile;
    private final List<String> sources;
    public HxzupPlan(File root,String id,File verifiedTool,JSONObject installedGameProfile,List<String> sources)throws Exception {
        RuntimeFiles.id(id);this.root=root.getAbsoluteFile();instance=RuntimeFiles.inside(root,"versions/"+id);updater=RuntimeFiles.inside(instance,"updater");
        tool=verifiedTool;RuntimeFiles.noLinks(tool);if(!tool.isFile())throw new IOException("Verified HXZUP tool missing");
        profile=new JSONObject(installedGameProfile.toString());RuntimeFiles.id(profile.getString("gameVersion"));
        if(sources.isEmpty()||sources.size()>16)throw new IOException("Expected 1..16 update sources");
        LinkedHashSet<String> normalized=new LinkedHashSet<>();for(String source:sources)normalized.add(ServerPresets.updateUrl(source));this.sources=new ArrayList<>(normalized);
    }
    /** Maintenance from a reachable source is authoritative; do not try another source. */
    public static Source readSource(List<String> sources,boolean profile,MetadataReader reader,EngineHost.Cancellation cancel)throws Exception {
        return readSource(sources,profile,reader,cancel,16000,8000);
    }
    static Source readSource(List<String> sources,boolean profile,MetadataReader reader,EngineHost.Cancellation cancel,int totalMillis,int perSourceMillis)throws Exception {
        if(totalMillis<1||totalMillis>16000||perSourceMillis<1||perSourceMillis>8000)throw new IllegalArgumentException("Invalid source check budget");
        if(sources.isEmpty()||sources.size()>16)throw new IOException("Expected 1..16 update sources");
        long deadline=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(totalMillis);Exception failure=null;boolean networkOnly=true;
        for(int i=0;i<sources.size();i++) {
            cancel.check();String base=ServerPresets.updateUrl(sources.get(i));long remaining=(deadline-System.nanoTime())/1000000;
            if(remaining<=0)break;int budget=(int)Math.max(1,Math.min(perSourceMillis,remaining/(sources.size()-i)));long sourceDeadline=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(budget);
            try {
                JSONObject status=boundedRead(reader,base+"/version.json",budget,cancel);
                if(status.optBoolean("maintenance"))return new Source(base,status,null);
                if(!(status.opt("version") instanceof String)||status.getString("version").isEmpty())throw new IOException("Invalid update status");
                int profileBudget=(int)Math.max(1,TimeUnit.NANOSECONDS.toMillis(sourceDeadline-System.nanoTime()));
                JSONObject game=profile?boundedRead(reader,base+"/game-profile.json",profileBudget,cancel):null;
                if(game!=null)RuntimeFiles.id(game.getString("gameVersion"));return new Source(base,status,game);
            }catch(java.util.concurrent.CancellationException e){throw e;}catch(Exception e){failure=e;networkOnly&=unavailable(e);}
        }throw new SourceUnavailableException(networkOnly,failure);
    }
    public static MetadataReader httpReader() {
        return (url,timeout,cancel)->{
            RuntimeDownloads.Http http=new RuntimeDownloads.UrlConnectionHttp(timeout,timeout);
            try(RuntimeDownloads.Response response=http.open(url,0)) {
                if(response.status!=200)throw new StatusException(response.status);ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[16384];int n;
                while((n=response.stream.read(buffer))!=-1){cancel.check();if(bytes.size()+n>8*1024*1024)throw new IOException("Metadata too large");bytes.write(buffer,0,n);}
                return new JSONObject(new String(bytes.toByteArray(),StandardCharsets.UTF_8));
            }
        };
    }
    public EngineHost.JavaJob job(int javaMajor) throws Exception {
        String main;try(JarFile jar=new JarFile(tool)){Manifest manifest=jar.getManifest();main=manifest==null?null:manifest.getMainAttributes().getValue("Main-Class");}
        if(!"up.hxz.Updater".equals(main))throw new IOException("Expected project's headless HXZUP updater tool");
        return new EngineHost.JavaJob(javaMajor,main,instance,Collections.singletonList(tool),Arrays.asList("-Xmx256m","-Dfile.encoding=UTF-8",
                "-Djava.awt.headless=true","-Dhxz.launcher.managed=true","-Dhxz.updater.dir="+updater.getAbsolutePath()),Collections.emptyList());
    }
    /** Portable mode is an existing HXZUP contract: sync rules, never spawn its PC game installer. */
    public void execute(EngineHost host,int javaMajor,Source source,GamePreparation preparation,GamePreparation.Context context,
                        String launchVersion,EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        if(source==null)throw new IOException("HXZUP requires a checked update source");
        if(source.maintenance()){assertComplete();if(!preparation.inspect(launchVersion,context).complete)throw new IOException("Maintenance: no complete local game installation");return;}
        if(!sources.contains(ServerPresets.updateUrl(source.base)))throw new IOException("Source is not in preset");
        if(!preparation.inspect(launchVersion,context).complete)throw new IOException("Install game and loader before pack synchronization");
        Files.createDirectories(updater.toPath());JSONObject config=new JSONObject();File configFile=RuntimeFiles.inside(updater,"config.json");
        if(configFile.exists())config=RuntimeFiles.json(configFile);
        List<String> preferred=new ArrayList<>();preferred.add(source.base);for(String base:sources)if(!base.equals(source.base))preferred.add(base);
        config.put("servers",new JSONArray(preferred));config.put("gameDir",root.getAbsolutePath());
        config.put("gameRunDir","versions/"+instance.getName());config.put("maxParentLevels",1);config.put("showChangelog",false);
        RuntimeFiles.writeJson(configFile,config);
        // Reuses HXZUP's published portable profile compatibility guard and file mapping level 1.
        RuntimeFiles.writeJson(RuntimeFiles.inside(updater,"portable.json"),new JSONObject().put("gameVersion",profile.getString("gameVersion")).put("loader",profile.optJSONObject("loader")==null?new JSONObject():profile.getJSONObject("loader")));
        int exit=host.runJava(job(javaMajor),cancel,progress);cancel.check();if(exit!=0)throw new IOException("HXZUP failed (exit "+exit+")");
        assertComplete();
        File local=RuntimeFiles.inside(updater,".updater/local-version.json");if(!local.isFile()||!source.status.getString("version").equals(RuntimeFiles.json(local).optString("version")))throw new IOException("HXZUP did not commit the requested update version");
        GamePreparation.InstallationState state=preparation.inspect(launchVersion,context);if(!state.complete)throw new IOException("Pack synchronization invalidated game files: "+state.problems);
        recordLocalCompletion(instance,cancel);
    }
    private static File mapped(File instance,String value)throws Exception {
        if(value==null||!value.matches("[01]/.+"))throw new IOException("Invalid local pack mapping");
        File file=RuntimeFiles.inside(value.startsWith("0/")?RuntimeFiles.inside(instance,"updater"):instance,value.substring(2));
        if(file.toPath().startsWith(RuntimeFiles.inside(instance,"updater/.updater").toPath()))throw new IOException("Pack manifest overlaps updater state");return file;
    }
    /** Private completion receipt preserves successful rule outcomes, including intentional deletions.
     * Config contents remain user editable; executable JAR contents are pinned to the committed result. */
    private static void recordLocalCompletion(File instance,EngineHost.Cancellation cancel)throws Exception {
        File cache=RuntimeFiles.inside(instance,"updater/.updater"),manifest=new File(cache,"local-manifest.json");
        JSONObject version=RuntimeFiles.json(new File(cache,"local-version.json"));JSONArray rows=RuntimeFiles.json(manifest).getJSONArray("files"),saved=new JSONArray();
        if(rows.length()>100000)throw new IOException("Local pack manifest too large");
        for(int i=0;i<rows.length();i++) {cancel.check();String path=rows.getJSONObject(i).getString("path");File file=mapped(instance,path);
            JSONObject row=new JSONObject().put("path",path).put("exists",file.isFile());
            if(file.isFile()&&path.toLowerCase(Locale.ROOT).endsWith(".jar"))row.put("sha256",RuntimeFiles.hash(file,"SHA-256"));saved.put(row);
        }
        RuntimeFiles.writeJson(new File(cache,"local-completion.json"),new JSONObject().put("schema",1).put("version",version.getString("version")).put("manifestSha256",RuntimeFiles.hash(manifest,"SHA-256")).put("files",saved));
    }
    public static void assertLocalPackComplete(File instance,EngineHost.Cancellation cancel)throws Exception {
        File cache=RuntimeFiles.inside(instance,"updater/.updater"),manifest=new File(cache,"local-manifest.json"),versionFile=new File(cache,"local-version.json");
        if(!manifest.isFile()||!versionFile.isFile())throw new IOException("A synchronized local pack is required");
        JSONObject version=RuntimeFiles.json(versionFile);if(version.optString("version").isEmpty()||!version.optString("pendingVersion").isEmpty()||new File(cache,"transaction.json").exists())throw new IOException("Local pack is not committed");
        JSONArray rows=RuntimeFiles.json(manifest).getJSONArray("files");if(rows.length()>100000)throw new IOException("Local pack manifest too large");
        Map<String,JSONObject> receipt=new HashMap<>();File completion=new File(cache,"local-completion.json");
        if(completion.isFile()) {JSONObject saved=RuntimeFiles.json(completion);
            if(saved.optInt("schema")!=1||!version.getString("version").equals(saved.optString("version"))||!RuntimeFiles.hash(manifest,"SHA-256").equals(saved.optString("manifestSha256")))throw new IOException("Local pack completion receipt mismatch");
            JSONArray files=saved.getJSONArray("files");if(files.length()!=rows.length())throw new IOException("Incomplete local pack receipt");
            for(int i=0;i<files.length();i++){JSONObject row=files.getJSONObject(i);if(receipt.put(row.getString("path"),row)!=null)throw new IOException("Duplicate local pack receipt path");}
        }
        Set<String> targets=new HashSet<>();
        for(int i=0;i<rows.length();i++) {cancel.check();JSONObject row=rows.getJSONObject(i);String path=row.getString("path");File file=mapped(instance,path);
            if(!targets.add(file.getCanonicalPath().toLowerCase(Locale.ROOT)))throw new IOException("Duplicate local pack target");
            JSONObject saved=receipt.get(path);if(completion.isFile()&&saved==null)throw new IOException("Missing local pack receipt entry");
            // A missing file is allowed only when a completed updater transaction recorded that result.
            if(saved!=null&&!saved.getBoolean("exists"))continue;
            if(!file.isFile())throw new IOException("Missing local pack file: "+path);
            if(path.toLowerCase(Locale.ROOT).endsWith(".jar")) {
                if(saved!=null) {String sha=saved.getString("sha256");if(!sha.matches("[a-f0-9]{64}")||!sha.equals(RuntimeFiles.hash(file,"SHA-256")))throw new IOException("Local pack JAR changed: "+path);}
                else {String sha=row.getString("sha1");if(!sha.matches("(?i)[a-f0-9]{40}")||file.length()!=row.getLong("fileSize")||!sha.equalsIgnoreCase(RuntimeFiles.hash(file,"SHA-1")))throw new IOException("Local pack JAR corrupt: "+path);}
            }
        }
    }
    public void assertComplete()throws Exception {
        if(RuntimeFiles.inside(updater,".updater/transaction.json").exists())throw new IOException("HXZUP transaction needs recovery");
        File version=RuntimeFiles.inside(updater,".updater/local-version.json");
        if(version.exists()&&!RuntimeFiles.json(version).optString("pendingVersion").isEmpty())throw new IOException("HXZUP has pending files");
    }
}

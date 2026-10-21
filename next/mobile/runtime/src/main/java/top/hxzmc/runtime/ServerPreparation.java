package top.hxzmc.runtime;

import org.json.*;
import java.io.*;
import java.util.*;
import java.nio.channels.*;
import java.nio.file.*;

/** Single independent entry point for the three preset -> install -> HXZUP -> verified launch flow. */
public final class ServerPreparation {
    private final File root,tool;
    private final RuntimeDownloads downloads;
    private final HxzupPlan.MetadataReader metadata;
    public ServerPreparation(File minecraftRoot,RuntimeDownloads downloads,File verifiedHxzupToolJar)throws IOException {
        this(minecraftRoot,downloads,verifiedHxzupToolJar,HxzupPlan.httpReader());
    }
    public ServerPreparation(File minecraftRoot,RuntimeDownloads downloads,File verifiedHxzupToolJar,HxzupPlan.MetadataReader metadata)throws IOException {
        root=minecraftRoot.getAbsoluteFile();RuntimeFiles.noLinks(root);this.downloads=Objects.requireNonNull(downloads);tool=verifiedHxzupToolJar;this.metadata=Objects.requireNonNull(metadata);
    }
    public LaunchPlan prepare(ServerPresets.Preset preset,GamePreparation.Context context,EngineHost host,
                              EngineHost.Cancellation cancel,EngineHost.Progress progress)throws Exception {
        return prepare(preset,context,host,cancel,progress,true);
    }
    /** Room guests/hosts pass joinPreset=false before appending their room-specific launch args. */
    public LaunchPlan prepare(ServerPresets.Preset preset,GamePreparation.Context context,EngineHost host,
                              EngineHost.Cancellation cancel,EngineHost.Progress progress,boolean joinPreset)throws Exception {
        return prepare(preset,context,host,cancel,progress,joinPreset,null,null);
    }
    /** Compatibility restoration surrounds all updater/offline hash checks; quarantine precedes returning a launch. */
    public LaunchPlan prepare(ServerPresets.Preset preset,GamePreparation.Context context,EngineHost host,
                              EngineHost.Cancellation cancel,EngineHost.Progress progress,boolean joinPreset,
                              ClientModCompatibility compatibility,ClientModCompatibility.ReportListener listener)throws Exception {
        if(compatibility!=null&&!compatibility.instance.getCanonicalFile().equals(context.run.getCanonicalFile()))throw new IOException("Compatibility scanner belongs to a different instance");
        File lock=RuntimeFiles.inside(root,".hxz/preparation.lock");Files.createDirectories(lock.getParentFile().toPath());
        try(FileChannel channel=FileChannel.open(lock.toPath(),StandardOpenOption.CREATE,StandardOpenOption.WRITE)) {
            FileLock held;
            try{held=channel.tryLock();}catch(OverlappingFileLockException e){throw new IOException("Another instance preparation is running",e);}
            if(held==null)throw new IOException("Another instance preparation is running");
            try {
                if(compatibility==null)return prepareLocked(preset,context,host,cancel,progress,joinPreset);
                try(ClientModCompatibility.Session session=compatibility.beforePreparation(cancel)) {
                    LaunchPlan plan=prepareLocked(preset,context,host,cancel,progress,joinPreset);
                    ClientModCompatibility.Report report=session.finish(cancel,progress);if(listener!=null)listener.onReport(report);return plan;
                }
            }finally{held.release();}
        }
    }
    private LaunchPlan prepareLocked(ServerPresets.Preset preset,GamePreparation.Context context,EngineHost host,
                                     EngineHost.Cancellation cancel,EngineHost.Progress progress,boolean joinPreset)throws Exception {
        cancel.check();if(!preset.enabled)throw new IOException("Server preset disabled by administrator");
        if(preset.profileSource.equals("package"))throw new IOException("Package source requires audited pack import; this runtime supports manual and HXZUP profiles");
        File expectedRun=RuntimeFiles.inside(root,"versions/"+preset.id);
        if(!context.run.getCanonicalFile().equals(expectedRun.getCanonicalFile()))throw new IOException("Preset context must use its isolated instance directory");
        GamePreparation preparation=new GamePreparation(root,downloads);
        GamePreparation.InstallationState previousState=preparation.inspect(preset.id,context);
        JSONObject previous=null;try{previous=preparation.readVersion(preset.id).optJSONObject("hxzGameProfile");}catch(Exception ignored){}
        boolean needsSync=preset.autoUpdate||preset.updateRequired||(!previousState.complete&&preset.profileSource.equals("hxzup"));
        boolean needsSource=needsSync||(!previousState.complete&&preset.profileSource.equals("hxzup"));
        HxzupPlan.Source source=null;
        if(needsSource) {
            if(preset.updateUrls.isEmpty()) {if(preset.updateRequired||preset.profileSource.equals("hxzup"))throw new IOException("Update source missing");needsSync=false;}
            else try {source=HxzupPlan.readSource(preset.updateUrls,preset.profileSource.equals("hxzup"),metadata,cancel);}
            catch(HxzupPlan.SourceUnavailableException failure) {
                cancel.check();
                if(!failure.networkOnly||preset.updateRequired||!previousState.complete)throw failure;
                assertNoPending(expectedRun);
                if(preset.profileSource.equals("hxzup")||RuntimeFiles.inside(expectedRun,"updater/.updater/local-manifest.json").exists())HxzupPlan.assertLocalPackComplete(expectedRun,cancel);
                if(progress!=null)progress.update("offline","更新服务暂不可达，使用完整本地版本",1,1);
                return finish(preparation,preset,context,cancel,progress,joinPreset);
            }
        }
        if(source!=null&&source.maintenance()) {
            assertNoPending(expectedRun);
            if(!previousState.complete)throw new IOException("Server maintenance: a complete local instance is required");
            if(preset.profileSource.equals("hxzup")||RuntimeFiles.inside(expectedRun,"updater/.updater/local-manifest.json").exists())HxzupPlan.assertLocalPackComplete(expectedRun,cancel);
            return finish(preparation,preset,context,cancel,progress,joinPreset);
        }
        JSONObject requested;
        if(preset.profileSource.equals("manual"))requested=preset.manualGameProfile();
        else if(source!=null&&source.gameProfile!=null)requested=new JSONObject(source.gameProfile.toString());
        else if(previous!=null)requested=new JSONObject(previous.toString());
        else throw new IOException("No installed or published game profile");
        if(!previousState.complete||!matches(requested,previous)) {
            if(progress!=null)progress.update("install",preset.name,0,1);
            preparation.installGame(requested,preset.id,context,host,cancel,progress);
        }
        if(needsSync&&source!=null) {
            JSONObject installed=preparation.readVersion(preset.id).getJSONObject("hxzGameProfile");
            HxzupPlan updater=new HxzupPlan(root,preset.id,Objects.requireNonNull(tool,"A verified HXZUP tool jar is required"),installed,preset.updateUrls);
            updater.execute(host,GamePreparation.javaMajor(preparation.readVersion(preset.id)),source,preparation,context,preset.id,cancel,progress);
        }
        assertNoPending(expectedRun);
        // Re-read metadata after HXZUP; its transaction may replace instance metadata.
        return finish(preparation,preset,context,cancel,progress,joinPreset);
    }
    private static LaunchPlan finish(GamePreparation preparation,ServerPresets.Preset preset,GamePreparation.Context context,
                                     EngineHost.Cancellation cancel,EngineHost.Progress progress,boolean joinPreset)throws Exception {
        LaunchPlan plan=preparation.prepare(preset.id,context,cancel,progress);
        if(joinPreset&&preset.autoJoin&&!preset.address.isEmpty()) {
            JSONObject metadata=preparation.readVersion(preset.id);List<String> args=new ArrayList<>();
            if(metadata.optJSONObject("arguments")!=null&&metadata.getJSONObject("arguments").toString().contains("quickPlayMultiplayer"))args.addAll(Arrays.asList("--quickPlayMultiplayer",preset.address));
            else {java.net.URI server=new java.net.URI("http://"+preset.address);if(server.getHost()==null)throw new IOException("Invalid preset server host");args.addAll(Arrays.asList("--server",server.getHost(),"--port",String.valueOf(server.getPort()==-1?25565:server.getPort())));}
            plan=plan.withAdditionalArguments(Collections.emptyList(),args);
        }return plan;
    }
    private static boolean matches(JSONObject requested,JSONObject installed)throws Exception {
        if(installed==null||!requested.getString("gameVersion").equals(installed.optString("gameVersion")))return false;
        JSONObject a=requested.optJSONObject("loader"),b=installed.optJSONObject("loader");
        String type=a==null?"":a.optString("type"),actual=b==null?"":b.optString("type");
        if(type.equals("vanilla"))type="";if(actual.equals("vanilla"))actual="";
        if(!type.equals(actual))return false;String version=a==null?"":a.optString("version");
        if(!version.isEmpty()&&!version.equals(b==null?"":b.optString("version")))return false;
        return requested.optBoolean("fabricAPI")==installed.optBoolean("fabricAPI");
    }
    private static void assertNoPending(File instance)throws Exception {
        if(RuntimeFiles.inside(instance,".hxz-install-pending.json").exists())throw new IOException("Game installation is pending");
        if(RuntimeFiles.inside(instance,"updater/.updater/transaction.json").exists())throw new IOException("HXZUP transaction needs recovery");
        File local=RuntimeFiles.inside(instance,"updater/.updater/local-version.json");
        if(local.isFile()&&!RuntimeFiles.json(local).optString("pendingVersion").isEmpty())throw new IOException("HXZUP has pending files");
    }
}

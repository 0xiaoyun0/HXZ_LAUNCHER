package com.tungsten.fcl.hxz;

import android.app.*;
import android.content.*;
import android.content.pm.*;
import com.google.gson.*;
import com.mio.data.Renderer;
import com.tungsten.fcl.game.LauncherHelper;
import com.tungsten.fcl.setting.*;
import com.tungsten.fcl.ui.TaskDialog;
import com.tungsten.fclcore.auth.Account;
import com.tungsten.fclcore.download.*;
import com.tungsten.fclcore.game.GameComponentType;
import com.tungsten.fclcore.task.*;
import org.json.*;
import up.hxz.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

final class HxzPreparation {
    private static <T>T ui(Activity activity,Callable<T> action)throws Exception{
        if(activity.isFinishing()||activity.isDestroyed())throw new IOException("安装窗口已关闭，请返回社区继续安装");
        FutureTask<T> task=new FutureTask<>(action);activity.runOnUiThread(task);
        try{return task.get(20,TimeUnit.SECONDS);}catch(TimeoutException e){task.cancel(false);throw new IOException("安装界面未响应，已保留下载，请重新打开运行组件",e);}catch(ExecutionException e){throw new IOException("准备游戏界面失败",e.getCause());}
    }
    private static void execute(Activity activity,TaskDialog pane,AtomicReference<TaskExecutor> active,TaskExecutor task)throws Exception{
        active.set(task);ui(activity,()->{pane.setExecutor(task,false);return null;});
        if(!task.test()){if(Thread.currentThread().isInterrupted())throw new InterruptedException("安装已暂停");throw new IOException("游戏安装未完成，可继续安装",task.getException());}
        active.compareAndSet(task,null);
    }
    static void run(Activity activity,JSONObject job,TaskDialog pane,AtomicReference<TaskExecutor> active)throws Exception{
        JSONObject preset=job.getJSONObject("server"),options=job.optJSONObject("options");if(options==null)options=new JSONObject();
        if(!preset.optBoolean("enabled",true))throw new IOException("管理员暂时关闭了此服务器");
        String id=preset.getString("id");if(!Arrays.asList("HXZ-survival","HXZ-mod-1","HXZ-mod-2").contains(id))throw new IOException("服务器标识无效");
        File parent=activity.getExternalFilesDir(null);if(parent==null)throw new IOException("设备游戏存储暂不可用");
        Path root=new File(parent,"HXZ-minecraft/"+id+"/.minecraft").getCanonicalFile().toPath();Files.createDirectories(root);
        List<String> urls=new ArrayList<>();JSONArray update=preset.optJSONArray("updateUrls");if(update!=null)for(int i=0;i<Math.min(16,update.length());i++)urls.add(update.getString(i));
        Consumer<String> progress=text->{HxzRunner.record(activity,text);activity.runOnUiThread(()->{if(pane.isShowing())pane.setTitle(text);});HxzInstallService.stage(activity,text);};
        JsonObject game;Path saved=root.resolve("hxz-game-profile.json");
        progress.accept("正在读取服务器游戏配置");
        if("hxzup".equals(preset.optString("profileSource"))){try{game=AndroidPack.profile(urls);}catch(Exception e){if(!Files.isRegularFile(saved)||preset.optBoolean("updateRequired"))throw e;game=JsonParser.parseString(new String(Files.readAllBytes(saved),StandardCharsets.UTF_8)).getAsJsonObject();progress.accept("更新服务暂不可用，保留已安装的版本");}}
        else if("package".equals(preset.optString("profileSource")))throw new IOException("此服务器使用归档整合包，请先在运行组件中导入，或请管理员配置 HXZ UP。");
        else{game=new JsonObject();game.addProperty("gameVersion",preset.getString("version"));JsonObject loader=new JsonObject();loader.addProperty("type",preset.optString("loader"));loader.addProperty("version",preset.optString("loaderVersion"));game.add("loader",loader);}
        String minecraft=game.get("gameVersion").getAsString();if(!minecraft.matches("[A-Za-z0-9.+_-]{1,100}"))throw new IOException("游戏版本格式无效");
        JsonObject loader=game.has("loader")?game.getAsJsonObject("loader"):new JsonObject();String type=loader.has("type")?loader.get("type").getAsString():"",lv=loader.has("version")?loader.get("version").getAsString():"";
        String requested=options.optString("renderer","auto");boolean vulkan=activity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_VULKAN_HARDWARE_VERSION,0x400000);
        final String renderer="auto".equals(requested)?((type.equals("neoforge")||type.equals("forge"))&&vulkan?"zink":"nggl4es"):requested;
        AndroidCompatibility.configure(activity.getAssets().open("hxz/android-compatibility.json"));
        try(AndroidCompatibility.Session compatibility=AndroidCompatibility.open(root,renderer,progress)){
            boolean shouldUpdate=!urls.isEmpty()&&(options.optBoolean("autoUpdate",true)||preset.optBoolean("updateRequired"));
            if(shouldUpdate)AndroidPack.preflight(urls,progress);
            Profile profile=ui(activity,()->{Profile found=null;for(Profile p:Profiles.getProfiles())if(p.getGameDir().equals(root.toFile())){found=p;break;}if(found==null){found=new Profile("幻想镇 · "+preset.optString("name",id),root.toFile());Profiles.addProfile(found);}Profiles.setSelectedProfile(found);return found;});
            if(!type.isEmpty()&&!type.equals("vanilla")&&lv.isEmpty()){
                GameComponentType component=GameComponentType.fromPatchId(type);if(component==null)throw new IOException("加载器类型不受支持");ComponentVersionList<?> list=profile.getDependency().getVersionList(component);
                progress.accept("正在获取 "+type+" 版本");execute(activity,pane,active,list.loadAsync(minecraft).executor());
                ComponentRemoteVersion latest=list.getVersions(minecraft).stream().max(Comparator.naturalOrder()).orElseThrow(()->new IOException("当前 Minecraft 暂无对应加载器"));lv=latest.getSelfVersion();loader.addProperty("version",lv);game.add("loader",loader);
            }
            String identity=minecraft+":"+type+":"+lv;byte[] digest=MessageDigest.getInstance("SHA-256").digest(identity.getBytes(StandardCharsets.UTF_8));StringBuilder suffix=new StringBuilder();for(int i=0;i<6;i++)suffix.append(String.format(Locale.ROOT,"%02x",digest[i]&255));String version=id+"-"+suffix;
            AndroidInstallState install=new AndroidInstallState(root,version,identity);
            if(!install.complete()){
                install.begin();progress.accept("正在安装 "+minecraft+" · "+type+" · Java "+InstallerRuntime.forGame(minecraft));
                GameBuilder builder=profile.getDependency().gameBuilder().name(version).gameVersion(minecraft);if(!type.isEmpty()&&!type.equals("vanilla"))builder.version(type,lv);
                if(builder instanceof DefaultGameBuilder)((DefaultGameBuilder)builder).setPreserveFilesOnFailure(true);
                execute(activity,pane,active,builder.buildAsync().executor());profile.getRepository().refreshVersions();install.finish();
            }
            if(Thread.currentThread().isInterrupted())throw new InterruptedException("安装已暂停");
            if(shouldUpdate)AndroidPack.update(root,urls,game,progress);
            progress.accept("正在应用手机兼容配置");compatibility.reconcile();
            AndroidNativeFix.apply(root,activity.getAssets().open("hxz/sable-android-patch-2.0.3.jar"),progress);
            if(preset.optBoolean("fabricAPI")&&type.equals("fabric"))AndroidPack.fabricAPI(root,minecraft,progress);
            Path temp=Files.createTempFile(root,"profile-",".tmp");try{Files.write(temp,game.toString().getBytes(StandardCharsets.UTF_8));Files.move(temp,saved,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}
            JSONObject selected=job.getJSONObject("account");Map<Object,Object> storage=new HashMap<>();storage.put("serverBaseURL","https://skin.hxzmc.top/api/yggdrasil");storage.put("username",selected.getString("name"));storage.put("displayName",selected.getString("name"));storage.put("uuid",selected.getString("uuid"));storage.put("accessToken",selected.getString("accessToken"));storage.put("clientToken",selected.getString("clientToken"));Account account=Accounts.FACTORY_AUTHLIB_INJECTOR.fromStorage(storage);
            final JSONObject settings=options;
            progress.accept("游戏文件已就绪 · "+renderer);
            ui(activity,()->{profile.setSelectedVersion(version);VersionSetting setting=profile.getVersionSetting(version);setting.setUsesGlobal(false);setting.setIsolateGameDir(false);setting.setJava("Auto");
                ActivityManager.MemoryInfo memory=new ActivityManager.MemoryInfo();((ActivityManager)activity.getSystemService(Context.ACTIVITY_SERVICE)).getMemoryInfo(memory);int max=Math.max(512,(int)Math.min(6144,Math.min(memory.totalMem/1048576*.60,memory.availMem/1048576-1024)));
                setting.setAutoMemory(false);setting.setMaxMemory(settings.optInt("memoryMB",0)<=0?max:Math.max(512,Math.min(max,settings.optInt("memoryMB"))));
                setting.setServerIp(settings.optBoolean("autoJoin",true)?preset.optString("address",""):"");setting.setRenderer(renderer.equals("zink")?Renderer.ID_ZINK:renderer.equals("virgl")?Renderer.ID_VIRGL:Renderer.ID_NGGL4ES);
                pane.dismiss();if(settings.optBoolean("prepareOnly"))android.widget.Toast.makeText(activity,"安装完成，安卓适配记录保存在实例 updater/android-compatibility 中",android.widget.Toast.LENGTH_LONG).show();else new LauncherHelper(activity,profile,account,version).launch();return null;});
        }
    }
}

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
        List<String> urls=new ArrayList<>();JSONArray update=preset.optJSONArray("updateUrls");if(update!=null)for(int i=0;i<Math.min(16,update.length());i++){String url=update.getString(i).trim();if(!url.isEmpty()&&!urls.contains(url))urls.add(url);}
        String legacy=preset.optString("updateUrl","").trim();if(!legacy.isEmpty()&&!urls.contains(legacy)&&urls.size()<16)urls.add(legacy);
        if(urls.isEmpty()&&("hxzup".equals(preset.optString("profileSource"))||preset.optBoolean("updateRequired")))throw new IOException("服务器尚未配置 HXZUP 地址，请联系管理员");
        Consumer<String> progress=text->{HxzRunner.record(activity,text);activity.runOnUiThread(()->{if(pane.isShowing())pane.setTitle(text);});HxzInstallService.stage(activity,text);};
        progress.accept("正在导入社区皮肤站账号");Account account=ui(activity,()->HxzAccounts.install(job.getJSONObject("account")));
        progress.accept("正在验证幻想镇皮肤站账号");account.logIn();progress.accept("皮肤站验证通过");
        HxzLaunch.remember(root,preset,options);
        boolean shouldUpdate=AndroidPack.shouldUpdate(root,urls,options.optBoolean("autoUpdate",preset.optBoolean("autoUpdate",true)),preset.optBoolean("updateRequired"));
        JsonObject game;Path saved=root.resolve("hxz-game-profile.json");
        progress.accept("正在读取服务器游戏配置");
        if(!shouldUpdate&&Files.isRegularFile(saved))game=JsonParser.parseString(new String(Files.readAllBytes(saved),StandardCharsets.UTF_8)).getAsJsonObject();
        else if("hxzup".equals(preset.optString("profileSource"))){try{game=AndroidPack.profile(urls);}catch(Exception e){if(!Files.isRegularFile(saved)||preset.optBoolean("updateRequired")||!AndroidPack.installed(root))throw e;game=JsonParser.parseString(new String(Files.readAllBytes(saved),StandardCharsets.UTF_8)).getAsJsonObject();progress.accept("更新服务暂不可用，保留已安装的版本");}}
        else if("package".equals(preset.optString("profileSource")))throw new IOException("此服务器使用归档整合包，请先在运行组件中导入，或请管理员配置 HXZ UP。");
        else{game=new JsonObject();game.addProperty("gameVersion",preset.getString("version"));JsonObject loader=new JsonObject();loader.addProperty("type",preset.optString("loader"));loader.addProperty("version",preset.optString("loaderVersion"));game.add("loader",loader);}
        String minecraft=game.get("gameVersion").getAsString();if(!minecraft.matches("[A-Za-z0-9.+_-]{1,100}"))throw new IOException("游戏版本格式无效");
        JsonObject loader=game.has("loader")?game.getAsJsonObject("loader"):new JsonObject();String type=loader.has("type")?loader.get("type").getAsString():"",lv=loader.has("version")?loader.get("version").getAsString():"";
        String requested=options.optString("renderer","auto");
        final HxzGraphics.Selection graphics=HxzGraphics.select(activity,requested,minecraft,type,progress);
        final String renderer=graphics.renderer;
        AndroidCompatibility.configure(activity.getAssets().open("hxz/android-compatibility.json"));
        try(AndroidCompatibility.Session compatibility=AndroidCompatibility.open(root,renderer,progress)){
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
            if(shouldUpdate){progress.accept("正在调用 HXZUP 更新整合包");AndroidPack.update(root,urls,game,progress);if(!AndroidPack.installed(root))throw new IOException("HXZUP 尚未完成首次安装，服务器可能正在维护，请稍后继续");progress.accept("HXZUP 整合包同步完成");}
            else progress.accept(urls.isEmpty()?"此实例未配置整合包更新":"已按设置跳过更新，使用本地完整整合包");
            progress.accept("正在应用手机兼容配置");compatibility.reconcile();
            if(AndroidGameDefaults.apply(root))progress.accept("已应用手机画质：关闭默认光影、降低视距；可在游戏设置中调整");
            AndroidNativeFix.apply(root,activity.getAssets().open("hxz/sable-android-patch-2.0.3.jar"),progress);
            if(preset.optBoolean("fabricAPI")&&type.equals("fabric"))AndroidPack.fabricAPI(root,minecraft,progress);
            Path temp=Files.createTempFile(root,"profile-",".tmp");try{Files.write(temp,game.toString().getBytes(StandardCharsets.UTF_8));Files.move(temp,saved,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}
            final JSONObject settings=options;
            VersionSetting instance=ui(activity,()->profile.getRepository().specializeVersionSetting(version));
            if(instance==null)throw new IOException("版本尚未就绪，请继续安装");
            HxzGraphics.firstRunDisplay(activity);
            progress.accept("游戏文件已就绪 · "+renderer);
            ui(activity,()->{profile.setSelectedVersion(version);VersionSetting setting=profile.getRepository().specializeVersionSetting(version);if(setting==null)throw new IOException("版本尚未就绪，请继续安装");setting.setIsolateGameDir(false);setting.setJava("Auto");
                if(!settings.optBoolean("prepareOnly"))HxzMemory.configure(activity,setting,settings.optInt("memoryMB",0),!id.equals("HXZ-survival"),renderer.equals("zink"),progress);
                setting.setServerIp(settings.optBoolean("autoJoin",true)?preset.optString("address",""):"");setting.setRenderer(renderer.equals("zink")?Renderer.ID_ZINK:renderer.equals("virgl")?Renderer.ID_VIRGL:Renderer.ID_NGGL4ES);setting.setVKDriverSystem(graphics.systemDriver);if(renderer.equals("zink")&&!graphics.systemDriver)setting.setDriver("Turnip");
                pane.dismiss();if(settings.optBoolean("prepareOnly"))android.widget.Toast.makeText(activity,"安装完成，安卓适配记录保存在实例 updater/android-compatibility 中",android.widget.Toast.LENGTH_LONG).show();else new LauncherHelper(activity,profile,account,version).launchPrepared();return null;});
        }
    }
}

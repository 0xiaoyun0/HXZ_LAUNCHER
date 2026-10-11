package com.tungsten.fcl.hxz;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.tungsten.fcl.setting.*;
import com.tungsten.fcl.game.LauncherHelper;
import com.tungsten.fcl.ui.TaskDialog;
import com.tungsten.fcl.util.TaskCancellationAction;
import com.tungsten.fclcore.auth.Account;
import com.tungsten.fclcore.download.*;
import com.tungsten.fclcore.game.GameComponentType;
import com.tungsten.fclcore.task.*;
import com.mio.data.Renderer;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import up.hxz.AndroidPack;

public final class HxzRunner {
    private static JSONObject pending;
    private static boolean running;
    public static synchronized void offer(JSONObject job){if(running)throw new IllegalStateException("已有游戏准备任务，请完成或取消后重试");pending=job;}
    public static synchronized void consume(Activity activity){
        if(pending==null||running)return;JSONObject job=pending;pending=null;running=true;
        AtomicReference<TaskExecutor> active=new AtomicReference<>();AtomicReference<Thread> worker=new AtomicReference<>();
        TaskDialog pane=new TaskDialog(activity,new TaskCancellationAction((Runnable)()->{TaskExecutor e=active.get();if(e!=null)e.cancel();Thread t=worker.get();if(t!=null)t.interrupt();}));
        pane.setTitle("幻想镇 · 准备游戏");pane.show();
        Thread thread=new Thread(()->{
            try{prepare(activity,job,pane,active);}
            catch(Exception e){activity.runOnUiThread(()->{pane.dismiss();com.tungsten.fcllibrary.component.dialog.FCLAlertDialog.Builder dialog=new com.tungsten.fcllibrary.component.dialog.FCLAlertDialog.Builder(activity);dialog.setMessage("游戏尚未启动\n"+(e.getMessage()==null?e.getClass().getSimpleName():e.getMessage())+"\n\n已校验的下载会保留。可以回到幻想镇社区重新尝试；部分电脑模组可能不支持手机。");dialog.setPositiveButton(()->{});dialog.create().show();});}
            finally{synchronized(HxzRunner.class){running=false;}job.remove("account");}
        },"hxz-game-prepare");worker.set(thread);thread.start();
    }
    private static void prepare(Activity activity,JSONObject job,TaskDialog pane,AtomicReference<TaskExecutor> active)throws Exception{
        JSONObject preset=job.getJSONObject("server"),options=job.optJSONObject("options");if(options==null)options=new JSONObject();
        if(!preset.optBoolean("enabled",true))throw new IOException("管理员暂时关闭了此服务器");
        String id=preset.getString("id");File root=new File(activity.getExternalFilesDir(null),"HXZ-minecraft/"+id+"/.minecraft").getCanonicalFile();root.mkdirs();
        List<String> urls=new ArrayList<>();JSONArray update=preset.optJSONArray("updateUrls");if(update!=null)for(int i=0;i<Math.min(16,update.length());i++)urls.add(update.getString(i));
        final java.util.function.Consumer<String> progress=text->activity.runOnUiThread(()->pane.setTitle(text));
        JsonObject game;Path saved=root.toPath().resolve("hxz-game-profile.json");
        if("hxzup".equals(preset.optString("profileSource"))){
            try{game=AndroidPack.profile(urls);}catch(Exception e){if(!Files.isRegularFile(saved)||preset.optBoolean("updateRequired"))throw e;game=JsonParser.parseString(new String(Files.readAllBytes(saved),StandardCharsets.UTF_8)).getAsJsonObject();progress.accept("更新服务暂不可用，使用已安装的版本");}
        }else if("package".equals(preset.optString("profileSource")))throw new IOException("此服务器配置为整合包归档安装。请先在运行引擎中导入该整合包，或请管理员提供 HXZ UP 游戏配置。");
        else{game=new JsonObject();game.addProperty("gameVersion",preset.getString("version"));JsonObject loader=new JsonObject();loader.addProperty("type",preset.optString("loader"));loader.addProperty("version",preset.optString("loaderVersion"));game.add("loader",loader);}
        String minecraft=game.get("gameVersion").getAsString();if(!minecraft.matches("[A-Za-z0-9.+_-]{1,100}"))throw new IOException("游戏版本格式无效");
        final Profile[] result=new Profile[1];java.util.concurrent.CountDownLatch ready=new java.util.concurrent.CountDownLatch(1);
        activity.runOnUiThread(()->{Profile found=null;for(Profile p:Profiles.getProfiles())if(p.getGameDir().equals(root)){found=p;break;}if(found==null){found=new Profile("幻想镇 · "+preset.optString("name",id),root);Profiles.addProfile(found);}Profiles.setSelectedProfile(found);result[0]=found;ready.countDown();});ready.await();Profile profile=result[0];
        JsonObject loader=game.has("loader")?game.getAsJsonObject("loader"):new JsonObject();String type=loader.has("type")?loader.get("type").getAsString():"",lv=loader.has("version")?loader.get("version").getAsString():"";
        if(!type.isEmpty()&&!type.equals("vanilla")&&lv.isEmpty()){
            GameComponentType component=GameComponentType.fromPatchId(type);if(component==null)throw new IOException("加载器类型不受支持");ComponentVersionList<?> list=profile.getDependency().getVersionList(component);TaskExecutor load=list.loadAsync(minecraft).executor();active.set(load);if(!load.test())throw new IOException("无法获取加载器版本",load.getException());
            ComponentRemoteVersion latest=list.getVersions(minecraft).stream().max(Comparator.naturalOrder()).orElseThrow(()->new IOException("此 Minecraft 版本暂时没有对应加载器"));lv=latest.getSelfVersion();loader.addProperty("version",lv);game.add("loader",loader);
        }
        String identity=minecraft+":"+type+":"+lv;byte[] digest=MessageDigest.getInstance("SHA-256").digest(identity.getBytes(StandardCharsets.UTF_8));StringBuilder suffix=new StringBuilder();for(int i=0;i<6;i++)suffix.append(String.format(Locale.ROOT,"%02x",digest[i]&255));String version=id+"-"+suffix;
        File descriptor=new File(root,"versions/"+version+"/"+version+".json");
        if(!descriptor.isFile()){
            progress.accept("正在安装 "+minecraft+(type.isEmpty()?"":" · "+type));GameBuilder builder=profile.getDependency().gameBuilder().name(version).gameVersion(minecraft);if(!type.isEmpty()&&!type.equals("vanilla"))builder.version(type,lv);
            TaskExecutor executor=builder.buildAsync().executor();active.set(executor);activity.runOnUiThread(()->pane.setExecutor(executor,false));if(!executor.test())throw new IOException("游戏安装未完成，可重新尝试",executor.getException());profile.getRepository().refreshVersions();
        }
        if(Thread.currentThread().isInterrupted())throw new InterruptedException("已取消");
        if(!urls.isEmpty()&&(options.optBoolean("autoUpdate",true)||preset.optBoolean("updateRequired"))){
            try{AndroidPack.update(root.toPath(),urls,game,progress);}catch(Exception e){if(preset.optBoolean("updateRequired")||!Files.isRegularFile(saved))throw e;throw new IOException("整合包更新未完成。原文件已保留；可在社区游戏设置中关闭本次自动更新后重试。",e);}
        }
        if(preset.optBoolean("fabricAPI")&&type.equals("fabric"))AndroidPack.fabricAPI(root.toPath(),minecraft,progress);
        Files.write(saved,game.toString().getBytes(StandardCharsets.UTF_8));
        JSONObject selected=job.getJSONObject("account");Map<Object,Object> storage=new HashMap<>();storage.put("serverBaseURL","https://skin.hxzmc.top/api/yggdrasil");storage.put("username",selected.getString("name"));storage.put("displayName",selected.getString("name"));storage.put("uuid",selected.getString("uuid"));storage.put("accessToken",selected.getString("accessToken"));storage.put("clientToken",selected.getString("clientToken"));Account account=Accounts.FACTORY_AUTHLIB_INJECTOR.fromStorage(storage);
        JSONObject settings=options;
        activity.runOnUiThread(()->{try{
            profile.setSelectedVersion(version);VersionSetting setting=profile.getVersionSetting(version);setting.setUsesGlobal(false);setting.setIsolateGameDir(false);setting.setAutoMemory(settings.optInt("memoryMB",0)<=0);
            ActivityManager.MemoryInfo memory=new ActivityManager.MemoryInfo();((ActivityManager)activity.getSystemService(Context.ACTIVITY_SERVICE)).getMemoryInfo(memory);int max=Math.max(512,(int)Math.min(6144,memory.totalMem/1024/1024*.65));setting.setMaxMemory(Math.max(512,Math.min(max,settings.optInt("memoryMB",Math.min(3072,max)))));
            setting.setServerIp(settings.optBoolean("autoJoin",true)?preset.optString("address",""):"");String renderer=settings.optString("renderer","auto");if(renderer.equals("nggl4es"))setting.setRenderer(Renderer.ID_NGGL4ES);if(renderer.equals("virgl"))setting.setRenderer(Renderer.ID_VIRGL);if(renderer.equals("zink"))setting.setRenderer(Renderer.ID_ZINK);
            if(settings.optBoolean("prepareOnly")){pane.dismiss();android.widget.Toast.makeText(activity,"安装完成，可在引擎中调整触控和渲染设置",android.widget.Toast.LENGTH_LONG).show();}else{pane.dismiss();new LauncherHelper(activity,profile,account,version).launch();}
        }catch(Exception e){pane.setTitle("准备启动失败："+e.getMessage());}});
    }
}

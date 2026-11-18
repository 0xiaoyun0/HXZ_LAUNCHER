package com.tungsten.fcl.hxz;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import com.mio.device.VulkanCapabilities;
import com.mio.device.VulkanChecker;
import com.mio.plugin.DriverPlugin;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import java.util.function.Consumer;

/** Probe the selected driver once before launching a modpack, rather than failing in GLFW. */
final class HxzGraphics {
    static void firstRunDisplay(Context context) throws Exception {
        Path folder = java.nio.file.Paths.get(com.tungsten.fclauncher.utils.FCLPath.FILES_DIR);
        Path marker = folder.resolve("hxz-mobile-display-v1"), target = folder.resolve("menu_setting.json");
        if (Files.exists(marker)) return;
        JSONObject menu = Files.isRegularFile(target) ? new JSONObject(new String(Files.readAllBytes(target), StandardCharsets.UTF_8)) : new JSONObject();
        if (menu.optDouble("windowScale", 1) == 1) {
            android.util.DisplayMetrics metrics = context.getResources().getDisplayMetrics();
            menu.put("windowScale", Math.max(.35, Math.min(1, 1600d / Math.max(metrics.widthPixels, metrics.heightPixels))));
            Path backup = folder.resolve("menu_setting.before-hxz-mobile.json");
            if (Files.isRegularFile(target) && !Files.exists(backup)) Files.copy(target, backup);
            Path temp = Files.createTempFile(folder, "menu-", ".tmp");
            try { Files.write(temp, menu.toString().getBytes(StandardCharsets.UTF_8)); Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING); }
            finally { Files.deleteIfExists(temp); }
        }
        Files.write(marker, new byte[]{1});
    }
    static final class Selection {
        final String renderer;final boolean systemDriver;
        Selection(String renderer,boolean systemDriver){this.renderer=renderer;this.systemDriver=systemDriver;}
    }
    static Selection select(Context context,String requested,String minecraft,String loader,Consumer<String> progress)throws IOException{
        SharedPreferences cache=context.getSharedPreferences("hxz-graphics-check",Context.MODE_PRIVATE);
        String key="v3:"+Build.FINGERPRINT+":"+context.getApplicationInfo().nativeLibraryDir;
        JSONObject caps=null;
        try{JSONObject old=new JSONObject(cache.getString("device","{}"));if(key.equals(old.optString("key"))&&System.currentTimeMillis()-old.optLong("at")<86400000)caps=old;}catch(Exception ignored){}
        if(caps==null){
            progress.accept("正在校验设备 GPU、OpenGL ES 与 Vulkan 驱动");caps=new JSONObject();
            try(Probe probe=new Probe(context)){
                android.os.Bundle gl=probe.query("gles");String gpu=gl.getString("gpu","");
                caps.put("gles",gl.getInt("gles"));caps.put("gpu",gpu);
                caps.put("system",probe.query("system").getBoolean("supported"));
                boolean adreno=(gpu+" "+gl.getString("vendor","")).toLowerCase(java.util.Locale.ROOT).matches(".*(adreno|qualcomm).*");
                boolean stockPreferred=Build.VERSION.SDK_INT>=31&&Build.SOC_MODEL.toUpperCase(java.util.Locale.ROOT).startsWith("SM8750");
                caps.put("custom",adreno&&!stockPreferred&&probe.query("custom").getBoolean("supported"));
                caps.put("key",key);caps.put("at",System.currentTimeMillis());
                if(caps.optInt("gles")>0)cache.edit().putString("device",caps.toString()).apply();
            }catch(InterruptedException e){Thread.currentThread().interrupt();throw new IOException("已取消图形检测",e);}
            catch(Exception e){throw new IOException("设备图形检测未完成，已停止启动以保护应用。请关闭其他游戏后重试；已安装文件保留。",e);}
        }
        boolean vulkan=caps.optBoolean("custom")||caps.optBoolean("system");
        boolean modern=up.hxz.InstallerRuntime.forGame(minecraft)>=17;
        if(caps.optInt("gles")<(modern?3:2)&&!vulkan)throw new IOException("当前设备无法创建此游戏需要的图形环境。请尝试更低版本或在兼容设备运行，已安装文件保留。");
        boolean modded="forge".equals(loader)||"neoforge".equals(loader);
        String automatic=(modded||up.hxz.InstallerRuntime.forGame(minecraft)>=25)&&vulkan?"zink":modded?"virgl":"nggl4es";
        String renderer=java.util.Arrays.asList("zink","virgl","nggl4es").contains(requested)?requested:automatic;
        if(renderer.equals("zink")&&!vulkan){renderer=modded?"virgl":"nggl4es";progress.accept("Vulkan 驱动不适用，已自动改用 "+renderer);}
        if(!renderer.equals("zink")&&caps.optInt("gles")<(modern?3:2)){renderer="zink";progress.accept("OpenGL ES 环境不适用，已自动改用 Zink");}
        boolean system=!caps.optBoolean("custom");
        progress.accept("GPU："+caps.optString("gpu","未知")+" · 已选择 "+renderer+(renderer.equals("zink")?(system?" / 系统 Vulkan":" / 内置 Turnip"):"")+"，将写入 FCL 实例设置");
        return new Selection(renderer,system);
    }
    private static final class Probe implements AutoCloseable {
        final Context context;final java.util.concurrent.CompletableFuture<android.os.Messenger> ready=new java.util.concurrent.CompletableFuture<>();
        volatile java.util.concurrent.CompletableFuture<android.os.Bundle> response;
        volatile boolean dead;boolean bound;
        final android.content.ServiceConnection connection=new android.content.ServiceConnection(){
            public void onServiceConnected(android.content.ComponentName name,android.os.IBinder binder){ready.complete(new android.os.Messenger(binder));}
            public void onServiceDisconnected(android.content.ComponentName name){lost();}
            public void onBindingDied(android.content.ComponentName name){lost();}
            public void onNullBinding(android.content.ComponentName name){lost();}
            private void lost(){dead=true;ready.completeExceptionally(new IOException("图形检测进程已退出"));java.util.concurrent.CompletableFuture<android.os.Bundle> pending=response;if(pending!=null)pending.complete(new android.os.Bundle());}
        };
        Probe(Context context)throws IOException{this.context=context.getApplicationContext();bound=this.context.bindService(new android.content.Intent(this.context,HxzGraphicsProbeService.class),connection,Context.BIND_AUTO_CREATE);if(!bound)throw new IOException("无法启动图形检测");}
        android.os.Bundle query(String mode)throws InterruptedException{
            if(dead)return new android.os.Bundle();
            response=new java.util.concurrent.CompletableFuture<>();
            try{
                android.os.Message request=android.os.Message.obtain();android.os.Bundle data=new android.os.Bundle();data.putString("mode",mode);request.setData(data);
                java.util.concurrent.CompletableFuture<android.os.Bundle> current=response;
                request.replyTo=new android.os.Messenger(new android.os.Handler(android.os.Looper.getMainLooper(),reply->{current.complete(reply.getData());return true;}));
                ready.get(8,java.util.concurrent.TimeUnit.SECONDS).send(request);
                return current.get(12,java.util.concurrent.TimeUnit.SECONDS);
            }catch(java.util.concurrent.ExecutionException|java.util.concurrent.TimeoutException|android.os.RemoteException e){dead=true;return new android.os.Bundle();}
        }
        public void close(){if(bound){bound=false;context.unbindService(connection);}}
    }
}

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
    public static synchronized boolean isBusy(){return running||pending!=null;}
    public static synchronized void offer(JSONObject job){if(running||pending!=null)throw new IllegalStateException("已有游戏准备任务，请完成或取消后重试");pending=job;}
    public static synchronized void consume(Activity activity){
        if(running)return;if(pending==null){HxzCommunityAccounts.sync(activity);return;}JSONObject job=pending;pending=null;running=true;
        if(job.optBoolean("accountOnly")){try{HxzAccounts.install(job.getJSONObject("account"));android.widget.Toast.makeText(activity,"已导入社区皮肤站角色",android.widget.Toast.LENGTH_SHORT).show();}catch(Exception e){android.widget.Toast.makeText(activity,e.getMessage(),android.widget.Toast.LENGTH_LONG).show();}finally{job.remove("account");running=false;}return;}
        AtomicReference<TaskExecutor> active=new AtomicReference<>();AtomicReference<Thread> worker=new AtomicReference<>();
        TaskDialog pane=new TaskDialog(activity,new TaskCancellationAction((Runnable)()->{TaskExecutor e=active.get();if(e!=null)e.cancel();Thread t=worker.get();if(t!=null)t.interrupt();}));
        pane.setTitle("幻想镇 · 准备游戏");pane.show();
        try{HxzInstallService.start(activity);}catch(Exception e){running=false;job.remove("account");pane.dismiss();android.widget.Toast.makeText(activity,"无法启动安装服务，请保持运行组件在前台后重试",android.widget.Toast.LENGTH_LONG).show();return;}
        activity.getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        record(activity,"开始准备 · "+android.os.Build.MANUFACTURER+" "+android.os.Build.MODEL+" · Android "+android.os.Build.VERSION.RELEASE);
        Thread thread=new Thread(()->{
            try{HxzPreparation.run(activity,job,pane,active);}
            catch(Exception e){StringWriter trace=new StringWriter();e.printStackTrace(new PrintWriter(trace));String details=trace.toString();JSONObject account=job.optJSONObject("account");if(account!=null)for(String key:Arrays.asList("accessToken","clientToken")){String secret=account.optString(key);if(!secret.isEmpty())details=details.replace(secret,"<已隐藏>");}record(activity,details);final String report=diagnostics(activity,details);final boolean cancelled=Thread.currentThread().isInterrupted()||e instanceof InterruptedException||(e instanceof java.io.InterruptedIOException&&!(e instanceof java.net.SocketTimeoutException))||e instanceof java.util.concurrent.CancellationException;
                activity.runOnUiThread(()->{pane.dismiss();if(activity.isFinishing()||activity.isDestroyed())return;com.tungsten.fcllibrary.component.dialog.FCLAlertDialog.Builder dialog=new com.tungsten.fcllibrary.component.dialog.FCLAlertDialog.Builder(activity);String message=cancelled?"安装已暂停，下次会继续使用已下载的文件。":readable(e)+"\n\n已校验文件和下载断点会保留。返回社区再次点击「安装并进入」即可继续。";dialog.setMessage(message);dialog.setPositiveButton("复制诊断",()->{android.content.ClipboardManager clipboard=(android.content.ClipboardManager)activity.getSystemService(Context.CLIPBOARD_SERVICE);clipboard.setPrimaryClip(android.content.ClipData.newPlainText("幻想镇安卓安装诊断",report));});dialog.setNegativeButton("关闭",()->{});dialog.create().show();});}
            finally{synchronized(HxzRunner.class){running=false;}job.remove("account");HxzInstallService.stop(activity);activity.runOnUiThread(()->activity.getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));}
        },"hxz-game-prepare");worker.set(thread);thread.start();
    }
    static synchronized void record(Activity activity,String text){try{Path folder=activity.getExternalFilesDir(null).toPath().resolve("log");Files.createDirectories(folder);Path file=folder.resolve("hxz-prepare.log");if(Files.exists(file)&&Files.size(file)>1024*1024)Files.move(file,folder.resolve("hxz-prepare.previous.log"),StandardCopyOption.REPLACE_EXISTING);Files.write(file,(java.time.Instant.now()+" "+text+"\n").getBytes(StandardCharsets.UTF_8),StandardOpenOption.CREATE,StandardOpenOption.APPEND);}catch(Exception ignored){}}
    private static String readable(Throwable error){StringBuilder text=new StringBuilder("游戏尚未启动");Set<Throwable> seen=Collections.newSetFromMap(new IdentityHashMap<>());for(int i=0;error!=null&&i<5&&seen.add(error);i++,error=error.getCause()){String line=error.getMessage();if(line!=null&&!line.isEmpty()&&text.indexOf(line)<0)text.append("\n").append(line.length()>1600?line.substring(0,1600):line);}return text.toString();}
    private static String diagnostics(Activity activity,String error){StringBuilder text=new StringBuilder("幻想镇安卓安装诊断\n").append(android.os.Build.MANUFACTURER).append(' ').append(android.os.Build.MODEL).append(" · Android ").append(android.os.Build.VERSION.RELEASE).append("\n").append(error);for(String name:Arrays.asList("hxz-prepare.log","latest_api_installer.log")){File file=new File(activity.getExternalFilesDir(null),"log/"+name);try(RandomAccessFile in=new RandomAccessFile(file,"r")){long start=Math.max(0,in.length()-32*1024);in.seek(start);byte[] bytes=new byte[(int)(in.length()-start)];in.readFully(bytes);text.append("\n--- ").append(name).append(" ---\n").append(new String(bytes,StandardCharsets.UTF_8));}catch(IOException ignored){}}return text.toString();}
}

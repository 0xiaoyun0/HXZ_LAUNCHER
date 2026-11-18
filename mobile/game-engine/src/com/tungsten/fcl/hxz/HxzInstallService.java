package com.tungsten.fcl.hxz;

import android.app.*;
import android.content.*;
import android.os.*;
import com.tungsten.fcl.R;

/** Keep the preparation task visible to Android while downloading or switching installer JVMs. */
public final class HxzInstallService extends Service {
    private static final int NOTIFICATION=701;
    private PowerManager.WakeLock wake;
    public static void start(Context context){context.startForegroundService(new Intent(context,HxzInstallService.class));}
    public static void stop(Context context){context.stopService(new Intent(context,HxzInstallService.class));}
    public static void stage(Context context,String stage){
        NotificationManager manager=(NotificationManager)context.getSystemService(NOTIFICATION_SERVICE);
        manager.createNotificationChannel(new NotificationChannel("hxz-install","游戏安装",NotificationManager.IMPORTANCE_LOW));
        manager.notify(NOTIFICATION,notification(context,stage));
    }
    private static Notification notification(Context context,String stage){
        Intent open=context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        Notification.Builder builder=new Notification.Builder(context,"hxz-install").setSmallIcon(R.mipmap.ic_launcher).setContentTitle("幻想镇 · 正在准备游戏").setContentText(stage.length()>120?stage.substring(0,120):stage).setOngoing(true).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_PROGRESS);
        if(open!=null)builder.setContentIntent(PendingIntent.getActivity(context,701,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        return builder.build();
    }
    @Override public void onCreate(){super.onCreate();NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);manager.createNotificationChannel(new NotificationChannel("hxz-install","游戏安装",NotificationManager.IMPORTANCE_LOW));startForeground(NOTIFICATION,notification(this,"正在检查安装环境"));wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"hxz:game-install");wake.acquire(60*60*1000L);}
    @Override public int onStartCommand(Intent intent,int flags,int startId){return START_NOT_STICKY;}
    @Override public IBinder onBind(Intent intent){return null;}
    @Override public void onDestroy(){if(wake!=null&&wake.isHeld())wake.release();stopForeground(true);super.onDestroy();}
}

package top.hxzmc.community;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.IBinder;

/** Keeps the community-process peer sockets alive while Minecraft owns the foreground. */
public final class GameLobbyService extends Service {
    private static final String CHANNEL="hxz_game_lobby";
    private GameLobby lobby(){return ((CommunityApp)getApplication()).gameLobby;}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null||"leave".equals(intent.getAction())){lobby().close("已离开联机");stopSelf();return START_NOT_STICKY;}
        if(lobby().status().optString("mode").equals("idle")){stopSelf();return START_NOT_STICKY;}
        try{NotificationManager manager=getSystemService(NotificationManager.class);manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Minecraft 联机",NotificationManager.IMPORTANCE_LOW));
            PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
            PendingIntent leave=PendingIntent.getService(this,2,new Intent(this,GameLobbyService.class).setAction("leave"),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
            Notification notification=new Notification.Builder(this,CHANNEL).setSmallIcon(R.drawable.ic_launcher).setContentTitle("幻想镇 · Minecraft 联机").setContentText("手机与伙伴正在保持加密直连").setContentIntent(open).setOngoing(true).addAction(new Notification.Action.Builder(null,"断开联机",leave).build()).build();
            startForeground(84,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        }catch(Exception e){lobby().close("系统未能保持联机服务："+CommunityApp.reason(e));stopSelf();}
        return START_NOT_STICKY;
    }
    @Override public void onTaskRemoved(Intent intent){lobby().close("应用已退出，联机已关闭");stopSelf();}
    @Override public void onDestroy(){super.onDestroy();if(!lobby().status().optString("mode").equals("idle"))lobby().close("联机服务已停止");}
    @Override public IBinder onBind(Intent intent){return null;}
}

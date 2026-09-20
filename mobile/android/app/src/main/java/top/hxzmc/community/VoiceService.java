package top.hxzmc.community;

import android.app.*;
import android.content.*;
import android.os.IBinder;
import android.content.pm.ServiceInfo;

public final class VoiceService extends Service {
    static final String CHANNEL="hxz_voice";
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        CommunityApp app=(CommunityApp)getApplication();
        if(intent==null||"leave".equals(intent.getAction())){app.leave();stopSelf();return START_NOT_STICKY;}
        try{
            NotificationManager manager=getSystemService(NotificationManager.class);
            manager.createNotificationChannel(new NotificationChannel(CHANNEL,"语音通话",NotificationManager.IMPORTANCE_LOW));
            PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
            PendingIntent leave=PendingIntent.getService(this,1,new Intent(this,VoiceService.class).setAction("leave"),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
            Notification notification=new Notification.Builder(this,CHANNEL).setSmallIcon(top.hxzmc.community.R.drawable.ic_launcher)
                .setContentTitle("幻想镇 · 语音通话").setContentText("社区语音正在使用麦克风").setOngoing(true).setContentIntent(open)
                .addAction(new Notification.Action.Builder(null,"离开语音",leave).build()).build();
            int type=ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
            if(android.os.Build.VERSION.SDK_INT>=30)type|=ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
            startForeground(42,notification,type);
            app.voiceJoin(intent.getStringExtra("room"));
        }catch(Exception e){app.event("error","语音未能开启："+CommunityApp.reason(e));app.leave();stopSelf();}
        return START_NOT_STICKY;
    }
    @Override public void onTaskRemoved(Intent intent){((CommunityApp)getApplication()).leave();stopSelf();}
    @Override public void onDestroy(){super.onDestroy();CommunityApp app=(CommunityApp)getApplication();if(!app.room.isEmpty()||!app.recoveryRoom.isEmpty())app.leave();}
    @Override public IBinder onBind(Intent intent){return null;}
}

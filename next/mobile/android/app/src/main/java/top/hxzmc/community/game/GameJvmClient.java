// SPDX-License-Identifier: GPL-3.0-only
package top.hxzmc.community.game;

import android.app.*;
import android.content.*;
import android.os.*;
import android.view.Surface;
import java.io.*;
import java.util.concurrent.*;

/** UI-side lifetime boundary; Surface never crosses a raw pointer or pixel IPC. */
final class GameJvmClient implements ServiceConnection {
    private final Context context;
    private final CountDownLatch connected=new CountDownLatch(1),done=new CountDownLatch(1);
    private final Handler main=new Handler(Looper.getMainLooper());
    private final Messenger replies=new Messenger(new Handler(Looper.getMainLooper(),message->{
        if(message.what==GameJvmService.READY)pid=message.arg1;
        else if(message.what==GameJvmService.EXIT){exit=message.arg1;error=message.getData().getString("error","");done.countDown();}
        return true;
    }));
    private volatile Messenger service;
    private volatile int exit=-1,pid;
    private volatile String error="";
    private volatile boolean bound;
    GameJvmClient(Context context){this.context=context;}
    void start(File job,String socket,String libraries,File log,Surface surface,int width,int height)throws Exception{
        try{
        bound=context.bindService(new Intent(context,GameJvmService.class),this,Context.BIND_AUTO_CREATE|Context.BIND_IMPORTANT);
        if(!bound)throw new IOException("无法建立独立游戏渲染进程");
        if(!connected.await(8,TimeUnit.SECONDS)||service==null)throw new IOException("独立游戏渲染进程启动超时");
        Bundle b=surfaceData(surface,width,height);b.putString("job",job.getCanonicalPath());b.putString("socket",socket);b.putString("libraries",libraries);b.putString("log",log.getCanonicalPath());
        Message start=Message.obtain(null,GameJvmService.START);start.replyTo=replies;start.setData(b);service.send(start);
        }catch(Exception e){close();throw e;}
    }
    private static Bundle surfaceData(Surface surface,int width,int height){Bundle b=new Bundle();b.putParcelable("surface",surface);b.putInt("width",width);b.putInt("height",height);return b;}
    void surface(Surface surface,int width,int height){Messenger current=service;if(current==null||done.getCount()==0)return;
        try{Message message=Message.obtain(null,GameJvmService.SURFACE);message.setData(surfaceData(surface,width,height));current.send(message);}catch(RemoteException ignored){}
    }
    boolean waitFor(long millis)throws InterruptedException{return done.await(millis,TimeUnit.MILLISECONDS);}
    int exitValue(){return exit;}
    String error(){return error;}
    @Override public void onServiceConnected(ComponentName name,IBinder binder){service=new Messenger(binder);connected.countDown();}
    @Override public void onServiceDisconnected(ComponentName name){
        service=null;connected.countDown();
        // Unbind immediately: Android otherwise restarts a crashed bound service.
        unbind();
        main.postDelayed(()->{
            if(done.getCount()==0)return;
            if(Build.VERSION.SDK_INT>=30&&pid>0){
                try{ActivityManager manager=(ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
                    for(ApplicationExitInfo record:manager.getHistoricalProcessExitReasons(context.getPackageName(),pid,4)){
                        if(record.getPid()!=pid)continue;
                        exit=record.getReason()==ApplicationExitInfo.REASON_EXIT_SELF?record.getStatus():128+record.getStatus();
                        error="游戏进程结束："+record.getDescription();break;
                    }
                }catch(Exception ignored){}
            }
            done.countDown();
        },300);
    }
    @Override public void onNullBinding(ComponentName name){error="游戏渲染服务没有返回连接";connected.countDown();done.countDown();unbind();}
    @Override public void onBindingDied(ComponentName name){onServiceDisconnected(name);}
    private synchronized void unbind(){if(bound){bound=false;try{context.unbindService(this);}catch(IllegalArgumentException ignored){}}}
    void close(){service=null;unbind();done.countDown();}
}

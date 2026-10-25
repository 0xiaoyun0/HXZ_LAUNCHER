// SPDX-License-Identifier: GPL-3.0-only
package top.hxzmc.community.game;

import android.app.Service;
import android.content.Intent;
import android.os.*;
import android.view.Surface;
import java.io.*;

/** One disposable HotSpot per process. Binder transfers the real Android Surface. */
public final class GameJvmService extends Service {
    static final int START=1,SURFACE=2,READY=3,EXIT=4;
    private boolean started;
    private final Handler messages=new Handler(Looper.getMainLooper(),message->{
        if(message.sendingUid!=android.os.Process.myUid())return true;
        Bundle data=message.getData();data.setClassLoader(Surface.class.getClassLoader());
        if(message.what==SURFACE){
            Surface surface=data.getParcelable("surface");
            try{NativeRuntime.directSurface(surface,data.getInt("width"),data.getInt("height"));}
            finally{if(surface!=null)surface.release();}
        }else if(message.what==START&&!started){
            started=true;Messenger reply=message.replyTo;
            try{
                String job=privateFile(data.getString("job"),getCacheDir());
                String log=privateFile(data.getString("log"),getFilesDir());
                String socket=privateFile(data.getString("socket"),getCacheDir());
                String renderer=new File(getApplicationInfo().nativeLibraryDir,"libng_gl4es.so").getCanonicalPath();
                String libraries=data.getString("libraries","");
                for(String path:libraries.split(":"))if(!new File(path).getCanonicalPath().startsWith(getFilesDir().getCanonicalPath()+File.separator)
                        &&!new File(path).getCanonicalPath().equals(getApplicationInfo().nativeLibraryDir))throw new IOException("Invalid runtime library path");
                Surface surface=data.getParcelable("surface");
                try{if(surface==null||!surface.isValid())throw new IOException("Android Surface unavailable");
                    NativeRuntime.directSurface(surface,data.getInt("width"),data.getInt("height"));
                }finally{if(surface!=null)surface.release();}
                send(reply,READY,android.os.Process.myPid(),null);
                new Thread(()->{
                    int exit=NativeRuntime.runDirect(job,socket,renderer,libraries,log);
                    send(reply,EXIT,exit,null);
                    // Neither a terminated JVM nor its globals may be reused.
                    android.os.Process.killProcess(android.os.Process.myPid());
                },"hxz-fcl-render-game").start();
            }catch(Exception e){send(reply,EXIT,78,e.getMessage());stopSelf();}
        }
        return true;
    });
    private final Messenger messenger=new Messenger(messages);
    private static String privateFile(String value,File directory)throws IOException{
        if(value==null)throw new IOException("Missing private game path");String path=new File(value).getCanonicalPath();
        if(!path.startsWith(directory.getCanonicalPath()+File.separator))throw new IOException("Game path is outside private storage");return path;
    }
    private static void send(Messenger target,int what,int value,String error){
        if(target==null)return;try{Message message=Message.obtain(null,what,value,0);if(error!=null){Bundle b=new Bundle();b.putString("error",error);message.setData(b);}target.send(message);}catch(RemoteException ignored){}
    }
    @Override public IBinder onBind(Intent intent){return messenger.getBinder();}
    @Override public boolean onUnbind(Intent intent){
        // A dead UI must not leave a detached game consuming resources.
        android.os.Process.killProcess(android.os.Process.myPid());return false;
    }
}

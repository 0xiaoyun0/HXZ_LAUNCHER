package top.hxzmc.community.game;

import android.view.Surface;

/** App-owned surface/input and JVM boundary; not a second application. */
final class NativeRuntime {
    static { System.loadLibrary("hxz_runtime"); }
    static native String start(String privateSocket,int width,int height);
    static native String startDirect(String privateSocket,int width,int height);
    static native void directSurface(Surface surface,int width,int height);
    static native int runDirect(String job,String socket,String renderer,String libraries,String log);
    static native void stop();
    static native void surface(Surface surface,int width,int height);
    static native void event(int type,int a,int b,int c,int d);
    static native void release();
    static native boolean captured();
    static native String renderer(String verifiedPath,String kind);
}

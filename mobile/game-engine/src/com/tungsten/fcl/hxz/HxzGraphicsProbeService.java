package com.tungsten.fcl.hxz;

import android.app.Service;
import android.content.Intent;
import android.opengl.*;
import android.os.*;
import com.mio.device.VulkanCapabilities;
import com.mio.device.VulkanChecker;
import java.io.File;
import java.nio.file.Files;

/** Native driver faults are confined to this short-lived private process. */
public final class HxzGraphicsProbeService extends Service {
    private HandlerThread worker;
    private Messenger endpoint;
    @Override public void onCreate() {
        super.onCreate();worker = new HandlerThread("hxz-graphics-probe");worker.start();
        endpoint = new Messenger(new Handler(worker.getLooper(), message -> {
            Bundle result = new Bundle();
            try {
                String mode = message.getData().getString("mode", "gles");
                if (mode.equals("gles")) result = gles();
                else {
                    File scratch = Files.createTempDirectory(getCacheDir().toPath(), "hxz-vulkan-").toFile();
                    boolean custom = mode.equals("custom");
                    VulkanCapabilities caps = VulkanChecker.INSTANCE.checkCapabilities(custom, getApplicationInfo().nativeLibraryDir, scratch);
                    result.putBoolean("supported", caps != null && caps.isVersionSupported() && (!custom || caps.getUsedCustomDriver()));
                    result.putString("version", caps == null ? "" : caps.getVersionString());
                }
            } catch (Exception | LinkageError ignored) { result.putBoolean("supported", false); }
            try { Message reply = Message.obtain();reply.setData(result);message.replyTo.send(reply); } catch (Exception ignored) {}
            return true;
        }));
    }
    @Override public IBinder onBind(Intent intent) { return endpoint.getBinder(); }
    @Override public void onDestroy() {
        worker.quitSafely();super.onDestroy();
        // Manifest gives this service its own :hxz_graphics process; never the UI/game process.
        if (android.app.Application.getProcessName().endsWith(":hxz_graphics")) android.os.Process.killProcess(android.os.Process.myPid());
    }
    private static Bundle gles() {
        Bundle result = new Bundle();EGLDisplay display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY);
        EGLContext context = EGL14.EGL_NO_CONTEXT;EGLSurface surface = EGL14.EGL_NO_SURFACE;
        if (display == EGL14.EGL_NO_DISPLAY || !EGL14.eglInitialize(display, new int[2], 0, new int[2], 0)) return result;
        try {
            for (int version : new int[]{3,2}) {
                EGLConfig[] configs = new EGLConfig[1];int[] count = new int[1];
                int[] attrs = {EGL14.EGL_RENDERABLE_TYPE, version == 3 ? 0x40 : EGL14.EGL_OPENGL_ES2_BIT, EGL14.EGL_SURFACE_TYPE, EGL14.EGL_PBUFFER_BIT, EGL14.EGL_NONE};
                if (!EGL14.eglChooseConfig(display, attrs, 0, configs, 0, 1, count, 0) || count[0] == 0) continue;
                context = EGL14.eglCreateContext(display, configs[0], EGL14.EGL_NO_CONTEXT, new int[]{EGL14.EGL_CONTEXT_CLIENT_VERSION, version, EGL14.EGL_NONE}, 0);
                if (context == EGL14.EGL_NO_CONTEXT) continue;
                surface = EGL14.eglCreatePbufferSurface(display, configs[0], new int[]{EGL14.EGL_WIDTH,1,EGL14.EGL_HEIGHT,1,EGL14.EGL_NONE}, 0);
                if (surface != EGL14.EGL_NO_SURFACE && EGL14.eglMakeCurrent(display, surface, surface, context)) {
                    result.putInt("gles", version);result.putString("gpu", GLES20.glGetString(GLES20.GL_RENDERER));
                    result.putString("vendor", GLES20.glGetString(GLES20.GL_VENDOR));break;
                }
                if (surface != EGL14.EGL_NO_SURFACE) EGL14.eglDestroySurface(display, surface);
                EGL14.eglDestroyContext(display, context);surface=EGL14.EGL_NO_SURFACE;context=EGL14.EGL_NO_CONTEXT;
            }
            return result;
        } finally {
            EGL14.eglMakeCurrent(display, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT);
            if (surface != EGL14.EGL_NO_SURFACE) EGL14.eglDestroySurface(display, surface);
            if (context != EGL14.EGL_NO_CONTEXT) EGL14.eglDestroyContext(display, context);
            EGL14.eglTerminate(display);EGL14.eglReleaseThread();
        }
    }
}

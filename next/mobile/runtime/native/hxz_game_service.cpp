// SPDX-License-Identifier: GPL-3.0-only
#include "hxz_glfw.h"
#include "hxz_fcl_render.h"
#include "hxz_jvm.h"
#include "hxz_ipc.h"
#include <jni.h>
#include <android/native_window_jni.h>
#include <dlfcn.h>
#include <unistd.h>
#include <fcntl.h>
#include <cstdio>
#include <cstdlib>
#include <exception>
#include <string>
#include <thread>
namespace {
std::string utf(JNIEnv* env,jstring value){if(!value)return {};const char* p=env->GetStringUTFChars(value,nullptr);std::string s=p?p:"";if(p)env->ReleaseStringUTFChars(value,p);return s;}
}
extern "C" JNIEXPORT void JNICALL Java_top_hxzmc_community_game_NativeRuntime_directSurface(JNIEnv* env,jclass,jobject surface,jint width,jint height){
    ANativeWindow* window=surface?ANativeWindow_fromSurface(env,surface):nullptr;
    hxz_fcl_surface(window,width,height);if(window)ANativeWindow_release(window);
}
extern "C" JNIEXPORT jint JNICALL Java_top_hxzmc_community_game_NativeRuntime_runDirect(JNIEnv* env,jclass,jstring jobPath,jstring socketPath,jstring rendererPath,jstring libraryPath,jstring logPath){
    // Copy ART values before entering HotSpot. No ART JNI objects enter the game VM.
    auto job=utf(env,jobPath),socket=utf(env,socketPath),renderer=utf(env,rendererPath),libraries=utf(env,libraryPath),log=utf(env,logPath);
    int output=open(log.c_str(),O_WRONLY|O_CREAT|O_APPEND|O_CLOEXEC,0600);
    if(output<0)return 78;
    fflush(nullptr);dup2(output,STDOUT_FILENO);dup2(output,STDERR_FILENO);close(output);setvbuf(stdout,nullptr,_IOLBF,0);setvbuf(stderr,nullptr,_IONBF,0);
    setenv("LD_LIBRARY_PATH",libraries.c_str(),1);
    // Same loader-path update used by FCL's utils.c; no hidden namespace escape.
    using UpdatePath=void(*)(const char*);
    void* dl=dlopen("libdl.so",RTLD_NOW|RTLD_LOCAL);
    auto update=reinterpret_cast<UpdatePath>(dlsym(dl,"android_update_LD_LIBRARY_PATH"));
    if(!update)update=reinterpret_cast<UpdatePath>(dlsym(dl,"__loader_android_update_LD_LIBRARY_PATH"));
    if(update)update(libraries.c_str());
    // HotSpot must start on a fresh native thread, not reuse ART's JavaThread
    // TLS/stack. FCL's JLI launcher likewise creates a native Java-main thread.
    int result=70;
    std::thread game([&]{try {
        const auto request=hxz_read_job(job.c_str());
        const auto error=hxz_ipc_child_connect(socket,true);
        if(!error.empty()){fprintf(stderr,"HXZ: %s\n",error.c_str());result=79;return;}
        if(hxz_configure_renderer(renderer.c_str(),"fcl-egl")!=0){fprintf(stderr,"HXZ: %s\n",hxz_last_error());result=80;return;}
        fprintf(stderr,"[HXZ graphics] FCL NG-GL4ES / EGL direct Android Surface; no CPU frame readback\n");
        // The UI and account provider live in other processes. System.exit or a
        // native game crash can terminate this disposable JVM service safely.
        result=hxz_java(request);hxz_ipc_child_close();
    }catch(const std::exception& e){fprintf(stderr,"HXZ: %s\n",e.what());result=70;}});
    game.join();return result;
}

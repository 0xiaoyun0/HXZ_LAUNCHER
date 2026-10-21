#include "hxz_glfw.h"
#include "hxz_ipc.h"
#include <jni.h>
#include <android/native_window_jni.h>
#include <android/log.h>
#include <string>
static std::string string(JNIEnv* env,jstring s) {
    if(!s)return {};const char* value=env->GetStringUTFChars(s,nullptr);std::string result=value?value:"";if(value)env->ReleaseStringUTFChars(s,value);return result;
}
extern "C" JNIEXPORT jstring JNICALL Java_top_hxzmc_community_game_NativeRuntime_start(JNIEnv* env,jclass,jstring path,jint width,jint height) {
    hxz_surface_resolution(width,height);
    const std::string error=hxz_ipc_start(string(env,path),width,height);
    return error.empty()?nullptr:env->NewStringUTF(error.c_str());
}
extern "C" JNIEXPORT void JNICALL Java_top_hxzmc_community_game_NativeRuntime_stop(JNIEnv*,jclass){hxz_ipc_stop();}
extern "C" JNIEXPORT void JNICALL Java_top_hxzmc_community_game_NativeRuntime_surface(JNIEnv* env,jclass,jobject surface,jint w,jint h) {
    ANativeWindow* window=surface?ANativeWindow_fromSurface(env,surface):nullptr;hxz_surface(window,w,h);if(window)ANativeWindow_release(window);hxz_ipc_resize(window?w:0,window?h:0);
}
extern "C" JNIEXPORT void JNICALL Java_top_hxzmc_community_game_NativeRuntime_event(JNIEnv*,jclass,jint type,jint a,jint b,jint c,jint d){hxz_ipc_event(type,a,b,c,d);}
extern "C" JNIEXPORT void JNICALL Java_top_hxzmc_community_game_NativeRuntime_release(JNIEnv*,jclass){hxz_ipc_release();}
extern "C" JNIEXPORT jboolean JNICALL Java_top_hxzmc_community_game_NativeRuntime_captured(JNIEnv*,jclass){return hxz_ipc_captured();}
extern "C" JNIEXPORT jstring JNICALL Java_top_hxzmc_community_game_NativeRuntime_renderer(JNIEnv* env,jclass,jstring path,jstring kind) {
    (void)path;(void)kind;return env->NewStringUTF("Renderer must be configured in the game executor");
}

#pragma once
#include <jni.h>
#include <cstdio>
#include <string>

// BinaryPatcher's synchronous main closes its output ZIP, but some versions retain
// a non-daemon LZMA input worker. DestroyJavaVM waits for that worker indefinitely.
// Only this known installer CLI gets an explicit Java shutdown: shutdown hooks run,
// and the parent still verifies the processor's declared output hashes.
inline int hxz_finish_java(JNIEnv* env,JavaVM* vm,bool installerProcess,const std::string& mainClass) {
    if(installerProcess&&mainClass=="net.neoforged.binarypatcher.ConsoleTool") {
        auto failed=[env](){if(!env->ExceptionCheck())return false;env->ExceptionDescribe();env->ExceptionClear();return true;};
        jclass system=env->FindClass("java/lang/System");if(failed()||!system)return 77;
        jmethodID exit=env->GetStaticMethodID(system,"exit","(I)V");if(failed()||!exit)return 77;
        std::fprintf(stderr,"[HXZ-JVM] processor-exit-requested\n");
        env->CallStaticVoidMethod(system,exit,0);
        failed(); // System.exit must not return, even if no exception was reported.
        std::fprintf(stderr,"HXZ: processor shutdown did not terminate the JVM\n");
        return 77;
    }
    const jint result=vm->DestroyJavaVM();
    if(result==JNI_OK)std::fprintf(stderr,"[HXZ-JVM] shutdown-complete\n");
    return result==JNI_OK?0:76;
}

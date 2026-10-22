#include "hxz_jvm.h"
#include "hxz_jvm_shutdown.h"
#include <jni.h>
#include <dlfcn.h>
#include <unistd.h>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <stdexcept>
#include <algorithm>
#include <charconv>

// JNI Invocation API. ART's JNIEnv is never used with the game VM's objects.
static std::string field(std::istream& in) {
    unsigned char b[4];if(!in.read(reinterpret_cast<char*>(b),4))throw std::runtime_error("Truncated Java job");
    unsigned n=(unsigned(b[0])<<24)|(unsigned(b[1])<<16)|(unsigned(b[2])<<8)|b[3];
    if(n>1024*1024)throw std::runtime_error("Java job field is too large");
    std::string s(n,'\0');if(!in.read(s.data(),n)||s.find('\0')!=std::string::npos)throw std::runtime_error("Invalid Java job field");return s;
}
HxzJavaJob hxz_read_job(const char* path) {
    std::ifstream in(path,std::ios::binary);char magic[8];if(!in.read(magic,8)||std::string(magic,8)!="HXZJVM01")throw std::runtime_error("Invalid Java job format");
    HxzJavaJob j;j.home=field(in);j.directory=field(in);j.mainClass=field(in);
    for(auto* list:{&j.options,&j.arguments}){
        const std::string countField=field(in);unsigned count=0;
        const auto parsed=std::from_chars(countField.data(),countField.data()+countField.size(),count);
        if(parsed.ec!=std::errc{}||parsed.ptr!=countField.data()+countField.size()||count>4096)throw std::runtime_error("Invalid Java argument count");
        while(count--)list->push_back(field(in));
    }
    if(in.peek()!=EOF)throw std::runtime_error("Trailing Java job data");return j;
}
static void library(const std::string& path,bool required) {
    if(!dlopen(path.c_str(),RTLD_NOW|RTLD_GLOBAL)&&required)throw std::runtime_error(std::string("Cannot load runtime library: ")+dlerror());
}
static bool exception(JNIEnv* env) {
    if(!env->ExceptionCheck())return false;
    env->ExceptionDescribe();env->ExceptionClear();return true;
}
// This launcher is used only in disposable :jvm / processor processes. Java's
// shutdown hooks run before HotSpot invokes this standard JNI exit callback.
// Skip C++/libc global destruction: detached EGL/input workers may still hold
// native mutexes. The OS releases surfaces, sockets and mappings on process exit.
static void JNICALL isolated_vm_exit(jint status) {
    std::fprintf(stderr,"[HXZ-JVM] vm-exit=%d\n",status);
    std::fflush(nullptr);
    std::_Exit(status);
}
int hxz_java(const HxzJavaJob& j,bool installerProcess) {
    try {
        if(j.home.empty()||j.home[0]!='/'||j.directory.empty()||j.directory[0]!='/'||j.mainClass.empty())throw std::runtime_error("Invalid Java launch plan");
        if(chdir(j.directory.c_str())!=0)throw std::runtime_error("Cannot open game working directory");
        setenv("JAVA_HOME",j.home.c_str(),1);setenv("HOME",j.directory.c_str(),1);
        unsetenv("JAVA_TOOL_OPTIONS");unsetenv("_JAVA_OPTIONS");unsetenv("JDK_JAVA_OPTIONS");
        // Unlike an exec child, an ART-created service does not inherit a new
        // linker search path when LD_LIBRARY_PATH is changed. FCL preloads the
        // JRE by absolute path for this reason. libinstrument also needs libjli.
        const std::string lib=j.home+"/lib/";
        library(lib+"libjli.so",true);
        void* vmLibrary=dlopen((lib+"server/libjvm.so").c_str(),RTLD_NOW|RTLD_GLOBAL);
        if(!vmLibrary)throw std::runtime_error(std::string("Cannot load Java VM: ")+dlerror());
        library(lib+"libverify.so",false);library(lib+"libjava.so",true);library(lib+"libjimage.so",false);
        library(lib+"libnet.so",false);library(lib+"libnio.so",false);library(lib+"libzip.so",false);
        const auto agents=std::count_if(j.options.begin(),j.options.end(),[](const std::string& option){return option.rfind("-javaagent:",0)==0;});
        if(agents>0) {
            library(lib+"libinstrument.so",true);
            // HotSpot's -javaagent parser loads "instrument" by SONAME. Check
            // that same lookup now, before JNI_CreateJavaVM can terminate the
            // process. Keep -javaagent intact (module resolution/JPLIS semantics).
            library("libinstrument.so",true);
            fprintf(stderr,"[HXZ-JVM] Java agent native bootstrap ready; agents=%zu\n",static_cast<size_t>(agents));
        }
        using Create=jint(*)(JavaVM**,void**,void*);
        auto create=reinterpret_cast<Create>(dlsym(vmLibrary,"JNI_CreateJavaVM"));if(!create)throw std::runtime_error("Java VM has no Invocation API");
        std::vector<std::string> options=j.options;
        options.erase(std::remove_if(options.begin(),options.end(),[](const std::string& option){return option.rfind("-Dsun.boot.library.path=",0)==0;}),options.end());
        options.push_back("-Dsun.boot.library.path="+j.home+"/lib");
        options.insert(options.begin(),{"-Djava.home="+j.home,"-Duser.dir="+j.directory,"-Duser.home="+j.directory,"-Djava.awt.headless=true"});
        std::vector<JavaVMOption> native;for(auto& option:options)native.push_back({option.data(),nullptr});
        char exitOption[]="exit";
        native.push_back({exitOption,reinterpret_cast<void*>(&isolated_vm_exit)});
        // The NDK invocation header exposes 1.6; this interface version is
        // sufficient for the calls below and accepted by modern HotSpot.
        JavaVMInitArgs args{};args.version=JNI_VERSION_1_6;args.nOptions=static_cast<jint>(native.size());args.options=native.data();args.ignoreUnrecognized=JNI_FALSE;
        JavaVM* vm=nullptr;JNIEnv* env=nullptr;jint result=create(&vm,reinterpret_cast<void**>(&env),&args);
        if(result!=JNI_OK||!vm||!env){fprintf(stderr,"HXZ: Java VM initialization failed (%d)\n",result);return 71;}
        // FindClass from an attached native launch thread uses the system class loader.
        std::string name=j.mainClass;std::replace(name.begin(),name.end(),'.','/');
        jclass main=env->FindClass(name.c_str());if(exception(env)||!main)return 72;
        jmethodID method=env->GetStaticMethodID(main,"main","([Ljava/lang/String;)V");if(exception(env)||!method)return 73;
        jclass stringType=env->FindClass("java/lang/String");if(exception(env)||!stringType)return 74;
        jobjectArray argv=env->NewObjectArray(static_cast<jsize>(j.arguments.size()),stringType,nullptr);if(exception(env)||!argv)return 74;
        // Convert UTF-8 via String(byte[], UTF-8), not JNI modified UTF-8 (Chinese/supplementary paths).
        jmethodID ctor=env->GetMethodID(stringType,"<init>","([BLjava/lang/String;)V");if(exception(env)||!ctor)return 74;
        jstring charset=env->NewStringUTF("UTF-8");if(exception(env)||!charset)return 74;
        for(jsize i=0;i<static_cast<jsize>(j.arguments.size());i++) {
            const auto& s=j.arguments[i];jbyteArray bytes=env->NewByteArray(s.size());if(exception(env)||!bytes)return 74;
            env->SetByteArrayRegion(bytes,0,s.size(),reinterpret_cast<const jbyte*>(s.data()));
            if(exception(env))return 74;
            auto value=env->NewObject(stringType,ctor,bytes,charset);if(exception(env)||!value)return 74;
            env->SetObjectArrayElement(argv,i,value);if(exception(env))return 74;
            env->DeleteLocalRef(bytes);env->DeleteLocalRef(value);
        }
        env->DeleteLocalRef(charset);
        env->CallStaticVoidMethod(main,method,argv);bool failed=exception(env);
        if(failed)return 75;
        std::fprintf(stderr,"[HXZ-JVM] main-complete\n");
        // Unknown processors and games may still have workers writing output.
        return hxz_finish_java(env,vm,installerProcess,j.mainClass);
    } catch(const std::exception& e) {fprintf(stderr,"HXZ: %s\n",e.what());return 70;}
}

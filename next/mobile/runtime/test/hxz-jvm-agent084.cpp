// Run the production JNI launcher with an Android-like closed library search
// namespace. Files exist; bare dlopen only finds libraries preloaded by SONAME.
#include <jni.h>
#include <dlfcn.h>
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <stdexcept>
#include <algorithm>
#include <charconv>
#include <set>
#include <string>
#include <vector>
#include "hxz_jvm.h"

namespace {
struct VmReady {};
std::string scenario,loaderError;
const std::string home="/private/runtime/java/21",lib=home+"/lib/";
std::set<std::string> loaded;
std::vector<std::string> attempted,options;
int creates=0;
char handleToken;
bool has(const std::string& name){return loaded.count(name)>0;}
std::string nameOf(const std::string& path){return path.substr(path.find_last_of('/')+1);}
int fakeChdir(const char* path){assert(std::strcmp(path,"/private/game")==0);return 0;}
int fakeSetenv(const char*,const char*,int){return 0;}
int fakeUnsetenv(const char*){return 0;}
void* fakeDlopen(const char* value,int flags){
    std::string path=value,name=nameOf(path);attempted.push_back(path);
    assert((flags&RTLD_GLOBAL)!=0);
    if(path.find('/')==std::string::npos){
        if(!has(name)){loaderError="dlopen failed: library \""+name+"\" not found";return nullptr;}
        return &handleToken;
    }
    if(path==lib+"libjli.so"&&scenario=="missing-jli"){
        loaderError="libjli.so is absent";return nullptr;
    }
    if(path==lib+"libinstrument.so"){
        if(scenario=="missing-instrument"){loaderError="libinstrument.so is absent";return nullptr;}
        if(scenario=="broken-instrument"){loaderError="cannot locate symbol fixture in libinstrument.so";return nullptr;}
        if(!has("libjli.so")||!has("libjava.so")||!has("libjvm.so")){
            loaderError="libinstrument.so dependency libjli.so not found";return nullptr;
        }
    }
    loaded.insert(name);return &handleToken;
}
const char* fakeDlerror(){return loaderError.c_str();}
jint JNICALL create(JavaVM**,void**,void* raw){
    ++creates;auto* args=static_cast<JavaVMInitArgs*>(raw);
    for(int i=0;i<args->nOptions;i++)options.emplace_back(args->options[i].optionString);
    bool agent=false;for(const auto& option:options)if(option.rfind("-javaagent:",0)==0)agent=true;
    if(agent&&!fakeDlopen("libinstrument.so",RTLD_NOW|RTLD_GLOBAL)){
        std::fprintf(stderr,"Could not find agent library instrument on the library path, with error: %s\n",fakeDlerror());
        return JNI_ERR;
    }
    throw VmReady{}; // Stop exactly before HotSpot would run the Java agent.
}
void* fakeDlsym(void*,const char* name){
    assert(std::strcmp(name,"JNI_CreateJavaVM")==0);return reinterpret_cast<void*>(&create);
}
}
#define dlopen fakeDlopen
#define dlerror fakeDlerror
#define dlsym fakeDlsym
#define chdir fakeChdir
#define setenv fakeSetenv
#define unsetenv fakeUnsetenv
#include "hxz_jvm.cpp"
#undef dlopen
#undef dlerror
#undef dlsym
#undef chdir
#undef setenv
#undef unsetenv

int main(int argc,char** argv){
    assert(argc==2);scenario=argv[1];
    HxzJavaJob job;job.home=home;job.directory="/private/game";job.mainClass="example.Main";
    job.options={"-Xmx1024M","-Djava.library.path=/private/game/natives","-Djava.class.path=game.jar"};
    job.options.push_back("-Dsun.boot.library.path=/stale/runtime/lib");
    if(scenario!="no-agent"&&scenario!="missing-jli")job.options.push_back("-javaagent:/private/auth injector.jar=https://skin.example/api");
    if(scenario=="two-agents")job.options.push_back("-javaagent:/private/direct-lobby.jar");
    bool ready=false;int result=-1;
    try{result=hxz_java(job);}catch(const VmReady&){ready=true;}
    if(scenario=="missing-instrument"||scenario=="broken-instrument"||scenario=="missing-jli"){
        assert(!ready&&result==70&&creates==0); // Report the loader cause before a fatal VM bootstrap.
        assert(loaderError.find(scenario=="missing-jli"?"libjli.so":"libinstrument.so")!=std::string::npos);
    }else{
        if(!ready){std::fprintf(stderr,"FAIL: production JVM bootstrap did not prepare Java agent libraries (result %d)\n",result);return 1;}
        assert(creates==1&&has("libjli.so"));
        assert(has("libinstrument.so")== (scenario!="no-agent"));
        assert(std::find(options.begin(),options.end(),"-Dsun.boot.library.path="+home+"/lib")!=options.end());
        for(const auto& option:job.options)if(option.rfind("-Dsun.boot.library.path=",0)!=0)assert(std::find(options.begin(),options.end(),option)!=options.end());
        assert(std::count_if(options.begin(),options.end(),[](const std::string& option){return option.rfind("-Dsun.boot.library.path=",0)==0;})==1);
    }
    std::printf("PASS %s: production JNI bootstrap / closed native namespace\n",scenario.c_str());
}

// Host JNI boundary test of the production helper; this does not run HotSpot.
#include "hxz_jvm_shutdown.h"
#include <cassert>
#include <cstdarg>
#include <cstring>

namespace {
enum class Fault { none, findNull, findException, methodNull, methodException, exitException, exitReturns, destroy };
struct ExitRequested {}; // Non-std sentinel models System.exit not returning.
struct State {
    Fault fault=Fault::none;
    int finds=0,methods=0,exits=0,destroys=0,describes=0,clears=0;
    bool pending=false;
} state;
_jclass systemClass;
char methodToken;
const jmethodID exitMethod=reinterpret_cast<jmethodID>(&methodToken);
jclass JNICALL findClass(JNIEnv*,const char* name) {
    assert(std::strcmp(name,"java/lang/System")==0);++state.finds;
    state.pending=state.fault==Fault::findException;
    return state.fault==Fault::findNull?nullptr:&systemClass;
}
jmethodID JNICALL getMethod(JNIEnv*,jclass type,const char* name,const char* signature) {
    assert(type==&systemClass&&std::strcmp(name,"exit")==0&&std::strcmp(signature,"(I)V")==0);++state.methods;
    state.pending=state.fault==Fault::methodException;
    return state.fault==Fault::methodNull?nullptr:exitMethod;
}
void JNICALL callExit(JNIEnv*,jclass type,jmethodID method,va_list arguments) {
    assert(type==&systemClass&&method==exitMethod&&va_arg(arguments,jint)==0);++state.exits;
    if(state.fault==Fault::exitException){state.pending=true;return;}
    if(state.fault==Fault::exitReturns)return;
    throw ExitRequested{};
}
jboolean JNICALL exceptionCheck(JNIEnv*){return state.pending?JNI_TRUE:JNI_FALSE;}
void JNICALL exceptionDescribe(JNIEnv*){assert(state.pending);++state.describes;}
void JNICALL exceptionClear(JNIEnv*){assert(state.pending);state.pending=false;++state.clears;}
jint JNICALL destroy(JavaVM*){++state.destroys;return state.fault==Fault::destroy?JNI_ERR:JNI_OK;}
}

int main() {
    JNINativeInterface_ native{};
    native.FindClass=findClass;native.GetStaticMethodID=getMethod;native.CallStaticVoidMethodV=callExit;
    native.ExceptionCheck=exceptionCheck;native.ExceptionDescribe=exceptionDescribe;native.ExceptionClear=exceptionClear;
    JNIInvokeInterface_ invocation{};invocation.DestroyJavaVM=destroy;
    JNIEnv env{&native};JavaVM vm{&invocation};
    constexpr const char* patcher="net.neoforged.binarypatcher.ConsoleTool";
    struct Case {const char* name;bool installer;const char* mainClass;Fault fault;};
    const Case cases[]={
        {"installer-binarypatcher-exit",true,patcher,Fault::none},
        {"game-binarypatcher-destroy",false,patcher,Fault::none},
        {"other-installer-destroy",true,"net.neoforged.installertools.ConsoleTool",Fault::none},
        {"other-game-destroy",false,"net.minecraft.client.main.Main",Fault::none},
        {"similar-class-destroy",true,"net.neoforged.binarypatcher.ConsoleToolExtra",Fault::none},
        {"find-null",true,patcher,Fault::findNull},
        {"find-exception",true,patcher,Fault::findException},
        {"method-null",true,patcher,Fault::methodNull},
        {"method-exception",true,patcher,Fault::methodException},
        {"exit-exception",true,patcher,Fault::exitException},
        {"exit-returned",true,patcher,Fault::exitReturns},
        {"destroy-failure",false,patcher,Fault::destroy},
    };
    for(const auto& test:cases) {
        state=State{};state.fault=test.fault;
        const bool special=test.installer&&std::strcmp(test.mainClass,patcher)==0;
        bool terminated=false;int result=-1;
        try {result=hxz_finish_java(&env,&vm,test.installer,test.mainClass);}
        catch(const ExitRequested&){terminated=true;}
        assert(terminated==(special&&test.fault==Fault::none));
        if(!terminated)assert(test.fault==Fault::none?result==0:result!=0);
        assert(state.destroys==(special?0:1)&&state.finds==(special?1:0));
        const bool found=special&&test.fault!=Fault::findNull&&test.fault!=Fault::findException;
        const bool method=found&&test.fault!=Fault::methodNull&&test.fault!=Fault::methodException;
        assert(state.methods==(found?1:0)&&state.exits==(method?1:0));
        const bool exception=test.fault==Fault::findException||test.fault==Fault::methodException||test.fault==Fault::exitException;
        assert(!state.pending&&state.describes==(exception?1:0)&&state.clears==(exception?1:0));
        std::printf("PASS %s\n",test.name);
    }
    std::puts("PASS JVM shutdown 12 scenarios");
}

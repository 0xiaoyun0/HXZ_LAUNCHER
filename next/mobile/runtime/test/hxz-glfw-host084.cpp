// Host regression: execute the actual adapter with a deterministic OSMesa API.
// No Android device, real display, Java VM, or renderer is simulated as accepted.
#include <cassert>
#include <stdexcept>
#include <future>
#include <cstdio>
#include <cstring>
#include <string>
#include <chrono>

#include "hxz_glfw_under_test.cpp"

namespace {
thread_local bool mesaCurrent=false;
int binds=0,unbinds=0;
void* fakeCreate(const int*,void*){return reinterpret_cast<void*>(2);}
unsigned char fakeBind(void* context,void*,unsigned int,int,int){mesaCurrent=context!=nullptr;if(context)++binds;else ++unbinds;return 1;}
void fakeDestroy(void*){assert(!mesaCurrent);}
void fakeFinish(){assert(mesaCurrent);}
void fakePixelStore(int,int){}
void* fakeProc(const char* name){return std::strcmp(name,"glFinish")==0?reinterpret_cast<void*>(&fakeFinish):nullptr;}
struct BootError:std::runtime_error {using std::runtime_error::runtime_error;};
void bootError(int,const char* message){throw BootError(message);}
void expectError(int expected){assert(glfwGetError(nullptr)==expected);}
void bootWindow(int minor){
    glfwDefaultWindowHints();
    glfwWindowHint(GLFW_CLIENT_API,GLFW_OPENGL_API);
    glfwWindowHint(GLFW_CONTEXT_CREATION_API,GLFW_NATIVE_CONTEXT_API);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR,3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR,minor);
    glfwWindowHint(GLFW_OPENGL_PROFILE,GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT,GLFW_TRUE);
    glfwWindowHint(GLFW_VISIBLE,GLFW_FALSE);
}
}
extern "C" void* dlopen(const char*,int){return reinterpret_cast<void*>(1);}
extern "C" int dlclose(void*){return 0;}
extern "C" void* dlsym(void*,const char* name){
    if(std::strcmp(name,"OSMesaCreateContextAttribs")==0)return reinterpret_cast<void*>(&fakeCreate);
    if(std::strcmp(name,"OSMesaMakeCurrent")==0)return reinterpret_cast<void*>(&fakeBind);
    if(std::strcmp(name,"OSMesaDestroyContext")==0)return reinterpret_cast<void*>(&fakeDestroy);
    if(std::strcmp(name,"OSMesaGetProcAddress")==0)return reinterpret_cast<void*>(&fakeProc);
    if(std::strcmp(name,"OSMesaPixelStore")==0)return reinterpret_cast<void*>(&fakePixelStore);
    return nullptr;
}
extern "C" void ANativeWindow_acquire(ANativeWindow*){}
extern "C" void ANativeWindow_release(ANativeWindow*){}
extern "C" int32_t ANativeWindow_setBuffersGeometry(ANativeWindow*,int32_t,int32_t,int32_t){return 0;}
extern "C" int32_t ANativeWindow_lock(ANativeWindow*,ANativeWindow_Buffer*,void*){return -1;}
extern "C" int32_t ANativeWindow_unlockAndPost(ANativeWindow*){return 0;}

int main(int argc,char** argv){
    assert(hxz_configure_renderer("/verified/osmesa.so","osmesa")==0);
    assert(glfwInit()==GLFW_TRUE);
    glfwSetErrorCallback(bootError);
    for(int minor:{2,3}){
        bootWindow(minor); // 1.21.1 requests 3.2; 26.2 requests 3.3.
        GLFWwindow* w=glfwCreateWindow(854,480,"Minecraft",nullptr,nullptr);assert(w);
        glfwMakeContextCurrent(w);assert(glfwGetCurrentContext()==w&&mesaCurrent);
        // 1.21.1 calls this unconditionally before replacing bootCrash callback.
        try{glfwSetWindowSizeLimits(w,GLFW_DONT_CARE,GLFW_DONT_CARE,16384,16384);}
        catch(const BootError&){if(argc==2&&std::string(argv[1])=="--expect-legacy-failure")return 0;throw;}
        if(argc==2)return 91; // A legacy reproduction must actually fail here.
        glfwSetWindowPos(w,120,80);int x=0,y=0;glfwGetWindowPos(w,&x,&y);assert(x==120&&y==80);
        unsigned char pixel[4]{};GLFWimage image{1,1,pixel};glfwSetWindowIcon(w,1,&image);
        glfwSetWindowIcon(w,0,nullptr);glfwShowWindow(w);assert(glfwGetWindowAttrib(w,GLFW_VISIBLE));
        glfwHideWindow(w);assert(!glfwGetWindowAttrib(w,GLFW_VISIBLE));glfwShowWindow(w);
        glfwSetWindowAspectRatio(w,16,9);glfwSetWindowAspectRatio(w,-1,-1);
        glfwSetWindowOpacity(w,0.5f);assert(glfwGetWindowOpacity(w)==0.5f);
        glfwSetWindowAttrib(w,GLFW_RESIZABLE,GLFW_FALSE);assert(!glfwGetWindowAttrib(w,GLFW_RESIZABLE));
        glfwIconifyWindow(w);assert(glfwGetWindowAttrib(w,GLFW_ICONIFIED));
        glfwRestoreWindow(w);assert(!glfwGetWindowAttrib(w,GLFW_ICONIFIED));
        glfwMaximizeWindow(w);assert(glfwGetWindowAttrib(w,GLFW_MAXIMIZED));glfwRestoreWindow(w);
        glfwRequestWindowAttention(w);glfwFocusWindow(w);expectError(GLFW_NO_ERROR);
        glfwSwapBuffers(w);glfwMakeContextCurrent(nullptr);assert(!mesaCurrent&&!glfwGetCurrentContext());
        // Moving a detached OSMesa context must not leave it current on either thread.
        auto moved=std::async(std::launch::async,[w]{glfwMakeContextCurrent(w);assert(mesaCurrent);glfwMakeContextCurrent(nullptr);assert(!mesaCurrent);});moved.get();
        glfwMakeContextCurrent(w);glfwDestroyWindow(w);assert(!mesaCurrent);
    }
    bootWindow(3);auto* w=glfwCreateWindow(854,480,"Minecraft",nullptr,nullptr);assert(w);
    glfwSetErrorCallback(nullptr);
    glfwSetWindowSizeLimits(w,100,100,50,50);expectError(GLFW_INVALID_VALUE);
    glfwSetWindowSizeLimits(w,-2,-1,-1,-1);expectError(GLFW_INVALID_VALUE);
    glfwSetWindowAspectRatio(w,0,9);expectError(GLFW_INVALID_VALUE);
    glfwSetWindowIcon(w,1,nullptr);expectError(GLFW_INVALID_VALUE);
    glfwSetWindowOpacity(w,2);expectError(GLFW_INVALID_VALUE);
    auto waiter=std::async(std::launch::async,[]{glfwWaitEvents();});
    std::this_thread::sleep_for(std::chrono::milliseconds(20));hxz_request_close();
    if(waiter.wait_for(std::chrono::seconds(2))!=std::future_status::ready)std::_Exit(92);
    waiter.get();assert(glfwWindowShouldClose(w));glfwDestroyWindow(w);glfwTerminate();
    assert(binds>0&&unbinds>=binds);
    std::puts("GLFW Minecraft boot sequence, invalid arguments, OSMesa handoff, close wake: passed");
}

// SPDX-License-Identifier: GPL-3.0-only
// HXZ adapter for FCL's EGL bridge. Surface updates may arrive on Binder's
// thread, but EGL creation/rebinding and presentation stay on the render thread.
#include "hxz_fcl_render.h"
#include <mutex>
#include <dlfcn.h>
#include <cstdlib>
#include <cstdio>
extern "C" {
#include "fcl/environ.h"
#include "fcl/egl_loader.h"
static struct pojav_environ_s environment{};
struct pojav_environ_s* pojav_environ=&environment;
int hxz_fcl_width=1280,hxz_fcl_height=720;
}
namespace {
std::recursive_mutex renderMutex;
void* renderer;
using Proc=void*(*)(const char*);
Proc getGlProc;
}
extern "C" int hxz_fcl_init(const char* path) {
    std::lock_guard<std::recursive_mutex> lock(renderMutex);
    if(renderer || !path || *path!='/')return -1;
    // FCL's NG renderer profile: translate desktop GL to the device's GLES3.
    setenv("POJAV_RENDERER","opengles3",1);setenv("POJAVEXEC_EGL","libEGL.so",1);
    setenv("LIBGL_ES","3",1);setenv("LIBGL_GL","33",1);
    setenv("LIBGL_USE_MC_COLOR","1",1);setenv("LIBGL_NORMALIZE","1",1);
    setenv("LIBGL_NOINTOVLHACK","1",1);setenv("LIBGL_NOERROR","1",1);
    unsetenv("LIBGL_ALWAYS_SOFTWARE");unsetenv("GALLIUM_DRIVER");
    renderer=dlopen(path,RTLD_NOW|RTLD_GLOBAL);
    if(!renderer)return -1;
    getGlProc=reinterpret_cast<Proc>(dlsym(renderer,"glXGetProcAddressARB"));
    if(!getGlProc || !gl_init())return -1;
    gl_init_dimensions(renderer);
    return 0;
}
extern "C" void hxz_fcl_surface(ANativeWindow* window,int width,int height) {
    std::lock_guard<std::recursive_mutex> lock(renderMutex);
    if(window)ANativeWindow_acquire(window);
    auto* old=environment.pojavWindow;environment.pojavWindow=window;
    if(width>0&&height>0){hxz_fcl_width=width;hxz_fcl_height=height;}
    gl_setup_window();
    if(old)ANativeWindow_release(old);
}
extern "C" void* hxz_fcl_create(){std::lock_guard<std::recursive_mutex> lock(renderMutex);return gl_init_context(nullptr);}
extern "C" int hxz_fcl_current(void* context){
    std::lock_guard<std::recursive_mutex> lock(renderMutex);
    auto* bundle=static_cast<gl_render_window_t*>(context);gl_make_current(bundle);
    static bool reported=false;
    if(bundle&&gl_get_current()==bundle&&!reported){
        using GetString=const unsigned char*(*)(unsigned int);
        auto get=reinterpret_cast<GetString>(hxz_fcl_proc("glGetString"));
        if(get){for(auto token:{0x1F00u,0x1F01u,0x1F02u}){auto value=get(token);fprintf(stderr,"[HXZ GPU] %x=%s\n",token,value?reinterpret_cast<const char*>(value):"(none)");}}
        reported=true;
    }
    return gl_get_current()==bundle?0:-1;
}
extern "C" void hxz_fcl_destroy(void* context){std::lock_guard<std::recursive_mutex> lock(renderMutex);gl_destroy_context(static_cast<gl_render_window_t*>(context));}
extern "C" int hxz_fcl_swap(){
    std::lock_guard<std::recursive_mutex> lock(renderMutex);
    return gl_swap_buffers()?0:-1;
}
extern "C" void hxz_fcl_interval(int interval){std::lock_guard<std::recursive_mutex> lock(renderMutex);gl_swap_interval(interval);}
extern "C" void* hxz_fcl_proc(const char* name){
    if(!name||!renderer)return nullptr;
    auto* address=dlsym(renderer,name);
    return address?address:(getGlProc?getGlProc(name):nullptr);
}

// SPDX-License-Identifier: GPL-3.0-only
// HXZ adapter for FCL's EGL bridge. Surface updates may arrive on Binder's
// thread, but EGL creation/rebinding and presentation stay on the render thread.
#include "hxz_fcl_render.h"
#include <mutex>
#include <dlfcn.h>
#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <atomic>
#include "hxz_ng_indices.h"
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
std::atomic<uint64_t> contextRevision{0};
void* originalProc(const char* name){auto* address=dlsym(renderer,name);return address?address:(getGlProc?getGlProc(name):nullptr);}
// The renderer library is loaded once for the disposable JVM process and is
// never replaced/unloaded. Cache its entry points, not context-specific GL state.
int textureUnitLimit(){
    // NG's config.h/state.h have exactly MAX_TEX=16 slots, even when GLES advertises more.
    using Query=void(*)(unsigned,int*);int units=16;
    static const auto query=reinterpret_cast<Query>(originalProc("glGetIntegerv"));
    if(query)query(0x84E2,&units);
    return units>0&&units<16?units:16;
}
void safeGetInteger(unsigned token,int* value){
    using Query=void(*)(unsigned,int*);static const auto query=reinterpret_cast<Query>(originalProc("glGetIntegerv"));
    if(!query)return;query(token,value);
    if(value&&(token==0x8B4D||token==0x8872)&&*value>textureUnitLimit())*value=textureUnitLimit();
}
void safeBindSampler(unsigned unit,unsigned sampler){
    using Bind=void(*)(unsigned,unsigned);static const auto bind=reinterpret_cast<Bind>(originalProc("glBindSampler"));
    if(!bind)return;
    // Upstream tests unit > maxtex; equality incorrectly dirties a nonexistent slot.
    // A definitely invalid unit lets NG report GL_INVALID_VALUE without mutating any state.
    bind(unit>=static_cast<unsigned>(textureUnitLimit())?~0u:unit,sampler);
}
template<class Draw> bool drawPromoted(unsigned mode,int count,unsigned type,const void* indices,int base,Draw draw){
    // Only replace the affected EBO-backed triangle path. Leave all other GL semantics to NG.
    if(mode!=0x0004||base<=0||count<=0||count>4*1024*1024||(type!=0x1401&&type!=0x1403))return false;
    using Query=void(*)(unsigned,int*);using BufferQuery=void(*)(unsigned,unsigned,int*);
    using Bind=void(*)(unsigned,unsigned);using Generate=void(*)(int,unsigned*);
    using Data=void(*)(unsigned,intptr_t,const void*,unsigned);using Read=void(*)(unsigned,intptr_t,intptr_t,void*);
    using Enabled=unsigned char(*)(unsigned);
    static const auto query=reinterpret_cast<Query>(originalProc("glGetIntegerv"));static const auto bufferQuery=reinterpret_cast<BufferQuery>(originalProc("glGetBufferParameteriv"));
    static const auto bind=reinterpret_cast<Bind>(originalProc("glBindBuffer"));static const auto generate=reinterpret_cast<Generate>(originalProc("glGenBuffers"));
    static const auto data=reinterpret_cast<Data>(originalProc("glBufferData"));static const auto read=reinterpret_cast<Read>(originalProc("glGetBufferSubData"));
    static const auto enabled=reinterpret_cast<Enabled>(originalProc("glIsEnabled"));
    if(!query||!bufferQuery||!bind||!generate||!data||!read||!enabled||enabled(0x8F9D))return false;
    int bound=0,size=0,mapped=0;query(0x8895,&bound);
    if(!bound)return false;
    bufferQuery(0x8893,0x8764,&size);bufferQuery(0x8893,0x88BC,&mapped);
    uintptr_t offset=reinterpret_cast<uintptr_t>(indices);size_t bytes=static_cast<size_t>(count)*(type==0x1401?1:2);
    if(mapped||size<0||offset>static_cast<uintptr_t>(size)||bytes>static_cast<size_t>(size)-offset)return false;
    thread_local std::vector<unsigned char> source;thread_local std::vector<uint32_t> promoted;
    thread_local void* owner=nullptr;thread_local unsigned scratch=0;thread_local bool scratchValid=false;
    thread_local uint64_t revision=0;
    try{source.resize(bytes);}catch(...){return false;}
    // glGetBufferSubData reads NG's existing CPU shadow, never a framebuffer/GPU pixel readback.
    read(0x8893,static_cast<intptr_t>(offset),static_cast<intptr_t>(bytes),source.data());
    bool changed=false;
    if(!hxz_ng_promote_indices(source.data(),count,type,base,promoted,&changed)){scratchValid=false;return false;}
    const auto liveRevision=contextRevision.load(std::memory_order_relaxed);
    if(owner!=gl_get_current()||revision!=liveRevision){owner=gl_get_current();revision=liveRevision;scratch=0;scratchValid=false;}
    if(!scratch)generate(1,&scratch);if(!scratch)return false;
    bind(0x8893,scratch);
    // Revalidate the live source bytes every draw, including mapped/sub-data
    // updates. Only reuse identical *contents*, never just an EBO ID/offset.
    // This avoids repeated GL allocation/upload for unchanged chunk indices.
    if(changed||!scratchValid){data(0x8893,static_cast<intptr_t>(promoted.size()*sizeof(uint32_t)),promoted.data(),0x88E0);scratchValid=true;}
    draw();bind(0x8893,static_cast<unsigned>(bound));
    static thread_local bool reported=false;if(!reported){reported=true;fprintf(stderr,"[HXZ graphics] base-vertex 32-bit index repair active\n");}
    return true;
}
void safeDrawBaseVertex(unsigned mode,int count,unsigned type,const void* indices,int base){
    using DrawBase=void(*)(unsigned,int,unsigned,const void*,int);using Draw=void(*)(unsigned,int,unsigned,const void*);
    static const auto original=reinterpret_cast<DrawBase>(originalProc("glDrawElementsBaseVertex"));if(!original)return;
    static const auto draw=reinterpret_cast<Draw>(originalProc("glDrawElements"));
    if(draw&&drawPromoted(mode,count,type,indices,base,[&]{draw(mode,count,0x1405,nullptr);}))return;
    original(mode,count,type,indices,base);
}
void safeDrawInstancedBaseVertex(unsigned mode,int count,unsigned type,const void* indices,int instances,int base){
    using DrawBase=void(*)(unsigned,int,unsigned,const void*,int,int);using Draw=void(*)(unsigned,int,unsigned,const void*,int);
    static const auto original=reinterpret_cast<DrawBase>(originalProc("glDrawElementsInstancedBaseVertex"));if(!original)return;
    static const auto draw=reinterpret_cast<Draw>(originalProc("glDrawElementsInstanced"));
    // Keep the driver instancing path and its attribute divisors; one ordinary draw is not equivalent.
    if(instances>0&&draw&&drawPromoted(mode,count,type,indices,base,[&]{draw(mode,count,0x1405,nullptr,instances);}))return;
    original(mode,count,type,indices,instances,base);
}
void safeMultiDrawBaseVertex(unsigned mode,const int* counts,unsigned type,const void* const* indices,int draws,const int* bases){
    if(!counts||!indices||!bases||draws<0||draws>65536)return;
    for(int i=0;i<draws;i++)safeDrawBaseVertex(mode,counts[i],type,indices[i],bases[i]);
}
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
extern "C" void hxz_fcl_destroy(void* context){std::lock_guard<std::recursive_mutex> lock(renderMutex);gl_destroy_context(static_cast<gl_render_window_t*>(context));if(context)contextRevision.fetch_add(1,std::memory_order_relaxed);}
extern "C" int hxz_fcl_swap(){
    std::lock_guard<std::recursive_mutex> lock(renderMutex);
    return gl_swap_buffers()?0:-1;
}
extern "C" void hxz_fcl_interval(int interval){std::lock_guard<std::recursive_mutex> lock(renderMutex);gl_swap_interval(interval);}
extern "C" void* hxz_fcl_proc(const char* name){
    if(!name||!renderer)return nullptr;
    if(!strcmp(name,"glGetIntegerv"))return reinterpret_cast<void*>(&safeGetInteger);
    if(!strcmp(name,"glBindSampler"))return reinterpret_cast<void*>(&safeBindSampler);
    if(!strcmp(name,"glDrawElementsBaseVertex")||!strcmp(name,"glDrawElementsBaseVertexARB")||!strcmp(name,"glDrawElementsBaseVertexEXT")||!strcmp(name,"glDrawElementsBaseVertexOES"))return reinterpret_cast<void*>(&safeDrawBaseVertex);
    if(!strcmp(name,"glDrawElementsInstancedBaseVertex")||!strcmp(name,"glDrawElementsInstancedBaseVertexARB")||!strcmp(name,"glDrawElementsInstancedBaseVertexEXT")||!strcmp(name,"glDrawElementsInstancedBaseVertexOES"))return reinterpret_cast<void*>(&safeDrawInstancedBaseVertex);
    if(!strcmp(name,"glMultiDrawElementsBaseVertex")||!strcmp(name,"glMultiDrawElementsBaseVertexEXT"))return reinterpret_cast<void*>(&safeMultiDrawBaseVertex);
    return originalProc(name);
}
// LWJGL GL's library provider uses GLX lookup directly, rather than GLFW's lookup.
extern "C" __attribute__((visibility("default"))) void* glXGetProcAddress(const char* name){return hxz_fcl_proc(name);}
extern "C" __attribute__((visibility("default"))) void* glXGetProcAddressARB(const char* name){return hxz_fcl_proc(name);}

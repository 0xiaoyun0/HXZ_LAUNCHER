// Runs the imported production FCL bridge against deterministic EGL/window stubs.
#include <assert.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "environ.h"
#include "egl_loader.h"

struct ANativeWindow {int refs;};
static struct pojav_environ_s environment;
struct pojav_environ_s* pojav_environ=&environment;
int hxz_fcl_width=1280,hxz_fcl_height=720;
static int created=0,destroyed=0,contexts=0,swaps=0,geometry=0;
static int failSwap=0,failContext=0,failInit=0;
static EGLContext current;
static EGLSurface currentSurface;

void ANativeWindow_acquire(struct ANativeWindow* window){assert(window);++window->refs;}
void ANativeWindow_release(struct ANativeWindow* window){assert(window&&window->refs>0);--window->refs;}
int32_t ANativeWindow_setBuffersGeometry(struct ANativeWindow* window,int32_t w,int32_t h,int32_t format){assert(window&&w==1280&&h==720&&format==1);++geometry;return 0;}
int __android_log_print(int priority,const char* tag,const char* format,...){(void)priority;(void)tag;(void)format;return 0;}
void* dlsym(void* handle,const char* name){(void)handle;(void)name;return NULL;}

static EGLDisplay display(EGLNativeDisplayType unused){(void)unused;return (EGLDisplay)1;}
static EGLBoolean initialize(EGLDisplay d,EGLint* a,EGLint* b){(void)d;(void)a;(void)b;return EGL_TRUE;}
static EGLBoolean choose(EGLDisplay d,const EGLint* attrs,EGLConfig* config,EGLint capacity,EGLint* count){(void)d;(void)attrs;(void)capacity;*count=1;if(config)*config=(EGLConfig)2;return EGL_TRUE;}
static EGLBoolean attrib(EGLDisplay d,EGLConfig config,EGLint key,EGLint* out){(void)d;(void)config;(void)key;*out=1;return EGL_TRUE;}
static EGLBoolean bind(EGLenum api){assert(api==EGL_OPENGL_ES_API);return EGL_TRUE;}
static EGLContext createContext(EGLDisplay d,EGLConfig config,EGLContext share,const EGLint* attrs){(void)d;(void)config;(void)share;assert(attrs[1]==3);if(failContext)return EGL_NO_CONTEXT;++contexts;return (EGLContext)3;}
static EGLBoolean destroyContext(EGLDisplay d,EGLContext context){(void)d;assert(context&&!current);--contexts;return EGL_TRUE;}
static EGLSurface createWindow(EGLDisplay d,EGLConfig config,EGLNativeWindowType window,const EGLint* attrs){(void)d;(void)config;(void)attrs;assert(window);return (EGLSurface)(uintptr_t)(++created+10);}
static EGLSurface createPbuffer(EGLDisplay d,EGLConfig config,const EGLint* attrs){(void)d;(void)config;assert(attrs[1]==1&&attrs[3]==1);return (EGLSurface)(uintptr_t)(++created+10);}
static EGLBoolean destroySurface(EGLDisplay d,EGLSurface s){(void)d;assert(s&&!current);++destroyed;return EGL_TRUE;}
static EGLBoolean makeCurrent(EGLDisplay d,EGLSurface draw,EGLSurface read,EGLContext context){(void)d;assert(draw==read);current=context;currentSurface=draw;return EGL_TRUE;}
static EGLBoolean swap(EGLDisplay d,EGLSurface s){(void)d;assert(s==currentSurface&&current);++swaps;if(failSwap){failSwap=0;return EGL_FALSE;}return EGL_TRUE;}
static EGLint error(void){return EGL_BAD_SURFACE;}
static EGLBoolean interval(EGLDisplay d,EGLint n){(void)d;assert(n==1);return EGL_TRUE;}
static EGLBoolean query(EGLDisplay d,EGLSurface s,EGLint key,EGLint* out){(void)d;assert(s);*out=key==EGL_WIDTH?1280:720;return EGL_TRUE;}

EGLBoolean (*eglMakeCurrent_p)(EGLDisplay,EGLSurface,EGLSurface,EGLContext)=makeCurrent;
EGLBoolean (*eglDestroyContext_p)(EGLDisplay,EGLContext)=destroyContext;
EGLBoolean (*eglDestroySurface_p)(EGLDisplay,EGLSurface)=destroySurface;
EGLDisplay (*eglGetDisplay_p)(EGLNativeDisplayType)=display;
EGLBoolean (*eglInitialize_p)(EGLDisplay,EGLint*,EGLint*)=initialize;
EGLBoolean (*eglChooseConfig_p)(EGLDisplay,const EGLint*,EGLConfig*,EGLint,EGLint*)=choose;
EGLBoolean (*eglGetConfigAttrib_p)(EGLDisplay,EGLConfig,EGLint,EGLint*)=attrib;
EGLBoolean (*eglBindAPI_p)(EGLenum)=bind;
EGLSurface (*eglCreatePbufferSurface_p)(EGLDisplay,EGLConfig,const EGLint*)=createPbuffer;
EGLSurface (*eglCreateWindowSurface_p)(EGLDisplay,EGLConfig,EGLNativeWindowType,const EGLint*)=createWindow;
EGLBoolean (*eglSwapBuffers_p)(EGLDisplay,EGLSurface)=swap;
EGLint (*eglGetError_p)(void)=error;
EGLContext (*eglCreateContext_p)(EGLDisplay,EGLConfig,EGLContext,const EGLint*)=createContext;
EGLBoolean (*eglSwapInterval_p)(EGLDisplay,EGLint)=interval;
EGLBoolean (*eglQuerySurface_p)(EGLDisplay,EGLSurface,EGLint,EGLint*)=query;
bool dlsym_EGL(void){return !failInit;}

int main(void){
#ifdef _WIN32
    _putenv_s("POJAV_RENDERER","opengles3");_putenv_s("LIBGL_ES","3");
#else
    setenv("POJAV_RENDERER","opengles3",1);setenv("LIBGL_ES","3",1);
#endif
    failInit=1;assert(!gl_init());failInit=0;assert(gl_init());
    failContext=1;assert(!gl_init_context(NULL));failContext=0;
    struct ANativeWindow a={1},b={1};environment.pojavWindow=&a;
    gl_render_window_t* ctx=gl_init_context(NULL);assert(ctx&&contexts==1);
    gl_make_current(ctx);assert(gl_get_current()==ctx&&a.refs==2);
    for(int i=0;i<120;++i)gl_swap_buffers();assert(swaps==120&&geometry==1);
    environment.pojavWindow=&b;gl_setup_window();gl_swap_buffers();assert(a.refs==1&&b.refs==2);
    environment.pojavWindow=NULL;gl_setup_window();gl_swap_buffers();assert(a.refs==1&&b.refs==1&&current);
    environment.pojavWindow=&a;gl_setup_window();gl_swap_buffers();assert(a.refs==2);
    failSwap=1;gl_swap_buffers();assert(a.refs==1&&current); // Dying Surface -> pbuffer.
    gl_swap_interval(1);gl_destroy_context(ctx);
    assert(!gl_get_current()&&!current&&contexts==0&&created==destroyed&&a.refs==1&&b.refs==1);
    gl_swap_buffers(); // Closing/background state cannot dereference a NULL bundle.
    puts("Production FCL EGL bridge: direct swaps, replace/destroy/restore Surface, bad Surface, EGL failure, context cleanup passed");
    return 0;
}

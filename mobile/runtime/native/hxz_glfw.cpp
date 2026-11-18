#define GLFW_INCLUDE_NONE
#define GLFW_INCLUDE_VULKAN
#include "include/glfw3.h"
#include "include/hxz_glfw_ime.h"
#include "hxz_glfw.h"
#include "hxz_frame_present.h"
#include "hxz_fcl_render.h"

#include <EGL/egl.h>
#include <android/native_window.h>
#include <dlfcn.h>
#include <algorithm>
#include <atomic>
#include <array>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <cstdint>
#include <cstring>
#include <deque>
#include <limits>
#include <mutex>
#include <new>
#include <string>
#include <thread>
#include <vector>

// This is an independently implemented Android backend for GLFW's public 3.4
// C ABI. It is not the desktop GLFW implementation or a launcher bridge.
struct GLFWmonitor { int unused; };
struct GLFWcursor { int unused; };
struct GLFWwindow {
    int width=0, height=0, x=0, y=0;
    std::atomic<bool> close{false}; bool visible=true, focused=true;
    bool maximized=false;
    bool iconified=false, resizable=true, decorated=false, floating=false;
    bool autoIconify=true, focusOnShow=true, mousePassthrough=false;
    float opacity=1.0f;
    int minWidth=GLFW_DONT_CARE,minHeight=GLFW_DONT_CARE;
    int maxWidth=GLFW_DONT_CARE,maxHeight=GLFW_DONT_CARE;
    int aspectNumerator=GLFW_DONT_CARE,aspectDenominator=GLFW_DONT_CARE;
    GLFWmonitor* attachedMonitor=nullptr;
    std::string title;
    int cursor=GLFW_CURSOR_NORMAL;
    double cursorX=0, cursorY=0;
    void* user=nullptr;
    std::thread::id owner;
    GLFWwindowposfun posCb=nullptr;
    GLFWwindowsizefun sizeCb=nullptr;
    GLFWwindowclosefun closeCb=nullptr;
    GLFWwindowrefreshfun refreshCb=nullptr;
    GLFWwindowfocusfun focusCb=nullptr;
    GLFWframebuffersizefun framebufferCb=nullptr;
    GLFWmousebuttonfun mouseCb=nullptr;
    GLFWcursorposfun cursorCb=nullptr;
    GLFWcursorenterfun enterCb=nullptr;
    GLFWscrollfun scrollCb=nullptr;
    GLFWkeyfun keyCb=nullptr;
    GLFWcharfun charCb=nullptr;
    GLFWcharmodsfun charModsCb=nullptr;
    GLFWpreeditfun preeditCb=nullptr;
    GLFWimestatusfun imeStatusCb=nullptr;
    GLFWpreeditcandidatefun preeditCandidateCb=nullptr;
    // Android's text dialog owns composition and candidates. Only committed
    // codepoints cross hxz_event(5); this mode describes the client's IME request,
    // not the visibility of Android's keyboard, and must not filter those commits.
    bool imeEnabled=false;
    int preeditX=0,preeditY=0,preeditWidth=0,preeditHeight=0;
    GLFWdropfun dropCb=nullptr;
    GLFWwindowiconifyfun iconifyCb=nullptr;
    GLFWwindowmaximizefun maximizeCb=nullptr;
    GLFWwindowcontentscalefun scaleCb=nullptr;
    void* context=nullptr;
    int bufferWidth=0, bufferHeight=0;
    bool topDown=false;
    EGLContext eglContext=EGL_NO_CONTEXT;
    EGLSurface eglSurface=EGL_NO_SURFACE;
    uint64_t boundSurfaceGeneration=0;
    std::vector<uint8_t> pixels;
};

namespace {
using Clock=std::chrono::steady_clock;
constexpr size_t kQueueLimit=512;
constexpr int kSurfaceResize=100;
constexpr int OSMESA_FORMAT=0x22, OSMESA_DEPTH_BITS=0x30, OSMESA_STENCIL_BITS=0x31;
constexpr int OSMESA_PROFILE=0x33, OSMESA_CORE_PROFILE=0x34, OSMESA_COMPAT_PROFILE=0x35;
constexpr int OSMESA_CONTEXT_MAJOR_VERSION=0x36, OSMESA_CONTEXT_MINOR_VERSION=0x37;
constexpr int OSMESA_Y_UP=0x11, GL_RGBA_VALUE=0x1908, GL_UNSIGNED_BYTE_VALUE=0x1401;
struct Event {int type,a,b,c,d;};
struct Hints {int api=GLFW_OPENGL_API, major=1, minor=0, profile=GLFW_OPENGL_ANY_PROFILE;
              int creation=GLFW_NATIVE_CONTEXT_API, samples=0;bool visible=true;
              bool resizable=true,decorated=true,focused=true,maximized=false,floating=false;
              bool autoIconify=true,focusOnShow=true,mousePassthrough=false;};
enum class Backend { none, osmesa, egl, fcl };
struct OSMesaApi {
    void* (*create)(const int*,void*)=nullptr;
    unsigned char (*makeCurrent)(void*,void*,unsigned int,int,int)=nullptr;
    void (*destroy)(void*)=nullptr;
    void* (*getProc)(const char*)=nullptr;
    void (*pixelStore)(int,int)=nullptr;
};
struct EglApi {
    decltype(&eglGetDisplay) getDisplay=nullptr;
    decltype(&eglInitialize) initialize=nullptr;
    decltype(&eglTerminate) terminate=nullptr;
    decltype(&eglBindAPI) bindAPI=nullptr;
    decltype(&eglChooseConfig) chooseConfig=nullptr;
    decltype(&eglCreateContext) createContext=nullptr;
    decltype(&eglDestroyContext) destroyContext=nullptr;
    decltype(&eglCreateWindowSurface) createWindowSurface=nullptr;
    decltype(&eglCreatePbufferSurface) createPbufferSurface=nullptr;
    decltype(&eglDestroySurface) destroySurface=nullptr;
    decltype(&eglMakeCurrent) makeCurrent=nullptr;
    decltype(&eglSwapBuffers) swapBuffers=nullptr;
    decltype(&eglSwapInterval) swapInterval=nullptr;
    decltype(&eglGetProcAddress) getProcAddress=nullptr;
};

std::mutex mu;
std::mutex presentMu;
HxzFrameGeometry frameGeometry;
std::condition_variable eventReady;
std::deque<Event> events;
std::array<unsigned char,GLFW_KEY_LAST+1> keys{};
std::array<unsigned char,GLFW_MOUSE_BUTTON_LAST+1> buttons{};
GLFWwindow* window=nullptr;
GLFWmonitor monitor{};
void* monitorUser=nullptr;
GLFWmonitor* monitorList[]={&monitor};
GLFWvidmode videoMode{1280,720,8,8,8,60};
Hints hints;
Backend backend=Backend::none;
void* rendererLib=nullptr;
void* glesLib=nullptr;
OSMesaApi osmesa;
EglApi egl;
EGLDisplay display=EGL_NO_DISPLAY;
EGLConfig config=nullptr;
ANativeWindow* surface=nullptr;
int surfaceWidth=0,surfaceHeight=0;
uint64_t surfaceGeneration=1;
bool initialized=false;
int errorCode=GLFW_NO_ERROR;
std::string errorMessage;
GLFWerrorfun errorCallback=nullptr;
GLFWmonitorfun monitorCallback=nullptr;
GLFWjoystickfun joystickCallback=nullptr;
std::string clipboard;
std::string rendererError;
Clock::time_point epoch=Clock::now();
double timeOffset=0;
thread_local GLFWwindow* current=nullptr;
thread_local std::string returnedError;
std::atomic<HxzFrameSink> frameSink{nullptr};

void report(int code,const char* message){
    GLFWerrorfun callback;
    {std::lock_guard<std::mutex> lock(mu);errorCode=code;errorMessage=message;rendererError=message;callback=errorCallback;}
    if(callback)callback(code,message);
}
template<typename T> bool load(void* lib,const char* name,T& out){out=reinterpret_cast<T>(dlsym(lib,name));return out!=nullptr;}
bool loadOSMesa(void* lib,OSMesaApi& api){
    return load(lib,"OSMesaCreateContextAttribs",api.create)&&load(lib,"OSMesaMakeCurrent",api.makeCurrent)&&
           load(lib,"OSMesaDestroyContext",api.destroy)&&load(lib,"OSMesaGetProcAddress",api.getProc);
}
bool loadEgl(void* lib,EglApi& api){
    return load(lib,"eglGetDisplay",api.getDisplay)&&load(lib,"eglInitialize",api.initialize)&&
           load(lib,"eglTerminate",api.terminate)&&load(lib,"eglBindAPI",api.bindAPI)&&
           load(lib,"eglChooseConfig",api.chooseConfig)&&load(lib,"eglCreateContext",api.createContext)&&
           load(lib,"eglDestroyContext",api.destroyContext)&&load(lib,"eglCreateWindowSurface",api.createWindowSurface)&&
           load(lib,"eglCreatePbufferSurface",api.createPbufferSurface)&&load(lib,"eglDestroySurface",api.destroySurface)&&
           load(lib,"eglMakeCurrent",api.makeCurrent)&&load(lib,"eglSwapBuffers",api.swapBuffers)&&
           load(lib,"eglSwapInterval",api.swapInterval)&&load(lib,"eglGetProcAddress",api.getProcAddress);
}
void enqueue(Event value){
    if(!events.empty()&&events.back().type==value.type){
        auto& previous=events.back();
        if(value.type==kSurfaceResize||(value.type==3&&!value.c&&!previous.c)){
            previous=value;eventReady.notify_one();return;
        }
        // Relative positions are displacements, so replacing them loses motion.
        // Saturate the wire integer without changing ordering across absolute moves.
        if(value.type==3&&value.c&&previous.c){
            auto add=[](int a,int b){return static_cast<int>(std::clamp<int64_t>(static_cast<int64_t>(a)+b,std::numeric_limits<int>::min(),std::numeric_limits<int>::max()));};
            previous.a=add(previous.a,value.a);previous.b=add(previous.b,value.b);eventReady.notify_one();return;
        }
    }
    if(events.size()>=kQueueLimit){
        events.clear();
        for(size_t i=0;i<keys.size();++i)if(keys[i]==GLFW_PRESS)events.push_back({1,static_cast<int>(i),0,GLFW_RELEASE,0});
        for(size_t i=0;i<buttons.size();++i)if(buttons[i]==GLFW_PRESS)events.push_back({2,static_cast<int>(i),GLFW_RELEASE,0,0});
    }
    if(events.size()<kQueueLimit)events.push_back(value);
    eventReady.notify_one();
}
bool resizeOSMesa(GLFWwindow* w,int width,int height){
    if(width<1||height<1||width>16384||height>16384||static_cast<uint64_t>(width)*height>67108864){report(GLFW_INVALID_VALUE,"OpenGL framebuffer size is invalid");return false;}
    if(w->bufferWidth==width&&w->bufferHeight==height)return true;
    std::vector<uint8_t> next;
    try{next.assign(static_cast<size_t>(width)*height*4,0);}catch(...){report(GLFW_OUT_OF_MEMORY,"Cannot allocate OpenGL framebuffer");return false;}
    if(current==w&&!osmesa.makeCurrent(w->context,next.data(),GL_UNSIGNED_BYTE_VALUE,width,height)){report(GLFW_PLATFORM_ERROR,"OSMesaMakeCurrent failed after resize");return false;}
    w->pixels.swap(next);w->bufferWidth=width;w->bufferHeight=height;
    return true;
}
bool updateEglSurface(GLFWwindow* w){
    ANativeWindow* native;
    uint64_t generation;
    int width,height;
    {std::lock_guard<std::mutex> lock(mu);native=surface;generation=surfaceGeneration;width=surfaceWidth;height=surfaceHeight;
     if(native)ANativeWindow_acquire(native);}
    if(generation==w->boundSurfaceGeneration){if(native)ANativeWindow_release(native);return true;}
    egl.makeCurrent(display,EGL_NO_SURFACE,EGL_NO_SURFACE,EGL_NO_CONTEXT);
    if(w->eglSurface!=EGL_NO_SURFACE){egl.destroySurface(display,w->eglSurface);w->eglSurface=EGL_NO_SURFACE;}
    if(native){
        if(ANativeWindow_setBuffersGeometry(native,width,height,WINDOW_FORMAT_RGBA_8888)!=0){ANativeWindow_release(native);report(GLFW_PLATFORM_ERROR,"Android Surface does not accept RGBA geometry");return false;}
        w->eglSurface=egl.createWindowSurface(display,config,native,nullptr);
        ANativeWindow_release(native);
        if(w->eglSurface==EGL_NO_SURFACE){report(GLFW_PLATFORM_ERROR,"EGL cannot bind Android Surface");return false;}
    }else{
        const EGLint attrs[]={EGL_WIDTH,1,EGL_HEIGHT,1,EGL_NONE};
        w->eglSurface=egl.createPbufferSurface(display,config,attrs);
        if(w->eglSurface==EGL_NO_SURFACE){report(GLFW_PLATFORM_ERROR,"EGL cannot create fallback pbuffer");return false;}
    }
    w->boundSurfaceGeneration=generation;
    return egl.makeCurrent(display,w->eglSurface,w->eglSurface,w->eglContext)==EGL_TRUE;
}
void destroyWindow(GLFWwindow* w){
    if(!w)return;
    if(current==w){if(backend==Backend::fcl)hxz_fcl_current(nullptr);
        else if(backend==Backend::egl)egl.makeCurrent(display,EGL_NO_SURFACE,EGL_NO_SURFACE,EGL_NO_CONTEXT);
        else if(backend==Backend::osmesa)osmesa.makeCurrent(nullptr,nullptr,0,0,0);current=nullptr;w->owner={};}
    if(backend==Backend::osmesa&&w->context)osmesa.destroy(w->context);
    if(backend==Backend::fcl&&w->context)hxz_fcl_destroy(w->context);
    if(backend==Backend::egl){if(w->eglSurface!=EGL_NO_SURFACE)egl.destroySurface(display,w->eglSurface);if(w->eglContext!=EGL_NO_CONTEXT)egl.destroyContext(display,w->eglContext);}
    delete w;
}
bool hasWindow(GLFWwindow* w){if(w&&w==window)return true;report(GLFW_INVALID_VALUE,"Invalid GLFW window");return false;}
bool hasImeWindow(GLFWwindow* w){
    if(!initialized){report(GLFW_NOT_INITIALIZED,"GLFW is not initialized");return false;}
    return hasWindow(w);
}
}

extern "C" void hxz_surface(ANativeWindow* native,int width,int height){
    if(native&&(width<1||height<1||width>16384||height>16384)){report(GLFW_INVALID_VALUE,"Invalid Android Surface size");return;}
    if(native)ANativeWindow_acquire(native);
    ANativeWindow* old;
    {std::lock_guard<std::mutex> lock(mu);old=surface;surface=native;surfaceWidth=native?width:0;surfaceHeight=native?height:0;++surfaceGeneration;
     if(native)enqueue({kSurfaceResize,width,height,0,0});}
    if(old)ANativeWindow_release(old);
}
extern "C" void hxz_surface_resolution(int width,int height){
    if(width<1||height<1||width>4096||height>4096){report(GLFW_INVALID_VALUE,"Invalid host render size");return;}
    std::lock_guard<std::mutex> lock(mu);surfaceWidth=width;surfaceHeight=height;++surfaceGeneration;
    if(surface)enqueue({kSurfaceResize,width,height,0,0});
}
extern "C" void hxz_event(int type,int a,int b,int c,int d){
    if(type<1||type>6)return;
    if(type==1&&(a<0||a>GLFW_KEY_LAST||c<GLFW_RELEASE||c>GLFW_REPEAT))return;
    if(type==2&&(a<0||a>GLFW_MOUSE_BUTTON_LAST||b<GLFW_RELEASE||b>GLFW_REPEAT))return;
    std::lock_guard<std::mutex> lock(mu);enqueue({type,a,b,c,d});
}
extern "C" void hxz_release_inputs(void){
    std::lock_guard<std::mutex> lock(mu);
    auto heldKeys=keys;auto heldButtons=buttons;
    // A press may still be waiting for the game thread to poll it.
    for(const auto& e:events){
        if(e.type==1)heldKeys[e.a]=e.c==GLFW_RELEASE?GLFW_RELEASE:GLFW_PRESS;
        else if(e.type==2)heldButtons[e.a]=e.b==GLFW_RELEASE?GLFW_RELEASE:GLFW_PRESS;
    }
    for(size_t i=0;i<heldKeys.size();++i)if(heldKeys[i]==GLFW_PRESS)enqueue({1,static_cast<int>(i),0,GLFW_RELEASE,0});
    for(size_t i=0;i<heldButtons.size();++i)if(heldButtons[i]==GLFW_PRESS)enqueue({2,static_cast<int>(i),GLFW_RELEASE,0,0});
}
extern "C" void hxz_virtual_size(int width,int height){
    if(width<1||height<1||width>4096||height>4096){report(GLFW_INVALID_VALUE,"Invalid virtual game size");return;}
    std::lock_guard<std::mutex> lock(mu);enqueue({kSurfaceResize,width,height,0,0});
}
extern "C" void hxz_request_close(void){std::lock_guard<std::mutex> lock(mu);if(window)window->close.store(true);eventReady.notify_all();}
extern "C" int hxz_configure_renderer(const char* path,const char* kind){
    if(!kind){report(GLFW_INVALID_VALUE,"Renderer kind is required");return -1;}
    {std::lock_guard<std::mutex> lock(mu);if(window){rendererError="Close the GLFW window before changing renderer";return -1;}}
    if(std::strcmp(kind,"fcl-egl")==0){
        if(hxz_fcl_init(path)!=0){report(GLFW_API_UNAVAILABLE,"FCL EGL / NG-GL4ES initialization failed");return -1;}
        backend=Backend::fcl;return 0;
    }
    Backend next;
    if(std::strcmp(kind,"osmesa")==0)next=Backend::osmesa;
    else if(std::strcmp(kind,"egl")==0)next=Backend::egl;
    else{report(GLFW_API_UNAVAILABLE,"Unsupported renderer kind");return -1;}
    if(next==Backend::osmesa&&(!path||path[0]!='/')){report(GLFW_INVALID_VALUE,"OSMesa requires an absolute verified library path");return -1;}
    void* lib=dlopen(next==Backend::egl&&(!path||!path[0])?"libEGL.so":path,RTLD_NOW|RTLD_LOCAL);
    if(!lib){report(GLFW_API_UNAVAILABLE,"Renderer library could not be loaded");return -1;}
    OSMesaApi mesa{};EglApi eglApi{};
    bool valid=next==Backend::osmesa?loadOSMesa(lib,mesa):loadEgl(lib,eglApi);
    if(!valid){dlclose(lib);report(GLFW_API_UNAVAILABLE,"Renderer library lacks required context functions");return -1;}
    if(display!=EGL_NO_DISPLAY){egl.terminate(display);display=EGL_NO_DISPLAY;}
    if(glesLib){dlclose(glesLib);glesLib=nullptr;}
    if(rendererLib)dlclose(rendererLib);
    rendererLib=lib;backend=next;osmesa=mesa;egl=eglApi;
    {std::lock_guard<std::mutex> lock(mu);++surfaceGeneration;rendererError.clear();}
    return 0;
}
extern "C" const char* hxz_last_error(void){std::lock_guard<std::mutex> lock(mu);returnedError=rendererError;return returnedError.c_str();}
extern "C" int hxz_cursor_captured(void){std::lock_guard<std::mutex> lock(mu);return window&&window->cursor==GLFW_CURSOR_DISABLED;}
extern "C" void hxz_set_frame_sink(HxzFrameSink sink){frameSink.store(sink,std::memory_order_release);}
extern "C" int hxz_present_frame(const unsigned char* rgba,int width,int height,int stridePixels,int topDown){
    if(!rgba||width<1||height<1||width>4096||height>4096||stridePixels<width||stridePixels>4096){report(GLFW_INVALID_VALUE,"Invalid shared frame geometry");return -1;}
    std::unique_lock<std::mutex> presentLock(presentMu);
    ANativeWindow* native;
    uint64_t generation;
    {std::lock_guard<std::mutex> lock(mu);native=surface;generation=surfaceGeneration;if(native)ANativeWindow_acquire(native);}
    if(!native)return 0;
    if(frameGeometry.ensure(generation,width,height,[&]{return ANativeWindow_setBuffersGeometry(native,width,height,WINDOW_FORMAT_RGBA_8888);})!=0){ANativeWindow_release(native);presentLock.unlock();report(GLFW_PLATFORM_ERROR,"Android Surface does not accept RGBA geometry");return -1;}
    ANativeWindow_Buffer output{};
    if(ANativeWindow_lock(native,&output,nullptr)!=0){frameGeometry.invalidate();ANativeWindow_release(native);presentLock.unlock();report(GLFW_PLATFORM_ERROR,"Android Surface lock failed");return -1;}
    if(output.format!=WINDOW_FORMAT_RGBA_8888||output.bits==nullptr||output.stride<output.width||output.width<1||output.height<1){frameGeometry.invalidate();ANativeWindow_unlockAndPost(native);ANativeWindow_release(native);presentLock.unlock();report(GLFW_FORMAT_UNAVAILABLE,"Android Surface buffer geometry is invalid");return -1;}
    hxzCopyRgbaFrame(rgba,width,height,stridePixels,topDown!=0,output.bits,output.width,output.height,output.stride);
    int result=ANativeWindow_unlockAndPost(native);ANativeWindow_release(native);
    if(result!=0){frameGeometry.invalidate();presentLock.unlock();report(GLFW_PLATFORM_ERROR,"Android Surface present failed");return -1;}return 0;
}

extern "C" int glfwInit(void){initialized=true;epoch=Clock::now();return GLFW_TRUE;}
extern "C" void glfwInitAllocator(const GLFWallocator* allocator){if(allocator)report(GLFW_FEATURE_UNAVAILABLE,"Custom GLFW allocator is unavailable");}
extern "C" void glfwInitVulkanLoader(PFN_vkGetInstanceProcAddr loader){if(loader)report(GLFW_API_UNAVAILABLE,"Vulkan loader is unavailable");}
extern "C" void glfwTerminate(void){glfwDestroyWindow(window);if(window)return;initialized=false;eventReady.notify_all();
    ANativeWindow* oldSurface;{std::lock_guard<std::mutex> lock(mu);oldSurface=surface;surface=nullptr;surfaceWidth=0;surfaceHeight=0;}
    if(oldSurface)ANativeWindow_release(oldSurface);if(display!=EGL_NO_DISPLAY){egl.terminate(display);display=EGL_NO_DISPLAY;}
    if(glesLib){dlclose(glesLib);glesLib=nullptr;}if(rendererLib){dlclose(rendererLib);rendererLib=nullptr;}backend=Backend::none;
    {std::lock_guard<std::mutex> lock(mu);events.clear();keys.fill(0);buttons.fill(0);++surfaceGeneration;}}
extern "C" void glfwInitHint(int hint,int value){if(hint==GLFW_PLATFORM){if(value!=GLFW_ANY_PLATFORM&&value!=GLFW_PLATFORM_NULL)report(GLFW_PLATFORM_UNAVAILABLE,"Requested desktop GLFW platform is unavailable");return;}
    if(hint==GLFW_MANAGE_PREEDIT_CANDIDATE){if(value!=GLFW_FALSE)report(GLFW_FEATURE_UNAVAILABLE,"Android IME owns the candidate window");return;}
    if(hint==GLFW_JOYSTICK_HAT_BUTTONS)return;
    if(hint==GLFW_COCOA_CHDIR_RESOURCES||hint==GLFW_COCOA_MENUBAR||hint==GLFW_WAYLAND_LIBDECOR||hint==GLFW_X11_XCB_VULKAN_SURFACE){report(GLFW_FEATURE_UNAVAILABLE,"Desktop GLFW init hint is unavailable on Android");return;}
    report(GLFW_INVALID_ENUM,"Unsupported GLFW init hint");}
extern "C" int glfwGetPlatform(void){return GLFW_PLATFORM_NULL;}
extern "C" int glfwPlatformSupported(int platform){return platform==GLFW_PLATFORM_NULL?GLFW_TRUE:GLFW_FALSE;}
extern "C" void glfwGetVersion(int* major,int* minor,int* rev){if(major)*major=3;if(minor)*minor=4;if(rev)*rev=0;}
extern "C" const char* glfwGetVersionString(void){return "3.4.0 HXZ Android backend";}
extern "C" int glfwGetError(const char** description){std::lock_guard<std::mutex> lock(mu);int result=errorCode;returnedError=errorMessage;if(description)*description=returnedError.empty()?nullptr:returnedError.c_str();errorCode=GLFW_NO_ERROR;return result;}
extern "C" GLFWerrorfun glfwSetErrorCallback(GLFWerrorfun callback){std::lock_guard<std::mutex> lock(mu);auto old=errorCallback;errorCallback=callback;return old;}
extern "C" void glfwDefaultWindowHints(void){hints=Hints{};}
extern "C" void glfwWindowHint(int hint,int value){switch(hint){
    case GLFW_CLIENT_API:hints.api=value;break;case GLFW_CONTEXT_VERSION_MAJOR:hints.major=value;break;
    case GLFW_CONTEXT_VERSION_MINOR:hints.minor=value;break;case GLFW_OPENGL_PROFILE:hints.profile=value;break;
    case GLFW_CONTEXT_CREATION_API:hints.creation=value;break;case GLFW_SAMPLES:hints.samples=value;break;
    case GLFW_VISIBLE:hints.visible=value==GLFW_TRUE;break;
    case GLFW_RESIZABLE:hints.resizable=value==GLFW_TRUE;break;case GLFW_DECORATED:hints.decorated=value==GLFW_TRUE;break;
    case GLFW_FOCUSED:hints.focused=value==GLFW_TRUE;break;case GLFW_MAXIMIZED:hints.maximized=value==GLFW_TRUE;break;
    case GLFW_FLOATING:hints.floating=value==GLFW_TRUE;break;case GLFW_AUTO_ICONIFY:hints.autoIconify=value==GLFW_TRUE;break;
    case GLFW_FOCUS_ON_SHOW:hints.focusOnShow=value==GLFW_TRUE;break;case GLFW_MOUSE_PASSTHROUGH:hints.mousePassthrough=value==GLFW_TRUE;break;
    case GLFW_CENTER_CURSOR:case GLFW_TRANSPARENT_FRAMEBUFFER:
    case GLFW_SCALE_TO_MONITOR:case GLFW_RED_BITS:case GLFW_GREEN_BITS:case GLFW_BLUE_BITS:
    case GLFW_ALPHA_BITS:case GLFW_DEPTH_BITS:case GLFW_STENCIL_BITS:case GLFW_DOUBLEBUFFER:
    case GLFW_SRGB_CAPABLE:case GLFW_OPENGL_FORWARD_COMPAT:case GLFW_OPENGL_DEBUG_CONTEXT:break;
    default:report(GLFW_INVALID_ENUM,"Unsupported GLFW window hint");break;
}}
extern "C" void glfwWindowHintString(int hint,const char* value){(void)hint;(void)value;report(GLFW_INVALID_ENUM,"GLFW string hints are unavailable on Android");}
extern "C" GLFWwindow* glfwCreateWindow(int width,int height,const char* title,GLFWmonitor* targetMonitor,GLFWwindow* share){
    if(!initialized){report(GLFW_NOT_INITIALIZED,"GLFW is not initialized");return nullptr;}
    if(window||share){report(GLFW_PLATFORM_ERROR,"Only one independent game window is supported");return nullptr;}
    if(targetMonitor&&targetMonitor!=&monitor){report(GLFW_INVALID_VALUE,"Invalid monitor");return nullptr;}
    if(width<1||height<1||width>16384||height>16384){report(GLFW_INVALID_VALUE,"Invalid window size");return nullptr;}
    if(backend==Backend::none){report(GLFW_API_UNAVAILABLE,"No verified renderer has been configured");return nullptr;}
    auto* w=new(std::nothrow) GLFWwindow();if(!w){report(GLFW_OUT_OF_MEMORY,"Cannot allocate GLFW window");return nullptr;}
    w->width=width;w->height=height;w->visible=hints.visible;w->attachedMonitor=targetMonitor;w->title=title?title:"";
    w->resizable=hints.resizable;w->decorated=hints.decorated;w->focused=hints.focused;w->maximized=hints.maximized;
    w->floating=hints.floating;w->autoIconify=hints.autoIconify;w->focusOnShow=hints.focusOnShow;w->mousePassthrough=hints.mousePassthrough;
    if(backend==Backend::fcl){
        if(hints.api!=GLFW_OPENGL_API){delete w;report(GLFW_API_UNAVAILABLE,"FCL NG bridge provides desktop OpenGL only");return nullptr;}
        w->context=hxz_fcl_create();
        if(!w->context){delete w;report(GLFW_VERSION_UNAVAILABLE,"FCL EGL context creation failed");return nullptr;}
    }else if(backend==Backend::osmesa){
        if(hints.api!=GLFW_OPENGL_API){delete w;report(GLFW_API_UNAVAILABLE,"OSMesa provides desktop OpenGL only");return nullptr;}
        if(hints.creation!=GLFW_NATIVE_CONTEXT_API&&hints.creation!=GLFW_OSMESA_CONTEXT_API){delete w;report(GLFW_API_UNAVAILABLE,"Requested context provider does not match OSMesa");return nullptr;}
        const int attrs[]={OSMESA_FORMAT,GL_RGBA_VALUE,OSMESA_DEPTH_BITS,24,OSMESA_STENCIL_BITS,8,
                           OSMESA_PROFILE,hints.profile==GLFW_OPENGL_CORE_PROFILE?OSMESA_CORE_PROFILE:OSMESA_COMPAT_PROFILE,
                           OSMESA_CONTEXT_MAJOR_VERSION,hints.major,OSMESA_CONTEXT_MINOR_VERSION,hints.minor,0};
        w->context=osmesa.create(attrs,nullptr);
        if(!w->context){delete w;report(GLFW_VERSION_UNAVAILABLE,"OSMesa cannot create the requested OpenGL context");return nullptr;}
        if(!resizeOSMesa(w,width,height)){destroyWindow(w);return nullptr;}
        if(osmesa.pixelStore==nullptr)load(rendererLib,"OSMesaPixelStore",osmesa.pixelStore);
    }else{
        if(hints.api!=GLFW_OPENGL_ES_API||hints.major!=3||hints.minor!=0){delete w;report(GLFW_API_UNAVAILABLE,"EGL provider supports OpenGL ES 3.0 only; Minecraft desktop OpenGL requires OSMesa");return nullptr;}
        if(hints.creation!=GLFW_NATIVE_CONTEXT_API&&hints.creation!=GLFW_EGL_CONTEXT_API){delete w;report(GLFW_API_UNAVAILABLE,"Requested context provider does not match EGL");return nullptr;}
        display=egl.getDisplay(EGL_DEFAULT_DISPLAY);EGLint major=0,minor=0;
        if(display==EGL_NO_DISPLAY||!egl.initialize(display,&major,&minor)||!egl.bindAPI(EGL_OPENGL_ES_API)){delete w;report(GLFW_PLATFORM_ERROR,"EGL initialization failed");return nullptr;}
        const EGLint attrs[]={EGL_SURFACE_TYPE,EGL_WINDOW_BIT|EGL_PBUFFER_BIT,EGL_RENDERABLE_TYPE,0x40,
                              EGL_RED_SIZE,8,EGL_GREEN_SIZE,8,EGL_BLUE_SIZE,8,EGL_ALPHA_SIZE,8,
                              EGL_DEPTH_SIZE,24,EGL_STENCIL_SIZE,8,EGL_NONE};
        EGLint count=0;if(!egl.chooseConfig(display,attrs,&config,1,&count)||count<1){delete w;report(GLFW_FORMAT_UNAVAILABLE,"No EGL ES3 RGBA window config");return nullptr;}
        const EGLint contextAttrs[]={EGL_CONTEXT_CLIENT_VERSION,3,EGL_NONE};
        w->eglContext=egl.createContext(display,config,EGL_NO_CONTEXT,contextAttrs);
        if(w->eglContext==EGL_NO_CONTEXT){delete w;report(GLFW_VERSION_UNAVAILABLE,"EGL cannot create GLES3 context");return nullptr;}
        glesLib=dlopen("libGLESv3.so",RTLD_NOW|RTLD_LOCAL);
    }
    {std::lock_guard<std::mutex> lock(mu);window=w;}return w;
}
extern "C" void glfwDestroyWindow(GLFWwindow* w){if(!w)return;if(w!=window){report(GLFW_INVALID_VALUE,"Invalid GLFW window");return;}
    if(w->owner!=std::thread::id{}&&w->owner!=std::this_thread::get_id()){report(GLFW_PLATFORM_ERROR,"Release the OpenGL context on its owner thread before destroying the window");return;}
    {std::lock_guard<std::mutex> lock(mu);window=nullptr;events.clear();keys.fill(0);buttons.fill(0);}destroyWindow(w);}
extern "C" int glfwWindowShouldClose(GLFWwindow* w){return hasWindow(w)&&w->close?GLFW_TRUE:GLFW_FALSE;}
extern "C" void glfwSetWindowShouldClose(GLFWwindow* w,int value){if(hasWindow(w)){w->close=value!=0;eventReady.notify_all();}}
extern "C" const char* glfwGetWindowTitle(GLFWwindow* w){return hasWindow(w)?w->title.c_str():nullptr;}
extern "C" void glfwSetWindowTitle(GLFWwindow* w,const char* title){if(hasWindow(w))w->title=title?title:"";}
extern "C" void glfwSetWindowIcon(GLFWwindow* w,int count,const GLFWimage* images){
    if(!hasWindow(w))return;
    if(count<0||(count>0&&!images)){report(GLFW_INVALID_VALUE,"Invalid window icons");return;}
    for(int i=0;i<count;++i)if(images[i].width<1||images[i].height<1||!images[i].pixels){report(GLFW_INVALID_VALUE,"Invalid window icon image");return;}
    // Android owns the launcher icon. A valid desktop icon request is harmless.
}
extern "C" void glfwGetWindowPos(GLFWwindow* w,int* x,int* y){if(!hasWindow(w))return;if(x)*x=w->x;if(y)*y=w->y;}
extern "C" void glfwSetWindowPos(GLFWwindow* w,int x,int y){if(!hasWindow(w))return;w->x=x;w->y=y;if(w->posCb)w->posCb(w,x,y);}
extern "C" void glfwGetWindowSize(GLFWwindow* w,int* width,int* height){if(!hasWindow(w))return;if(width)*width=w->width;if(height)*height=w->height;}
extern "C" void glfwSetWindowSize(GLFWwindow* w,int width,int height){if(!hasWindow(w))return;if(width<1||height<1||width>16384||height>16384){report(GLFW_INVALID_VALUE,"Invalid window size");return;}
    w->width=width;w->height=height;if(w->sizeCb)w->sizeCb(w,width,height);if(window==w&&w->framebufferCb)w->framebufferCb(w,width,height);}
extern "C" void glfwGetFramebufferSize(GLFWwindow* w,int* width,int* height){glfwGetWindowSize(w,width,height);}
extern "C" void glfwGetWindowFrameSize(GLFWwindow* w,int* l,int* t,int* r,int* b){if(!hasWindow(w))return;if(l)*l=0;if(t)*t=0;if(r)*r=0;if(b)*b=0;}
extern "C" void glfwGetWindowContentScale(GLFWwindow* w,float* x,float* y){if(!hasWindow(w))return;if(x)*x=1;if(y)*y=1;}
extern "C" float glfwGetWindowOpacity(GLFWwindow* w){return hasWindow(w)?w->opacity:0.0f;}
extern "C" void glfwSetWindowOpacity(GLFWwindow* w,float opacity){if(!hasWindow(w))return;
    if(!std::isfinite(opacity)||opacity<0||opacity>1){report(GLFW_INVALID_VALUE,"Invalid window opacity");return;}w->opacity=opacity;}
extern "C" void glfwSetWindowSizeLimits(GLFWwindow* w,int minW,int minH,int maxW,int maxH){
    if(!hasWindow(w))return;
    if((minW<0&&minW!=GLFW_DONT_CARE)||(minH<0&&minH!=GLFW_DONT_CARE)||
       (maxW<0&&maxW!=GLFW_DONT_CARE)||(maxH<0&&maxH!=GLFW_DONT_CARE)||
       (minW!=GLFW_DONT_CARE&&maxW!=GLFW_DONT_CARE&&maxW<minW)||
       (minH!=GLFW_DONT_CARE&&maxH!=GLFW_DONT_CARE&&maxH<minH)){report(GLFW_INVALID_VALUE,"Invalid window size limits");return;}
    // Minecraft calls this with its fatal boot callback installed. Keep the
    // virtual-window request; Android retains physical Surface control.
    w->minWidth=minW;w->minHeight=minH;w->maxWidth=maxW;w->maxHeight=maxH;
}
extern "C" void glfwSetWindowAspectRatio(GLFWwindow* w,int numerator,int denominator){if(!hasWindow(w))return;
    if(!((numerator==GLFW_DONT_CARE&&denominator==GLFW_DONT_CARE)||(numerator>0&&denominator>0))){report(GLFW_INVALID_VALUE,"Invalid window aspect ratio");return;}
    w->aspectNumerator=numerator;w->aspectDenominator=denominator;}
extern "C" void glfwShowWindow(GLFWwindow* w){if(hasWindow(w))w->visible=true;}
extern "C" void glfwHideWindow(GLFWwindow* w){if(hasWindow(w))w->visible=false;}
extern "C" void glfwFocusWindow(GLFWwindow* w){if(hasWindow(w)&&!w->focused){w->focused=true;if(w->focusCb)w->focusCb(w,GLFW_TRUE);}}
extern "C" void glfwRequestWindowAttention(GLFWwindow* w){(void)hasWindow(w);}
extern "C" void glfwIconifyWindow(GLFWwindow* w){if(hasWindow(w)&&!w->iconified){w->iconified=true;if(w->iconifyCb)w->iconifyCb(w,GLFW_TRUE);}}
extern "C" void glfwRestoreWindow(GLFWwindow* w){if(!hasWindow(w))return;bool iconified=w->iconified,maximized=w->maximized;w->iconified=false;w->maximized=false;
    if(iconified&&w->iconifyCb)w->iconifyCb(w,GLFW_FALSE);if(window==w&&maximized&&w->maximizeCb)w->maximizeCb(w,GLFW_FALSE);}
extern "C" void glfwMaximizeWindow(GLFWwindow* w){if(hasWindow(w)&&!w->maximized){w->maximized=true;if(w->maximizeCb)w->maximizeCb(w,GLFW_TRUE);}}
extern "C" int glfwGetWindowAttrib(GLFWwindow* w,int attrib){if(!hasWindow(w))return 0;switch(attrib){
    case GLFW_FOCUSED:return w->focused;case GLFW_ICONIFIED:return w->iconified;case GLFW_VISIBLE:return w->visible;
    case GLFW_MAXIMIZED:return w->maximized;case GLFW_RESIZABLE:return w->resizable;case GLFW_DECORATED:return w->decorated;
    case GLFW_FLOATING:return w->floating;case GLFW_AUTO_ICONIFY:return w->autoIconify;case GLFW_FOCUS_ON_SHOW:return w->focusOnShow;
    case GLFW_MOUSE_PASSTHROUGH:return w->mousePassthrough;case GLFW_CLIENT_API:return hints.api;
    case GLFW_CONTEXT_VERSION_MAJOR:return hints.major;case GLFW_CONTEXT_VERSION_MINOR:return hints.minor;
    case GLFW_OPENGL_PROFILE:return hints.profile;case GLFW_CONTEXT_CREATION_API:return backend==Backend::osmesa?GLFW_OSMESA_CONTEXT_API:GLFW_EGL_CONTEXT_API;
    default:report(GLFW_INVALID_ENUM,"Unsupported GLFW window attribute");return 0;}}
extern "C" void glfwSetWindowAttrib(GLFWwindow* w,int attrib,int value){if(!hasWindow(w))return;
    if(value!=GLFW_TRUE&&value!=GLFW_FALSE){report(GLFW_INVALID_VALUE,"Invalid window attribute value");return;}
    switch(attrib){case GLFW_RESIZABLE:w->resizable=value;break;case GLFW_DECORATED:w->decorated=value;break;
    case GLFW_FLOATING:w->floating=value;break;case GLFW_AUTO_ICONIFY:w->autoIconify=value;break;
    case GLFW_FOCUS_ON_SHOW:w->focusOnShow=value;break;case GLFW_MOUSE_PASSTHROUGH:w->mousePassthrough=value;break;
    default:report(GLFW_INVALID_ENUM,"Unsupported GLFW window attribute");break;}}
extern "C" void glfwSetWindowUserPointer(GLFWwindow* w,void* value){if(hasWindow(w))w->user=value;}
extern "C" void* glfwGetWindowUserPointer(GLFWwindow* w){return hasWindow(w)?w->user:nullptr;}
extern "C" GLFWmonitor* glfwGetPrimaryMonitor(void){return initialized?&monitor:nullptr;}
extern "C" GLFWmonitor** glfwGetMonitors(int* count){if(count)*count=initialized?1:0;return initialized?monitorList:nullptr;}
extern "C" const GLFWvidmode* glfwGetVideoMode(GLFWmonitor* m){if(m!=&monitor){report(GLFW_INVALID_VALUE,"Invalid monitor");return nullptr;}return &videoMode;}
extern "C" const GLFWvidmode* glfwGetVideoModes(GLFWmonitor* m,int* count){if(count)*count=m==&monitor?1:0;return glfwGetVideoMode(m);}
extern "C" const char* glfwGetMonitorName(GLFWmonitor* m){if(m!=&monitor){report(GLFW_INVALID_VALUE,"Invalid monitor");return nullptr;}return "Android display";}
extern "C" void glfwSetMonitorUserPointer(GLFWmonitor* m,void* value){if(m==&monitor)monitorUser=value;else report(GLFW_INVALID_VALUE,"Invalid monitor");}
extern "C" void* glfwGetMonitorUserPointer(GLFWmonitor* m){if(m==&monitor)return monitorUser;report(GLFW_INVALID_VALUE,"Invalid monitor");return nullptr;}
extern "C" void glfwGetMonitorPos(GLFWmonitor* m,int* x,int* y){if(m!=&monitor){report(GLFW_INVALID_VALUE,"Invalid monitor");return;}if(x)*x=0;if(y)*y=0;}
extern "C" void glfwGetMonitorWorkarea(GLFWmonitor* m,int* x,int* y,int* w,int* h){if(m!=&monitor){report(GLFW_INVALID_VALUE,"Invalid monitor");return;}if(x)*x=0;if(y)*y=0;if(w)*w=videoMode.width;if(h)*h=videoMode.height;}
extern "C" void glfwGetMonitorContentScale(GLFWmonitor* m,float* x,float* y){if(m!=&monitor){report(GLFW_INVALID_VALUE,"Invalid monitor");return;}if(x)*x=1;if(y)*y=1;}
extern "C" void glfwGetMonitorPhysicalSize(GLFWmonitor* m,int* w,int* h){if(m!=&monitor){report(GLFW_INVALID_VALUE,"Invalid monitor");return;}if(w)*w=0;if(h)*h=0;report(GLFW_FEATURE_UNAVAILABLE,"Physical display size is unavailable");}
extern "C" void glfwSetGamma(GLFWmonitor* m,float){if(m==&monitor)report(GLFW_FEATURE_UNAVAILABLE,"Android display gamma is controlled by the system");else report(GLFW_INVALID_VALUE,"Invalid monitor");}
extern "C" const GLFWgammaramp* glfwGetGammaRamp(GLFWmonitor* m){if(m==&monitor)report(GLFW_FEATURE_UNAVAILABLE,"Android display gamma ramp is unavailable");else report(GLFW_INVALID_VALUE,"Invalid monitor");return nullptr;}
extern "C" void glfwSetGammaRamp(GLFWmonitor* m,const GLFWgammaramp*){if(m==&monitor)report(GLFW_FEATURE_UNAVAILABLE,"Android display gamma ramp is unavailable");else report(GLFW_INVALID_VALUE,"Invalid monitor");}
extern "C" GLFWmonitor* glfwGetWindowMonitor(GLFWwindow* w){return hasWindow(w)?w->attachedMonitor:nullptr;}
extern "C" void glfwSetWindowMonitor(GLFWwindow* w,GLFWmonitor* m,int x,int y,int width,int height,int){if(!hasWindow(w))return;if(m&&m!=&monitor){report(GLFW_INVALID_VALUE,"Invalid monitor");return;}
    w->attachedMonitor=m;glfwSetWindowPos(w,x,y);if(window==w)glfwSetWindowSize(w,width,height);}
extern "C" GLFWmonitorfun glfwSetMonitorCallback(GLFWmonitorfun cb){auto old=monitorCallback;monitorCallback=cb;return old;}
extern "C" void glfwMakeContextCurrent(GLFWwindow* w){
    if(!w){if(current&&backend==Backend::fcl)hxz_fcl_current(nullptr);
        else if(current&&backend==Backend::egl)egl.makeCurrent(display,EGL_NO_SURFACE,EGL_NO_SURFACE,EGL_NO_CONTEXT);
        else if(current&&backend==Backend::osmesa&&!osmesa.makeCurrent(nullptr,nullptr,0,0,0)){report(GLFW_PLATFORM_ERROR,"OSMesa context release failed");return;}
        if(current)current->owner={};current=nullptr;return;}
    if(!hasWindow(w))return;
    if(w->owner!=std::thread::id{}&&w->owner!=std::this_thread::get_id()){report(GLFW_PLATFORM_ERROR,"OpenGL context belongs to another thread");return;}
    if(backend==Backend::osmesa){if(!resizeOSMesa(w,w->width,w->height))return;if(!osmesa.makeCurrent(w->context,w->pixels.data(),GL_UNSIGNED_BYTE_VALUE,w->width,w->height)){report(GLFW_PLATFORM_ERROR,"OSMesaMakeCurrent failed");return;}if(osmesa.pixelStore){osmesa.pixelStore(OSMESA_Y_UP,0);w->topDown=true;}}
    else if(backend==Backend::fcl){if(hxz_fcl_current(w->context)!=0){report(GLFW_PLATFORM_ERROR,"FCL EGL context binding failed");return;}}
    else if(backend==Backend::egl){if(!updateEglSurface(w)){report(GLFW_PLATFORM_ERROR,"EGL surface binding failed");return;}}
    else{report(GLFW_NO_WINDOW_CONTEXT,"No renderer context");return;}
    current=w;w->owner=std::this_thread::get_id();
}
extern "C" GLFWwindow* glfwGetCurrentContext(void){return current;}
extern "C" void glfwSwapBuffers(GLFWwindow* w){
    if(!hasWindow(w))return;if(current!=w||w->owner!=std::this_thread::get_id()){report(GLFW_NO_CURRENT_CONTEXT,"No current context on this thread");return;}
    if(backend==Backend::fcl){if(hxz_fcl_swap()!=0)report(GLFW_PLATFORM_ERROR,"FCL EGL presentation failed");return;}
    if(backend==Backend::egl){if(!updateEglSurface(w)||egl.swapBuffers(display,w->eglSurface)!=EGL_TRUE)report(GLFW_PLATFORM_ERROR,"EGL swap failed");return;}
    if(!resizeOSMesa(w,w->width,w->height))return;
    if(auto finish=reinterpret_cast<void(*)()>(osmesa.getProc("glFinish")))finish();
    HxzFrameSink sink=frameSink.load(std::memory_order_acquire);
    if(sink){if(sink(w->pixels.data(),w->width,w->height,w->width,w->topDown?1:0)<0)report(GLFW_PLATFORM_ERROR,"Shared frame delivery failed");}
    else hxz_present_frame(w->pixels.data(),w->width,w->height,w->width,w->topDown?1:0);
}
extern "C" void glfwSwapInterval(int interval){if(backend==Backend::fcl){hxz_fcl_interval(interval);return;}if(backend==Backend::egl&&display!=EGL_NO_DISPLAY)egl.swapInterval(display,interval);}
extern "C" GLFWglproc glfwGetProcAddress(const char* name){if(!name||!current){report(GLFW_NO_CURRENT_CONTEXT,"No current context for GL symbol");return nullptr;}
    if(backend==Backend::fcl)return reinterpret_cast<GLFWglproc>(hxz_fcl_proc(name));
    if(backend==Backend::osmesa)return reinterpret_cast<GLFWglproc>(osmesa.getProc(name));
    auto result=egl.getProcAddress(name);if(!result&&glesLib)result=reinterpret_cast<__eglMustCastToProperFunctionPointerType>(dlsym(glesLib,name));return reinterpret_cast<GLFWglproc>(result);}
extern "C" int glfwExtensionSupported(const char* name){
    if(!current){report(GLFW_NO_CURRENT_CONTEXT,"No current context for extension query");return GLFW_FALSE;}
    if(!name||!*name||std::strpbrk(name," \t\r\n")){report(GLFW_INVALID_VALUE,"Invalid OpenGL extension name");return GLFW_FALSE;}
    // Core contexts prohibit glGetString(GL_EXTENSIONS); query indexed names.
    using GetInteger=void(*)(unsigned int,int*);using GetStringi=const unsigned char*(*)(unsigned int,unsigned int);
    if(auto integer=reinterpret_cast<GetInteger>(glfwGetProcAddress("glGetIntegerv"));integer&&hints.major>=3){
        auto indexed=reinterpret_cast<GetStringi>(glfwGetProcAddress("glGetStringi"));
        if(!indexed)return GLFW_FALSE;
        int count=0;integer(0x821D,&count);
        if(count<0||count>65536)return GLFW_FALSE;
        for(int i=0;i<count;++i){const auto* extension=indexed(0x1F03,static_cast<unsigned int>(i));if(extension&&std::strcmp(reinterpret_cast<const char*>(extension),name)==0)return GLFW_TRUE;}
        return GLFW_FALSE;
    }
    using GetString=const unsigned char*(*)(unsigned int);auto fn=reinterpret_cast<GetString>(glfwGetProcAddress("glGetString"));if(!fn)return GLFW_FALSE;
    const char* extensions=reinterpret_cast<const char*>(fn(0x1F03));if(!extensions)return GLFW_FALSE;
    std::string needle=name;const char* match=extensions;while((match=std::strstr(match,needle.c_str()))){if((match==extensions||match[-1]==' ')&&(match[needle.size()]==' '||match[needle.size()]=='\0'))return GLFW_TRUE;match+=needle.size();}return GLFW_FALSE;}
extern "C" void glfwPollEvents(void){
    std::deque<Event> batch;{std::lock_guard<std::mutex> lock(mu);batch.swap(events);}
    for(const Event& e:batch){GLFWwindow* w=window;if(!w)break;switch(e.type){
        case 1:{std::lock_guard<std::mutex> lock(mu);keys[e.a]=e.c==GLFW_RELEASE?GLFW_RELEASE:GLFW_PRESS;}if(w->keyCb)w->keyCb(w,e.a,e.b,e.c,e.d);break;
        case 2:{std::lock_guard<std::mutex> lock(mu);buttons[e.a]=e.b==GLFW_RELEASE?GLFW_RELEASE:GLFW_PRESS;}if(w->mouseCb)w->mouseCb(w,e.a,e.b,e.c);break;
        case 3:{double x=e.a/1000.0,y=e.b/1000.0;if(e.c){x+=w->cursorX;y+=w->cursorY;}w->cursorX=x;w->cursorY=y;if(w->cursorCb)w->cursorCb(w,x,y);break;}
        case 4:if(w->scrollCb)w->scrollCb(w,e.a/1000.0,e.b/1000.0);break;
        case 5:if(e.a>=0&&e.a<=0x10ffff){if(w->charCb)w->charCb(w,static_cast<unsigned int>(e.a));if(window==w&&w->charModsCb)w->charModsCb(w,static_cast<unsigned int>(e.a),0);}break;
        case 6:w->focused=e.a!=0;if(!w->focused)hxz_release_inputs();if(w->focusCb)w->focusCb(w,w->focused);break;
        case kSurfaceResize:{w->width=e.a;w->height=e.b;videoMode.width=e.a;videoMode.height=e.b;
            GLFWwindowsizefun size=w->sizeCb;if(size)size(w,e.a,e.b);
            if(window==w){GLFWframebuffersizefun framebuffer=w->framebufferCb;if(framebuffer)framebuffer(w,e.a,e.b);}break;}
        default:break;}}
}
extern "C" void glfwWaitEvents(void){{std::unique_lock<std::mutex> lock(mu);eventReady.wait(lock,[]{return !events.empty()||!initialized||(window&&window->close.load());});}glfwPollEvents();}
extern "C" void glfwWaitEventsTimeout(double timeout){if(!std::isfinite(timeout)||timeout<0){report(GLFW_INVALID_VALUE,"Invalid event timeout");return;}
    {std::unique_lock<std::mutex> lock(mu);eventReady.wait_for(lock,std::chrono::duration<double>(timeout),[]{return !events.empty()||!initialized||(window&&window->close.load());});}glfwPollEvents();}
extern "C" void glfwPostEmptyEvent(void){std::lock_guard<std::mutex> lock(mu);enqueue({0,0,0,0,0});}
extern "C" double glfwGetTime(void){return timeOffset+std::chrono::duration<double>(Clock::now()-epoch).count();}
extern "C" void glfwSetTime(double value){if(!std::isfinite(value)||value<0){report(GLFW_INVALID_VALUE,"Invalid GLFW time");return;}epoch=Clock::now();timeOffset=value;}
extern "C" uint64_t glfwGetTimerValue(void){return std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now().time_since_epoch()).count();}
extern "C" uint64_t glfwGetTimerFrequency(void){return 1000000000ULL;}
extern "C" int glfwGetKey(GLFWwindow* w,int key){if(!hasWindow(w)||key<0||key>GLFW_KEY_LAST)return GLFW_RELEASE;return keys[key];}
extern "C" int glfwGetMouseButton(GLFWwindow* w,int button){if(!hasWindow(w)||button<0||button>GLFW_MOUSE_BUTTON_LAST)return GLFW_RELEASE;return buttons[button];}
extern "C" const char* glfwGetKeyName(int key,int){static thread_local char name[2];if(key>=GLFW_KEY_A&&key<=GLFW_KEY_Z){name[0]=static_cast<char>('a'+key-GLFW_KEY_A);name[1]=0;return name;}if(key>=GLFW_KEY_0&&key<=GLFW_KEY_9){name[0]=static_cast<char>('0'+key-GLFW_KEY_0);name[1]=0;return name;}return nullptr;}
extern "C" int glfwGetKeyScancode(int){report(GLFW_FEATURE_UNAVAILABLE,"Android scan code mapping is unavailable");return -1;}
extern "C" void glfwGetCursorPos(GLFWwindow* w,double* x,double* y){if(!hasWindow(w))return;if(x)*x=w->cursorX;if(y)*y=w->cursorY;}
extern "C" void glfwSetCursorPos(GLFWwindow* w,double x,double y){if(!hasWindow(w))return;if(!std::isfinite(x)||!std::isfinite(y)){report(GLFW_INVALID_VALUE,"Invalid cursor coordinates");return;}w->cursorX=x;w->cursorY=y;if(w->cursorCb)w->cursorCb(w,x,y);}
extern "C" GLFWcursor* glfwCreateCursor(const GLFWimage*,int,int){report(GLFW_FEATURE_UNAVAILABLE,"Native Android cursors are unavailable");return nullptr;}
extern "C" GLFWcursor* glfwCreateStandardCursor(int){report(GLFW_FEATURE_UNAVAILABLE,"Native Android cursors are unavailable");return nullptr;}
extern "C" void glfwDestroyCursor(GLFWcursor*){}
extern "C" void glfwSetCursor(GLFWwindow* w,GLFWcursor* cursor){if(hasWindow(w)&&cursor)report(GLFW_FEATURE_UNAVAILABLE,"Native Android cursors are unavailable");}
extern "C" void glfwSetInputMode(GLFWwindow* w,int mode,int value){
    if(mode==GLFW_IME){
        if(!hasImeWindow(w))return;
        const bool enabled=value!=GLFW_FALSE;
        if(w->imeEnabled!=enabled){w->imeEnabled=enabled;auto cb=w->imeStatusCb;if(cb)cb(w);}
        return; // A callback may have destroyed the window; do not access it again.
    }
    if(!hasWindow(w))return;if(mode==GLFW_CURSOR){if(value!=GLFW_CURSOR_NORMAL&&value!=GLFW_CURSOR_HIDDEN&&value!=GLFW_CURSOR_DISABLED){report(GLFW_INVALID_ENUM,"Invalid cursor mode");return;}std::lock_guard<std::mutex> lock(mu);w->cursor=value;return;}
    if(mode==GLFW_STICKY_KEYS||mode==GLFW_STICKY_MOUSE_BUTTONS||mode==GLFW_LOCK_KEY_MODS){if(value!=GLFW_FALSE)report(GLFW_FEATURE_UNAVAILABLE,"Requested GLFW input mode is unavailable");return;}
    if(mode==GLFW_RAW_MOUSE_MOTION){if(value!=GLFW_FALSE)report(GLFW_FEATURE_UNAVAILABLE,"Raw mouse motion is unavailable");return;}report(GLFW_INVALID_ENUM,"Unsupported GLFW input mode");}
extern "C" int glfwGetInputMode(GLFWwindow* w,int mode){
    if(mode==GLFW_IME)return hasImeWindow(w)&&w->imeEnabled?GLFW_TRUE:GLFW_FALSE;
    if(!hasWindow(w))return 0;if(mode==GLFW_CURSOR)return w->cursor;if(mode==GLFW_STICKY_KEYS||mode==GLFW_STICKY_MOUSE_BUTTONS||mode==GLFW_LOCK_KEY_MODS||mode==GLFW_RAW_MOUSE_MOTION)return GLFW_FALSE;report(GLFW_INVALID_ENUM,"Unsupported GLFW input mode");return 0;}
extern "C" void glfwGetPreeditCursorRectangle(GLFWwindow* w,int* x,int* y,int* width,int* height){
    if(x)*x=0;if(y)*y=0;if(width)*width=0;if(height)*height=0;
    if(!hasImeWindow(w))return;
    if(x)*x=w->preeditX;if(y)*y=w->preeditY;if(width)*width=w->preeditWidth;if(height)*height=w->preeditHeight;
}
extern "C" void glfwSetPreeditCursorRectangle(GLFWwindow* w,int x,int y,int width,int height){
    if(!hasImeWindow(w))return;
    if(width<0||height<0){report(GLFW_INVALID_VALUE,"Invalid preedit cursor size");return;}
    // Preserve the client's rectangle. Android places its own candidate UI.
    w->preeditX=x;w->preeditY=y;w->preeditWidth=width;w->preeditHeight=height;
}
extern "C" void glfwResetPreeditText(GLFWwindow* w){
    if(!hasImeWindow(w))return;
    // There is no composing text in the runtime. Clear any client preedit view
    // without dropping committed characters already queued by the Android host.
    auto cb=w->preeditCb;if(cb)cb(w,0,nullptr,0,nullptr,0,0);
}
extern "C" unsigned int* glfwGetPreeditCandidate(GLFWwindow* w,int index,int* textCount){
    if(textCount)*textCount=0;
    if(!hasImeWindow(w))return nullptr;
    if(index<0)report(GLFW_INVALID_VALUE,"Invalid preedit candidate index");
    return nullptr; // Candidate text remains inside the Android IME.
}
extern "C" int glfwRawMouseMotionSupported(void){return GLFW_FALSE;}
extern "C" const char* glfwGetClipboardString(GLFWwindow* w){return hasWindow(w)?clipboard.c_str():nullptr;}
extern "C" void glfwSetClipboardString(GLFWwindow* w,const char* value){if(hasWindow(w))clipboard=value?value:"";}
extern "C" int glfwJoystickPresent(int){return GLFW_FALSE;}
extern "C" const float* glfwGetJoystickAxes(int,int* count){if(count)*count=0;return nullptr;}
extern "C" const unsigned char* glfwGetJoystickButtons(int,int* count){if(count)*count=0;return nullptr;}
extern "C" const unsigned char* glfwGetJoystickHats(int,int* count){if(count)*count=0;return nullptr;}
extern "C" const char* glfwGetJoystickName(int){return nullptr;}
extern "C" const char* glfwGetJoystickGUID(int){return nullptr;}
extern "C" void glfwSetJoystickUserPointer(int,void*){report(GLFW_FEATURE_UNAVAILABLE,"Joysticks are unavailable in this input adapter");}
extern "C" void* glfwGetJoystickUserPointer(int){return nullptr;}
extern "C" int glfwJoystickIsGamepad(int){return GLFW_FALSE;}
extern "C" GLFWjoystickfun glfwSetJoystickCallback(GLFWjoystickfun cb){auto old=joystickCallback;joystickCallback=cb;return old;}
extern "C" int glfwUpdateGamepadMappings(const char*){report(GLFW_FEATURE_UNAVAILABLE,"Gamepad mappings are unavailable in this input adapter");return GLFW_FALSE;}
extern "C" const char* glfwGetGamepadName(int){return nullptr;}
extern "C" int glfwGetGamepadState(int,GLFWgamepadstate*){return GLFW_FALSE;}
extern "C" int glfwVulkanSupported(void){return GLFW_FALSE;}
extern "C" const char** glfwGetRequiredInstanceExtensions(uint32_t* count){if(count)*count=0;report(GLFW_API_UNAVAILABLE,"Vulkan is unavailable in this Android renderer");return nullptr;}
extern "C" GLFWvkproc glfwGetInstanceProcAddress(VkInstance,const char*){report(GLFW_API_UNAVAILABLE,"Vulkan is unavailable in this Android renderer");return nullptr;}
extern "C" int glfwGetPhysicalDevicePresentationSupport(VkInstance,VkPhysicalDevice,uint32_t){report(GLFW_API_UNAVAILABLE,"Vulkan is unavailable in this Android renderer");return GLFW_FALSE;}
extern "C" VkResult glfwCreateWindowSurface(VkInstance,GLFWwindow*,const VkAllocationCallbacks*,VkSurfaceKHR*){report(GLFW_API_UNAVAILABLE,"Vulkan is unavailable in this Android renderer");return static_cast<VkResult>(-7);}

#define WINDOW_CALLBACK(setter,member,type) extern "C" type setter(GLFWwindow* w,type cb){if(!hasWindow(w))return nullptr;auto old=w->member;w->member=cb;return old;}
WINDOW_CALLBACK(glfwSetWindowPosCallback,posCb,GLFWwindowposfun)
WINDOW_CALLBACK(glfwSetWindowSizeCallback,sizeCb,GLFWwindowsizefun)
WINDOW_CALLBACK(glfwSetWindowCloseCallback,closeCb,GLFWwindowclosefun)
WINDOW_CALLBACK(glfwSetWindowRefreshCallback,refreshCb,GLFWwindowrefreshfun)
WINDOW_CALLBACK(glfwSetWindowFocusCallback,focusCb,GLFWwindowfocusfun)
WINDOW_CALLBACK(glfwSetFramebufferSizeCallback,framebufferCb,GLFWframebuffersizefun)
WINDOW_CALLBACK(glfwSetMouseButtonCallback,mouseCb,GLFWmousebuttonfun)
WINDOW_CALLBACK(glfwSetCursorPosCallback,cursorCb,GLFWcursorposfun)
WINDOW_CALLBACK(glfwSetCursorEnterCallback,enterCb,GLFWcursorenterfun)
WINDOW_CALLBACK(glfwSetScrollCallback,scrollCb,GLFWscrollfun)
WINDOW_CALLBACK(glfwSetKeyCallback,keyCb,GLFWkeyfun)
WINDOW_CALLBACK(glfwSetCharCallback,charCb,GLFWcharfun)
WINDOW_CALLBACK(glfwSetCharModsCallback,charModsCb,GLFWcharmodsfun)
WINDOW_CALLBACK(glfwSetDropCallback,dropCb,GLFWdropfun)
WINDOW_CALLBACK(glfwSetWindowIconifyCallback,iconifyCb,GLFWwindowiconifyfun)
WINDOW_CALLBACK(glfwSetWindowMaximizeCallback,maximizeCb,GLFWwindowmaximizefun)
WINDOW_CALLBACK(glfwSetWindowContentScaleCallback,scaleCb,GLFWwindowcontentscalefun)
#undef WINDOW_CALLBACK

#define IME_CALLBACK(setter,member,type) extern "C" type setter(GLFWwindow* w,type cb){if(!hasImeWindow(w))return nullptr;auto old=w->member;w->member=cb;return old;}
IME_CALLBACK(glfwSetPreeditCallback,preeditCb,GLFWpreeditfun)
IME_CALLBACK(glfwSetIMEStatusCallback,imeStatusCb,GLFWimestatusfun)
IME_CALLBACK(glfwSetPreeditCandidateCallback,preeditCandidateCb,GLFWpreeditcandidatefun)
#undef IME_CALLBACK

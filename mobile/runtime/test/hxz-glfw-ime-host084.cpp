// Only platform dependencies are stubbed. The IME implementation and event queue
// below are the production adapter; fixture hooks inject a real window and input.
#include <cassert>
#include "hxz_glfw_under_test.cpp"

extern "C" void* dlopen(const char*,int){return nullptr;}
extern "C" void* dlsym(void*,const char*){return nullptr;}
extern "C" int dlclose(void*){return 0;}
extern "C" void ANativeWindow_acquire(ANativeWindow*){}
extern "C" void ANativeWindow_release(ANativeWindow*){}
extern "C" int32_t ANativeWindow_setBuffersGeometry(ANativeWindow*,int32_t,int32_t,int32_t){return 0;}
extern "C" int32_t ANativeWindow_lock(ANativeWindow*,ANativeWindow_Buffer*,void*){return -1;}
extern "C" int32_t ANativeWindow_unlockAndPost(ANativeWindow*){return 0;}

extern "C" __declspec(dllexport) GLFWwindow* hxz_test_create_window(){
    assert(initialized&&!window);window=new GLFWwindow();return window;
}
extern "C" __declspec(dllexport) void hxz_test_commit(){
    hxz_event(5,'A',0,0,0);hxz_event(5,0x4e2d,0,0,0);hxz_event(5,0x1f600,0,0,0);
}
extern "C" __declspec(dllexport) void hxz_test_callback_payloads(){
    unsigned int text[]={0x4e2d,0x1f600};int blocks[]={2};
    assert(window&&window->preeditCb&&window->preeditCandidateCb);
    window->preeditCb(window,2,text,1,blocks,0,2);
    window->preeditCandidateCb(window,7,3,2,4);
}
extern "C" __declspec(dllexport) void hxz_test_null_window(){
    assert(glfwSetPreeditCallback(nullptr,nullptr)==nullptr);assert(glfwGetError(nullptr)==GLFW_INVALID_VALUE);
    assert(glfwSetIMEStatusCallback(nullptr,nullptr)==nullptr);assert(glfwGetError(nullptr)==GLFW_INVALID_VALUE);
    assert(glfwSetPreeditCandidateCallback(nullptr,nullptr)==nullptr);assert(glfwGetError(nullptr)==GLFW_INVALID_VALUE);
    glfwSetPreeditCursorRectangle(nullptr,0,0,1,1);assert(glfwGetError(nullptr)==GLFW_INVALID_VALUE);
    int x=1,y=1,w=1,h=1;glfwGetPreeditCursorRectangle(nullptr,&x,&y,&w,&h);
    assert(x==0&&y==0&&w==0&&h==0);assert(glfwGetError(nullptr)==GLFW_INVALID_VALUE);
    glfwResetPreeditText(nullptr);assert(glfwGetError(nullptr)==GLFW_INVALID_VALUE);
    int count=99;assert(glfwGetPreeditCandidate(nullptr,0,&count)==nullptr&&count==0);assert(glfwGetError(nullptr)==GLFW_INVALID_VALUE);
    glfwSetInputMode(nullptr,GLFW_IME,GLFW_TRUE);assert(glfwGetError(nullptr)==GLFW_INVALID_VALUE);
    assert(glfwGetInputMode(nullptr,GLFW_IME)==GLFW_FALSE);assert(glfwGetError(nullptr)==GLFW_INVALID_VALUE);
}

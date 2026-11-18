#include <algorithm>
#include <cassert>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <functional>
#include <mutex>
#include <thread>
#include <vector>

#if __has_include("hxz_frame_present.h")
#include "hxz_frame_present.h"
HxzFrameGeometry frameGeometry;
#endif

constexpr int GLFW_INVALID_VALUE=1,GLFW_PLATFORM_ERROR=2,GLFW_FORMAT_UNAVAILABLE=3;
constexpr int WINDOW_FORMAT_RGBA_8888=1;
struct ANativeWindow {
    int width=2,height=2,stride=2,format=WINDOW_FORMAT_RGBA_8888;
    int refs=0,geometryCalls=0,lockCalls=0,postCalls=0;
    int geometryFailures=0,lockFailures=0,postFailures=0;
    bool keepGeometry=false,nullBits=false;
    std::vector<uint32_t> pixels;
};
struct ANativeWindow_Buffer {int width,height,stride,format;void* bits;};
std::mutex mu,presentMu;
ANativeWindow* surface=nullptr;
uint64_t surfaceGeneration=1;
int lastError=0;
std::function<void()> geometryHook,reportHook;
void report(int code,const char*){lastError=code;if(reportHook){auto callback=std::move(reportHook);reportHook=nullptr;callback();}}
void ANativeWindow_acquire(ANativeWindow* value){++value->refs;}
void ANativeWindow_release(ANativeWindow* value){assert(value->refs>0);--value->refs;}
int ANativeWindow_setBuffersGeometry(ANativeWindow* value,int width,int height,int format){
    assert(value->refs>0);++value->geometryCalls;
    if(value->geometryFailures>0){--value->geometryFailures;return -1;}
    if(!value->keepGeometry){value->width=width;value->height=height;value->stride=width;value->format=format;}
    value->pixels.assign(static_cast<size_t>(value->stride)*value->height,0xfeedface);
    if(geometryHook){auto callback=std::move(geometryHook);geometryHook=nullptr;callback();}
    return 0;
}
int ANativeWindow_lock(ANativeWindow* value,ANativeWindow_Buffer* output,void*){
    assert(value->refs>0);++value->lockCalls;
    if(value->lockFailures>0){--value->lockFailures;return -1;}
    *output={value->width,value->height,value->stride,value->format,value->nullBits?nullptr:value->pixels.data()};
    return 0;
}
int ANativeWindow_unlockAndPost(ANativeWindow* value){
    assert(value->refs>0);++value->postCalls;
    if(value->postFailures>0){--value->postFailures;return -1;}return 0;
}

#include "hxz_frame_under_test.cpp"

namespace {
void attach(ANativeWindow& value){surface=&value;++surfaceGeneration;lastError=0;}
int present(const std::vector<uint32_t>& pixels,int width,int height,int stride,int topDown=1){
    int result=hxz_present_frame(reinterpret_cast<const unsigned char*>(pixels.data()),width,height,stride,topDown);
    if(surface)assert(surface->refs==0);
    return result;
}
void expectPixels(const ANativeWindow& value,const std::vector<uint32_t>& expected){assert(value.pixels==expected);}
void copyCases(){
    ANativeWindow value;attach(value);
    assert(present({1,2,3,4,5,6},2,3,2)==0);expectPixels(value,{1,2,3,4,5,6});
    assert(present({1,2,3,4,5,6},2,3,2,0)==0);expectPixels(value,{5,6,3,4,1,2});
    assert(present({1,2,99,3,4,98,5,6,97},2,3,3)==0);expectPixels(value,{1,2,3,4,5,6});
    value={};value.width=2;value.height=2;value.stride=3;value.keepGeometry=true;attach(value);
    assert(present({1,2,3,4},2,2,2)==0);expectPixels(value,{1,2,0xfeedface,3,4,0xfeedface});
    assert(present({5,6,99,7,8,98},2,2,3)==0);expectPixels(value,{5,6,0xfeedface,7,8,0xfeedface});
    assert(present({1,2,99,3,4,98},2,2,3,0)==0);expectPixels(value,{3,4,0xfeedface,1,2,0xfeedface});
    value={};value.width=3;value.height=3;value.stride=4;value.keepGeometry=true;attach(value);
    assert(present({1,2,3,4},2,2,2)==0);expectPixels(value,{1,2,0,0xfeedface,3,4,0,0xfeedface,0,0,0,0xfeedface});
    value={};value.width=1;value.height=1;value.stride=2;value.keepGeometry=true;attach(value);
    assert(present({1,2,3,4,5,6},2,3,2,0)==0);expectPixels(value,{5,0xfeedface});
}
void geometryCases(){
    ANativeWindow value;attach(value);
    for(int i=0;i<60;++i)assert(present({1,2,3,4},2,2,2)==0);
    assert(value.geometryCalls==1&&value.lockCalls==60&&value.postCalls==60);
    assert(present({1,2,3,4,5,6},3,2,3)==0);assert(value.geometryCalls==2);
    assert(present({1,2,3},3,1,3)==0);assert(value.geometryCalls==3);
    // A native address may be reused after Surface recreation; generation wins.
    ++surfaceGeneration;
    assert(present({1,2,3},3,1,3)==0);assert(value.geometryCalls==4);
    surface=nullptr;++surfaceGeneration;
    assert(present({1,2,3},3,1,3)==0);assert(value.geometryCalls==4);
    attach(value);assert(present({1,2,3},3,1,3)==0);assert(value.geometryCalls==5);
}
void failureCases(){
    ANativeWindow value;value.geometryFailures=1;attach(value);
    assert(present({1,2,3,4},2,2,2)==-1);assert(lastError==GLFW_PLATFORM_ERROR&&value.lockCalls==0);
    assert(present({1,2,3,4},2,2,2)==0);assert(value.geometryCalls==2);
    value.geometryFailures=1;
    assert(present({1,2},2,1,2)==-1);
    assert(present({1,2,3,4},2,2,2)==0);assert(value.geometryCalls==4);
    value={};value.lockFailures=1;attach(value);
    assert(present({1,2,3,4},2,2,2)==-1);assert(value.postCalls==0);
    assert(present({1,2,3,4},2,2,2)==0);assert(value.geometryCalls==2);
    value={};value.keepGeometry=true;value.format=99;attach(value);
    assert(present({1,2,3,4},2,2,2)==-1);assert(lastError==GLFW_FORMAT_UNAVAILABLE&&value.postCalls==1);
    value.format=WINDOW_FORMAT_RGBA_8888;
    assert(present({1,2,3,4},2,2,2)==0);assert(value.geometryCalls==2);
    value={};value.postFailures=1;attach(value);
    assert(present({1,2,3,4},2,2,2)==-1);
    assert(present({1,2,3,4},2,2,2)==0);assert(value.geometryCalls==2);
    value={};attach(value);
    assert(hxz_present_frame(nullptr,2,2,2,1)==-1);
    assert(present({1,2,3,4},2,2,1)==-1);assert(value.geometryCalls==0&&value.refs==0);
}
void lifetimeAndConcurrencyCases(){
    ANativeWindow oldValue,nextValue;attach(oldValue);
    geometryHook=[&]{
        assert(oldValue.refs==1);
        std::lock_guard<std::mutex> lock(mu);attach(nextValue);
    };
    assert(present({1,2,3,4},2,2,2)==0);
    assert(oldValue.refs==0&&oldValue.postCalls==1&&nextValue.geometryCalls==0);
    assert(present({5,6,7,8},2,2,2)==0);assert(nextValue.geometryCalls==1);
    expectPixels(oldValue,{1,2,3,4});expectPixels(nextValue,{5,6,7,8});

    // A GLFW error callback may reenter presentation; no presenter lock or
    // acquired native reference may survive across the callback.
    ANativeWindow value;value.lockFailures=1;attach(value);
    reportHook=[&]{assert(value.refs==0);assert(present({1,2,3,4},2,2,2)==0);};
    assert(present({1,2,3,4},2,2,2)==-1);assert(value.postCalls==1&&value.geometryCalls==2);

    value={};attach(value);
    std::vector<std::thread> threads;
    for(int i=0;i<4;++i)threads.emplace_back([]{
        const std::vector<uint32_t> pixels{1,2,3,4};
        for(int j=0;j<100;++j)assert(hxz_present_frame(reinterpret_cast<const unsigned char*>(pixels.data()),2,2,2,1)==0);
    });
    for(auto& thread:threads)thread.join();
    assert(value.geometryCalls==1&&value.lockCalls==400&&value.postCalls==400&&value.refs==0);
}
}

int main(int argc,char** argv){
    ANativeWindow value;attach(value);
    for(int i=0;i<5;++i)assert(present({1,2,3,4},2,2,2)==0);
    if(value.geometryCalls!=1){
        std::printf("FAIL: unchanged Surface generation and 2x2 resolution: expected 1 geometry call for 5 frames, observed %d\n",value.geometryCalls);
        return 10;
    }
    if(argc==2&&std::strcmp(argv[1],"--geometry-only")==0)return 0;
    copyCases();geometryCases();failureCases();lifetimeAndConcurrencyCases();
    std::puts("PASS: tight/padded/flipped/clipped RGBA contents; geometry cache, resize/recreation, failure retries, Surface replacement during a frame, error callback reentry and concurrent presentation; 60 stable frames = 1 geometry call");
}

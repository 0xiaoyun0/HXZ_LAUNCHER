// The production .cpp is compiled separately. Only the dynamic-loader and
// OSMesa/OpenGL system boundaries are replaced with deterministic implementations.
#include "hxz_renderer_probe.h"
#include <array>
#include <cassert>
#include <cstdio>
#include <cstring>
#include <string>

namespace {
std::string scenario;
int openCalls=0,closeCalls=0,createCalls=0,bindCalls=0,destroyCalls=0;
int clearCalls=0,finishCalls=0,readCalls=0;
unsigned char* boundPixels=nullptr;
int libraryToken=0,contextToken=0;
constexpr std::array<int,13> expectedAttributes{
    0x22,0x1908,0x30,24,0x31,8,0x33,0x34,0x36,3,0x37,3,0
};
bool startsWith(const char* prefix){return scenario.rfind(prefix,0)==0;}
bool allGlFunctions(){return !startsWith("missing-gl-");}

void* fakeCreate(const int* attributes,void* shared){
    ++createCalls;assert(shared==nullptr);
    // RGBA, depth 24, stencil 8, core profile, and an actual requested 3.3
    // context are observable requirements at the OSMesa boundary.
    for(size_t i=0;i<expectedAttributes.size();++i)assert(attributes[i]==expectedAttributes[i]);
    return scenario=="create-failure"?nullptr:&contextToken;
}
unsigned char fakeBind(void* context,void* pixels,unsigned int type,int width,int height){
    ++bindCalls;assert(context==&contextToken&&pixels&&type==0x1401&&width==32&&height==32);
    if(scenario=="binding-failure")return 0;
    boundPixels=static_cast<unsigned char*>(pixels);
    for(size_t i=0;i<32*32*4;++i)assert(boundPixels[i]==0);
    return 1;
}
void fakeDestroy(void* context){
    assert(context==&contextToken&&destroyCalls==0);++destroyCalls;
    if(scenario!="binding-failure")assert(boundPixels!=nullptr);
    boundPixels=nullptr;
}
const unsigned char* fakeGetString(unsigned int name){
    assert(boundPixels);
    static const std::string longRenderer(300,'R');
    const char* value=nullptr;
    switch(name){
        case 0x1F00:value=scenario=="sanitized-fields"?"Mock Vendor\nBuild\tA":"Mock Vendor";break;
        case 0x1F01:value=scenario=="sanitized-fields"?"Mock\x01Renderer":
                          scenario=="truncated-field"?longRenderer.c_str():"Mock Renderer";break;
        case 0x1F02:value=scenario=="version-3.2"?"3.2 Mock Driver":
                          scenario=="success-4.6"?"4.6 Mock Driver":"3.3 Mock Driver";break;
        default:assert(false);
    }
    return reinterpret_cast<const unsigned char*>(value);
}
void fakeGetInteger(unsigned int name,int* value){
    assert(boundPixels&&value);
    if(name==0x821B)*value=scenario=="success-4.6"?4:3;
    else{assert(name==0x821C);*value=scenario=="version-3.2"?2:scenario=="success-4.6"?6:3;}
}
void fakeClearColor(float red,float green,float blue,float alpha){
    assert(boundPixels&&red==0.25f&&green==0.5f&&blue==0.75f&&alpha==1.0f);
}
void fakeClear(unsigned int mask){
    assert(boundPixels&&mask==0x4000&&clearCalls==0);++clearCalls;
    // A deterministic boundary renderer produces the known RGBA8 result of
    // (0.25, 0.5, 0.75, 1). The tested function must read it after glFinish.
    unsigned char pixel[4]={64,128,191,255};
    if(scenario=="pixel-red")pixel[0]=62;
    if(scenario=="pixel-green")pixel[1]=130;
    if(scenario=="pixel-blue")pixel[2]=189;
    if(scenario=="pixel-alpha")pixel[3]=254;
    if(scenario=="pixel-low-bound"){pixel[0]=63;pixel[1]=127;pixel[2]=190;}
    if(scenario=="pixel-high-bound"){pixel[0]=65;pixel[1]=129;pixel[2]=192;}
    for(size_t i=0;i<32*32;++i)std::memcpy(boundPixels+i*4,pixel,4);
}
void fakeFinish(){assert(boundPixels&&clearCalls==1&&finishCalls==0);++finishCalls;}
void fakeRead(int x,int y,int width,int height,unsigned int format,unsigned int type,void* output){
    assert(boundPixels&&finishCalls==1&&readCalls==0&&x==0&&y==0&&width==1&&height==1&&format==0x1908&&type==0x1401&&output);
    ++readCalls;std::memcpy(output,boundPixels,4);
}
void* fakeProc(const char* name){
    assert(boundPixels&&name);
    if(scenario==std::string("missing-gl-")+name)return nullptr;
    if(std::strcmp(name,"glGetString")==0)return reinterpret_cast<void*>(&fakeGetString);
    if(std::strcmp(name,"glGetIntegerv")==0)return reinterpret_cast<void*>(&fakeGetInteger);
    if(std::strcmp(name,"glClearColor")==0)return reinterpret_cast<void*>(&fakeClearColor);
    if(std::strcmp(name,"glClear")==0)return reinterpret_cast<void*>(&fakeClear);
    if(std::strcmp(name,"glFinish")==0)return reinterpret_cast<void*>(&fakeFinish);
    if(std::strcmp(name,"glReadPixels")==0)return reinterpret_cast<void*>(&fakeRead);
    assert(false);return nullptr;
}
}

extern "C" void* dlopen(const char* path,int flags){
    ++openCalls;assert(path&&std::strcmp(path,"/verified/renderer.so")==0&&flags==2);
    return scenario=="load-failure"?nullptr:&libraryToken;
}
extern "C" const char* dlerror(){return "mock renderer load failure";}
extern "C" int dlclose(void* library){assert(library==&libraryToken);++closeCalls;return 0;}
extern "C" void* dlsym(void* library,const char* name){
    assert(library==&libraryToken&&name);
    if(scenario==std::string("missing-context-")+name)return nullptr;
    if(std::strcmp(name,"OSMesaCreateContextAttribs")==0)return reinterpret_cast<void*>(&fakeCreate);
    if(std::strcmp(name,"OSMesaMakeCurrent")==0)return reinterpret_cast<void*>(&fakeBind);
    if(std::strcmp(name,"OSMesaDestroyContext")==0)return reinterpret_cast<void*>(&fakeDestroy);
    if(std::strcmp(name,"OSMesaGetProcAddress")==0)return reinterpret_cast<void*>(&fakeProc);
    assert(false);return nullptr;
}

int main(int argc,char** argv){
    assert(argc==2);scenario=argv[1];
    const char* path=scenario=="invalid-null"?nullptr:scenario=="invalid-relative"?"renderer.so":"/verified/renderer.so";
    const int result=hxz_probe_renderer(path);
    const bool validPath=!startsWith("invalid-");
    const bool loaded=validPath&&scenario!="load-failure";
    const bool hasContextFunctions=loaded&&!startsWith("missing-context-");
    const bool contextCreated=hasContextFunctions&&scenario!="create-failure";
    const bool bound=contextCreated&&scenario!="binding-failure";
    const int expectedDraw=bound&&allGlFunctions()?1:0;
    assert(openCalls==(validPath?1:0));
    assert(createCalls==(hasContextFunctions?1:0));
    assert(bindCalls==(contextCreated?1:0));
    assert(destroyCalls==(contextCreated?1:0));
    assert(boundPixels==nullptr);
    assert(clearCalls==expectedDraw&&finishCalls==expectedDraw&&readCalls==expectedDraw);
    // Loading is intentionally process-lifetime: dlclose can race driver workers.
    assert(closeCalls==0);
    return result;
}

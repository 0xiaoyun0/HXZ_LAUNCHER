#include "hxz_renderer_probe.h"
#include <dlfcn.h>
#include <cstdio>
#include <string>
#include <vector>

// A separate, short-lived executor probes the real Mesa context before loading Java.
// No renderer or HotSpot is loaded into ART, including on a defective GPU driver.
int hxz_probe_renderer(const char* path) {
    if(!path||path[0]!='/'){std::fprintf(stderr,"HXZ GPU probe: invalid library path\n");return 80;}
    void* library=dlopen(path,RTLD_NOW|RTLD_LOCAL);
    if(!library){std::fprintf(stderr,"HXZ GPU probe: cannot load renderer: %s\n",dlerror());return 81;}
    auto create=reinterpret_cast<void*(*)(const int*,void*)>(dlsym(library,"OSMesaCreateContextAttribs"));
    auto bind=reinterpret_cast<unsigned char(*)(void*,void*,unsigned int,int,int)>(dlsym(library,"OSMesaMakeCurrent"));
    auto destroy=reinterpret_cast<void(*)(void*)>(dlsym(library,"OSMesaDestroyContext"));
    auto proc=reinterpret_cast<void*(*)(const char*)>(dlsym(library,"OSMesaGetProcAddress"));
    if(!create||!bind||!destroy||!proc){std::fprintf(stderr,"HXZ GPU probe: required context functions missing\n");return 82;}
    const int attributes[]={0x22,0x1908,0x30,24,0x31,8,0x33,0x34,0x36,3,0x37,3,0};
    void* context=create(attributes,nullptr);
    if(!context){std::fprintf(stderr,"HXZ GPU probe: OpenGL 3.3 core context unavailable\n");return 83;}
    std::vector<unsigned char> pixels(32*32*4);
    if(!bind(context,pixels.data(),0x1401,32,32)){destroy(context);std::fprintf(stderr,"HXZ GPU probe: context binding failed\n");return 84;}
    auto getString=reinterpret_cast<const unsigned char*(*)(unsigned int)>(proc("glGetString"));
    auto getInteger=reinterpret_cast<void(*)(unsigned int,int*)>(proc("glGetIntegerv"));
    auto clearColor=reinterpret_cast<void(*)(float,float,float,float)>(proc("glClearColor"));
    auto clear=reinterpret_cast<void(*)(unsigned int)>(proc("glClear"));
    auto finish=reinterpret_cast<void(*)()>(proc("glFinish"));
    auto read=reinterpret_cast<void(*)(int,int,int,int,unsigned int,unsigned int,void*)>(proc("glReadPixels"));
    int result=85;
    if(getString&&getInteger&&clearColor&&clear&&finish&&read){
        auto field=[&](const char* key,unsigned int name){
            const auto* raw=getString(name);std::string value;
            if(raw)for(size_t i=0;raw[i]&&i<256;++i)value+=raw[i]>=32&&raw[i]<127?static_cast<char>(raw[i]):' ';
            std::printf("HXZ_GPU_%s=%s\n",key,value.c_str());
        };
        field("VENDOR",0x1F00);field("RENDERER",0x1F01);field("VERSION",0x1F02);
        int major=0,minor=0;getInteger(0x821B,&major);getInteger(0x821C,&minor);
        clearColor(0.25f,0.5f,0.75f,1.0f);clear(0x4000);finish();
        unsigned char sample[4]{};read(0,0,1,1,0x1908,0x1401,sample);
        const bool valid=(major>3||(major==3&&minor>=3))&&sample[0]>=63&&sample[0]<=65&&sample[1]>=127&&sample[1]<=129&&sample[2]>=190&&sample[2]<=192&&sample[3]==255;
        if(valid){std::printf("HXZ_GPU_FRAME_OK=1\n");result=0;}
        else std::fprintf(stderr,"HXZ GPU probe: context version or rendered pixel validation failed\n");
    }else std::fprintf(stderr,"HXZ GPU probe: required OpenGL functions missing\n");
    destroy(context);
    // The executor exits immediately; unloading a driver with worker threads is unsafe.
    return result;
}

#include "../native/hxz_fcl_render.h"
extern "C" {
#include "../native/fcl/environ.h"
void* glXGetProcAddress(const char*);
void* glXGetProcAddressARB(const char*);
}
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <vector>
#include <map>
#include <cstdint>
#include <chrono>
static gl_render_window_t context{};
static gl_render_window_t secondContext{};
static gl_render_window_t* activeContext=&context;
static std::map<unsigned,std::vector<unsigned char>> buffers;
static unsigned bound=1,nextBuffer=10;static int ordinary=0,originalCalls=0;
static int instanced=0,originalInstanced=0,instances=0;static bool restarting=false;
static std::vector<uint32_t> drawn;
static unsigned lookups=0,uploads=0;
static void check(bool yes,const char* text){if(!yes){std::fprintf(stderr,"FAIL %s\n",text);std::exit(1);}}
extern "C" {
int hxz_test_setenv(const char*,const char*,int){return 0;}int hxz_test_unsetenv(const char*){return 0;}
void ANativeWindow_acquire(ANativeWindow*){}void ANativeWindow_release(ANativeWindow*){}
bool gl_init(){return true;}void gl_init_dimensions(void*){}gl_render_window_t* gl_get_current(){return activeContext;}
gl_render_window_t* gl_init_context(gl_render_window_t*){return &context;}void gl_make_current(gl_render_window_t*){}
void gl_destroy_context(gl_render_window_t*){}bool gl_swap_buffers(){return true;}void gl_setup_window(){}void gl_swap_interval(int){}
}
static int samplerUnit=-1,samplerId=-1,invalidSamplers=0;
static void query(unsigned token,int* value){if(token==0x8B4D||token==0x8872){*value=32;return;}if(token==0x84E2){*value=16;return;}check(token==0x8895,"EBO binding query");*value=static_cast<int>(bound);}
// Reproduce NG's reviewed off-by-one: unit == maxtex is accepted and sets bound_changed=17.
static void sampler(unsigned unit,unsigned id){if(unit>16){invalidSamplers++;return;}check(unit<16,"NG texture unit 16 must never reach the unsafe off-by-one path");samplerUnit=unit;samplerId=id;}
static void bufferQuery(unsigned target,unsigned token,int* value){check(target==0x8893,"buffer query target");*value=token==0x8764?static_cast<int>(buffers[bound].size()):0;}
static void bind(unsigned target,unsigned value){check(target==0x8893,"bind target");bound=value;}
static void generate(int count,unsigned* value){check(count==1,"one scratch buffer");*value=nextBuffer++;}
static void data(unsigned target,intptr_t size,const void* bytes,unsigned usage){uploads++;check(target==0x8893&&usage==0x88E0,"stream index upload");const auto* begin=static_cast<const unsigned char*>(bytes);buffers[bound].assign(begin,begin+size);}
static void read(unsigned target,intptr_t offset,intptr_t size,void* out){check(target==0x8893,"shadow read target");check(offset>=0&&offset+size<=static_cast<intptr_t>(buffers[bound].size()),"shadow read bounds");std::memcpy(out,buffers[bound].data()+offset,static_cast<size_t>(size));}
static void draw(unsigned mode,int count,unsigned type,const void*){check(mode==4&&type==0x1405,"triangle draw uses wide indices");drawn.resize(count);std::memcpy(drawn.data(),buffers[bound].data(),count*4);ordinary++;}
static void drawInstanced(unsigned mode,int count,unsigned type,const void* offset,int amount){draw(mode,count,type,offset);instanced++;instances=amount;}
static unsigned char enabled(unsigned){return restarting?1:0;}
static void oldDraw(unsigned,int,unsigned,const void*,int){originalCalls++;}
static void oldInstanced(unsigned,int,unsigned,const void*,int amount,int){originalInstanced++;instances=amount;}
static void* lookup(const char* name){
    if(!std::strcmp(name,"glGetIntegerv"))return reinterpret_cast<void*>(&query);
    if(!std::strcmp(name,"glBindSampler"))return reinterpret_cast<void*>(&sampler);
    if(!std::strcmp(name,"glGetBufferParameteriv"))return reinterpret_cast<void*>(&bufferQuery);
    if(!std::strcmp(name,"glBindBuffer"))return reinterpret_cast<void*>(&bind);
    if(!std::strcmp(name,"glGenBuffers"))return reinterpret_cast<void*>(&generate);
    if(!std::strcmp(name,"glBufferData"))return reinterpret_cast<void*>(&data);
    if(!std::strcmp(name,"glGetBufferSubData"))return reinterpret_cast<void*>(&read);
    if(!std::strcmp(name,"glDrawElements"))return reinterpret_cast<void*>(&draw);
    if(!std::strcmp(name,"glDrawElementsInstanced"))return reinterpret_cast<void*>(&drawInstanced);
    if(!std::strcmp(name,"glIsEnabled"))return reinterpret_cast<void*>(&enabled);
    if(!std::strcmp(name,"glDrawElementsBaseVertex"))return reinterpret_cast<void*>(&oldDraw);
    if(!std::strcmp(name,"glDrawElementsInstancedBaseVertex"))return reinterpret_cast<void*>(&oldInstanced);
    return nullptr;
}
extern "C" void* dlopen(const char*,int){return reinterpret_cast<void*>(1);}
extern "C" void* dlsym(void*,const char* name){lookups++;if(!std::strcmp(name,"glXGetProcAddressARB"))return reinterpret_cast<void*>(&lookup);return lookup(name);}
int main(){
    uint16_t source[]={0,1,2,2,3,0};buffers[1].resize(sizeof(source));std::memcpy(buffers[1].data(),source,sizeof(source));
    check(hxz_fcl_init("/mock/ng.so")==0,"bridge init");
    using Query=void(*)(unsigned,int*);using Sampler=void(*)(unsigned,unsigned);
    int units=0;reinterpret_cast<Query>(glXGetProcAddress("glGetIntegerv"))(0x8B4D,&units);
    check(units==16,"advertised combined texture units must fit NG's 16-slot state");
    auto bindSampler=reinterpret_cast<Sampler>(glXGetProcAddress("glBindSampler"));
    bindSampler(15,42);check(samplerUnit==15&&samplerId==42,"last valid sampler retained");
    bindSampler(16,0);bindSampler(0xffffffffu,0);
    check(samplerUnit==15&&invalidSamplers==2,"invalid units report through NG without touching state");
    using DrawBase=void(*)(unsigned,int,unsigned,const void*,int);
    auto call=reinterpret_cast<DrawBase>(glXGetProcAddress("glDrawElementsBaseVertex"));check(call!=nullptr,"LWJGL GLX provider lookup");
    call(4,6,0x1403,nullptr,65536);check(drawn==std::vector<uint32_t>({65536,65537,65538,65538,65539,65536}),"water indices must select intended chunk");check(bound==1&&originalCalls==0&&ordinary==1,"restores EBO and avoids overflow path");
    call(4,6,0x1403,reinterpret_cast<void*>(4096),65536);check(originalCalls==1&&bound==1,"invalid offsets delegate without reading memory");
    call(1,6,0x1403,nullptr,65536);check(originalCalls==2,"non-triangle paths retained");
    call(4,6,0x1403,nullptr,0);check(originalCalls==3,"zero base remains original");
    check(glXGetProcAddressARB("glDrawElements")==reinterpret_cast<void*>(&draw),"unaffected functions forwarded");
    using Multi=void(*)(unsigned,const int*,unsigned,const void* const*,int,const int*);
    auto multi=reinterpret_cast<Multi>(glXGetProcAddress("glMultiDrawElementsBaseVertex"));int counts[]={6,6},bases[]={65536,131072};const void* offsets[]={nullptr,nullptr};multi(4,counts,0x1403,offsets,2,bases);
    check(ordinary==3&&drawn[0]==131072&&bound==1,"multi draw preserves per-draw bases and binding");
    using Instanced=void(*)(unsigned,int,unsigned,const void*,int,int);
    auto repeated=reinterpret_cast<Instanced>(glXGetProcAddress("glDrawElementsInstancedBaseVertex"));check(repeated!=nullptr,"instanced lookup");
    repeated(4,6,0x1403,nullptr,7,65536);
    check(instanced==1&&instances==7&&drawn[0]==65536&&drawn[4]==65539&&bound==1&&originalInstanced==0,"instanced water draw must promote indices and preserve all seven instances");
    for(const char* name:{"glDrawElementsInstancedBaseVertexARB","glDrawElementsInstancedBaseVertexEXT","glDrawElementsInstancedBaseVertexOES"})check(glXGetProcAddressARB(name)==reinterpret_cast<void*>(repeated),"instanced aliases use repair");
    repeated(4,6,0x1403,nullptr,3,0);check(originalInstanced==1&&instances==3,"instanced zero base retained");
    repeated(4,6,0x1403,nullptr,3,-1);check(originalInstanced==2,"negative base retained");
    repeated(4,6,0x1403,nullptr,0,65536);check(originalInstanced==3&&instanced==1,"zero instances do not upload scratch indices");
    repeated(4,6,0x1403,reinterpret_cast<void*>(4096),2,65536);check(originalInstanced==4&&bound==1,"instanced invalid offset retained");
    restarting=true;repeated(4,6,0x1403,nullptr,2,65536);restarting=false;check(originalInstanced==5,"primitive restart semantics retained");
    check(buffers[1].size()==sizeof(source)&&std::memcmp(buffers[1].data(),source,sizeof(source))==0,"instanced repair must not mutate source EBO");
    uint8_t shortSource[]={3,2,1};buffers[1].assign(shortSource,shortSource+3);
    repeated(4,3,0x1401,nullptr,2,131072);check(instanced==2&&instances==2&&drawn==std::vector<uint32_t>({131075,131074,131073})&&bound==1,"byte indices and multiple instances retained");
    check(buffers[1].size()==sizeof(shortSource)&&std::memcmp(buffers[1].data(),shortSource,sizeof(shortSource))==0,"byte index source unchanged");
    const auto initialUploads=uploads,initialLookups=lookups;
    auto start=std::chrono::steady_clock::now();
    for(int i=0;i<10000;i++)repeated(4,3,0x1401,nullptr,2,131072);
    const auto elapsed=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-start).count();
    std::printf("METRIC repeated_draws=10000 symbol_lookups=%u index_uploads=%u host_us=%lld\n",lookups-initialLookups,uploads-initialUploads,static_cast<long long>(elapsed));
    check(lookups==initialLookups,"steady-state draws must not resolve GL symbols again");
    check(uploads==initialUploads,"identical indices must reuse the scratch EBO without upload");
    check(instances==2&&bound==1&&drawn==std::vector<uint32_t>({131075,131074,131073}),"cached draw semantics preserved");
    buffers[1][1]=7;repeated(4,3,0x1401,nullptr,2,131072);
    check(uploads==initialUploads+1&&drawn[1]==131079,"same EBO modified in place must refresh scratch contents");
    repeated(4,3,0x1401,nullptr,2,65536);
    check(uploads==initialUploads+2&&drawn[1]==65543,"base change must refresh scratch contents");
    repeated(4,2,0x1401,nullptr,2,65536);
    check(uploads==initialUploads+3&&drawn.size()==2,"count change must refresh scratch contents");
    activeContext=&secondContext;repeated(4,2,0x1401,nullptr,2,65536);
    check(uploads==initialUploads+4&&drawn[1]==65543,"new context must initialize its scratch EBO");
    activeContext=&context;repeated(4,2,0x1401,nullptr,2,65536);
    check(uploads==initialUploads+5&&bound==1,"context return must refresh a newly allocated scratch EBO");
    hxz_fcl_destroy(&context);repeated(4,2,0x1401,nullptr,2,65536);
    check(uploads==initialUploads+6&&drawn[1]==65543,"recycled context address must not reuse a deleted scratch EBO");
    const auto samplerLookups=lookups;
    auto getInteger=reinterpret_cast<Query>(glXGetProcAddress("glGetIntegerv"));
    for(int i=0;i<1000;i++){bindSampler(15,42);getInteger(0x8B4D,&units);}
    check(lookups==samplerLookups&&samplerUnit==15&&units==16,"sampler and capability guards must cache entry points while preserving live GL queries");
    std::vector<uint16_t> chunk(49152);for(size_t i=0;i<chunk.size();i++)chunk[i]=static_cast<uint16_t>(i);
    buffers[1].resize(chunk.size()*sizeof(uint16_t));std::memcpy(buffers[1].data(),chunk.data(),buffers[1].size());
    repeated(4,static_cast<int>(chunk.size()),0x1403,nullptr,2,65536);
    const auto largeUploads=uploads,largeLookups=lookups;
    start=std::chrono::steady_clock::now();
    for(int i=0;i<250;i++)repeated(4,static_cast<int>(chunk.size()),0x1403,nullptr,2,65536);
    const auto largeElapsed=std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now()-start).count();
    check(uploads==largeUploads&&lookups==largeLookups&&drawn.back()==114687&&bound==1,"large unchanged EBO retains every vertex without upload");
    std::printf("METRIC large_draws=250 indices=49152 symbol_lookups=%u index_uploads=%u avoided_upload_bytes=49152000 host_us=%lld\n",lookups-largeLookups,uploads-largeUploads,static_cast<long long>(largeElapsed));
    call(4,static_cast<int>(chunk.size()),0x1403,nullptr,65536);
    const auto ordinaryUploads=uploads,ordinaryLookups=lookups;
    for(int i=0;i<250;i++)call(4,static_cast<int>(chunk.size()),0x1403,nullptr,65536);
    check(uploads==ordinaryUploads&&lookups==ordinaryLookups&&drawn.back()==114687&&bound==1,"ordinary draw specialization must also reuse unchanged indices");
    buffers[1][0]=5;call(4,static_cast<int>(chunk.size()),0x1403,nullptr,65536);
    check(uploads==ordinaryUploads+1&&drawn[0]==65541,"ordinary draws must notice in-place writes after reuse");
    std::puts("PASS production GLX dispatch and NG index repair with simulated GL buffers; no device GPU claim");
}

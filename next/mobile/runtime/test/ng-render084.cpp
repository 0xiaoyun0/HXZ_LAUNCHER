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
static gl_render_window_t context{};
static std::map<unsigned,std::vector<unsigned char>> buffers;
static unsigned bound=1,nextBuffer=10;static int ordinary=0,originalCalls=0;
static std::vector<uint32_t> drawn;
static void check(bool yes,const char* text){if(!yes){std::fprintf(stderr,"FAIL %s\n",text);std::exit(1);}}
extern "C" {
int hxz_test_setenv(const char*,const char*,int){return 0;}int hxz_test_unsetenv(const char*){return 0;}
void ANativeWindow_acquire(ANativeWindow*){}void ANativeWindow_release(ANativeWindow*){}
bool gl_init(){return true;}void gl_init_dimensions(void*){}gl_render_window_t* gl_get_current(){return &context;}
gl_render_window_t* gl_init_context(gl_render_window_t*){return &context;}void gl_make_current(gl_render_window_t*){}
void gl_destroy_context(gl_render_window_t*){}bool gl_swap_buffers(){return true;}void gl_setup_window(){}void gl_swap_interval(int){}
}
static void query(unsigned token,int* value){check(token==0x8895,"EBO binding query");*value=static_cast<int>(bound);}
static void bufferQuery(unsigned target,unsigned token,int* value){check(target==0x8893,"buffer query target");*value=token==0x8764?static_cast<int>(buffers[bound].size()):0;}
static void bind(unsigned target,unsigned value){check(target==0x8893,"bind target");bound=value;}
static void generate(int count,unsigned* value){check(count==1,"one scratch buffer");*value=nextBuffer++;}
static void data(unsigned target,intptr_t size,const void* bytes,unsigned usage){check(target==0x8893&&usage==0x88E0,"stream index upload");const auto* begin=static_cast<const unsigned char*>(bytes);buffers[bound].assign(begin,begin+size);}
static void read(unsigned target,intptr_t offset,intptr_t size,void* out){check(target==0x8893,"shadow read target");check(offset>=0&&offset+size<=static_cast<intptr_t>(buffers[bound].size()),"shadow read bounds");std::memcpy(out,buffers[bound].data()+offset,static_cast<size_t>(size));}
static void draw(unsigned mode,int count,unsigned type,const void*){check(mode==4&&type==0x1405,"triangle draw uses wide indices");drawn.resize(count);std::memcpy(drawn.data(),buffers[bound].data(),count*4);ordinary++;}
static unsigned char enabled(unsigned){return 0;}
static void oldDraw(unsigned,int,unsigned,const void*,int){originalCalls++;}
static void* lookup(const char* name){
    if(!std::strcmp(name,"glGetIntegerv"))return reinterpret_cast<void*>(&query);
    if(!std::strcmp(name,"glGetBufferParameteriv"))return reinterpret_cast<void*>(&bufferQuery);
    if(!std::strcmp(name,"glBindBuffer"))return reinterpret_cast<void*>(&bind);
    if(!std::strcmp(name,"glGenBuffers"))return reinterpret_cast<void*>(&generate);
    if(!std::strcmp(name,"glBufferData"))return reinterpret_cast<void*>(&data);
    if(!std::strcmp(name,"glGetBufferSubData"))return reinterpret_cast<void*>(&read);
    if(!std::strcmp(name,"glDrawElements"))return reinterpret_cast<void*>(&draw);
    if(!std::strcmp(name,"glIsEnabled"))return reinterpret_cast<void*>(&enabled);
    if(!std::strcmp(name,"glDrawElementsBaseVertex"))return reinterpret_cast<void*>(&oldDraw);
    return nullptr;
}
extern "C" void* dlopen(const char*,int){return reinterpret_cast<void*>(1);}
extern "C" void* dlsym(void*,const char* name){if(!std::strcmp(name,"glXGetProcAddressARB"))return reinterpret_cast<void*>(&lookup);return lookup(name);}
int main(){
    uint16_t source[]={0,1,2,2,3,0};buffers[1].resize(sizeof(source));std::memcpy(buffers[1].data(),source,sizeof(source));
    check(hxz_fcl_init("/mock/ng.so")==0,"bridge init");
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
    check(buffers[1].size()==sizeof(source)&&std::memcmp(buffers[1].data(),source,sizeof(source))==0,"source EBO unchanged");
    std::puts("PASS production GLX dispatch and NG index repair with simulated GL buffers; no device GPU claim");
}

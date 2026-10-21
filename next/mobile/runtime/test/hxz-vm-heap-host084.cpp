// Runs the production helper with deterministic Bionic boundaries. Fake pointers
// are never dereferenced; free must receive the exact allocation, including its tag.
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>

namespace {
int sdk=36,publicResult=1,apiCalls=0,publicCalls=0,lookups=0,legacyCalls=0,allocations=0,frees=0;
bool legacyPresent=true,legacyResult=true,tagRemains=false,outOfMemory=false;
void* allocated=nullptr;
constexpr uintptr_t address=0x12345000;
constexpr uintptr_t tag=uintptr_t{0xb4}<<56;
}
extern "C" int hxz_test_api_level(){++apiCalls;return sdk;}
extern "C" int hxz_test_mallopt(int option,int value){
    assert(sdk>=31&&option==-204&&value==0);++publicCalls;return publicResult;
}
extern "C" bool hxz_test_legacy_mallopt(int option,void* value,size_t size){
    assert(sdk==30&&option==8&&value&&size==sizeof(uint32_t));
    assert(*static_cast<uint32_t*>(value)==0);++legacyCalls;return legacyResult;
}
extern "C" void* hxz_test_dlsym(void* handle,const char* name){
    assert(sdk==30&&handle==nullptr&&std::strcmp(name,"android_mallopt")==0);++lookups;
    return legacyPresent?reinterpret_cast<void*>(&hxz_test_legacy_mallopt):nullptr;
}
extern "C" void* hxz_test_malloc(size_t size){
    assert(size>0);++allocations;
    allocated=outOfMemory?nullptr:reinterpret_cast<void*>(address|(tagRemains?tag:0));
    return allocated;
}
extern "C" void hxz_test_free(void* pointer){
    // A residual tag is evidence to reject startup, not permission to strip the
    // pointer before releasing it to Bionic and create a tag mismatch itself.
    assert(pointer==allocated);++frees;
}
namespace std {using ::hxz_test_malloc;using ::hxz_test_free;}

// Host standard headers were loaded before defining Android architecture macros.
// These macros replace only external boundaries in the unmodified helper below.
#define __ANDROID__ 1
#define __BIONIC__ 1
#define __aarch64__ 1
#define android_get_device_api_level hxz_test_api_level
#define mallopt hxz_test_mallopt
#define dlsym hxz_test_dlsym
#define malloc hxz_test_malloc
#define free hxz_test_free
#include "hxz_vm_heap.cpp"
#undef free
#undef malloc
#undef dlsym
#undef mallopt
#undef android_get_device_api_level

int main(int argc,char** argv){
    assert(argc==2);const char* name=argv[1];
    bool expected=true,probe=true;
    if(std::strcmp(name,"api28")==0){sdk=28;expected=false;probe=false;}
    else if(std::strcmp(name,"api-unknown")==0){sdk=-1;expected=false;probe=false;}
    else if(std::strcmp(name,"api29")==0){sdk=29;probe=false;}
    else if(std::strcmp(name,"api31")==0)sdk=31;
    else if(std::strcmp(name,"api36")==0){}
    else if(std::strcmp(name,"api30")==0)sdk=30;
    else if(std::strcmp(name,"public-failure")==0){publicResult=0;expected=false;probe=false;}
    else if(std::strcmp(name,"public-invalid-success")==0){publicResult=2;expected=false;probe=false;}
    else if(std::strcmp(name,"legacy-failure")==0){sdk=30;legacyResult=false;expected=false;probe=false;}
    else if(std::strcmp(name,"legacy-unavailable")==0){sdk=30;legacyPresent=false;expected=false;probe=false;}
    else if(std::strcmp(name,"public-residual-tag")==0){tagRemains=true;expected=false;}
    else if(std::strcmp(name,"legacy-residual-tag")==0){sdk=30;tagRemains=true;expected=false;}
    else if(std::strcmp(name,"public-oom")==0){outOfMemory=true;expected=false;}
    else if(std::strcmp(name,"legacy-oom")==0){sdk=30;outOfMemory=true;expected=false;}
    else {std::fprintf(stderr,"unknown scenario: %s\n",name);return 2;}
    assert(hxz_prepare_vm_heap()==expected);
    assert(apiCalls==1);
    assert(publicCalls==(sdk>=31?1:0));
    assert(lookups==(sdk==30?1:0));
    assert(legacyCalls==(sdk==30&&legacyPresent?1:0));
    assert(allocations==(probe?1:0));
    assert(frees==(probe&&!outOfMemory?1:0));
    std::printf("PASS %s\n",name);
}

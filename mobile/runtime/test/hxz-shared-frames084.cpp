#include "hxz_shared_frames.h"
#include <sys/stat.h>
#include <cstdio>
#include <cstdlib>
#include <limits>

namespace {
size_t reportedSize=0;
int queryCount=0,lastFd=-1;
void require(bool condition,const char* message) {
    if(!condition){std::fprintf(stderr,"FAIL %s\n",message);std::exit(1);}
}
}

extern "C" size_t ASharedMemory_getSize(int fd) {
    ++queryCount;lastFd=fd;return reportedSize;
}

int main() {
    constexpr size_t frameBytes=1280u*720u*4u*2u;
    constexpr size_t maxFrameBytes=4096u*4096u*4u*2u;
    static_assert(maxFrameBytes==128u*1024u*1024u,"Maximum two-frame buffer is 128 MiB");
    struct Case {const char* name;int fd;size_t required,actual;const char* expected;bool queried;};
    const Case cases[]={
        {"exact-capacity",7,frameBytes,frameBytes,"",true},
        {"larger-capacity",7,frameBytes,frameBytes+4096,"",true},
        {"insufficient-capacity",7,frameBytes,frameBytes-1,"Shared frame buffer is too small: required=7372800, actual=7372799",true},
        {"zero-size",7,frameBytes,0,"Cannot query Android shared frame buffer size",true},
        {"error-sentinel",7,frameBytes,std::numeric_limits<size_t>::max(),"Cannot query Android shared frame buffer size",true},
        {"invalid-fd",-1,frameBytes,frameBytes,"Invalid shared frame buffer request",false},
        {"zero-required",7,0,frameBytes,"Invalid shared frame buffer request",false},
        {"fd-zero",0,frameBytes,frameBytes,"",true},
        {"minimum-capacity",7,1,1,"",true},
        {"maximum-two-frames",7,maxFrameBytes,maxFrameBytes,"",true},
        {"maximum-insufficient",7,maxFrameBytes,maxFrameBytes-1,"Shared frame buffer is too small: required=134217728, actual=134217727",true}
    };
    for(const auto& test:cases){
        reportedSize=test.actual;queryCount=0;lastFd=-1;
        const std::string result=hxz_check_shared_frames(test.fd,test.required);
        if(result!=test.expected){
            std::fprintf(stderr,"FAIL %s: expected '%s', got '%s'\n",test.name,test.expected,result.c_str());
            return 1;
        }
        require(queryCount==(test.queried?1:0),"Query only valid requests, exactly once");
        if(test.queried)require(lastFd==test.fd,"Query the supplied descriptor");
        std::printf("PASS %s\n",test.name);
    }

    // ashmem can expose st_size=0 while the Android API reports its real capacity.
    // Compare the removed predicate against the actual production helper.
    struct stat ordinaryStat{};
    ordinaryStat.st_size=0;
    const bool oldCheckRejects=ordinaryStat.st_size<static_cast<decltype(ordinaryStat.st_size)>(frameBytes);
    require(oldCheckRejects,"The regression fixture must fail the old st_size predicate");
    reportedSize=frameBytes;queryCount=0;lastFd=-1;
    require(hxz_check_shared_frames(7,frameBytes).empty(),"Accept adequate ashmem capacity despite st_size=0");
    require(queryCount==1&&lastFd==7,"The actual helper must query the Android API");
    std::puts("PASS ashmem-st-size-zero");
}

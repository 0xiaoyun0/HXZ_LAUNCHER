// Exercise the production executor entry, replacing only Android/JVM boundaries.
// A real child process observes exit status, buffered output and static teardown.
#include <cassert>
#include <csignal>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <stdexcept>
#include "hxz_jvm.h"

namespace {
const char* scenario=nullptr;
bool prepared=false,connected=false,renderer=false;
char outputBuffer[4096];
bool is(const char* name){return std::strcmp(scenario,name)==0;}
struct TeardownProbe {
    ~TeardownProbe(){std::fputs("STATIC-DESTRUCTOR\n",stderr);std::fflush(stderr);}
} teardownProbe;
}

bool hxz_prepare_vm_heap(){assert(!prepared);prepared=true;return true;}
int hxz_test_getppid(){assert(prepared);return 42;}
int hxz_test_prctl(int operation,int signal){assert(prepared&&operation==1&&signal==SIGTERM);return 0;}
[[noreturn]] void hxz_test_exit(int status){std::_Exit(status);}
HxzJavaJob hxz_read_job(const char* path){assert(prepared&&std::strcmp(path,"job")==0);return {};}
std::string hxz_ipc_child_connect(const std::string& path){
    assert(prepared&&!connected&&path=="socket");
    if(is("ipc66"))return "fixture IPC failure";
    connected=true;return {};
}
void hxz_ipc_child_close(){
    assert(!is("installer"));
    if(connected){connected=false;std::fputs("IPC-CLOSED\n",stdout);}
}
extern "C" int hxz_configure_renderer(const char* path,const char* kind){
    assert(connected&&std::strcmp(path,"renderer")==0&&std::strcmp(kind,"osmesa")==0);
    if(is("exception65"))throw std::runtime_error("fixture executor exception");
    if(is("renderer67"))return -1;
    renderer=true;return 0;
}
extern "C" const char* hxz_last_error(){return "fixture renderer failure";}
int hxz_java(const HxzJavaJob&,bool installer){
    assert(prepared&&installer==is("installer"));
    assert(installer?(!connected&&!renderer):(connected&&renderer));
    std::fputs("JAVA-CALLED\n",stdout);return is("java75")?75:0;
}

// The host's immediate process exit has the same teardown/stdio contract. Its
// observable output still requires the production entry to flush before exit.
#define getppid hxz_test_getppid
#define prctl hxz_test_prctl
#define _exit hxz_test_exit
#define main hxz_executor_main
int hxz_probe_renderer(const char*) { return 80; }
#include "hxz_jvm_exec.cpp"
#undef main
#undef _exit
#undef prctl
#undef getppid

int main(int argc,char** argv){
    assert(argc==2);scenario=argv[1];
    assert(is("normal")||is("installer")||is("java75")||is("renderer67")||is("ipc66")||is("exception65"));
    assert(std::setvbuf(stdout,outputBuffer,_IOFBF,sizeof(outputBuffer))==0);
    std::printf("BUFFERED:%s\n",scenario);
    char executable[]="executor",job[]="job",socket[]="socket",provider[]="renderer",kind[]="osmesa";
    char* arguments[]={executable,job,socket,provider,kind,nullptr};
    return hxz_executor_main(is("installer")?2:5,arguments);
}

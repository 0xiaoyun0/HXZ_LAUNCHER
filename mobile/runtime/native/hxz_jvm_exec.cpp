#include "hxz_jvm.h"
#include "hxz_glfw.h"
#include "hxz_ipc.h"
#include "hxz_vm_heap.h"
#include "hxz_renderer_probe.h"
#include <cstdio>
#include <exception>
#include <csignal>
#include <sys/prctl.h>
#include <unistd.h>
int main(int argc,char** argv) {
    const int result=[&]()->int {
        if(!hxz_prepare_vm_heap())return 69;
        const pid_t parent=getppid();
        if(parent<=1||prctl(PR_SET_PDEATHSIG,SIGTERM)!=0||getppid()!=parent){fprintf(stderr,"HXZ: parent process is unavailable\n");return 68;}
        if(argc==3&&std::string(argv[1])=="--probe-renderer")return hxz_probe_renderer(argv[2]);
        if(argc!=2&&argc!=5){fprintf(stderr,"HXZ: expected job [socket renderer-path renderer-kind]\n");return 64;}
        try{
            HxzJavaJob job=hxz_read_job(argv[1]);
            if(argc==5){
                std::string error=hxz_ipc_child_connect(argv[2]);
                if(!error.empty()){fprintf(stderr,"HXZ IPC: %s\n",error.c_str());return 66;}
                if(hxz_configure_renderer(argv[3],argv[4])!=0){fprintf(stderr,"HXZ renderer: %s\n",hxz_last_error());return 67;}
            }
            return hxz_java(job,argc==2);
        }
        catch(const std::exception& e){fprintf(stderr,"HXZ: %s\n",e.what());return 65;}
    }();
    if(argc==5)hxz_ipc_child_close();
    // This standalone process may still have detached IPC/VM threads. Returning
    // from main would destroy globals while those threads can still use them.
    std::fflush(nullptr);
    _exit(result);
}

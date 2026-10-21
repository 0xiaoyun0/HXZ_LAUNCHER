#include "hxz_ipc.h"
#include "hxz_glfw.h"

#include <android/sharedmem.h>
#include <sys/mman.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/un.h>
#include <poll.h>
#include <unistd.h>
#include <cerrno>
#include <cstring>
#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <thread>

namespace {
constexpr uint32_t magic=0x48585a34, version=1;
enum : uint32_t { hello=1, init=2, input=3, release=4, frame=5, ack=6, quit=7, resize=8 };
struct Packet { uint32_t marker=magic, revision=version, type=0, slot=0; int32_t a=0,b=0,c=0,d=0,e=0; uint64_t sequence=0,generation=0; };
struct State {
    std::atomic<int> listener{-1},socket{-1};
    std::atomic<bool> stopped{false},captured{false};
    std::mutex sendLock;
    bool connected=false; // Protected by sendLock; INIT must precede resize packets.
    std::string path;
    int fd=-1,width=0,height=0;
    size_t slotBytes=0;
    unsigned char* pixels=nullptr;
    std::atomic<uint64_t> pending[2]{{0},{0}};
    std::atomic<uint64_t> counter{1};
    std::atomic<uint64_t> generation{0};
    int desiredWidth=0,desiredHeight=0; // Protected by sendLock.
    ~State(){int s=socket.exchange(-1);if(s>=0)close(s);int l=listener.exchange(-1);if(l>=0)close(l);
        if(pixels)munmap(pixels,slotBytes*2);if(fd>=0)close(fd);}
};
std::mutex globalLock;
std::shared_ptr<State> host,child;
bool valid(const Packet& p){return p.marker==magic&&p.revision==version;}
bool sendPacketUnlocked(State& s,const Packet& p,int passFd=-1){
    int sock=s.socket.load();if(sock<0||s.stopped.load())return false;
    iovec io{const_cast<Packet*>(&p),sizeof(p)};msghdr msg{};msg.msg_iov=&io;msg.msg_iovlen=1;
    char ancillary[CMSG_SPACE(sizeof(int))]{};
    if(passFd>=0){msg.msg_control=ancillary;msg.msg_controllen=sizeof(ancillary);auto* c=CMSG_FIRSTHDR(&msg);
        c->cmsg_level=SOL_SOCKET;c->cmsg_type=SCM_RIGHTS;c->cmsg_len=CMSG_LEN(sizeof(int));std::memcpy(CMSG_DATA(c),&passFd,sizeof(int));}
    return sendmsg(sock,&msg,MSG_DONTWAIT|MSG_NOSIGNAL)==static_cast<ssize_t>(sizeof(p));
}
bool sendPacket(State& s,const Packet& p,int passFd=-1){std::lock_guard<std::mutex> guard(s.sendLock);return sendPacketUnlocked(s,p,passFd);}
bool receivePacket(int sock,Packet& p,int* receivedFd=nullptr){
    iovec io{&p,sizeof(p)};msghdr msg{};msg.msg_iov=&io;msg.msg_iovlen=1;
    char ancillary[CMSG_SPACE(sizeof(int))]{};msg.msg_control=ancillary;msg.msg_controllen=sizeof(ancillary);
    ssize_t n=recvmsg(sock,&msg,MSG_CMSG_CLOEXEC);int fd=-1;
    for(auto* c=CMSG_FIRSTHDR(&msg);c;c=CMSG_NXTHDR(&msg,c)){
        if(c->cmsg_level!=SOL_SOCKET||c->cmsg_type!=SCM_RIGHTS||c->cmsg_len<CMSG_LEN(sizeof(int)))continue;
        int candidate=-1;std::memcpy(&candidate,CMSG_DATA(c),sizeof(int));
        if(fd<0)fd=candidate;else close(candidate);
    }
    if(n!=static_cast<ssize_t>(sizeof(p))||(msg.msg_flags&(MSG_TRUNC|MSG_CTRUNC))||!valid(p)){
        if(fd>=0)close(fd);return false;
    }
    if(receivedFd)*receivedFd=fd;else if(fd>=0){close(fd);return false;}
    return true;
}
bool sameUid(int sock){ucred credentials{};socklen_t len=sizeof(credentials);return getsockopt(sock,SOL_SOCKET,SO_PEERCRED,&credentials,&len)==0&&len==sizeof(credentials)&&credentials.uid==getuid();}
bool address(const std::string& path,sockaddr_un& addr,socklen_t& len){
    if(path.empty()||path[0]!='/'||path.size()>=sizeof(addr.sun_path))return false;
    addr={};addr.sun_family=AF_UNIX;std::memcpy(addr.sun_path,path.c_str(),path.size()+1);
    len=static_cast<socklen_t>(offsetof(sockaddr_un,sun_path)+path.size()+1);return true;
}
void hostLoop(std::shared_ptr<State> s){
    int listener=s->listener.load();pollfd probe{listener,POLLIN,0};
    while(!s->stopped.load()){
        int ready=poll(&probe,1,250);if(ready<0&&errno==EINTR)continue;if(ready<=0)continue;
        int peer=accept4(listener,nullptr,nullptr,SOCK_CLOEXEC);if(peer<0)continue;
        if(!sameUid(peer)){close(peer);continue;}
        s->socket.store(peer);Packet p{};
        if(!receivePacket(peer,p)||p.type!=hello){s->socket.store(-1);close(peer);continue;}
        Packet setup{};setup.type=init;setup.a=s->width;setup.b=s->height;
        bool negotiated=false;
        {std::lock_guard<std::mutex> guard(s->sendLock);setup.generation=s->generation.load();
            negotiated=sendPacketUnlocked(*s,setup,s->fd);if(negotiated)s->connected=true;}
        if(!negotiated){s->socket.store(-1);close(peer);continue;}
        while(!s->stopped.load()&&receivePacket(peer,p)){
            if(p.type==frame){
                if(p.slot>1||p.sequence==0||p.a<1||p.b<1||p.a>s->width||p.b>s->height||p.c<p.a||p.c>s->width)break;
                s->captured.store(p.e!=0);
                const uint64_t previous=s->pending[p.slot].exchange(p.sequence);
                if(previous!=0)break;
                const auto* pixels=s->pixels+static_cast<size_t>(p.slot)*s->slotBytes;
                if(p.generation==s->generation.load())hxz_present_frame(pixels,p.a,p.b,p.c,p.d);
                s->pending[p.slot].store(0);
                Packet done{};done.type=ack;done.slot=p.slot;done.sequence=p.sequence;
                if(!sendPacket(*s,done))break;
            }else if(p.type==quit)break;else break;
        }
        {std::lock_guard<std::mutex> guard(s->sendLock);s->connected=false;s->socket.store(-1);}
        shutdown(peer,SHUT_RDWR);close(peer);s->captured.store(false);
        break; // One authenticated game executor per ART session.
    }
}
int frameSink(const unsigned char* pixels,int width,int height,int stride,int topDown){
    std::shared_ptr<State> s;{std::lock_guard<std::mutex> guard(globalLock);s=child;}
    if(!s||s->stopped.load())return -1;
    if(!pixels||width<1||height<1||width>s->width||height>s->height||stride<width)return -1;
    uint64_t sequence=s->counter.fetch_add(1);int slot=-1;
    for(int i=0;i<2;++i){uint64_t expected=0;if(s->pending[i].compare_exchange_strong(expected,sequence)){slot=i;break;}}
    if(slot<0)return 0; // Backpressure: drop rather than overwrite a frame awaiting ACK.
    unsigned char* target=s->pixels+static_cast<size_t>(slot)*s->slotBytes;
    for(int y=0;y<height;++y)std::memcpy(target+static_cast<size_t>(y)*s->width*4,pixels+static_cast<size_t>(y)*stride*4,static_cast<size_t>(width)*4);
    Packet p{};p.type=frame;p.slot=slot;p.sequence=sequence;p.generation=s->generation.load();p.a=width;p.b=height;p.c=s->width;p.d=topDown;p.e=hxz_cursor_captured();
    if(!sendPacket(*s,p)){s->pending[slot].store(0);return -1;}return 0;
}
void childLoop(std::shared_ptr<State> s){Packet p{};int sock=s->socket.load();
    while(!s->stopped.load()&&receivePacket(sock,p)){
        if(p.type==input)hxz_event(p.a,p.b,p.c,p.d,p.e);
        else if(p.type==release)hxz_release_inputs();
        else if(p.type==resize){if((p.a!=0||p.b!=0)&&(p.a<1||p.b<1||p.a>s->width||p.b>s->height))break;
            s->generation.store(p.generation);if(p.a>0)hxz_virtual_size(p.a,p.b);}
        else if(p.type==ack){if(p.slot>1||s->pending[p.slot].load()!=p.sequence)break;s->pending[p.slot].store(0);}
        else if(p.type==quit)break;else break;
    }
    s->stopped.store(true);hxz_request_close();shutdown(sock,SHUT_RDWR);
}
}

std::string hxz_ipc_start(const std::string& path,int width,int height){
    sockaddr_un addr{};socklen_t len=0;
    if(!address(path,addr,len))return "Invalid private IPC socket path";
    if(width<1||height<1||width>4096||height>4096||static_cast<uint64_t>(width)*height>16'777'216)return "Invalid render size";
    std::lock_guard<std::mutex> guard(globalLock);if(host)return "Native runtime is already started";
    auto s=std::make_shared<State>();s->path=path;s->width=width;s->height=height;s->desiredWidth=width;s->desiredHeight=height;s->slotBytes=static_cast<size_t>(width)*height*4;
    s->fd=ASharedMemory_create("hxz-frames",s->slotBytes*2);if(s->fd<0)return "Cannot allocate shared frame buffer";
    s->pixels=static_cast<unsigned char*>(mmap(nullptr,s->slotBytes*2,PROT_READ|PROT_WRITE,MAP_SHARED,s->fd,0));
    if(s->pixels==MAP_FAILED){s->pixels=nullptr;return "Cannot map shared frame buffer";}
    int sock=socket(AF_UNIX,SOCK_SEQPACKET|SOCK_CLOEXEC,0);if(sock<0)return "Cannot create IPC socket";
    s->listener.store(sock);
    struct stat existing{};if(lstat(path.c_str(),&existing)==0){
        if(!S_ISSOCK(existing.st_mode)||existing.st_uid!=getuid())return "IPC socket path is not a private socket";
        int probe=socket(AF_UNIX,SOCK_SEQPACKET|SOCK_CLOEXEC|SOCK_NONBLOCK,0);
        if(probe<0)return "Cannot inspect existing IPC socket";
        int connected=connect(probe,reinterpret_cast<sockaddr*>(&addr),len),reason=errno;close(probe);
        if(connected==0||reason!=ECONNREFUSED)return "IPC socket path is already in use";
        if(unlink(path.c_str())<0)return "Cannot remove stale IPC socket";
    }
    if(bind(sock,reinterpret_cast<sockaddr*>(&addr),len)<0)return "Cannot bind private IPC socket";
    if(chmod(path.c_str(),0600)<0){unlink(path.c_str());return "Cannot protect IPC socket";}
    if(listen(sock,1)<0){unlink(path.c_str());return "Cannot listen on IPC socket";}
    host=s;std::thread(hostLoop,s).detach();return {};
}
void hxz_ipc_stop(){std::shared_ptr<State> s;{std::lock_guard<std::mutex> guard(globalLock);s=std::move(host);}
    if(!s)return;Packet p{};p.type=quit;sendPacket(*s,p);s->stopped.store(true);
    int sock=s->socket.load();if(sock>=0)shutdown(sock,SHUT_RDWR);
    int listener=s->listener.exchange(-1);if(listener>=0)close(listener);
    unlink(s->path.c_str());s->captured.store(false);
}
void hxz_ipc_event(int type,int a,int b,int c,int d){std::shared_ptr<State> s;{std::lock_guard<std::mutex> guard(globalLock);s=host;}
    if(!s)return;Packet p{};p.type=input;p.a=type;p.b=a;p.c=b;p.d=c;p.e=d;sendPacket(*s,p);}
void hxz_ipc_release(){std::shared_ptr<State> s;{std::lock_guard<std::mutex> guard(globalLock);s=host;}
    if(!s)return;Packet p{};p.type=release;sendPacket(*s,p);}
void hxz_ipc_resize(int width,int height){std::shared_ptr<State> s;{std::lock_guard<std::mutex> guard(globalLock);s=host;}
    if(!s)return;if((width!=0||height!=0)&&(width<1||height<1||width>s->width||height>s->height))return;
    std::lock_guard<std::mutex> guard(s->sendLock);s->desiredWidth=width;s->desiredHeight=height;
    Packet p{};p.type=resize;p.a=width;p.b=height;p.generation=s->generation.fetch_add(1)+1;
    if(s->connected)sendPacketUnlocked(*s,p);
}
bool hxz_ipc_captured(){std::lock_guard<std::mutex> guard(globalLock);return host&&host->captured.load();}

std::string hxz_ipc_child_connect(const std::string& path){
    sockaddr_un addr{};socklen_t len=0;if(!address(path,addr,len))return "Invalid private IPC socket path";
    std::lock_guard<std::mutex> guard(globalLock);if(child)return "Game IPC already connected";
    auto s=std::make_shared<State>();int sock=socket(AF_UNIX,SOCK_SEQPACKET|SOCK_CLOEXEC,0);if(sock<0)return "Cannot create game IPC socket";
    s->socket.store(sock);if(connect(sock,reinterpret_cast<sockaddr*>(&addr),len)<0||!sameUid(sock))return "Cannot connect to same-UID game host";
    Packet greeting{};greeting.type=hello;if(!sendPacket(*s,greeting))return "Cannot negotiate game IPC";
    Packet setup{};int fd=-1;if(!receivePacket(sock,setup,&fd)||setup.type!=init||fd<0)return "Game IPC setup rejected";
    s->fd=fd;s->width=setup.a;s->height=setup.b;s->generation.store(setup.generation);
    if(s->width<1||s->height<1||s->width>4096||s->height>4096)return "Invalid shared frame dimensions";
    s->slotBytes=static_cast<size_t>(s->width)*s->height*4;
    struct stat st{};if(fstat(fd,&st)<0||st.st_size<static_cast<off_t>(s->slotBytes*2))return "Shared frame descriptor is too small";
    s->pixels=static_cast<unsigned char*>(mmap(nullptr,s->slotBytes*2,PROT_READ|PROT_WRITE,MAP_SHARED,fd,0));
    if(s->pixels==MAP_FAILED){s->pixels=nullptr;return "Cannot map game frame buffer";}
    child=s;hxz_set_frame_sink(frameSink);std::thread(childLoop,s).detach();return {};
}
void hxz_ipc_child_close(){std::shared_ptr<State> s;{std::lock_guard<std::mutex> guard(globalLock);s=std::move(child);}
    hxz_set_frame_sink(nullptr);if(!s)return;Packet p{};p.type=quit;sendPacket(*s,p);s->stopped.store(true);
    int sock=s->socket.load();if(sock>=0)shutdown(sock,SHUT_RDWR);
}

#pragma once
#include <string>

// ART owns the endpoint and shared frames. The game process only receives the
// descriptor after a same-UID credential check on a private seqpacket socket.
std::string hxz_ipc_start(const std::string& socketPath,int width,int height,bool direct=false);
void hxz_ipc_stop();
void hxz_ipc_event(int type,int a,int b,int c,int d);
void hxz_ipc_release();
void hxz_ipc_resize(int width,int height);
bool hxz_ipc_captured();

std::string hxz_ipc_child_connect(const std::string& socketPath,bool direct=false);
void hxz_ipc_child_close();

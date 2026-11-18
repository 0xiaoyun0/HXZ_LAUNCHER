// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include <cstdint>
#include <cstring>
#include <limits>
#include <vector>

// NG's GLES3.0 base-vertex emulation adds into uint16_t, wrapping at 65536.
// Promote BEFORE addition. Keep original buffers untouched and reject invalid indices.
inline bool hxz_ng_promote_indices(const void* source,int count,unsigned type,int base,std::vector<uint32_t>& out,bool* changed=nullptr) {
    if(!source||count<=0||count>4*1024*1024||base<0||(type!=0x1401&&type!=0x1403&&type!=0x1405))return false;
    bool differs=out.size()!=static_cast<size_t>(count);
    try{out.resize(static_cast<size_t>(count));}catch(...){return false;}
    const auto* bytes=static_cast<const unsigned char*>(source);
    for(int i=0;i<count;i++){
        uint32_t value;
        if(type==0x1401)value=bytes[i];
        else if(type==0x1403){uint16_t small;std::memcpy(&small,bytes+static_cast<size_t>(i)*2,2);value=small;}
        else std::memcpy(&value,bytes+static_cast<size_t>(i)*4,4);
        uint64_t sum=static_cast<uint64_t>(value)+static_cast<unsigned>(base);
        if(sum>std::numeric_limits<uint32_t>::max())return false;
        const auto promoted=static_cast<uint32_t>(sum);
        differs=differs||out[i]!=promoted;
        out[i]=promoted;
    }
    if(changed)*changed=differs;
    return true;
}

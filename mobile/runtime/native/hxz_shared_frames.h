#pragma once
#include <android/sharedmem.h>
#include <cstddef>
#include <string>

inline std::string hxz_check_shared_frames(int fd,size_t required) {
    if(fd<0||required==0)return "Invalid shared frame buffer request";
    // ASharedMemory may use ashmem (a device whose st_size can be zero) or memfd.
    // The NDK API understands both; fstat is not a shared-memory capacity query.
    const size_t actual=ASharedMemory_getSize(fd);
    if(actual==0||actual==static_cast<size_t>(-1))return "Cannot query Android shared frame buffer size";
    if(actual<required)return "Shared frame buffer is too small: required="+std::to_string(required)+", actual="+std::to_string(actual);
    return {};
}

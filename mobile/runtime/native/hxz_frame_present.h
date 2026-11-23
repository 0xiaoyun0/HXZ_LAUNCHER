#pragma once

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <cstring>

// The caller serializes presentation, retains the native window for the whole
// frame, and snapshots generation together with that window. Never retain a raw
// ANativeWindow address here: Surface recreation may reuse the same address.
class HxzFrameGeometry {
public:
    template<typename Configure>
    int ensure(uint64_t generation,int width,int height,Configure&& configure){
        if(valid_&&generation_==generation&&width_==width&&height_==height)return 0;
        // A failed reconfiguration may also invalidate the previous geometry.
        invalidate();
        const int result=configure();
        if(result==0){generation_=generation;width_=width;height_=height;valid_=true;}
        return result;
    }

    void invalidate(){valid_=false;}

private:
    uint64_t generation_=0;
    int width_=0,height_=0;
    bool valid_=false;
};

// Both sides are validated RGBA8888 buffers with positive dimensions and
// stride >= width. Preserve destination padding, clipping, black borders and
// the existing bottom-up source convention.
inline void hxzCopyRgbaFrame(const unsigned char* rgba,int width,int height,
                            int stridePixels,bool topDown,void* outputBits,
                            int outputWidth,int outputHeight,int outputStridePixels){
    if(topDown&&width==outputWidth&&height==outputHeight&&
       stridePixels==width&&outputStridePixels==width){
        std::memcpy(outputBits,rgba,static_cast<size_t>(width)*height*4);
        return;
    }
    const int rows=std::min(outputHeight,height),cols=std::min(outputWidth,width);
    for(int y=0;y<rows;++y){
        auto* dest=static_cast<unsigned char*>(outputBits)+static_cast<size_t>(y)*outputStridePixels*4;
        const int sourceRow=topDown?y:(height-1-y);
        const auto* source=rgba+static_cast<size_t>(sourceRow)*stridePixels*4;
        std::memcpy(dest,source,static_cast<size_t>(cols)*4);
        if(cols<outputWidth)std::memset(dest+static_cast<size_t>(cols)*4,0,static_cast<size_t>(outputWidth-cols)*4);
    }
    for(int y=rows;y<outputHeight;++y){
        std::memset(static_cast<unsigned char*>(outputBits)+static_cast<size_t>(y)*outputStridePixels*4,
                    0,static_cast<size_t>(outputWidth)*4);
    }
}

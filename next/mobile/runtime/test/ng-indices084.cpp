#include "../native/hxz_ng_indices.h"
#include <cstdio>
#include <cstdlib>
static void check(bool pass,const char* message){if(!pass){std::fprintf(stderr,"FAIL %s\n",message);std::exit(1);}}
int main(){
    std::vector<uint32_t> out;uint16_t water[]={0,1,2,2,3,0};
    check(hxz_ng_promote_indices(water,6,0x1403,65536,out),"water chunk conversion");
    check(out==std::vector<uint32_t>({65536,65537,65538,65538,65539,65536}),"base vertex must not wrap into a different chunk");
    uint16_t old=static_cast<uint16_t>(water[0]+65536);check(old!=out[0],"fixture must catch upstream uint16_t wrap");
    uint16_t edge[]={65534,65535};check(hxz_ng_promote_indices(edge,2,0x1403,2,out)&&out[1]==65537,"boundary crossing");
    uint8_t bytes[]={0,255};check(hxz_ng_promote_indices(bytes,2,0x1401,256,out)&&out[1]==511,"byte indices");
    uint32_t wide[]={70000,90000};check(hxz_ng_promote_indices(wide,2,0x1405,100000,out)&&out[1]==190000,"32-bit input");
    uint32_t overflow[]={0xffffffffu};check(!hxz_ng_promote_indices(overflow,1,0x1405,1,out),"overflow");
    check(!hxz_ng_promote_indices(water,6,0x1403,-1,out),"negative base delegates to driver");
    check(!hxz_ng_promote_indices(water,6,0x1406,1,out),"invalid type");
    check(!hxz_ng_promote_indices(nullptr,6,0x1403,1,out),"null");
    check(!hxz_ng_promote_indices(water,4*1024*1024+1,0x1403,1,out),"bounded allocation");
    check(water[0]==0&&water[5]==0,"input remains unchanged");
    std::puts("PASS NG base-vertex promotion: 12 regression cases; no device GPU claim");
}

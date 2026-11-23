#include "hxz_vm_heap.h"
#include <android/api-level.h>
#include <malloc.h>
#include <dlfcn.h>
#include <cstdint>
#include <cstdio>
#include <cstdlib>

// HotSpot/native dependencies may use the pointer's high bits. Android's
// standalone exec() initializes its own allocator, independent of the APK's
// Zygote/manifest policy. Set NONE before loading any JVM or renderer library.
// MEMTAG_OPTIONS=off is insufficient: Bionic maps it to TBI, not NONE.
// Keep this source out of libhxz_runtime.so, which is also loaded by ART.
bool hxz_prepare_vm_heap() {
    const int api = android_get_device_api_level();
    if (api < 29) {
        std::fprintf(stderr, "HXZ: cannot determine a supported Android API level (%d)\n", api);
        return false;
    }
    if (api == 29) return true; // Heap pointer tagging was introduced in API 30.

    bool disabled = false;
    if (api >= 31) {
        disabled = mallopt(M_BIONIC_SET_HEAP_TAGGING_LEVEL, M_HEAP_TAGGING_LEVEL_NONE) == 1;
    } else {
        // Android 11 predates the public mallopt option. Resolve its legacy
        // interface only here, without a private-symbol link-time dependency.
        using LegacyMallopt = bool (*)(int, void*, size_t);
        auto legacy = reinterpret_cast<LegacyMallopt>(dlsym(RTLD_DEFAULT, "android_mallopt"));
        uint32_t level = 0;
        constexpr int legacySetHeapTaggingLevel = 8;
        disabled = legacy && legacy(legacySetHeapTaggingLevel, &level, sizeof(level));
    }
    if (!disabled) {
        std::fprintf(stderr, "HXZ: Android %d could not enable isolated JVM heap compatibility; Java was not started\n", api);
        return false;
    }

    void* probe = std::malloc(32);
    if (!probe) {
        std::fprintf(stderr, "HXZ: insufficient memory for JVM heap compatibility check\n");
        return false;
    }
    const bool untagged = (reinterpret_cast<uintptr_t>(probe) >> 56) == 0;
    // Always free the original pointer, even when an OEM ignores the request.
    std::free(probe);
    if (!untagged) {
        std::fprintf(stderr, "HXZ: native heap tagging remains active; Java was not started\n");
        return false;
    }
    std::fprintf(stderr, "HXZ: isolated JVM heap compatibility ready (Android API %d)\n", api);
    return true;
}

#pragma once

// Only the standalone HotSpot executor may change its allocator policy.
bool hxz_prepare_vm_heap();

/* HXZ build configuration for unmodified libffi 3.4.6 on Android ARM64.
 * The C ABI is LP64/AAPCS64. Closure allocation uses libffi's mmap allocator;
 * device execution of closures remains a required runtime acceptance test. */
#pragma once
#define STDC_HEADERS 1
#define HAVE_ALLOCA_H 1
#define HAVE_MEMCPY 1
#define HAVE_MMAP 1
#define HAVE_MKOSTEMP 1
#define HAVE_AS_CFI_PSEUDO_OP 1
#define HAVE_HIDDEN_VISIBILITY_ATTRIBUTE 1
#define FFI_MMAP_EXEC_WRIT 1
#define FFI_MMAP_EXEC_SELINUX 0
#define SIZEOF_DOUBLE 8
#define SIZEOF_LONG_DOUBLE 16
#define SIZEOF_SIZE_T 8
#ifdef LIBFFI_ASM
#define FFI_HIDDEN(name) .hidden name
#else
#define FFI_HIDDEN __attribute__((visibility("hidden")))
#endif

cmake_minimum_required(VERSION 3.22)
project(hxz_upstream_natives C ASM)

# HXZ build recipe for unmodified, pinned third-party sources. This does not
# build any launcher glue. See dependencies.lock.json for source and notices.
if(NOT ANDROID OR NOT ANDROID_ABI STREQUAL "arm64-v8a")
  message(FATAL_ERROR "This audited configuration targets Android ARM64 only")
endif()
set(UPSTREAM_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../../.runtime/hxz-runtime-upstream")
set(LWJGL_VERSION "3.3.3" CACHE STRING "Pinned LWJGL version")
set(LWJGL_SRC "${UPSTREAM_ROOT}/sources/lwjgl-src-${LWJGL_VERSION}/modules/lwjgl")
if(LWJGL_VERSION VERSION_GREATER_EQUAL "3.4.1")
  set(FFI_VERSION "3.5.2")
else()
  set(FFI_VERSION "3.4.6")
endif()
set(FFI_SRC "${UPSTREAM_ROOT}/sources/libffi-${FFI_VERSION}")
set(CORE "${LWJGL_SRC}/core/src/main/c")
set(TARGET AARCH64)
set(HAVE_LONG_DOUBLE 1)
set(FFI_EXEC_TRAMPOLINE_TABLE 0)
set(VERSION ${FFI_VERSION})
set(FFI_VERSION_STRING ${FFI_VERSION})
set(FFI_VERSION_NUMBER 30502)
configure_file("${FFI_SRC}/include/ffi.h.in" "${CMAKE_BINARY_DIR}/ffi/ffi.h" @ONLY)
configure_file("${CMAKE_CURRENT_LIST_DIR}/fficonfig.h" "${CMAKE_BINARY_DIR}/ffi/fficonfig.h" COPYONLY)
add_library(ffi STATIC
  "${FFI_SRC}/src/prep_cif.c" "${FFI_SRC}/src/types.c"
  "${FFI_SRC}/src/raw_api.c" "${FFI_SRC}/src/java_raw_api.c"
  "${FFI_SRC}/src/closures.c" "${FFI_SRC}/src/tramp.c"
  "${FFI_SRC}/src/aarch64/ffi.c" "${FFI_SRC}/src/aarch64/sysv.S")
target_include_directories(ffi PRIVATE "${CMAKE_BINARY_DIR}/ffi" "${FFI_SRC}/include" "${FFI_SRC}/src/aarch64")
target_compile_definitions(ffi PRIVATE _GNU_SOURCE FFI_BUILDING)
set_target_properties(ffi PROPERTIES POSITION_INDEPENDENT_CODE ON)

file(GLOB CORE_SOURCES "${CORE}/*.c" "${LWJGL_SRC}/core/src/generated/c/*.c"
  "${LWJGL_SRC}/core/src/generated/c/linux/*.c" "${CORE}/linux/liburing/*.c")
add_library(lwjgl SHARED ${CORE_SOURCES})
target_include_directories(lwjgl PRIVATE "${CORE}/libffi" "${CORE}/libffi/aarch64"
  "${CORE}/linux/liburing" "${CORE}/linux/liburing/include")
target_compile_definitions(lwjgl PRIVATE CONFIG_HAVE_MEMFD_CREATE)
target_link_libraries(lwjgl PRIVATE ffi dl)

file(GLOB GL_SOURCES "${LWJGL_SRC}/opengl/src/generated/c/*.c")
list(FILTER GL_SOURCES EXCLUDE REGEX "org_lwjgl_opengl_WGL\\.c$")
add_library(lwjgl_opengl SHARED ${GL_SOURCES})
target_include_directories(lwjgl_opengl PRIVATE "${LWJGL_SRC}/opengl/src/main/c")

file(GLOB STB_SOURCES "${LWJGL_SRC}/stb/src/generated/c/*.c")
add_library(lwjgl_stb SHARED ${STB_SOURCES})
target_include_directories(lwjgl_stb PRIVATE "${LWJGL_SRC}/stb/src/main/c")
target_link_libraries(lwjgl_stb PRIVATE m)

add_library(lwjgl_tinyfd SHARED
  "${LWJGL_SRC}/tinyfd/src/generated/c/org_lwjgl_util_tinyfd_TinyFileDialogs.c"
  "${LWJGL_SRC}/tinyfd/src/main/c/tinyfiledialogs.c")
target_include_directories(lwjgl_tinyfd PRIVATE "${LWJGL_SRC}/tinyfd/src/main/c")

# AOSP libsync uses only libc and Linux sync_file ioctls, and supplies the
# legacy sync_wait entry that Mesa's published OSMesa binary imports.
add_library(sync SHARED "${UPSTREAM_ROOT}/sources/aosp-libsync/sync.c")
target_include_directories(sync PRIVATE "${UPSTREAM_ROOT}/sources/aosp-libsync/include")
target_compile_options(sync PRIVATE -O3 --target=aarch64-none-linux-android26)
target_link_options(sync PRIVATE -Wl,--no-undefined -Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384)

foreach(module lwjgl lwjgl_opengl lwjgl_stb lwjgl_tinyfd)
  target_compile_definitions(${module} PRIVATE LWJGL_LINUX LWJGL_arm64 NDEBUG _GNU_SOURCE _FILE_OFFSET_BITS=64)
  target_include_directories(${module} PRIVATE "${CORE}" "${CORE}/linux")
  target_compile_options(${module} PRIVATE -O3 -Wno-incompatible-pointer-types -Wno-deprecated-declarations)
  target_link_options(${module} PRIVATE "-Wl,--version-script,${UPSTREAM_ROOT}/sources/lwjgl-src-${LWJGL_VERSION}/config/linux/version.script"
    -Wl,--no-undefined -Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384)
endforeach()

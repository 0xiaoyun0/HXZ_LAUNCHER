// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include <android/native_window.h>
#ifdef __cplusplus
extern "C" {
#endif
int hxz_fcl_init(const char* library);
void hxz_fcl_surface(ANativeWindow*,int,int);
void* hxz_fcl_create();
int hxz_fcl_current(void*);
void hxz_fcl_destroy(void*);
int hxz_fcl_swap();
void hxz_fcl_interval(int);
void* hxz_fcl_proc(const char*);
#ifdef __cplusplus
}
#endif

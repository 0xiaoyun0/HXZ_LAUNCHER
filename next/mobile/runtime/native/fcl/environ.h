// SPDX-License-Identifier: GPL-3.0-only
// Minimal HXZ host for the imported FCL EGL bridge; no input/JVM state shared.
#pragma once
#include "gl_bridge.h"
#define STATE_RENDERER_ALIVE 0
#define STATE_RENDERER_NEW_WINDOW 1
typedef struct { char state; struct ANativeWindow* nativeSurface; struct ANativeWindow* newNativeSurface; } basic_render_window_t;
struct pojav_environ_s { struct ANativeWindow* pojavWindow; basic_render_window_t* mainWindowBundle; bool force_vsync; };
extern struct pojav_environ_s* pojav_environ;
extern int hxz_fcl_width, hxz_fcl_height;

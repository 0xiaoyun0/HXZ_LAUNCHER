// SPDX-License-Identifier: GPL-3.0-only
// Adapted from FCL-Team/FoldCraftLauncher a36e1e42292d6a67c93be0dafbfdceff01823e71.
// HXZ changes (2026-10-22): see mobile/third_party/fcl-renderer/NOTICE.md.
//
// Created by maks on 17.09.2022.
//
#include <EGL//egl.h>
#include <stdbool.h>
#ifndef POJAVLAUNCHER_GL_BRIDGE_H
#define POJAVLAUNCHER_GL_BRIDGE_H

typedef struct {
    char       state;
    struct ANativeWindow *nativeSurface;
    struct ANativeWindow *newNativeSurface;
    EGLConfig  config;
    EGLint     format;
    EGLContext context;
    EGLSurface surface;
} gl_render_window_t;

bool gl_init();
gl_render_window_t* gl_get_current();
gl_render_window_t* gl_init_context(gl_render_window_t* share);
void gl_make_current(gl_render_window_t* bundle);
bool gl_swap_buffers();
void gl_setup_window();
void gl_swap_interval(int swapInterval);


#endif //POJAVLAUNCHER_GL_BRIDGE_H

void gl_destroy_context(gl_render_window_t* bundle);
void gl_init_dimensions(void* library);

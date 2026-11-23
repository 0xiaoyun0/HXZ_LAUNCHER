// SPDX-License-Identifier: GPL-3.0-only
// Adapted from FCL-Team/FoldCraftLauncher a36e1e42292d6a67c93be0dafbfdceff01823e71.
// HXZ changes (2026-10-22): see mobile/third_party/fcl-renderer/NOTICE.md.
#include <EGL/egl.h>
#include <android/log.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <string.h>
#include <malloc.h>
#include <stdlib.h>
#include <dlfcn.h>
#include <stdbool.h>
#include <stdio.h>
#include <unistd.h>
#include "environ.h"
#include "gl_bridge.h"
#include "egl_loader.h"
#include "log.h"

//
// Created by maks on 17.09.2022.
//

static const char *g_LogTag = "GLBridge";
static __thread gl_render_window_t *currentBundle;
static EGLDisplay g_EglDisplay;

bool gl_init() {
    if (!dlsym_EGL()) return false;
    g_EglDisplay = eglGetDisplay_p(EGL_DEFAULT_DISPLAY);
    if (g_EglDisplay == EGL_NO_DISPLAY) {
        __android_log_print(ANDROID_LOG_ERROR, g_LogTag, "%s",
                            "eglGetDisplay_p(EGL_DEFAULT_DISPLAY) returned EGL_NO_DISPLAY");
        return false;
    }
    if (eglInitialize_p(g_EglDisplay, 0, 0) != EGL_TRUE) {
        __android_log_print(ANDROID_LOG_ERROR, g_LogTag, "eglInitialize_p() failed: %04x",
                            eglGetError_p());
        return false;
    }
    return true;
}

gl_render_window_t *gl_get_current() {
    return currentBundle;
}

static void gl4esi_get_display_dimensions(int *width, int *height) {
    if (currentBundle == NULL) goto zero;
    EGLSurface surface = currentBundle->surface;
    // Fetch dimensions from the EGL surface - the most reliable way
    EGLBoolean result_width = eglQuerySurface_p(g_EglDisplay, surface, EGL_WIDTH, width);
    EGLBoolean result_height = eglQuerySurface_p(g_EglDisplay, surface, EGL_HEIGHT, height);
    if (!result_width || !result_height) goto zero;
    return;

    zero:
    // No idea what to do, but feeding gl4es incorrect or non-initialized dimensions may be
    // a bad idea. Set to zero in case of errors.
    *width = 0;
    *height = 0;
}

gl_render_window_t *gl_init_context(gl_render_window_t *share) {
    gl_render_window_t *bundle = malloc(sizeof(gl_render_window_t));
    if (!bundle) return NULL;
    memset(bundle, 0, sizeof(gl_render_window_t));
    EGLint egl_attributes[] = {EGL_BLUE_SIZE, 8, EGL_GREEN_SIZE, 8, EGL_RED_SIZE, 8, EGL_ALPHA_SIZE,
                               8, EGL_DEPTH_SIZE, 24, EGL_SURFACE_TYPE,
                               EGL_WINDOW_BIT | EGL_PBUFFER_BIT, EGL_RENDERABLE_TYPE,
                               0x40 /* EGL_OPENGL_ES3_BIT_KHR */, EGL_NONE};
    EGLint num_configs = 0;

    if (eglChooseConfig_p(g_EglDisplay, egl_attributes, NULL, 0, &num_configs) != EGL_TRUE) {
        __android_log_print(ANDROID_LOG_ERROR, g_LogTag, "eglChooseConfig_p() failed: %04x",
                            eglGetError_p());
        free(bundle);
        return NULL;
    }
    if (num_configs == 0) {
        __android_log_print(ANDROID_LOG_ERROR, g_LogTag, "%s",
                            "eglChooseConfig_p() found no matching config");
        free(bundle);
        return NULL;
    }

    // Get the first matching config
    eglChooseConfig_p(g_EglDisplay, egl_attributes, &bundle->config, 1, &num_configs);
    eglGetConfigAttrib_p(g_EglDisplay, bundle->config, EGL_NATIVE_VISUAL_ID, &bundle->format);

    {
        EGLBoolean bindResult;
        if (strncmp(getenv("POJAV_RENDERER"), "opengles3_desktopgl", 19) == 0) {
            printf("EGLBridge: Binding to desktop OpenGL\n");
            bindResult = eglBindAPI_p(EGL_OPENGL_API);
        } else {
            printf("EGLBridge: Binding to OpenGL ES\n");
            bindResult = eglBindAPI_p(EGL_OPENGL_ES_API);
        }
        if (!bindResult) { free(bundle); return NULL; }
    }

    int libgl_es = strtol(getenv("LIBGL_ES"), NULL, 0);
    if (libgl_es < 0 || libgl_es > INT16_MAX) libgl_es = 2;
    const EGLint egl_context_attributes[] = {EGL_CONTEXT_CLIENT_VERSION, libgl_es, EGL_NONE};
    bundle->context = eglCreateContext_p(g_EglDisplay, bundle->config,
                                         share == NULL ? EGL_NO_CONTEXT : share->context,
                                         egl_context_attributes);

    if (bundle->context == EGL_NO_CONTEXT) {
        __android_log_print(ANDROID_LOG_ERROR, g_LogTag,
                            "eglCreateContext_p() finished with error: %04x",
                            eglGetError_p());
        free(bundle);
        return NULL;
    }
    return bundle;
}

void gl_swap_surface(gl_render_window_t *bundle) {
    // HXZ: all window/context transitions are serialized by the host adapter.
    if (bundle->surface != EGL_NO_SURFACE) {
        eglDestroySurface_p(g_EglDisplay, bundle->surface);
        bundle->surface = EGL_NO_SURFACE;
    }
    if (bundle->nativeSurface != NULL) {
        ANativeWindow_release(bundle->nativeSurface);
        bundle->nativeSurface = NULL;
    }
    if (bundle->newNativeSurface != NULL) {
        bundle->nativeSurface = bundle->newNativeSurface;
        bundle->newNativeSurface = NULL;
        ANativeWindow_acquire(bundle->nativeSurface);
        ANativeWindow_setBuffersGeometry(bundle->nativeSurface, hxz_fcl_width,
                                          hxz_fcl_height, bundle->format);
        bundle->surface = eglCreateWindowSurface_p(g_EglDisplay, bundle->config,
                                                   bundle->nativeSurface, NULL);
    }
    if (bundle->surface == EGL_NO_SURFACE) {
        const EGLint attrs[] = {EGL_WIDTH, 1, EGL_HEIGHT, 1, EGL_NONE};
        bundle->surface = eglCreatePbufferSurface_p(g_EglDisplay, bundle->config, attrs);
    }
    //eglMakeCurrent_p(g_EglDisplay, bundle->surface, bundle->surface, bundle->context);
}

void gl_make_current(gl_render_window_t *bundle) {
    if (bundle == NULL) {
        if (eglMakeCurrent_p(g_EglDisplay, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT)) {
            currentBundle = NULL;
        }
        return;
    }
    bool hasSetMainWindow = false;
    if (pojav_environ->mainWindowBundle == NULL) {
        pojav_environ->mainWindowBundle = (basic_render_window_t *) bundle;
        __android_log_print(ANDROID_LOG_INFO, g_LogTag, "Main window bundle is now %p",
                            pojav_environ->mainWindowBundle);
        pojav_environ->mainWindowBundle->newNativeSurface = pojav_environ->pojavWindow;
        hasSetMainWindow = true;
    }
    __android_log_print(ANDROID_LOG_INFO, g_LogTag,
                        "Making current, surface=%p, nativeSurface=%p, newNativeSurface=%p",
                        bundle->surface, bundle->nativeSurface, bundle->newNativeSurface);
    if (bundle->surface == NULL) { //it likely will be on the first run
        gl_swap_surface(bundle);
    }
    if (eglMakeCurrent_p(g_EglDisplay, bundle->surface, bundle->surface, bundle->context)) {
        currentBundle = bundle;
    } else {
        if (hasSetMainWindow) {
            pojav_environ->mainWindowBundle->newNativeSurface = NULL;
            gl_swap_surface((gl_render_window_t *) pojav_environ->mainWindowBundle);
            pojav_environ->mainWindowBundle = NULL;
        }
        __android_log_print(ANDROID_LOG_ERROR, g_LogTag, "eglMakeCurrent returned with error: %04x",
                            eglGetError_p());
    }

}

bool gl_swap_buffers() {
    if (currentBundle == NULL) return false;
    if (currentBundle->state == STATE_RENDERER_NEW_WINDOW) {
        if (!eglMakeCurrent_p(g_EglDisplay,EGL_NO_SURFACE,EGL_NO_SURFACE,EGL_NO_CONTEXT)) return false;
        gl_swap_surface(currentBundle);
        if (!eglMakeCurrent_p(g_EglDisplay,currentBundle->surface,currentBundle->surface,currentBundle->context)) return false;
        currentBundle->state = STATE_RENDERER_ALIVE;
    }
    if (currentBundle->surface == EGL_NO_SURFACE) return false;
    if (eglSwapBuffers_p(g_EglDisplay,currentBundle->surface)) return true;
    if (eglGetError_p() != EGL_BAD_SURFACE) return false;
    // A Surface may die before its Binder replacement arrives. Preserve the
    // context/textures on a pbuffer; the next window update restores display.
    if (!eglMakeCurrent_p(g_EglDisplay,EGL_NO_SURFACE,EGL_NO_SURFACE,EGL_NO_CONTEXT)) return false;
    currentBundle->newNativeSurface = NULL;
    gl_swap_surface(currentBundle);
    return eglMakeCurrent_p(g_EglDisplay,currentBundle->surface,currentBundle->surface,currentBundle->context);
}

void gl_setup_window() {
    if (pojav_environ->mainWindowBundle != NULL) {
        __android_log_print(ANDROID_LOG_INFO, g_LogTag,
                            "Main window bundle is not NULL, changing state");
        pojav_environ->mainWindowBundle->state = STATE_RENDERER_NEW_WINDOW;
        pojav_environ->mainWindowBundle->newNativeSurface = pojav_environ->pojavWindow;
    }
}

void gl_swap_interval(int swapInterval) {
    if (pojav_environ->force_vsync) swapInterval = 1;

    eglSwapInterval_p(g_EglDisplay, swapInterval);
}

JNIEXPORT void JNICALL
Java_org_lwjgl_opengl_PojavRendererInit_nativeInitGl4esInternals(JNIEnv *env, jclass clazz,
                                                                 jobject function_provider) {
    __android_log_print(ANDROID_LOG_INFO, g_LogTag, "GL4ES internals initializing...");
    jclass funcProviderClass = (*env)->GetObjectClass(env, function_provider);
    jmethodID method_getFunctionAddress = (*env)->GetMethodID(env, funcProviderClass,
                                                              "getFunctionAddress",
                                                              "(Ljava/lang/CharSequence;)J");
#define GETSYM(N) ((*env)->CallLongMethod(env, function_provider, method_getFunctionAddress, (*env)->NewStringUTF(env, N)));
    void (*set_getmainfbsize)(void (*new_getMainFBSize)(int *width, int *height)) = (void *) GETSYM(
            "set_getmainfbsize");
    if (set_getmainfbsize != NULL) {
        __android_log_print(ANDROID_LOG_INFO, g_LogTag,
                            "GL4ES internals initialized dimension callback");
        set_getmainfbsize(gl4esi_get_display_dimensions);
    }
#undef GETSYM
}
void gl_destroy_context(gl_render_window_t* bundle) {
    if (!bundle) return;
    if (currentBundle == bundle) gl_make_current(NULL);
    if (pojav_environ->mainWindowBundle == (basic_render_window_t*)bundle)
        pojav_environ->mainWindowBundle = NULL;
    if (bundle->surface != EGL_NO_SURFACE) eglDestroySurface_p(g_EglDisplay, bundle->surface);
    if (bundle->context != EGL_NO_CONTEXT) eglDestroyContext_p(g_EglDisplay, bundle->context);
    if (bundle->nativeSurface) ANativeWindow_release(bundle->nativeSurface);
    free(bundle);
}
void gl_init_dimensions(void* library) {
    void (*set_size)(void (*)(int*,int*)) = dlsym(library, "set_getmainfbsize");
    if (set_size) set_size(gl4esi_get_display_dimensions);
}

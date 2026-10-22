// SPDX-License-Identifier: GPL-3.0-only
// Adapted from FCL-Team/FoldCraftLauncher a36e1e42292d6a67c93be0dafbfdceff01823e71.
// HXZ changes (2026-10-22): see mobile/third_party/fcl-renderer/NOTICE.md.
//
// Created by maks on 21.09.2022.
//
#include <stdlib.h>
#include <stdio.h>
#include <dlfcn.h>
#include <string.h>
#include "egl_loader.h"
static void* loader_dlopen(const char* name, const char* fallback, int flags) {
    return dlopen(name && *name ? name : fallback, flags);
}

// 逃逸命名空间：定义于此、经 global_state.h 声明，由 loader_dlopen 兜底 dlopen 失败


EGLBoolean (*eglMakeCurrent_p) (EGLDisplay dpy, EGLSurface draw, EGLSurface read, EGLContext ctx);
EGLBoolean (*eglDestroyContext_p) (EGLDisplay dpy, EGLContext ctx);
EGLBoolean (*eglDestroySurface_p) (EGLDisplay dpy, EGLSurface surface);
EGLBoolean (*eglTerminate_p) (EGLDisplay dpy);
EGLBoolean (*eglReleaseThread_p) (void);
EGLContext (*eglGetCurrentContext_p) (void);
EGLDisplay (*eglGetDisplay_p) (NativeDisplayType display);
EGLBoolean (*eglInitialize_p) (EGLDisplay dpy, EGLint *major, EGLint *minor);
EGLBoolean (*eglChooseConfig_p) (EGLDisplay dpy, const EGLint *attrib_list, EGLConfig *configs, EGLint config_size, EGLint *num_config);
EGLBoolean (*eglGetConfigAttrib_p) (EGLDisplay dpy, EGLConfig config, EGLint attribute, EGLint *value);
EGLBoolean (*eglBindAPI_p) (EGLenum api);
EGLSurface (*eglCreatePbufferSurface_p) (EGLDisplay dpy, EGLConfig config, const EGLint *attrib_list);
EGLSurface (*eglCreateWindowSurface_p) (EGLDisplay dpy, EGLConfig config, NativeWindowType window, const EGLint *attrib_list);
EGLBoolean (*eglSwapBuffers_p) (EGLDisplay dpy, EGLSurface draw);
EGLint (*eglGetError_p) (void);
EGLContext (*eglCreateContext_p) (EGLDisplay dpy, EGLConfig config, EGLContext share_list, const EGLint *attrib_list);
EGLBoolean (*eglSwapInterval_p) (EGLDisplay dpy, EGLint interval);
EGLSurface (*eglGetCurrentSurface_p) (EGLint readdraw);
EGLBoolean (*eglQuerySurface_p)( 	EGLDisplay display,
                                    EGLSurface surface,
                                    EGLint attribute,
                                    EGLint * value);
__eglMustCastToProperFunctionPointerType (*eglGetProcAddress_p) (const char *procname);

bool dlsym_EGL() {
    char* gles = getenv("LIBGL_GLES");
    char* eglName = (strncmp(gles ? gles : "", "libGLESv2_angle.so", 18) == 0) ? "libEGL_angle.so" : getenv("POJAVEXEC_EGL");
    // 普通 dlopen 失败时 loader_dlopen 内部会改用逃逸命名空间重试（mesa 等随驱动一起打包的库）
    void* dl_handle = loader_dlopen(eglName,"libEGL.so", RTLD_LOCAL|RTLD_LAZY);
    if(dl_handle == NULL) return false;
    eglGetProcAddress_p = dlsym(dl_handle, "eglGetProcAddress");
    if(eglGetProcAddress_p == NULL) {
        printf("%s\n", dlerror());
        return false;
    }
    eglBindAPI_p = dlsym(dl_handle,"eglBindAPI");
    if(!eglBindAPI_p) eglBindAPI_p = (void*)eglGetProcAddress_p("eglBindAPI");
    if(!eglBindAPI_p) return false;
    eglChooseConfig_p = dlsym(dl_handle,"eglChooseConfig");
    if(!eglChooseConfig_p) eglChooseConfig_p = (void*)eglGetProcAddress_p("eglChooseConfig");
    if(!eglChooseConfig_p) return false;
    eglCreateContext_p = dlsym(dl_handle,"eglCreateContext");
    if(!eglCreateContext_p) eglCreateContext_p = (void*)eglGetProcAddress_p("eglCreateContext");
    if(!eglCreateContext_p) return false;
    eglCreatePbufferSurface_p = dlsym(dl_handle,"eglCreatePbufferSurface");
    if(!eglCreatePbufferSurface_p) eglCreatePbufferSurface_p = (void*)eglGetProcAddress_p("eglCreatePbufferSurface");
    if(!eglCreatePbufferSurface_p) return false;
    eglCreateWindowSurface_p = dlsym(dl_handle,"eglCreateWindowSurface");
    if(!eglCreateWindowSurface_p) eglCreateWindowSurface_p = (void*)eglGetProcAddress_p("eglCreateWindowSurface");
    if(!eglCreateWindowSurface_p) return false;
    eglDestroyContext_p = dlsym(dl_handle,"eglDestroyContext");
    if(!eglDestroyContext_p) eglDestroyContext_p = (void*)eglGetProcAddress_p("eglDestroyContext");
    if(!eglDestroyContext_p) return false;
    eglDestroySurface_p = dlsym(dl_handle,"eglDestroySurface");
    if(!eglDestroySurface_p) eglDestroySurface_p = (void*)eglGetProcAddress_p("eglDestroySurface");
    if(!eglDestroySurface_p) return false;
    eglGetConfigAttrib_p = dlsym(dl_handle,"eglGetConfigAttrib");
    if(!eglGetConfigAttrib_p) eglGetConfigAttrib_p = (void*)eglGetProcAddress_p("eglGetConfigAttrib");
    if(!eglGetConfigAttrib_p) return false;
    eglGetCurrentContext_p = dlsym(dl_handle,"eglGetCurrentContext");
    if(!eglGetCurrentContext_p) eglGetCurrentContext_p = (void*)eglGetProcAddress_p("eglGetCurrentContext");
    if(!eglGetCurrentContext_p) return false;
    eglGetDisplay_p = dlsym(dl_handle,"eglGetDisplay");
    if(!eglGetDisplay_p) eglGetDisplay_p = (void*)eglGetProcAddress_p("eglGetDisplay");
    if(!eglGetDisplay_p) return false;
    eglGetError_p = dlsym(dl_handle,"eglGetError");
    if(!eglGetError_p) eglGetError_p = (void*)eglGetProcAddress_p("eglGetError");
    if(!eglGetError_p) return false;
    eglInitialize_p = dlsym(dl_handle,"eglInitialize");
    if(!eglInitialize_p) eglInitialize_p = (void*)eglGetProcAddress_p("eglInitialize");
    if(!eglInitialize_p) return false;
    eglMakeCurrent_p = dlsym(dl_handle,"eglMakeCurrent");
    if(!eglMakeCurrent_p) eglMakeCurrent_p = (void*)eglGetProcAddress_p("eglMakeCurrent");
    if(!eglMakeCurrent_p) return false;
    eglSwapBuffers_p = dlsym(dl_handle,"eglSwapBuffers");
    if(!eglSwapBuffers_p) eglSwapBuffers_p = (void*)eglGetProcAddress_p("eglSwapBuffers");
    if(!eglSwapBuffers_p) return false;
    eglReleaseThread_p = dlsym(dl_handle,"eglReleaseThread");
    if(!eglReleaseThread_p) eglReleaseThread_p = (void*)eglGetProcAddress_p("eglReleaseThread");
    if(!eglReleaseThread_p) return false;
    eglSwapInterval_p = dlsym(dl_handle,"eglSwapInterval");
    if(!eglSwapInterval_p) eglSwapInterval_p = (void*)eglGetProcAddress_p("eglSwapInterval");
    if(!eglSwapInterval_p) return false;
    eglTerminate_p = dlsym(dl_handle,"eglTerminate");
    if(!eglTerminate_p) eglTerminate_p = (void*)eglGetProcAddress_p("eglTerminate");
    if(!eglTerminate_p) return false;
    eglGetCurrentSurface_p = dlsym(dl_handle,"eglGetCurrentSurface");
    if(!eglGetCurrentSurface_p) eglGetCurrentSurface_p = (void*)eglGetProcAddress_p("eglGetCurrentSurface");
    if(!eglGetCurrentSurface_p) return false;
    eglQuerySurface_p = dlsym(dl_handle,"eglQuerySurface");
    if(!eglQuerySurface_p) eglQuerySurface_p = (void*)eglGetProcAddress_p("eglQuerySurface");
    if(!eglQuerySurface_p) return false;
    return true;
}

// 供 glxshim 等外部库转发 eglGetProcAddress
__attribute__((visibility("default")))
void *getProcAddress(const char *procname) {
    // SDL 路径不经过 pojavInitOpenGL，首次调用时补齐 EGL 符号解析
    if (eglGetProcAddress_p == NULL && !dlsym_EGL()) return NULL;
    return eglGetProcAddress_p(procname);
}

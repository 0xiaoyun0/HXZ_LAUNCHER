#pragma once

#include <android/native_window.h>

#ifdef __cplusplus
extern "C" {
#endif

// The caller lends a reference. This module acquires its own reference until
// the next surface change or termination. Size is the game render resolution.
void hxz_surface(ANativeWindow* window, int width, int height);
void hxz_surface_resolution(int width,int height);

// 1 key(key,scancode,action,mods), 2 mouse(button,action,mods),
// 3 cursor(x*1000,y*1000,relative), 4 scroll(x*1000,y*1000),
// 5 Unicode(codepoint), 6 focus(focused).
void hxz_event(int type, int a, int b, int c, int d);
void hxz_release_inputs(void);
void hxz_virtual_size(int width,int height);
void hxz_request_close(void);

// kind: "osmesa" for desktop OpenGL, "egl" for OpenGL ES 3.0 only.
// OSMesa path must name the verified, absolute renderer library.
// Returns 0 on success; the message is available through hxz_last_error.
int hxz_configure_renderer(const char* path, const char* kind);
const char* hxz_last_error(void);
int hxz_cursor_captured(void);

// Optional process boundary. The game process sends completed OSMesa frames
// through this callback; the UI process presents verified shared-memory rows.
typedef int (*HxzFrameSink)(const unsigned char* rgba, int width, int height,
                             int stridePixels, int topDown);
void hxz_set_frame_sink(HxzFrameSink sink);
int hxz_present_frame(const unsigned char* rgba, int width, int height,
                      int stridePixels, int topDown);

#ifdef __cplusplus
}
#endif

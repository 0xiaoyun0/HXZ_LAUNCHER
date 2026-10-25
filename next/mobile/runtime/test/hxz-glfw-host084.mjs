import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const native=path.resolve('mobile/runtime/native');
const ndk=process.env.HXZ_ANDROID_NDK||'E:/hxz_up/hxzup/tools/android-ndk-r30';
const sysroot=path.join(ndk,'toolchains/llvm/prebuilt/windows-x86_64/sysroot/usr/include');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-glfw-host-'));
const include=path.join(tmp,'include');
await fs.mkdir(path.join(include,'android'),{recursive:true});
// Only Android/EGL/dlopen are stubbed; the complete production GLFW adapter runs.
await fs.writeFile(path.join(include,'android/native_window.h'),`#pragma once
#include <stdint.h>
typedef struct ANativeWindow ANativeWindow;
typedef struct ANativeWindow_Buffer {int32_t width,height,stride,format;void* bits;uint32_t reserved[6];} ANativeWindow_Buffer;
#define WINDOW_FORMAT_RGBA_8888 1
extern "C" {void ANativeWindow_acquire(ANativeWindow*);void ANativeWindow_release(ANativeWindow*);
int32_t ANativeWindow_setBuffersGeometry(ANativeWindow*,int32_t,int32_t,int32_t);
int32_t ANativeWindow_lock(ANativeWindow*,ANativeWindow_Buffer*,void*);
int32_t ANativeWindow_unlockAndPost(ANativeWindow*);}
`);
await fs.writeFile(path.join(include,'dlfcn.h'),`#pragma once
#define RTLD_NOW 2
#define RTLD_LOCAL 0
extern "C" {void* dlopen(const char*,int);void* dlsym(void*,const char*);int dlclose(void*);}
`);
await fs.copyFile(path.join(native,'hxz_fcl_render.h'),path.join(tmp,'hxz_fcl_render.h'));
for(const dir of ['EGL','KHR','vulkan','vk_video'])await fs.cp(path.join(sysroot,dir),path.join(include,dir),{recursive:true});
await fs.cp(path.join(native,'include'),path.join(tmp,'include'),{recursive:true});
await fs.copyFile(path.join(native,'hxz_glfw.h'),path.join(tmp,'hxz_glfw.h'));
await fs.copyFile(path.join(native,'hxz_frame_present.h'),path.join(tmp,'hxz_frame_present.h'));
const source=await fs.readFile(path.join(native,'hxz_glfw.cpp'),'utf8');
const fixture=path.resolve('mobile/runtime/test/hxz-glfw-host084.cpp');
const defaultZig=path.resolve('.runtime/review084/native-host-tools/ziglang/zig.exe');
const compiler=process.env.HXZ_HOST_CXX||(process.platform==='win32'?defaultZig:'c++');
const zig=path.basename(compiler).startsWith('zig');
const common=[...(zig?['c++']:[]),'-std=c++17','-Wall','-Wextra','-Werror','-pthread','-DEGL_NO_PLATFORM_SPECIFIC_TYPES','-I',tmp,'-I',include];
const executable=path.join(tmp,process.platform==='win32'?'boot.exe':'boot');
async function compile(text){
  await fs.writeFile(path.join(tmp,'hxz_glfw_under_test.cpp'),text);
  execFileSync(compiler,[...common,fixture,'-o',executable],{stdio:'pipe',timeout:240000});
}
// Establish that the previously shipped behavior fails at Minecraft's first
// legal post-capabilities call, while its fatal boot callback is installed.
const start=source.indexOf('extern "C" void glfwSetWindowSizeLimits');
const end=source.indexOf('extern "C" void glfwSetWindowAspectRatio',start);
assert(start>=0&&end>start);
await compile(source.slice(0,start)+'extern "C" void glfwSetWindowSizeLimits(GLFWwindow* w,int,int,int,int){if(hasWindow(w))report(GLFW_FEATURE_UNAVAILABLE,"Legacy size limits rejection");}\n'+source.slice(end));
execFileSync(executable,['--expect-legacy-failure'],{timeout:10000});
await compile(source);
for (const mode of ['--review-input','--review-extensions','--review-fcl']) console.log(execFileSync(executable,[mode],{encoding:'utf8',timeout:10000}).trim());
const result=execFileSync(executable,[],{encoding:'utf8',timeout:10000}).trim();
console.log(JSON.stringify({passed:true,legacyFailureReproduced:true,result,scope:'Actual host-native GLFW adapter with mocked Android/OSMesa calls; no real renderer, JVM, or device acceptance'}));

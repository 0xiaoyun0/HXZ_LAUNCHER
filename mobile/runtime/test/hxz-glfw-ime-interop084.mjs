import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

assert.equal(process.platform,'win32','This JNI fixture uses the local Windows LWJGL native library');
const native=path.resolve('mobile/runtime/native');
const ndk=process.env.HXZ_ANDROID_NDK||'E:/hxz_up/hxzup/tools/android-ndk-r30';
const sysroot=path.join(ndk,'toolchains/llvm/prebuilt/windows-x86_64/sysroot/usr/include');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-glfw-ime-jni-'));
const include=path.join(tmp,'include');
await fs.mkdir(path.join(include,'android'),{recursive:true});
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
for(const dir of ['EGL','KHR','vulkan','vk_video'])await fs.cp(path.join(sysroot,dir),path.join(include,dir),{recursive:true});
await fs.cp(path.join(native,'include'),include,{recursive:true});
await fs.copyFile(path.join(native,'hxz_glfw.h'),path.join(tmp,'hxz_glfw.h'));
await fs.copyFile(path.join(native,'hxz_glfw.cpp'),path.join(tmp,'hxz_glfw_under_test.cpp'));
const compiler=process.env.HXZ_HOST_CXX||path.resolve('.runtime/review084/native-host-tools/ziglang/zig.exe');
const common=['c++','-std=c++17','-Wall','-Wextra','-Werror','-pthread','-shared','-D_GLFW_BUILD_DLL','-DEGL_NO_PLATFORM_SPECIFIC_TYPES','-I',tmp,'-I',include,'-I',native];
const fixture=path.resolve('mobile/runtime/test/hxz-glfw-ime-host084.cpp');
const legacy=path.join(tmp,'glfw_missing_preedit.dll');const fixed=path.join(tmp,'glfw_ime.dll');
// Deliberately hide this one export to recreate the reported NPE with a valid
// window. The independent Android ABI test also recorded all seven missing
// exports against the original, unmodified adapter before the fix.
execFileSync(compiler,[...common,'-DglfwSetPreeditCallback=hxzLegacySetPreeditCallback',fixture,'-o',legacy],{stdio:'pipe',timeout:240000});
execFileSync(compiler,[...common,fixture,'-o',fixed],{stdio:'pipe',timeout:240000});
const jdk=process.env.HXZ_TEST_JDK||'C:/Program Files/Java/jdk-21';
const libraries=process.env.HXZ_TEST_LWJGL_DIR||'D:/PCL/.minecraft/libraries/org/lwjgl';
const glfwJar=process.env.HXZ_TEST_LWJGL_GLFW_JAR||path.join(libraries,'lwjgl-glfw/3.4.1/lwjgl-glfw-3.4.1.jar');
const cp=[tmp,path.join(libraries,'lwjgl/3.4.1/lwjgl-3.4.1.jar'),path.join(libraries,'lwjgl/3.4.1/lwjgl-3.4.1-natives-windows.jar'),glfwJar].join(path.delimiter);
execFileSync(path.join(jdk,'bin/javac.exe'),['-cp',cp,'-d',tmp,path.resolve('mobile/runtime/test/GlfwImeInterop084.java')],{stdio:'pipe'});
for(const [library,extra] of [[legacy,['expect-missing']],[fixed,[]]]){
  const result=execFileSync(path.join(jdk,'bin/java.exe'),['-ea','-cp',cp,'GlfwImeInterop084',library,...extra],{encoding:'utf8',timeout:30000});
  console.log(result.trim());
}
console.log(JSON.stringify({passed:true,scope:'Actual LWJGL 3.4.1/JDK 21 JNI and production IME code; synthetic window/payloads and stubbed Android API; no device, renderer or Minecraft launch'}));

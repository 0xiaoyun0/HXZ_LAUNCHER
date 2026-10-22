import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-ng-render-')),include=path.join(tmp,'include');await fs.mkdir(path.join(include,'android'),{recursive:true});
const ndk=process.env.HXZ_ANDROID_NDK||'E:/hxz_up/hxzup/tools/android-ndk-r30',headers=path.join(ndk,'toolchains/llvm/prebuilt/windows-x86_64/sysroot/usr/include');
for(const dir of ['EGL','KHR'])await fs.cp(path.join(headers,dir),path.join(include,dir),{recursive:true});
await fs.writeFile(path.join(include,'android/native_window.h'),'#pragma once\nstruct ANativeWindow;\nextern "C" {void ANativeWindow_acquire(ANativeWindow*);void ANativeWindow_release(ANativeWindow*);}\n');
await fs.writeFile(path.join(include,'dlfcn.h'),'#pragma once\n#define RTLD_NOW 2\n#define RTLD_GLOBAL 256\nextern "C" {void* dlopen(const char*,int);void* dlsym(void*,const char*);int hxz_test_setenv(const char*,const char*,int);int hxz_test_unsetenv(const char*);}\n#define setenv hxz_test_setenv\n#define unsetenv hxz_test_unsetenv\n');
const zig=path.resolve('.runtime/review084/native-host-tools/ziglang/zig.exe');
for(const [name,sources] of [['indices',['mobile/runtime/test/ng-indices084.cpp']],['dispatch',['mobile/runtime/native/hxz_fcl_render.cpp','mobile/runtime/test/ng-render084.cpp']]]){
 const output=path.join(tmp,name+'.exe');execFileSync(zig,['c++','-std=c++17','-DEGL_NO_PLATFORM_SPECIFIC_TYPES','-I',include,...sources,'-o',output],{stdio:'pipe',timeout:90000});console.log(execFileSync(output,[],{encoding:'utf8',timeout:5000}).trim());
}

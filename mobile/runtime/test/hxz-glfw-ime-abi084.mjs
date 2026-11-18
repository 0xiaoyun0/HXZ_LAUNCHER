// Check the actual LWJGL 3.4.1 function table, not only GLFW's stock 3.4 header.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {minecraftGlfwSymbols} from './hxz-glfw-minecraft-abi084.mjs';

const native=path.resolve('mobile/runtime/native');
const ndk=process.env.HXZ_ANDROID_NDK||'E:/hxz_up/hxzup/tools/android-ndk-r30';
const bin=path.join(ndk,'toolchains/llvm/prebuilt/windows-x86_64/bin');
const sysroot=path.join(ndk,'toolchains/llvm/prebuilt/windows-x86_64/sysroot');
const jdk=process.env.HXZ_TEST_JDK||'C:/Program Files/Java/jdk-21';
const jar=process.env.HXZ_TEST_LWJGL_GLFW_JAR||'D:/PCL/.minecraft/libraries/org/lwjgl/lwjgl-glfw/3.4.1/lwjgl-glfw-3.4.1.jar';
const output=process.env.HXZ_TEST_GLFW_LIBRARY||path.join(await fs.mkdtemp(path.join(os.tmpdir(),'hxz-glfw-ime-abi-')),'libhxz_glfw_ime.so');
const referenceHeader=process.env.HXZ_TEST_GLFW_IME_REFERENCE_HEADER;
if(referenceHeader)execFileSync(path.join(bin,'clang++.exe'),[
  '--target=aarch64-linux-android29','--sysroot='+sysroot,'-std=c++17','-Wall','-Wextra','-Werror',
  '-fsyntax-only','-DGLFW_INCLUDE_NONE=','-DGLFW_INCLUDE_VULKAN=','-include',referenceHeader,path.join(native,'hxz_glfw.cpp'),
],{stdio:'pipe'});
if(!process.env.HXZ_TEST_GLFW_LIBRARY)execFileSync(path.join(bin,'clang++.exe'),[
  '--target=aarch64-linux-android29','--sysroot='+sysroot,'-std=c++17','-Wall','-Wextra','-Werror',
  '-shared','-fPIC','-Wl,--no-undefined','-o',output,path.join(native,'hxz_glfw.cpp'),'-landroid','-ldl',
],{stdio:'pipe'});
const table=execFileSync(path.join(jdk,'bin/javap.exe'),['-classpath',jar,'-c','-p','org.lwjgl.glfw.GLFW$Functions'],{encoding:'utf8'});
const required=[...table.matchAll(/\/\/ String (glfw\w+)/g)].map(match=>match[1]);
assert(required.length>=120,'Actual LWJGL GLFW function table was not parsed');
assert(required.includes('glfwSetPreeditCallback'));
const symbols=execFileSync(path.join(bin,'llvm-nm.exe'),['-D','--defined-only',output],{encoding:'utf8'});
const exported=new Set([...symbols.matchAll(/\b(glfw\w+)$/gm)].map(match=>match[1]));
const missing=[...new Set([...required,...minecraftGlfwSymbols])].filter(name=>!exported.has(name));
console.log(JSON.stringify({jar,required:required.length,minecraftSymbols:minecraftGlfwSymbols.length,missing,referenceHeader:referenceHeader||null,output}));
assert.deepEqual(missing,[],`LWJGL functions resolve to NULL: ${missing.join(', ')}`);
console.log('PASS: all actual LWJGL GLFW function pointers resolve; this checks exports, not device execution.');

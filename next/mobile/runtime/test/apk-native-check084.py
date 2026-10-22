"""Read-only APK check for the Android 0.8.4 native process boundary.

Usage: python apk-native-check084.py path/to/app.apk [path/to/llvm-readelf]
This cannot prove the mode assigned by a particular device installer. The app
also checks File.canExecute() before launching the extracted native executable.
"""
import os
import re
import struct
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path


def fail(message):
    raise SystemExit(message)


apk = Path(sys.argv[1]) if len(sys.argv) > 1 else None
if apk is None or not apk.is_file():
    fail("Usage: apk-native-check084.py <built.apk> [llvm-readelf]")
ndk = Path(os.environ.get("HXZ_ANDROID_NDK", "E:/hxz_up/hxzup/tools/android-ndk-r30"))
readelf = Path(sys.argv[2]) if len(sys.argv) > 2 else ndk / "toolchains/llvm/prebuilt/windows-x86_64/bin/llvm-readelf.exe"
if not readelf.is_file():
    fail("llvm-readelf missing: " + str(readelf))

build_file = Path("mobile/android/app/build.gradle").read_text(encoding="utf-8")
if not re.search(r"useLegacyPackaging\s+true", build_file):
    fail("APK native libraries must be extracted into nativeLibraryDir")

required = {"libhxz_runtime.so", "libhxz_jvm_exec.so", "libc++_shared.so"}
if "hxz_fcl_render.cpp" in Path("mobile/runtime/native/CMakeLists.txt").read_text(encoding="utf-8"):
    required.add("libng_gl4es.so")
system = {"libandroid.so", "liblog.so", "libdl.so", "libEGL.so", "libGLESv3.so", "libc.so", "libm.so", "libz.so"}
prefix = "lib/arm64-v8a/"
results = {}
with zipfile.ZipFile(apk) as archive, tempfile.TemporaryDirectory(prefix="hxz-apk-native-") as temp:
    present = {name[len(prefix):] for name in archive.namelist() if name.startswith(prefix) and name.endswith(".so")}
    if missing := required - present:
        fail("APK lacks required arm64 native files: " + ", ".join(sorted(missing)))
    for name in sorted(required):
        info = archive.getinfo(prefix + name)
        if info.compress_type != zipfile.ZIP_DEFLATED:
            fail(name + " is not compressed; nativeLibraryDir extraction is not assured")
        data = archive.read(info)
        if data[:4] != b"\x7fELF" or data[4] != 2 or data[5] != 1 or struct.unpack_from("<H", data, 18)[0] != 183:
            fail(name + " is not little-endian AArch64 ELF64")
        target = Path(temp) / name
        target.write_bytes(data)
        headers = subprocess.check_output([str(readelf), "-l", str(target)], text=True)
        dynamic = subprocess.check_output([str(readelf), "-d", str(target)], text=True)
        needed = set(re.findall(r"Shared library: \[([^]]+)\]", dynamic))
        missing = needed - present - system
        if missing:
            fail(name + " has unresolved packaged/system DT_NEEDED: " + ", ".join(sorted(missing)))
        if name == "libhxz_jvm_exec.so":
            if "INTERP" not in headers or "libhxz_runtime.so" not in needed:
                fail("Game executor is not a dynamic executable sharing libhxz_runtime.so")
        # Check every PT_LOAD p_align directly; readelf's presentation varies.
        phoff = struct.unpack_from("<Q", data, 32)[0]
        entsize, count = struct.unpack_from("<HH", data, 54)
        if entsize < 56 or count == 0 or phoff + entsize * count > len(data):
            fail(name + " has invalid ELF program headers")
        loads = []
        for i in range(count):
            offset = phoff + entsize * i
            if struct.unpack_from("<I", data, offset)[0] == 1:
                file_offset, virtual, align = struct.unpack_from("<QQ", data, offset + 8)[0], struct.unpack_from("<Q", data, offset + 16)[0], struct.unpack_from("<Q", data, offset + 48)[0]
                loads.append(align)
                minimum_alignment = 4096 if name == "libng_gl4es.so" else 16384
                if align < minimum_alignment or file_offset % minimum_alignment != virtual % minimum_alignment:
                    fail(name + " PT_LOAD alignment does not meet the documented component requirement")
        if not loads:
            fail(name + " has no PT_LOAD")
        results[name] = {"needed": sorted(needed), "minLoadAlignment": min(loads), "zipMode": oct(info.external_attr >> 16)}

print({"upstreamNgRequires4KiBDevicePages": "libng_gl4es.so" in results, "passed": True, "apk": str(apk), "libraries": results,
       "installedExecutePermission": "Android extraction normally sets 0755; device File.canExecute gate remains required"})

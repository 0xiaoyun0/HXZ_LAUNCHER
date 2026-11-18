"""Repack upstream MIT adapter with the 16-KiB-aligned Android native, never a desktop library.
Usage: python repack-sable.py upstream-adapter.jar SableRapierPlugin_2.0.3_bc33fe1.apk output.jar
Input release hashes are pinned to make the distributed asset reproducible.
"""
import hashlib
import sys
import zipfile
from pathlib import Path

adapter, plugin, output = map(Path, sys.argv[1:])
assert hashlib.sha1(adapter.read_bytes()).hexdigest() == "3232097d2b181cfb722d7914c366ecc204cb0774", "Unexpected adapter"
with zipfile.ZipFile(plugin) as archive:
    native = archive.read("lib/arm64-v8a/libsable_rapier.so")
assert hashlib.sha256(native).hexdigest() == "ea8f0795266e30ca3cf3ce36c8ce19ac0370aaccccdb4c217e9172962c62b12c", "Unexpected native"
license_path = Path(__file__).parent / "assets/hxz/LICENSE-Sable-Rapier-Android.txt"
notice = """HXZ Android compatibility repack, 2026-10-12.
Java adapter: sa1672ndo/sable-android-patch tag 2.0.3, MIT. Classes unchanged.
Replaced natives/sable-rapier/sable_rapier_aarch64_android.so with the ARM64
native from ZalithLauncher/NativeLibPlugin release sable_rapier-0.1.0_NDK_BUILD,
asset SableRapierPlugin_2.0.3_bc33fe1.apk. ELF LOAD alignment: 0x4000 (16 KiB).
Native source: https://github.com/MovTery/sable_rapier_android (Apache-2.0).
Applied only to the exact Sable 2.0.3 build specified in AndroidNativeFix.java.
This is an adapter for the existing gameplay mod; it does not remove Sable.
"""
native_path = "natives/sable-rapier/sable_rapier_aarch64_android.so"
with zipfile.ZipFile(adapter) as source, zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as target:
    assert native_path in source.namelist()
    for name in sorted(source.namelist()):
        entry = zipfile.ZipInfo(name, date_time=(2026, 10, 12, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        target.writestr(entry, native if name == native_path else source.read(name))
    for name, data in [("META-INF/LICENSE-HXZ-RAPIER-ANDROID.txt", license_path.read_bytes()), ("META-INF/HXZ-CHANGES.txt", notice.encode())]:
        entry=zipfile.ZipInfo(name,date_time=(2026,10,12,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;target.writestr(entry,data)
print(hashlib.sha1(output.read_bytes()).hexdigest())

# FCL rendering integration · Android 80412

This Android build includes source derived from **Fold Craft Launcher**,
https://github.com/FCL-Team/FoldCraftLauncher, commit
`a36e1e42292d6a67c93be0dafbfdceff01823e71`.

Imported files: `FCL/src/main/jni/ctxbridges/gl_bridge.c`, `gl_bridge.h`,
`egl_loader.c`, `egl_loader.h`. Upstream identifies the bridge author as
**maks** (2022). Preserve the upstream authors' rights and GPL version 3 terms
in `COPYING`. The combined HXZ Android application is distributed under GPLv3;
the repository's Apache-2.0 notices for original HXZ code remain applicable.
Corresponding source, Gradle/CMake build configuration, and HXZ adaptations are
included in this repository (`next/mobile/` in published source tags).

HXZ modifications, 2026-10-22:

- Adapt the EGL bridge to HXZ's GLFW ABI and private `:jvm` service.
- Transfer Android Surface over Binder and submit frames using EGL; retain
  same-UID IPC for input only, with no shared frame allocation in direct mode.
- Serialize Surface changes and rendering; hold and release native references;
  use a fallback pbuffer while Android destroys/recreates the window.
- Remove the fixed 750 ms Surface delay and private namespace escape.
- Add cleanup, allocation/error guards, render-resolution geometry, framebuffer
  dimension callback, and GPU identification in the game diagnostic log.
- Use NG's supported GL 3.3 target for current Minecraft requirements; the
  backing GLES context remains the renderer's ES3 profile. This is translation,
  not an assertion that the phone has native desktop OpenGL.

`libng_gl4es.so` is copied **without modification** from ARM64 inside
`FCL/libs/NG-GL4ES-release.aar` at that same FCL commit. Artifact Git blob and
binary SHA256 are recorded in `provenance.json`. **Krypton Wrapper / NG-GL4ES**
is MIT licensed; see `NG-GL4ES-LICENSE`, upstream source
https://github.com/FCL-Team/NG-GL4ES and https://github.com/BZLZHH/NG-GL4ES.
Its upstream components include gl4es (Sebastien Chevalier, Ryan Hileman),
gl4es-114-extra, glslang, SPIRV-Cross, cJSON and code from MobileGlues. Their
licenses are retained here and in `NG-THIRD-PARTY-LICENSES.md`.

This binary and the existing Java runtime require 4 KiB device pages. The
existing runtime page-size guard is retained; this release does not claim
support for a 16 KiB-only device JVM. The APK's own HXZ bridge is built with
16 KiB segment alignment.

### HXZ 80417 index compatibility adapter

`libng_gl4es.so` remains unmodified. HXZ's `hxz_fcl_render.cpp` now also acts as
LWJGL's GLX function provider and promotes EBO-backed triangle base-vertex
indices to 32 bits before adding the base. This addresses the uint16 overflow
pattern in NG's GLES 3.0 emulation (`src/gl/drawing.c`,
`internal_glDrawElementsBaseVertex_gles30`). Non-triangle, invalid-range and
unsupported calls retain NG's implementation. The adapter reuses a bounded
scratch buffer, restores the original EBO binding, and does not read pixels
back from the GPU. A logged first-use marker identifies whether this path is
actually exercised on a device. The supplied regression harness simulates GL
buffers; it is not device rendering validation.

### HXZ 80420 texture-unit boundary adapter

The original NG binary is still unmodified. Its `config.h` and `state.h`
allocate 16 texture slots. `samplers.c:gl4es_glBindSampler` incorrectly accepts
`unit == hardext.maxtex`, which makes `realize_textures` access slot 16 and
dereference a null pointer. HXZ's GLX provider caps advertised combined/image
texture units to the supported slot limit. Invalid sampler units are passed
to NG as an unequivocally invalid unit, preserving its error path without
mutating texture state. Valid sampler IDs and bindings are unchanged.

The boundary regression reproduces the original off-by-one and passes after
the adapter. A Xiaomi Pad 8 Pro Android 16 reproduced native PC `0x317340` in
the original library; the adapter lets the same pack finish resource loading.

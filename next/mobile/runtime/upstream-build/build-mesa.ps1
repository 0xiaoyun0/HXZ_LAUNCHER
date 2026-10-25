param(
  [string]$Python = 'C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$cache = Join-Path $repo '.runtime/hxz-runtime-upstream'
# Sources are Mesa 25.3.4 + the separately pinned official Mesa24.3.4 OSMesa frontend.
# See the lock and research notes; this script must not download moving heads.
$env:PYTHONPATH = Join-Path $cache 'python-tools'
$env:PATH = (Join-Path $cache 'tools/winflexbison') + ';' +
  (Join-Path $repo '.runtime/android-sdk/cmake/3.22.1/bin') + ';' + (Split-Path $Python) + ';' + $env:PATH
$build = Join-Path $cache 'build/mesa-arm64'
$source = Join-Path $cache 'sources/mesa-25.3.4'
& $Python (Join-Path $PSScriptRoot 'prepare-mesa.py')
if ($LASTEXITCODE) { throw 'Mesa source verification/preparation failed' }
& $Python -m mesonbuild.mesonmain setup $build $source `
  --cross-file (Join-Path $PSScriptRoot 'mesa-android-arm64.ini') --buildtype release `
  '-Dplatforms=android' '-Dgallium-drivers=zink,softpipe' '-Dvulkan-drivers=[]' `
  '-Dosmesa=true' '-Degl=disabled' '-Dglx=disabled' '-Dgbm=disabled' `
  '-Dgles1=disabled' '-Dgles2=disabled' '-Dllvm=disabled' '-Dshared-llvm=disabled' `
  '-Dvalgrind=disabled' '-Dzstd=disabled' '-Dexpat=disabled' '-Dvideo-codecs=[]' `
  '-Dbuild-tests=false' '-Dglvnd=disabled' '-Dandroid-libbacktrace=disabled' `
  '-Dandroid-stub=true' '-Dandroid-strict=false'
if ($LASTEXITCODE) { throw 'Mesa configure failed; preserve meson-log.txt for diagnostics' }
& (Join-Path $repo '.runtime/android-sdk/cmake/3.22.1/bin/ninja.exe') -C $build -j 2
if ($LASTEXITCODE) { throw 'Mesa build failed' }

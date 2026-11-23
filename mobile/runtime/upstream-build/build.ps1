param(
  [string]$Ndk = 'E:/hxz_up/hxzup/tools/android-ndk-r30',
  [string]$Cmake = 'E:/hxz_next/.runtime/android-sdk/cmake/3.22.1/bin/cmake.exe',
  [string]$Python = 'C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$cache = Join-Path $repo '.runtime/hxz-runtime-upstream'
$ninja = Join-Path (Split-Path $Cmake) 'ninja.exe'
& $Python (Join-Path $PSScriptRoot 'prepare-sources.py')
if ($LASTEXITCODE) { throw 'Source hash verification/extraction failed' }
foreach ($version in @('3.3.3', '3.4.1')) {
  $build = Join-Path $cache "build/lwjgl-$version-arm64"
  & $Cmake -S $PSScriptRoot -B $build -G Ninja "-DCMAKE_MAKE_PROGRAM=$ninja" `
    "-DCMAKE_TOOLCHAIN_FILE=$Ndk/build/cmake/android.toolchain.cmake" `
    '-DANDROID_ABI=arm64-v8a' '-DANDROID_PLATFORM=android-24' `
    '-DCMAKE_BUILD_TYPE=Release' "-DLWJGL_VERSION=$version"
  if ($LASTEXITCODE) { throw "LWJGL $version configure failed" }
  & $Cmake --build $build --parallel 2
  if ($LASTEXITCODE) { throw "LWJGL $version build failed" }
}
$source = Join-Path $cache 'sources/openal-soft-1.24.3'
$build = Join-Path $cache 'build/openal-soft-arm64'
& $Cmake -S $source -B $build -G Ninja "-DCMAKE_MAKE_PROGRAM=$ninja" `
  "-DCMAKE_TOOLCHAIN_FILE=$Ndk/build/cmake/android.toolchain.cmake" `
  '-DANDROID_ABI=arm64-v8a' '-DANDROID_PLATFORM=android-24' '-DCMAKE_BUILD_TYPE=Release' `
  '-DALSOFT_UTILS=OFF' '-DALSOFT_EXAMPLES=OFF' '-DALSOFT_TESTS=OFF' `
  '-DALSOFT_INSTALL=OFF' '-DALSOFT_BACKEND_OPENSL=ON' '-DALSOFT_REQUIRE_OPENSL=ON' `
  '-DALSOFT_EMBED_HRTF_DATA=OFF' '-DANDROID_STL=c++_static' '-DCMAKE_CXX_FLAGS=-include stdlib.h'
if ($LASTEXITCODE) { throw 'OpenAL configure failed' }
& $Cmake --build $build --parallel 2
if ($LASTEXITCODE) { throw 'OpenAL build failed' }

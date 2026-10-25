param([string]$Ndk='E:/hxz_up/hxzup/tools/android-ndk-r30')
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$cache=Join-Path $repo '.runtime/hxz-runtime-upstream'
$archive=Join-Path $cache 'downloads/freetype-VER-2-13-3.tar.gz'
if ((Get-FileHash $archive -Algorithm SHA256).Hash.ToLower() -ne 'bc5c898e4756d373e0d991bab053036c5eb2aa7c0d5c67e8662ddc6da40c4103') {throw 'FreeType source hash mismatch'}
$source=Join-Path $cache 'sources/freetype-2.13.3'
if (!(Test-Path $source)) {throw 'Extract archive root freetype-VER-2-13-3 into sources/freetype-2.13.3 first'}
$cmake=Join-Path $repo '.runtime/android-sdk/cmake/3.22.1/bin/cmake.exe'
$build=Join-Path $cache 'build/freetype-arm64'
& $cmake -S $source -B $build -G Ninja "-DCMAKE_MAKE_PROGRAM=$repo/.runtime/android-sdk/cmake/3.22.1/bin/ninja.exe" "-DCMAKE_TOOLCHAIN_FILE=$Ndk/build/cmake/android.toolchain.cmake" '-DANDROID_ABI=arm64-v8a' '-DANDROID_PLATFORM=android-24' '-DCMAKE_BUILD_TYPE=Release' '-DBUILD_SHARED_LIBS=ON' '-DFT_DISABLE_ZLIB=ON' '-DFT_DISABLE_BZIP2=ON' '-DFT_DISABLE_PNG=ON' '-DFT_DISABLE_HARFBUZZ=ON' '-DFT_DISABLE_BROTLI=ON' '-DCMAKE_SHARED_LINKER_FLAGS=-Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384'
if($LASTEXITCODE){throw 'FreeType configure failed'}
& $cmake --build $build --parallel 2
if($LASTEXITCODE){throw 'FreeType build failed'}

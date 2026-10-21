$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$output = Join-Path $root '.runtime/review084/touch-input/classes'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$java = 'C:/Program Files/Java/jdk-21/bin'
$source = Join-Path $root 'mobile/android/app/src/main/java/top/hxzmc/community/game'
& (Join-Path $java 'javac.exe') -encoding UTF-8 --release 17 -cp (Join-Path $root '.runtime/android-sdk/platforms/android-35/android.jar') -d $output (Join-Path $source 'GameTouchLayout.java') (Join-Path $source 'GameTextInput.java') (Join-Path $source 'GamePointerGesture.java') (Join-Path $source 'GameKeyMap.java') (Join-Path $source 'GameMouseState.java') (Join-Path $root 'mobile/runtime/test/GameTouchInputTest.java') (Join-Path $root 'mobile/runtime/test/GamePointerGestureTest.java') (Join-Path $root 'mobile/runtime/test/GamePhysicalInputTest.java')
if ($LASTEXITCODE -ne 0) { throw 'Touch/input test compilation failed' }
& (Join-Path $java 'java.exe') -cp $output top.hxzmc.community.game.GameTouchInputTest
if ($LASTEXITCODE -ne 0) { throw 'Touch/input regression failed' }
& (Join-Path $java 'java.exe') -cp $output top.hxzmc.community.game.GamePointerGestureTest
if ($LASTEXITCODE -ne 0) { throw 'Pointer gesture regression failed' }
& (Join-Path $java 'java.exe') -cp $output top.hxzmc.community.game.GamePhysicalInputTest
if ($LASTEXITCODE -ne 0) { throw 'Physical input regression failed' }

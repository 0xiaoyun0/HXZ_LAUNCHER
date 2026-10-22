param([string[]]$InstalledPacks = @(), [string]$ReviewedModernUiJar = '')
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$reviewRoot = Join-Path $repoRoot '.runtime/review084/client-mod-compat'
$classes = Join-Path $reviewRoot 'classes'
$jsonJar = Join-Path $repoRoot '.runtime/review084/lobby/json.jar'
$toolJar = Join-Path $repoRoot 'resources/hxzup/updater-launcher.jar'
if (-not (Test-Path -LiteralPath $jsonJar)) { throw 'A real org.json JVM library is required.' }
if (-not (Test-Path -LiteralPath $toolJar)) { throw 'The real project HXZUP launcher is required.' }
New-Item -ItemType Directory -Force -Path $classes | Out-Null
$sources = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'mobile/runtime/src/main/java/top/hxzmc/runtime') -Filter '*.java' | Select-Object -ExpandProperty FullName)
$fixtures = Join-Path $repoRoot 'mobile/runtime/test/ClientModCompatibilityTest.java'
$dryRun = Join-Path $repoRoot 'mobile/runtime/test/ClientModCompatibilityDryRun.java'
$modernUi = Join-Path $repoRoot 'mobile/runtime/test/ModernUiCompatibilityTest.java'
$auth = Join-Path $repoRoot 'mobile/runtime/test/AuthlibLaunchArgumentsTest.java'
$advice = Join-Path $repoRoot 'mobile/runtime/test/GameFailureAdviceTest.java'
& javac -encoding UTF-8 --release 8 -cp $jsonJar -d $classes @sources $fixtures $dryRun $modernUi $auth $advice
if ($LASTEXITCODE -ne 0) { throw 'Client compatibility JVM compilation failed.' }
$classpath = $classes + [IO.Path]::PathSeparator + $jsonJar
& java -cp $classpath top.hxzmc.runtime.ClientModCompatibilityTest $reviewRoot $toolJar
if ($LASTEXITCODE -ne 0) { throw 'Client compatibility fixtures failed.' }
& java -cp $classpath AuthlibLaunchArgumentsTest
if ($LASTEXITCODE -ne 0) { throw 'Authlib launch protocol checks failed.' }
& java -cp $classpath GameFailureAdviceTest
if ($LASTEXITCODE -ne 0) { throw 'Game failure advice checks failed.' }
if ($ReviewedModernUiJar) {
    & java -cp $classpath top.hxzmc.runtime.ModernUiCompatibilityTest (Resolve-Path -LiteralPath $ReviewedModernUiJar).Path $reviewRoot
    if ($LASTEXITCODE -ne 0) { throw 'Reviewed ModernUI artifact recovery checks failed.' }
}
if ($InstalledPacks.Length -gt 0) {
    $absolutePacks = @($InstalledPacks | ForEach-Object { (Resolve-Path -LiteralPath $_).Path })
    & java -cp $classpath top.hxzmc.runtime.ClientModCompatibilityDryRun (Join-Path $reviewRoot 'installed-packs.json') @absolutePacks
    if ($LASTEXITCODE -ne 0) { throw 'Installed pack read-only audit failed.' }
}
$androidJar = Join-Path $repoRoot '.runtime/android-sdk/platforms/android-35/android.jar'
if (-not (Test-Path -LiteralPath $androidJar)) { throw 'Android API 35 compile check requires its real android.jar.' }
$androidClasses = Join-Path $reviewRoot 'android-api-classes'
New-Item -ItemType Directory -Force -Path $androidClasses | Out-Null
& javac -encoding UTF-8 -source 17 -target 17 -cp $androidJar -d $androidClasses @sources
if ($LASTEXITCODE -ne 0) { throw 'Client compatibility Android API 35 compilation failed.' }
Write-Output ('Compatibility results: ' + (Join-Path $reviewRoot 'results.json'))

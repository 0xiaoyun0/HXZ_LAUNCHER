param(
    [string]$FixtureDirectory = '',
    [string]$NeoForgeInstaller = ''
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$reviewRoot = Join-Path $repoRoot '.runtime/review084/runtime'
$jsonJar = Join-Path $repoRoot '.runtime/review084/lobby/json.jar'
$outputDirectory = Join-Path $reviewRoot 'test'
$classDirectory = Join-Path $reviewRoot 'classes'
if (-not (Test-Path -LiteralPath $jsonJar)) { throw 'The JVM test org.json jar is missing; do not substitute Android stub methods at runtime.' }
New-Item -ItemType Directory -Force -Path $classDirectory, $outputDirectory | Out-Null
$sources = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'mobile/runtime/src/main/java/top/hxzmc/runtime') -Filter '*.java' | Select-Object -ExpandProperty FullName)
$testSource = Join-Path $repoRoot 'mobile/runtime/test/RuntimeCoreTest.java'
& javac -encoding UTF-8 --release 8 -cp $jsonJar -d $classDirectory @sources $testSource
if ($LASTEXITCODE -ne 0) { throw 'Runtime core JVM compilation failed.' }
if (-not $FixtureDirectory -and (Test-Path -LiteralPath (Join-Path $reviewRoot 'mojang-26.2.json'))) { $FixtureDirectory = $reviewRoot }
$fixtureArgument = if ($FixtureDirectory) { (Resolve-Path -LiteralPath $FixtureDirectory).Path } else { '-' }
$neoArgument = if ($NeoForgeInstaller) { (Resolve-Path -LiteralPath $NeoForgeInstaller).Path } else { '-' }
$toolJar = Join-Path $repoRoot 'resources/hxzup/updater-launcher.jar'
& java -cp ($classDirectory + [IO.Path]::PathSeparator + $jsonJar) top.hxzmc.runtime.RuntimeCoreTest $outputDirectory $fixtureArgument $neoArgument $toolJar
if ($LASTEXITCODE -ne 0) { throw 'Runtime core checks failed.' }
$androidJar = Join-Path $repoRoot '.runtime/android-sdk/platforms/android-35/android.jar'
if (Test-Path -LiteralPath $androidJar) {
    $androidClasses = Join-Path $reviewRoot 'android-api-classes'
    New-Item -ItemType Directory -Force -Path $androidClasses | Out-Null
    & javac -encoding UTF-8 -source 17 -target 17 -cp $androidJar -d $androidClasses @sources
    if ($LASTEXITCODE -ne 0) { throw 'Runtime core compilation against Android API 35 failed.' }
}
Write-Output ('Runtime protocol results: ' + (Join-Path $outputDirectory 'results.json'))

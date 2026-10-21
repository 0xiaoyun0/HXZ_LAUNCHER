param([switch]$LegacyRepro)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$jsonJar = Join-Path $repoRoot '.runtime/review084/lobby/json.jar'
$classDirectory = Join-Path $repoRoot '.runtime/review084/renderer-selection/classes'
if (-not (Test-Path -LiteralPath $jsonJar)) { throw 'The JVM test org.json jar is missing.' }
New-Item -ItemType Directory -Force -Path $classDirectory | Out-Null
$sources = @(Join-Path $repoRoot 'mobile/runtime/test/RendererSelectionTest.java')
$helper = Join-Path $repoRoot 'mobile/runtime/src/main/java/top/hxzmc/runtime/RendererSelection.java'
if (Test-Path -LiteralPath $helper) { $sources += $helper }
& javac -encoding UTF-8 --release 8 -Xlint:-options -cp $jsonJar -d $classDirectory @sources
if ($LASTEXITCODE -ne 0) { throw 'Renderer selection test compilation failed.' }
$arguments = @()
if ($LegacyRepro) { $arguments += '--legacy-repro' }
& java -cp ($classDirectory + [IO.Path]::PathSeparator + $jsonJar) top.hxzmc.runtime.RendererSelectionTest @arguments
if ($LASTEXITCODE -ne 0) { throw 'Renderer selection checks failed.' }
$androidJar = Join-Path $repoRoot '.runtime/android-sdk/platforms/android-35/android.jar'
if (Test-Path -LiteralPath $androidJar) {
    $androidClasses = Join-Path $repoRoot '.runtime/review084/renderer-selection/android-api-classes'
    New-Item -ItemType Directory -Force -Path $androidClasses | Out-Null
    & javac -encoding UTF-8 -source 17 -target 17 -Xlint:-options -cp $androidJar -d $androidClasses $helper
    if ($LASTEXITCODE -ne 0) { throw 'Renderer selection compilation against Android API 35 failed.' }
}

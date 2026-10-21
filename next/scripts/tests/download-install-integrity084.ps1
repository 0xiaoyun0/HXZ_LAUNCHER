$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$jsonJar = Join-Path $repoRoot '.runtime/review084/lobby/json.jar'
$classDirectory = Join-Path $repoRoot '.runtime/fcl-audit084/install-integrity-classes'
if (-not (Test-Path -LiteralPath $jsonJar)) { throw 'The JVM org.json fixture is missing.' }
New-Item -ItemType Directory -Force -Path $classDirectory | Out-Null
$sources = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'mobile/runtime/src/main/java/top/hxzmc/runtime') -Filter '*.java' | Select-Object -ExpandProperty FullName)
& javac -encoding UTF-8 --release 8 -cp $jsonJar -d $classDirectory @sources (Join-Path $repoRoot 'mobile/runtime/test/DownloadInstallIntegrityTest.java')
if ($LASTEXITCODE -ne 0) { throw 'Download/install regression compilation failed.' }
& java -cp ($classDirectory + [IO.Path]::PathSeparator + $jsonJar) top.hxzmc.runtime.DownloadInstallIntegrityTest (Join-Path $repoRoot '.runtime/fcl-audit084')
if ($LASTEXITCODE -ne 0) { throw 'Download/install integrity regression failed.' }

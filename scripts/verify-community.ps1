param([string]$Base='http://127.0.0.1:8787', [version]$MinimumVersion)
$ErrorActionPreference='Stop'
$Base=$Base.TrimEnd('/')
if (-not $MinimumVersion) {
    $manifest=Join-Path $PSScriptRoot 'package.json'
    if (-not (Test-Path -LiteralPath $manifest)) {
        $manifest=Join-Path $PSScriptRoot '../apps/community-server/package.json'
    }
    $MinimumVersion=[version](Get-Content -Raw -Encoding UTF8 -LiteralPath $manifest | ConvertFrom-Json).version
}
$health=Invoke-RestMethod -Uri "$Base/health" -TimeoutSec 15
Write-Host "Community version: $($health.version)"
if($health.service -ne 'hxz-community' -or [version]$health.version -lt $MinimumVersion){
    throw "Expected Fantasy Town community $MinimumVersion or newer. Check the service startup path and reverse proxy target."
}
$online=Invoke-RestMethod -Uri "$Base/api/server-online?refresh=1" -TimeoutSec 25
$online.items | Select-Object id,name,available,online,max,source,error | Format-Table -AutoSize
foreach($asset in @('/admin/','/admin/operations092.mjs','/api/plugins')){
    $response=Invoke-WebRequest -UseBasicParsing -Uri ($Base+$asset) -TimeoutSec 15
    if($response.StatusCode -ne 200){throw "Endpoint failed: $asset"}
    Write-Host "OK $asset"
}
Write-Host 'Public checks passed. Login to /admin/ to check the program directory, bridge heartbeats, HXZRE and error reports.'

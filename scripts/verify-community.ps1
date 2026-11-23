param([string]$Base='http://127.0.0.1:8787')
$ErrorActionPreference='Stop'
$Base=$Base.TrimEnd('/')
$health=Invoke-RestMethod -Uri "$Base/health" -TimeoutSec 15
Write-Host "Community version: $($health.version)"
if($health.version -ne '0.9.2'){throw 'This address is not running 0.9.2. Check the Windows service/task startup path and reverse proxy target.'}
$online=Invoke-RestMethod -Uri "$Base/api/server-online?refresh=1" -TimeoutSec 25
$online.items | Select-Object id,name,available,online,max,source,error | Format-Table -AutoSize
foreach($asset in @('/admin/','/admin/operations092.mjs','/api/plugins')){
    $response=Invoke-WebRequest -UseBasicParsing -Uri ($Base+$asset) -TimeoutSec 15
    if($response.StatusCode -ne 200){throw "Endpoint failed: $asset"}
    Write-Host "OK $asset"
}
Write-Host 'Public checks passed. Login to /admin/ to check the program directory, bridge heartbeats, HXZRE and error reports.'

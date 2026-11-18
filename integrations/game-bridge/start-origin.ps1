param([ValidateRange(1,65535)][int]$Port=40000,[string]$Target='127.0.0.1:19999')
$ErrorActionPreference='Stop'
if($Target -notmatch '^(\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.-]+):([0-9]{1,5})$'){throw 'Target must be host:port.'}
if([int]$Matches[2] -lt 1 -or [int]$Matches[2] -gt 65535){throw 'Invalid target port.'}
$binary=Join-Path $PSScriptRoot 'bin\mc-tcp-fec.exe'
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'module.json') -Raw | ConvertFrom-Json
if((Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.sha256){throw 'HXZRE checksum mismatch.'}
$directory=Join-Path $PSScriptRoot "data-$Port"
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$tokenFile=Join-Path $directory 'origin.token'
if(!(Test-Path -LiteralPath $tokenFile)){
    $bytes=New-Object byte[] 32
    $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
    try{$rng.GetBytes($bytes)}finally{$rng.Dispose()}
    $token=([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()
    [IO.File]::WriteAllText($tokenFile,$token,(New-Object Text.UTF8Encoding($false)))
}
Write-Host "Origin UDP $Port -> MC $Target"
Write-Host "Token file for the corresponding community server preset: $tokenFile"
Write-Host 'Allow this UDP port in Windows Firewall and your external firewall/NAT. Keep this process running.'
$previousToken=$env:MC_FEC_TOKEN
try{
    $env:MC_FEC_TOKEN=[IO.File]::ReadAllText($tokenFile).Trim()
    & $binary origin --listen "0.0.0.0:$Port" --target $Target --token-file $tokenFile
    if($LASTEXITCODE -ne 0){throw "Origin exited: $LASTEXITCODE"}
}finally{$env:MC_FEC_TOKEN=$previousToken}

$ErrorActionPreference='Stop'
$releaseRoot=Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'release\0.9.2\game-server'
$kit=(Get-ChildItem -LiteralPath $releaseRoot -Directory | Where-Object {Test-Path -LiteralPath (Join-Path $_.FullName 'install-windows.ps1')}).FullName
$base=Join-Path ([IO.Path]::GetTempPath()) ('hxz-mc-install092-'+[Guid]::NewGuid().ToString('N'))
function Read-Host { param([string]$Prompt,[switch]$AsSecureString) if($AsSecureString){return ConvertTo-SecureString ('a'*64) -AsPlainText -Force}; return 'STOPPED' }
try {
    foreach($id in @('survival','mod-1','mod-2')) {
        $root=Join-Path $base $id
        $kind=if($id -eq 'survival'){'plugins'}else{'mods'}
        $extension=if($id -eq 'survival'){'mcdr'}else{'jar'}
        New-Item -ItemType Directory -Path (Join-Path $root $kind),(Join-Path $root 'server\world') -Force | Out-Null
        [IO.File]::WriteAllText((Join-Path $root "$kind\hxz-community-bridge-0.8.0.$extension"),'OLD')
        [IO.File]::WriteAllText((Join-Path $root 'server\world\level.dat'),'UNCHANGED')
        & (Join-Path $kit 'install-windows.ps1') -ServerId $id -ServerRoot $root
        if([IO.File]::ReadAllText((Join-Path $root 'server\world\level.dat')) -ne 'UNCHANGED'){throw 'World was modified'}
        if(@(Get-ChildItem -LiteralPath (Join-Path $root $kind) -File).Count -ne 1){throw 'Duplicate bridge remains'}
        if(!(Test-Path -LiteralPath (Join-Path $root 'hxz-bridge-backups'))){throw 'Backup missing'}
        $config=if($id -eq 'survival'){Join-Path $root 'config\hxz_community_bridge\config.json'}else{Join-Path $root 'config\hxz-community-bridge.properties'}
        if(!(Test-Path -LiteralPath $config)){throw 'Config missing'}
        if($id -eq 'survival'){$v=Get-Content -LiteralPath $config -Raw | ConvertFrom-Json;if($v.server -ne $id -or $v.token.Length -ne 64){throw 'Invalid MCDR config'}}
        else{if(!([IO.File]::ReadAllText($config).Contains("server=$id"))){throw 'Invalid NeoForge config'}}
        Write-Host "PASS $id installation, configuration, old bridge backup and world preservation"
    }
} finally {
    $resolved=[IO.Path]::GetFullPath($base)
    $expected=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\hxz-mc-install092-'
    if(!$resolved.StartsWith($expected,[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe test cleanup target'}
    if(Test-Path -LiteralPath $resolved){Remove-Item -LiteralPath $resolved -Recurse -Force}
}

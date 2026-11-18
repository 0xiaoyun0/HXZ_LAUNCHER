param(
    [Parameter(Mandatory=$true)][ValidateSet('survival','mod-1','mod-2')][string]$ServerId,
    [Parameter(Mandatory=$true)][string]$ServerRoot,
    [string]$Community='https://qqbot.hxzmc.top',
    [string]$MinecraftDirectory='server',
    [string]$World='world',
    [switch]$EnableChat,
    [switch]$EnableWhitelist
)
$ErrorActionPreference='Stop'
$release='0.9.2'
$root=(Resolve-Path -LiteralPath $ServerRoot).ProviderPath.TrimEnd('\')
if ($root.Length -lt 4 -or !(Test-Path -LiteralPath $root -PathType Container)) { throw 'Choose the existing server directory, not a drive root.' }
$uri=[Uri]$Community
if ($uri.Scheme -ne 'https' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment) { throw 'Community must be an HTTPS URL without credentials.' }
function Inside([string]$Relative) {
    $resolved=[IO.Path]::GetFullPath((Join-Path $root $Relative))
    if (!$resolved.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Path must remain inside the selected server directory.' }
    return $resolved
}
$kind=if($ServerId -eq 'survival'){'mcdr'}else{'neoforge'}
$folder=Inside $(if($kind -eq 'mcdr'){'plugins'}else{'mods'})
$extension=if($kind -eq 'mcdr'){'mcdr'}else{'jar'}
$name=if($kind -eq 'mcdr'){"hxz-community-bridge-$release-mcdr.mcdr"}else{"hxz-community-bridge-$release-neoforge-1.21.1.jar"}
$source=Join-Path $PSScriptRoot "components\$name"
if(!(Test-Path -LiteralPath $source -PathType Leaf)){throw "Missing package component: $name"}
$config=Inside $(if($kind -eq 'mcdr'){'config\hxz_community_bridge\config.json'}else{'config\hxz-community-bridge.properties'})
if($kind -eq 'mcdr') {
    $mc=Inside $MinecraftDirectory
    $worldRoot=Inside (Join-Path $MinecraftDirectory $World)
    if(!(Test-Path -LiteralPath $mc -PathType Container) -or !(Test-Path -LiteralPath $worldRoot -PathType Container)){throw 'MinecraftDirectory and World must point to the existing server world.'}
}
Write-Host "Install $release for $ServerId into $root"
Write-Host 'Stop this game server before continuing. Existing bridge files and config will be backed up.'
if((Read-Host 'Type STOPPED after stopping the server') -cne 'STOPPED'){throw 'Installation cancelled.'}
$secret=Read-Host 'Paste the separate 64-character bridge token from the community admin panel' -AsSecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try{$token=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
if($token -notmatch '^[a-fA-F0-9]{64}$'){throw 'Invalid bridge token.'}
$backup=Inside ('hxz-bridge-backups\'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backup,$folder,([IO.Path]::GetDirectoryName($config)) -Force | Out-Null
foreach($old in Get-ChildItem -LiteralPath $folder -File -Filter "hxz-community-bridge-*.$extension") {
    $checked=Inside ($old.FullName.Substring($root.Length+1))
    Move-Item -LiteralPath $checked -Destination (Join-Path $backup $old.Name)
}
if(Test-Path -LiteralPath $config){Copy-Item -LiteralPath $config -Destination (Join-Path $backup ([IO.Path]::GetFileName($config)))}
Copy-Item -LiteralPath $source -Destination (Join-Path $folder $name)
$utf8=New-Object Text.UTF8Encoding($false)
if($kind -eq 'mcdr'){
    $value=@{enabled=$true;community=$Community.TrimEnd('/');server=$ServerId;token=$token;server_directory=$MinecraftDirectory;world=$World;game_version='26.2';chat=$EnableChat.IsPresent;whitelist=$EnableWhitelist.IsPresent;interval=5} | ConvertTo-Json
}else{
    $value="enabled=true`ncommunity=$($Community.TrimEnd('/'))`nserver=$ServerId`ntoken=$token`nchat=$($EnableChat.IsPresent.ToString().ToLowerInvariant())`nwhitelist=$($EnableWhitelist.IsPresent.ToString().ToLowerInvariant())`n"
}
[IO.File]::WriteAllText($config,$value,$utf8)
$token=$null;$value=$null
Write-Host "Installed. Backup: $backup"
Write-Host 'Start this server, then check admin -> runtime diagnostics and game server access. Each server needs its own token.'

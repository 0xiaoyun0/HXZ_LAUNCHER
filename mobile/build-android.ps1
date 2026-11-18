param(
    [string]$Gradle = 'gradle',
    [string]$GradleUserHome = '',
    [string]$SigningMetadata = ''
)
$ErrorActionPreference = 'Stop'
$mobileRoot = $PSScriptRoot
Push-Location (Join-Path $mobileRoot 'web')
try {
    & npm.cmd ci --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw '安装界面依赖失败' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw '编译界面失败' }
} finally { Pop-Location }
$task = ':app:assembleDebug'
try {
    if ($SigningMetadata) {
        $signing = Get-Content -LiteralPath $SigningMetadata -Raw | ConvertFrom-Json
        $env:HXZ_ANDROID_KEYSTORE = $signing.keystore
        $env:HXZ_ANDROID_STORE_PASSWORD = $signing.password
        $task = ':app:assembleRelease'
    }
    Push-Location (Join-Path $mobileRoot 'android')
    try {
        $arguments = @($task, '--console=plain')
        if ($GradleUserHome) { $arguments += @('--gradle-user-home', $GradleUserHome) }
        & $Gradle @arguments
        if ($LASTEXITCODE -ne 0) { throw '构建 Android APK 失败' }
    } finally { Pop-Location }
} finally {
    Remove-Item Env:HXZ_ANDROID_KEYSTORE -ErrorAction SilentlyContinue
    Remove-Item Env:HXZ_ANDROID_STORE_PASSWORD -ErrorAction SilentlyContinue
}

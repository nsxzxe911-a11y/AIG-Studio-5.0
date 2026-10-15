# RECOVERED_FAST_LOOP_CANDIDATE
# Reconstructed from verified AIG workflow behavior. This is NOT claimed to be the original byte-for-byte local script.
# Fixed scope only: AIGII / AIGCNC, ANDROID / DESKTOP / BOTH. No arbitrary command passthrough.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('AIGII','AIGCNC','BOTH')]
    [string]$Project,

    [Parameter(Mandatory=$true)]
    [ValidateSet('ANDROID','DESKTOP','BOTH')]
    [string]$Platform
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$NoxAdb = 'E:\Program Files\Nox\bin\nox_adb.exe'
$NoxConsole = 'E:\Program Files\Nox\bin\NoxConsole.exe'
$NoxInstance = 'Nox_1'
$NoxTarget = '127.0.0.1:62026'
$InstallModeMarker = 'install -r'
$LaunchModeMarker = 'shell am start'
$DesktopTaskMarker = ':desktop:run'

$ProjectTable = @{
    AIGII = @{
        Roots = @(
            'E:\AIG\AIG\AIG-II-429-win',
            'E:\AIG\AIG\AIG-II'
        )
        Package = 'com.aigii.app'
        Activity = '.MainActivity'
    }
    AIGCNC = @{
        Roots = @(
            'E:\AIG\AIG\AIG-Studio-5.0',
            'E:\AIG\AIG\AIG-CNC'
        )
        Package = 'com.aigstudio.app'
        Activity = '.StartupActivity'
    }
}

function Resolve-ProjectRoot([string]$Id) {
    foreach($candidate in $ProjectTable[$Id].Roots) {
        if(Test-Path -LiteralPath $candidate -PathType Container) { return $candidate }
    }
    throw "FAST_LOOP_PROJECT_ROOT_MISSING:$Id"
}

function Resolve-Gradle([string]$Root) {
    $local = Join-Path $Root 'gradlew.bat'
    if(Test-Path -LiteralPath $local -PathType Leaf) { return $local }
    $known = 'E:\AIG\AIG\AIG-II\gradlew.bat'
    if(Test-Path -LiteralPath $known -PathType Leaf) { return $known }
    throw "FAST_LOOP_GRADLE_MISSING:$Root"
}

function Ensure-NoxOnline {
    if(-not (Test-Path -LiteralPath $NoxAdb -PathType Leaf)) {
        throw 'FAST_LOOP_NOX_ADB_MISSING'
    }

    & $NoxAdb connect $NoxTarget | Out-Host
    $state = (& $NoxAdb -s $NoxTarget get-state 2>$null | Out-String).Trim()
    if($state -eq 'device') { return }

    if(-not (Test-Path -LiteralPath $NoxConsole -PathType Leaf)) {
        throw 'FAST_LOOP_NOX_CONSOLE_MISSING'
    }

    & $NoxConsole launch "-name:$NoxInstance" | Out-Host
    for($i=0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        & $NoxAdb connect $NoxTarget | Out-Null
        $state = (& $NoxAdb -s $NoxTarget get-state 2>$null | Out-String).Trim()
        if($state -eq 'device') { return }
    }
    throw 'FAST_LOOP_NOX_OFFLINE_AFTER_START'
}

function Resolve-DebugApk([string]$Root) {
    $preferred = Join-Path $Root 'app\build\outputs\apk\debug\app-debug.apk'
    if(Test-Path -LiteralPath $preferred -PathType Leaf) { return $preferred }

    $apk = Get-ChildItem -LiteralPath (Join-Path $Root 'app\build\outputs\apk') -Filter '*.apk' -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '\\debug\\' -and $_.Name -notmatch 'androidTest' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if($null -eq $apk) { throw "FAST_LOOP_APK_MISSING:$Root" }
    return $apk.FullName
}

function Invoke-Android([string]$Id) {
    $root = Resolve-ProjectRoot $Id
    $gradle = Resolve-Gradle $root
    $package = $ProjectTable[$Id].Package
    $activity = $ProjectTable[$Id].Activity

    Write-Host "FAST_LOOP|PROJECT=$Id|PLATFORM=ANDROID|ROOT=$root"
    & $gradle -p $root :app:assembleDebug --no-daemon
    if($LASTEXITCODE -ne 0) { throw "FAST_LOOP_ANDROID_BUILD_FAIL:$Id" }

    $apk = Resolve-DebugApk $root
    Ensure-NoxOnline

    & $NoxAdb -s $NoxTarget install -r $apk | Out-Host
    if($LASTEXITCODE -ne 0) { throw "FAST_LOOP_ANDROID_INSTALL_FAIL:$Id" }

    & $NoxAdb -s $NoxTarget shell am force-stop $package | Out-Null
    & $NoxAdb -s $NoxTarget shell am start -n "$package/$activity" | Out-Host
    if($LASTEXITCODE -ne 0) { throw "FAST_LOOP_ANDROID_LAUNCH_FAIL:$Id" }

    Start-Sleep -Seconds 2
    $evidence = Join-Path $root 'release\fast-loop-evidence'
    New-Item -ItemType Directory -Path $evidence -Force | Out-Null

    $remoteShot = "/sdcard/aig-fast-$($Id.ToLowerInvariant()).png"
    $localShot = Join-Path $evidence "$Id-nox.png"
    $logFile = Join-Path $evidence "$Id-logcat.txt"
    $pkgFile = Join-Path $evidence "$Id-package.txt"

    & $NoxAdb -s $NoxTarget logcat -d | Out-File -FilePath $logFile -Encoding utf8
    & $NoxAdb -s $NoxTarget shell screencap -p $remoteShot | Out-Null
    & $NoxAdb -s $NoxTarget pull $remoteShot $localShot | Out-Host
    & $NoxAdb -s $NoxTarget shell dumpsys package $package | Select-String 'versionCode=|versionName=' |
        Out-File -FilePath $pkgFile -Encoding utf8

    Write-Host "FAST_LOOP_ANDROID_PASS|PROJECT=$Id|TARGET=$NoxTarget|APK=$apk|SCREENSHOT=$localShot"
}

function Invoke-Desktop([string]$Id) {
    $root = Resolve-ProjectRoot $Id
    $gradle = Resolve-Gradle $root
    Write-Host "FAST_LOOP|PROJECT=$Id|PLATFORM=DESKTOP|ROOT=$root"
    $args = @('-p', $root, ':desktop:run', '--no-daemon')
    Start-Process -FilePath $gradle -ArgumentList $args -WorkingDirectory $root | Out-Null
    Write-Host "FAST_LOOP_DESKTOP_STARTED|PROJECT=$Id|TASK=$DesktopTaskMarker"
}

$projects = if($Project -eq 'BOTH') { @('AIGII','AIGCNC') } else { @($Project) }
foreach($id in $projects) {
    if($Platform -eq 'ANDROID' -or $Platform -eq 'BOTH') { Invoke-Android $id }
    if($Platform -eq 'DESKTOP' -or $Platform -eq 'BOTH') { Invoke-Desktop $id }
}

Write-Host "AIG_FAST_LOOP_RECOVERED_CANDIDATE_PASS|PROJECT=$Project|PLATFORM=$Platform|NOX=$NoxInstance|TARGET=$NoxTarget"

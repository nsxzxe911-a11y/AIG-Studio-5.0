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
$AtomicProtocolMarker = 'install-create --multi-package | install-add-session | install-commit'

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
        throw 'FAST_LOOP_NOX_ADB_MISSING|CURRENT_STABLE_RETAINED'
    }

    & $NoxAdb connect $NoxTarget | Out-Host
    $state = (& $NoxAdb -s $NoxTarget get-state 2>$null | Out-String).Trim()
    if($state -eq 'device') { return }

    if(-not (Test-Path -LiteralPath $NoxConsole -PathType Leaf)) {
        throw 'FAST_LOOP_NOX_CONSOLE_MISSING|CURRENT_STABLE_RETAINED'
    }

    & $NoxConsole launch "-name:$NoxInstance" | Out-Host
    for($i=0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        & $NoxAdb connect $NoxTarget | Out-Null
        $state = (& $NoxAdb -s $NoxTarget get-state 2>$null | Out-String).Trim()
        if($state -eq 'device') { return }
    }
    throw 'FAST_LOOP_NOX_OFFLINE_AFTER_START|CURRENT_STABLE_RETAINED'
}

function Resolve-DebugApk([string]$Root) {
    $preferred = Join-Path $Root 'app\build\outputs\apk\debug\app-debug.apk'
    if(Test-Path -LiteralPath $preferred -PathType Leaf) { return $preferred }

    $apkRoot = Join-Path $Root 'app\build\outputs\apk'
    if(-not (Test-Path -LiteralPath $apkRoot -PathType Container)) {
        throw "FAST_LOOP_APK_ROOT_MISSING:$Root"
    }
    $apk = Get-ChildItem -LiteralPath $apkRoot -Filter '*.apk' -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '\\debug\\' -and $_.Name -notmatch 'androidTest' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if($null -eq $apk) { throw "FAST_LOOP_APK_MISSING:$Root" }
    return $apk.FullName
}

function Prepare-AndroidCandidate([string]$Id) {
    $root = Resolve-ProjectRoot $Id
    $gradle = Resolve-Gradle $root
    Write-Host "FAST_LOOP_STAGE|PROJECT=$Id|ROOT=$root"

    & $gradle -p $root :app:assembleDebug --no-daemon
    if($LASTEXITCODE -ne 0) {
        throw "FAST_LOOP_ANDROID_BUILD_FAIL:$Id|CURRENT_STABLE_RETAINED"
    }

    $apk = Resolve-DebugApk $root
    $head = (& git -C $root rev-parse HEAD 2>$null | Out-String).Trim()
    if(-not $head) { throw "FAST_LOOP_GIT_HEAD_MISSING:$Id|CURRENT_STABLE_RETAINED" }
    $sha = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToUpperInvariant()

    return [pscustomobject]@{
        Id = $Id
        Root = $root
        Apk = $apk
        Sha256 = $sha
        Head = $head
        Package = $ProjectTable[$Id].Package
        Activity = $ProjectTable[$Id].Activity
    }
}

function Test-AndroidCandidate($Candidate) {
    if($null -eq $Candidate) { throw 'FAST_LOOP_CANDIDATE_NULL|CURRENT_STABLE_RETAINED' }
    if(-not (Test-Path -LiteralPath $Candidate.Apk -PathType Leaf)) {
        throw "FAST_LOOP_CANDIDATE_APK_MISSING:$($Candidate.Id)|CURRENT_STABLE_RETAINED"
    }
    $file = Get-Item -LiteralPath $Candidate.Apk
    if($file.Length -le 0) {
        throw "FAST_LOOP_CANDIDATE_APK_EMPTY:$($Candidate.Id)|CURRENT_STABLE_RETAINED"
    }
    if($Candidate.Sha256 -notmatch '^[0-9A-F]{64}$') {
        throw "FAST_LOOP_CANDIDATE_SHA_INVALID:$($Candidate.Id)|CURRENT_STABLE_RETAINED"
    }
    $fresh = (Get-FileHash -LiteralPath $Candidate.Apk -Algorithm SHA256).Hash.ToUpperInvariant()
    if($fresh -ne $Candidate.Sha256) {
        throw "FAST_LOOP_CANDIDATE_SHA_CHANGED:$($Candidate.Id)|CURRENT_STABLE_RETAINED"
    }
    return $true
}

function Capture-AndroidEvidence($Candidate) {
    $package = $Candidate.Package
    $activity = $Candidate.Activity
    $root = $Candidate.Root

    & $NoxAdb -s $NoxTarget shell am force-stop $package | Out-Null
    & $NoxAdb -s $NoxTarget shell am start -n "$package/$activity" | Out-Host

    Start-Sleep -Seconds 2
    $evidence = Join-Path $root 'release\fast-loop-evidence'
    New-Item -ItemType Directory -Path $evidence -Force | Out-Null
    $remoteShot = "/sdcard/aig-fast-$($Candidate.Id.ToLowerInvariant()).png"
    $localShot = Join-Path $evidence "$($Candidate.Id)-nox.png"
    $logFile = Join-Path $evidence "$($Candidate.Id)-logcat.txt"
    $pkgFile = Join-Path $evidence "$($Candidate.Id)-package.txt"

    & $NoxAdb -s $NoxTarget logcat -d | Out-File -FilePath $logFile -Encoding utf8
    & $NoxAdb -s $NoxTarget shell screencap -p $remoteShot | Out-Null
    & $NoxAdb -s $NoxTarget pull $remoteShot $localShot | Out-Host
    & $NoxAdb -s $NoxTarget shell dumpsys package $package | Select-String 'versionCode=|versionName=' |
        Out-File -FilePath $pkgFile -Encoding utf8

    Write-Host "FAST_LOOP_ANDROID_EVIDENCE|PROJECT=$($Candidate.Id)|HEAD=$($Candidate.Head)|SHA256=$($Candidate.Sha256)|SCREENSHOT=$localShot"
}

function Invoke-AtomicDualAndroidInstall($AigIi, $AigCnc) {
    Test-AndroidCandidate $AigIi | Out-Null
    Test-AndroidCandidate $AigCnc | Out-Null
    Ensure-NoxOnline

    $packageHelp = (& $NoxAdb -s $NoxTarget shell cmd package help 2>&1 | Out-String)
    if($packageHelp -notmatch '--multi-package') {
        throw 'FAST_LOOP_ATOMIC_MULTI_PACKAGE_UNSUPPORTED|CURRENT_STABLE_RETAINED'
    }

    Write-Host "FAST_LOOP_DUAL_PREFLIGHT_PASS|AIGII=$($AigIi.Sha256)|AIGCNC=$($AigCnc.Sha256)|PROTOCOL=$AtomicProtocolMarker"

    # adb install-multi-package uses a parent multi-package session with child sessions and one final commit.
    # If the device/adb pair cannot perform that transaction, fail closed; never fall back to sequential installs.
    & $NoxAdb -s $NoxTarget install-multi-package -r $AigIi.Apk $AigCnc.Apk | Out-Host
    if($LASTEXITCODE -ne 0) {
        throw "FAST_LOOP_ATOMIC_MULTI_PACKAGE_UNSUPPORTED_OR_FAILED:$LASTEXITCODE|CURRENT_STABLE_RETAINED"
    }

    Write-Host "FAST_LOOP_DUAL_ATOMIC_INSTALL_PASS|AIGII_HEAD=$($AigIi.Head)|AIGCNC_HEAD=$($AigCnc.Head)|TARGET=$NoxTarget"
}

function Invoke-Android([string]$Id) {
    $candidate = Prepare-AndroidCandidate $Id
    Test-AndroidCandidate $candidate | Out-Null
    Ensure-NoxOnline

    # Single-project maintenance path only. Dual-project update never uses this sequential path.
    & $NoxAdb -s $NoxTarget install -r $candidate.Apk | Out-Host
    if($LASTEXITCODE -ne 0) {
        throw "FAST_LOOP_ANDROID_INSTALL_FAIL:$Id|CURRENT_STABLE_RETAINED"
    }
    Capture-AndroidEvidence $candidate
    Write-Host "FAST_LOOP_ANDROID_PASS|PROJECT=$Id|TARGET=$NoxTarget|APK=$($candidate.Apk)"
}

function Invoke-Desktop([string]$Id) {
    $root = Resolve-ProjectRoot $Id
    $gradle = Resolve-Gradle $root
    Write-Host "FAST_LOOP|PROJECT=$Id|PLATFORM=DESKTOP|ROOT=$root"
    $args = @('-p', $root, ':desktop:run', '--no-daemon')
    Start-Process -FilePath $gradle -ArgumentList $args -WorkingDirectory $root | Out-Null
    Write-Host "FAST_LOOP_DESKTOP_STARTED|PROJECT=$Id|TASK=$DesktopTaskMarker"
}

if($Project -eq 'BOTH' -and $Platform -eq 'ANDROID') {
    try {
        # Stage and verify BOTH projects before any installed package is touched.
        $aigIi = Prepare-AndroidCandidate 'AIGII'
        Test-AndroidCandidate $aigIi | Out-Null
        $aigCnc = Prepare-AndroidCandidate 'AIGCNC'
        Test-AndroidCandidate $aigCnc | Out-Null
        Invoke-AtomicDualAndroidInstall $aigIi $aigCnc

        # Evidence is post-commit telemetry, not a promotion input. Promotion happened atomically above.
        try { Capture-AndroidEvidence $aigIi } catch { Write-Warning "AIGII_POST_COMMIT_EVIDENCE:$($_.Exception.Message)" }
        try { Capture-AndroidEvidence $aigCnc } catch { Write-Warning "AIGCNC_POST_COMMIT_EVIDENCE:$($_.Exception.Message)" }
        Write-Host "AIG_STABLE_DUAL_UPDATE_PASS|PROJECT=BOTH|PLATFORM=ANDROID|PROMOTION=ATOMIC"
    }
    catch {
        Write-Host "AIG_STABLE_DUAL_UPDATE_BLOCKED|$($_.Exception.Message)|CURRENT_STABLE_RETAINED"
        throw
    }
    return
}

$projects = if($Project -eq 'BOTH') { @('AIGII','AIGCNC') } else { @($Project) }
foreach($id in $projects) {
    if($Platform -eq 'ANDROID' -or $Platform -eq 'BOTH') { Invoke-Android $id }
    if($Platform -eq 'DESKTOP' -or $Platform -eq 'BOTH') { Invoke-Desktop $id }
}

Write-Host "AIG_FAST_LOOP_RECOVERED_CANDIDATE_PASS|PROJECT=$Project|PLATFORM=$Platform|NOX=$NoxInstance|TARGET=$NoxTarget"

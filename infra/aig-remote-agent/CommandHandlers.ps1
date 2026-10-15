Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:NoxAdb = 'E:\Program Files\Nox\bin\nox_adb.exe'
$script:NoxExe = 'E:\Program Files\Nox\bin\Nox.exe'
$script:NoxTarget = '127.0.0.1:62026'
$script:AigRepo = 'E:\AIG\AIG\AIG-II-429-win'
$script:Expected462 = '6cd20f36'
$script:ResumeScript = Join-Path $env:ProgramData 'AIG-II\RemoteAgent\AIG-II-463-RESUME-READONLY.ps1'
$script:FastLoopLegacy = 'E:\AIG_WORK\tools\fast-loop\aig-fast.ps1'
$script:FastLoopRecovered = Join-Path $env:ProgramData 'AIG-II\RemoteAgent\aig-fast.ps1'

function Assert-Aig462Floor {
    if (-not (Test-Path $script:AigRepo)) { throw "AIG_REPO_MISSING" }
    Push-Location $script:AigRepo
    try {
        & git cat-file -e "$($script:Expected462)^{commit}" 2>$null
        if ($LASTEXITCODE -ne 0) { throw "AIG_462_COMMIT_MISSING" }
        & git merge-base --is-ancestor $script:Expected462 HEAD
        if ($LASTEXITCODE -ne 0) { throw "AIG_462_ANCESTRY_BLOCK" }
        return (& git rev-parse HEAD 2>$null | Out-String).Trim()
    }
    finally { Pop-Location }
}

function Invoke-NoxStatus {
    if (-not (Test-Path $script:NoxAdb)) { throw "NOX_ADB_MISSING" }
    $null = & $script:NoxAdb connect $script:NoxTarget 2>&1
    $state = (& $script:NoxAdb -s $script:NoxTarget get-state 2>&1 | Out-String).Trim()
    $model = (& $script:NoxAdb -s $script:NoxTarget shell getprop ro.product.model 2>&1 | Out-String).Trim()
    $display = (& $script:NoxAdb -s $script:NoxTarget shell wm size 2>&1 | Out-String).Trim()
    $version = (& $script:NoxAdb -s $script:NoxTarget shell dumpsys package com.aigii.app 2>&1 |
        Select-String -Pattern 'versionCode=|versionName=' | ForEach-Object { $_.Line.Trim() }) -join '; '
    return "TARGET=$($script:NoxTarget)|STATE=$state|MODEL=$model|DISPLAY=$display|$version"
}

function Invoke-NoxStart {
    if (-not (Test-Path $script:NoxAdb)) { throw "NOX_ADB_MISSING" }
    $probe = (& $script:NoxAdb -s $script:NoxTarget get-state 2>&1 | Out-String).Trim()
    if ($probe -ne 'device') {
        if (-not (Test-Path $script:NoxExe)) { throw "NOX_EXE_MISSING" }
        Start-Process -FilePath $script:NoxExe | Out-Null
        Start-Sleep -Seconds 8
        $null = & $script:NoxAdb connect $script:NoxTarget 2>&1
    }
    return Invoke-NoxStatus
}

function Invoke-Resume463 {
    $head = Assert-Aig462Floor
    if (-not (Test-Path $script:ResumeScript)) { throw "RESUME_SCRIPT_MISSING" }
    $resume = (& $script:ResumeScript 2>&1 | Out-String).Trim()
    return "AIG_463_RESUME|HEAD=$head|$resume"
}

function Invoke-WindowsAiUpdate {
    $head = Assert-Aig462Floor
    if (-not (Test-Path $script:ResumeScript)) { throw "WINDOWS_AI_UPDATE_ENTRY_MISSING" }
    $resume = (& $script:ResumeScript 2>&1 | Out-String).Trim()
    return "WINDOWS_AI_UPDATE_TRIGGERED|PATH=WEB_TO_WINDOWS|BASE=462|HEAD=$head|NEXT=463|$resume"
}

function Resolve-FastLoop {
    foreach ($candidate in @($script:FastLoopLegacy, $script:FastLoopRecovered)) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    throw "AIG_FAST_LOOP_MISSING|CURRENT_STABLE_RETAINED"
}

function Invoke-DualAndroidUpdate {
    # Fixed dual-project Android route only. No user parameters are accepted.
    $fastLoop = Resolve-FastLoop
    $result = (& $fastLoop -Project 'BOTH' -Platform 'ANDROID' 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "AIG_FAST_LOOP_DUAL_ANDROID_FAILED:$LASTEXITCODE|CURRENT_STABLE_RETAINED" }
    return "AIG_DUAL_AI_UPDATE_PASS|AIG_FAST_LOOP_DUAL_ANDROID|PROJECT=BOTH|PLATFORM=ANDROID|ENTRY=$fastLoop|$result"
}

function Invoke-AigRemoteCommand {
    param([Parameter(Mandatory = $true)][string]$Name)
    switch ($Name) {
        'AIG_DUAL_AI_UPDATE' { return Invoke-DualAndroidUpdate }
        'WINDOWS_AI_UPDATE' { return Invoke-WindowsAiUpdate }
        'DUAL_ANDROID_UPDATE' { return Invoke-DualAndroidUpdate }
        'RESUME_463' { return Invoke-Resume463 }
        'NOX_STATUS' { return Invoke-NoxStatus }
        'NOX_START' { return Invoke-NoxStart }
        default { throw "UNSUPPORTED_COMMAND:$Name" }
    }
}

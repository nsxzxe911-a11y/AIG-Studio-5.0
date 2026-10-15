Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:NoxAdb = 'E:\Program Files\Nox\bin\nox_adb.exe'
$script:NoxExe = 'E:\Program Files\Nox\bin\Nox.exe'
$script:NoxTarget = '127.0.0.1:62026'
$script:AigRepo = 'E:\AIG\AIG\AIG-II-429-win'
$script:Expected462 = '6cd20f36'
$script:ResumeScript = Join-Path $env:ProgramData 'AIG-II\RemoteAgent\AIG-II-463-RESUME-READONLY.ps1'

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
    if (-not (Test-Path $script:AigRepo)) { throw "AIG_REPO_MISSING" }
    Push-Location $script:AigRepo
    try {
        & git cat-file -e "$($script:Expected462)^{commit}" 2>$null
        if ($LASTEXITCODE -ne 0) { throw "AIG_462_COMMIT_MISSING" }
        & git merge-base --is-ancestor $script:Expected462 HEAD
        if ($LASTEXITCODE -ne 0) { throw "AIG_462_ANCESTRY_BLOCK" }
        if (-not (Test-Path $script:ResumeScript)) { throw "RESUME_SCRIPT_MISSING" }
        return (& $script:ResumeScript 2>&1 | Out-String).Trim()
    }
    finally { Pop-Location }
}

function Invoke-AigRemoteCommand {
    param([Parameter(Mandatory = $true)][string]$Name)
    switch ($Name) {
        'NOX_STATUS' { return Invoke-NoxStatus }
        'NOX_START' { return Invoke-NoxStart }
        'RESUME_463' { return Invoke-Resume463 }
        default { throw "UNSUPPORTED_COMMAND:$Name" }
    }
}

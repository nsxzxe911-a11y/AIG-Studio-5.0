Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'CommandHandlers.ps1')

$expected = @('WINDOWS_AI_UPDATE', 'DUAL_ANDROID_UPDATE', 'RESUME_463', 'NOX_STATUS', 'NOX_START')
foreach ($name in $expected) {
    if (-not ((Get-Content -Raw (Join-Path $PSScriptRoot 'CommandHandlers.ps1')).Contains("'$name'"))) {
        throw "MISSING_WHITELIST:$name"
    }
}

$handlerText = Get-Content -Raw (Join-Path $PSScriptRoot 'CommandHandlers.ps1')
if (-not $handlerText.Contains('Invoke-WindowsAiUpdate')) { throw 'WINDOWS_AI_UPDATE_HANDLER_MISSING' }
if (-not $handlerText.Contains('Invoke-DualAndroidUpdate')) { throw 'DUAL_ANDROID_UPDATE_HANDLER_MISSING' }
if ($handlerText.Contains('Invoke-Expression')) { throw 'ARBITRARY_SHELL_FORBIDDEN' }

$fastLoopPath = Join-Path $PSScriptRoot 'aig-fast.ps1'
if (-not (Test-Path -LiteralPath $fastLoopPath -PathType Leaf)) { throw 'FAST_LOOP_PACKAGE_MISSING' }
$tokens = $null
$parseErrors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile($fastLoopPath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) {
    $details = ($parseErrors | ForEach-Object { $_.Message }) -join ' | '
    throw "FAST_LOOP_PARSE_FAIL:$details"
}

try {
    Invoke-AigRemoteCommand -Name 'SHELL'
    throw 'UNKNOWN_COMMAND_WAS_NOT_REJECTED'
}
catch {
    if ($_.Exception.Message -notlike 'UNSUPPORTED_COMMAND:*') { throw }
}

'PASS AIG_REMOTE_AGENT_STATIC_CONTRACT'

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'CommandHandlers.ps1')

$expected = @('WINDOWS_AI_UPDATE', 'RESUME_463', 'NOX_STATUS', 'NOX_START')
foreach ($name in $expected) {
    if (-not ((Get-Content -Raw (Join-Path $PSScriptRoot 'CommandHandlers.ps1')).Contains("'$name'"))) {
        throw "MISSING_WHITELIST:$name"
    }
}

$handlerText = Get-Content -Raw (Join-Path $PSScriptRoot 'CommandHandlers.ps1')
if (-not $handlerText.Contains('Invoke-WindowsAiUpdate')) { throw 'WINDOWS_AI_UPDATE_HANDLER_MISSING' }
if ($handlerText.Contains('Invoke-Expression')) { throw 'ARBITRARY_SHELL_FORBIDDEN' }

try {
    Invoke-AigRemoteCommand -Name 'SHELL'
    throw 'UNKNOWN_COMMAND_WAS_NOT_REJECTED'
}
catch {
    if ($_.Exception.Message -notlike 'UNSUPPORTED_COMMAND:*') { throw }
}

'PASS AIG_REMOTE_AGENT_STATIC_CONTRACT'

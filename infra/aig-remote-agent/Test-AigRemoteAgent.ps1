Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'CommandHandlers.ps1')

$expected = @('NOX_STATUS', 'NOX_START', 'RESUME_463')
foreach ($name in $expected) {
    if (-not ((Get-Content -Raw (Join-Path $PSScriptRoot 'CommandHandlers.ps1')).Contains("'$name'"))) {
        throw "MISSING_WHITELIST:$name"
    }
}

try {
    Invoke-AigRemoteCommand -Name 'SHELL'
    throw 'UNKNOWN_COMMAND_WAS_NOT_REJECTED'
}
catch {
    if ($_.Exception.Message -notlike 'UNSUPPORTED_COMMAND:*') { throw }
}

'PASS AIG_REMOTE_AGENT_STATIC_CONTRACT'

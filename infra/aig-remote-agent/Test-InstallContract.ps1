Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$install = Get-Content -Raw (Join-Path $PSScriptRoot 'Install-AigRemoteAgent.ps1')
$uninstall = Get-Content -Raw (Join-Path $PSScriptRoot 'Uninstall-AigRemoteAgent.ps1')

foreach ($needle in @('AIG-II\RemoteAgent', 'AIG-II Remote Agent', 'New-ScheduledTaskTrigger -AtStartup', 'agent.config.json', '/inheritance:r', 'S-1-5-18', 'S-1-5-32-544')) {
    if (-not $install.Contains($needle)) { throw "INSTALL_CONTRACT_MISSING:$needle" }
}
if ($uninstall.Contains('E:\AIG') -or $uninstall.Contains('AIG-II-429-win')) {
    throw 'UNINSTALL_PROJECT_DATA_RISK'
}
'PASS AIG_REMOTE_AGENT_INSTALL_CONTRACT'

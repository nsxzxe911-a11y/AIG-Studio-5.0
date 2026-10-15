param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://')]
    [string]$BridgeUrl,

    [Parameter(Mandatory = $true)]
    [ValidateLength(32, 4096)]
    [string]$AgentToken
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'ADMIN_REQUIRED'
}

$target = Join-Path $env:ProgramData 'AIG-II\RemoteAgent'
$taskName = 'AIG-II Remote Agent'
$configPath = Join-Path $target 'agent.config.json'

New-Item -ItemType Directory -Path $target -Force | Out-Null

$required = @('AigRemoteAgent.ps1', 'CommandHandlers.ps1', 'aig-fast.ps1')
foreach ($name in $required) {
    $src = Join-Path $PSScriptRoot $name
    if (-not (Test-Path $src)) { throw "PACKAGE_FILE_MISSING:$name" }
    Copy-Item -LiteralPath $src -Destination (Join-Path $target $name) -Force
}

$resumeSrc = Join-Path $PSScriptRoot 'AIG-II-463-RESUME-READONLY.ps1'
if (Test-Path $resumeSrc) {
    Copy-Item -LiteralPath $resumeSrc -Destination (Join-Path $target 'AIG-II-463-RESUME-READONLY.ps1') -Force
}

$config = [ordered]@{
    bridge_url = $BridgeUrl.TrimEnd('/')
    agent_token = $AgentToken
}
$config | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $configPath -Encoding UTF8

& icacls $configPath /inheritance:r /grant:r '*S-1-5-18:(F)' '*S-1-5-32-544:(F)' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'CONFIG_ACL_FAILED' }

$agentPath = Join-Path $target 'AigRemoteAgent.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$agentPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principalTask = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principalTask -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

"AIG_REMOTE_AGENT_INSTALLED|PATH=$target|TASK=$taskName|FAST_LOOP=PACKAGED"

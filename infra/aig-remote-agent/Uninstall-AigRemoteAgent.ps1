Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$target = Join-Path $env:ProgramData 'AIG-II\RemoteAgent'
$taskName = 'AIG-II Remote Agent'

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($null -ne $task) {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

if (Test-Path $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
}

'AIG_REMOTE_AGENT_UNINSTALLED'

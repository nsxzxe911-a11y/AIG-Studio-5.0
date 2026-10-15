param(
    [string]$ConfigPath = "$env:ProgramData\AIG-II\RemoteAgent\agent.config.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'CommandHandlers.ps1')

if (-not (Test-Path $ConfigPath)) { throw "AGENT_CONFIG_MISSING" }
$config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
if (-not $config.bridge_url -or -not $config.agent_token) { throw "AGENT_CONFIG_INVALID" }

$baseUrl = ([string]$config.bridge_url).TrimEnd('/')
$agentId = $env:COMPUTERNAME
$headers = @{ Authorization = "Bearer $([string]$config.agent_token)" }
$backoff = 5
$lastHeartbeat = Get-Date '2000-01-01T00:00:00Z'

function Invoke-BridgePost {
    param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)]$Body)
    $json = $Body | ConvertTo-Json -Depth 6 -Compress
    return Invoke-RestMethod -Method Post -Uri ($baseUrl + $Path) -Headers $headers -ContentType 'application/json' -Body $json -TimeoutSec 20
}

while ($true) {
    try {
        if (((Get-Date) - $lastHeartbeat).TotalSeconds -ge 60) {
            $null = Invoke-BridgePost -Path '/api/agent/heartbeat' -Body @{ agent_id = $agentId }
            $lastHeartbeat = Get-Date
        }
        $poll = Invoke-BridgePost -Path '/api/agent/poll' -Body @{ agent_id = $agentId }
        if ($null -ne $poll.command) {
            $command = $poll.command
            try {
                $summary = Invoke-AigRemoteCommand -Name ([string]$command.name)
                $null = Invoke-BridgePost -Path '/api/agent/result' -Body @{ command_id = [string]$command.id; status = 'succeeded'; summary = [string]$summary }
            }
            catch {
                $null = Invoke-BridgePost -Path '/api/agent/result' -Body @{ command_id = [string]$command.id; status = 'failed'; summary = [string]$_.Exception.Message }
            }
        }
        $backoff = 5
        Start-Sleep -Seconds 5
    }
    catch {
        Start-Sleep -Seconds $backoff
        $backoff = [Math]::Min(60, ($backoff * 2))
    }
}

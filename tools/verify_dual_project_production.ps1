param([Parameter(Mandatory=$true)][string]$PeerRoot)
$ErrorActionPreference='Stop'
$localRoot=Split-Path -Parent $PSScriptRoot
$local=Join-Path $localRoot 'shared\dual-project-production-contract.json'
$peer=Join-Path $PeerRoot 'shared\dual-project-production-contract.json'
if(!(Test-Path $local)){throw "LOCAL_CONTRACT_MISSING: $local"}
if(!(Test-Path $peer)){throw "PEER_CONTRACT_MISSING: $peer"}
$localJson=Get-Content $local -Raw | ConvertFrom-Json
$peerJson=Get-Content $peer -Raw | ConvertFrom-Json
if($localJson.schema -ne 'aig-dual-project-production-contract-v1'){throw 'LOCAL_SCHEMA_INVALID'}
if($peerJson.schema -ne $localJson.schema){throw 'PEER_SCHEMA_MISMATCH'}
$requiredPages=@('HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC_GCODE','AI','SETTINGS','LINK_MANAGER','FILES_PROJECTS','SYSTEM_MONITOR')
foreach($page in $requiredPages){if($localJson.pages -notcontains $page){throw "LOCAL_PAGE_MISSING:$page"};if($peerJson.pages -notcontains $page){throw "PEER_PAGE_MISSING:$page"}}
if(-not $localJson.policy.dual_project_same_round -or -not $peerJson.policy.dual_project_same_round){throw 'DUAL_PROJECT_SAME_ROUND_DISABLED'}
if(-not $localJson.policy.mobile_desktop_separate_ui_art -or -not $peerJson.policy.mobile_desktop_separate_ui_art){throw 'PLATFORM_UI_ART_NOT_SEPARATED'}
if(-not $localJson.policy.programming_reads_rgb_baseline_before_code -or -not $peerJson.policy.programming_reads_rgb_baseline_before_code){throw 'RGB_BEFORE_CODE_POLICY_MISSING'}
$localHash=(Get-FileHash $local -Algorithm SHA256).Hash
$peerHash=(Get-FileHash $peer -Algorithm SHA256).Hash
if($localHash -ne $peerHash){throw "CONTRACT_SHA_MISMATCH local=$localHash peer=$peerHash"}
Write-Output "AIG_DUAL_PROJECT_PRODUCTION_CONTRACT_PASS|SHA256=$localHash|SAME_ROUND|MOBILE_DESKTOP_SEPARATE|RGB_BEFORE_CODE|PROGRAMMING_PLUS_3D_ART"
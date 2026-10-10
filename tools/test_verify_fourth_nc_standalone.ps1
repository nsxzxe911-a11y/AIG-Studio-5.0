$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$verifier=Join-Path $PSScriptRoot 'verify_fourth_nc_standalone.ps1'
if(-not(Test-Path -LiteralPath $verifier)){throw 'RED: NC standalone verifier missing'}
$out=& $verifier -EvidenceDir (Join-Path $root 'evidence\android-fourth-nc-397') 6>&1 | Out-String
if($out -notmatch 'FOURTH_NC_STANDALONE_PASS\|AIG_CNC\|SHA256=[0-9a-f]{64}') { throw "NC verifier did not emit exact PASS marker: $out" }
Write-Host 'NC_VERIFIER_TEST_PASS|AIG_CNC'
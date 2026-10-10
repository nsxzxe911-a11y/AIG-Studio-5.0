param([string]$EvidenceDir='')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
if([string]::IsNullOrWhiteSpace($EvidenceDir)){$EvidenceDir=Join-Path $root 'evidence\android-fourth-cam-396'}
function Need([string]$p){if(-not(Test-Path -LiteralPath $p)){throw "missing evidence: $p"};Get-Item -LiteralPath $p}
$manifestPath=Join-Path $EvidenceDir 'standalone-manifest.txt';Need $manifestPath|Out-Null
$m=@{};Get-Content -LiteralPath $manifestPath|ForEach-Object{if($_ -match '^([^=]+)=(.*)$'){$m[$matches[1]]=$matches[2]}}
foreach($k in @('RUNTIME_HEAD','APK_SHA256','ADB_SERIAL','MODEL','API','GLES','PACKAGE','VERSION_NAME','VERSION_CODE')){if(-not$m.ContainsKey($k)-or[string]::IsNullOrWhiteSpace($m[$k])){throw "manifest key missing: $k"}}
git -C $root cat-file -e ($m.RUNTIME_HEAD+'^{commit}') 2>$null;if($LASTEXITCODE-ne 0){throw 'runtime HEAD is not a repo commit'}
$apk=Need (Join-Path $root 'product-host-android\build\outputs\apk\debug\product-host-android-debug.apk')
$sha=(Get-FileHash -Algorithm SHA256 -LiteralPath $apk.FullName).Hash.ToLowerInvariant();if($sha-ne$m.APK_SHA256.ToLowerInvariant()){throw "APK SHA mismatch $sha != $($m.APK_SHA256)"}
$screens=@('home.png','cam.png','cam-manual.png','cam-avoidance.png','cam-candidate-preview.png','cam-local-warning.png','cam-recovered.png','offline-home.png','rotated-cam.png')
foreach($n in $screens){$x=Need(Join-Path $EvidenceDir $n);if($x.Length-lt 10000){throw "screenshot too small: $n"};if($x.LastWriteTimeUtc-lt$apk.LastWriteTimeUtc){throw "stale screenshot older than APK: $n"}}
$runtime=(Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'runtime-logcat.txt')).FullName)
$offline=(Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'offline-logcat.txt')).FullName)
$rotationLog=Need(Join-Path $EvidenceDir 'rotation-logcat.txt');if($rotationLog.Length-lt 1){throw 'rotation logcat is empty'}
foreach($mark in @('AIG4_GLES|FIRST_FRAME|PASS','AIG4_SCENE|HOME_TO_CAM|PASS','AIG4_CAM|COMMAND|MANUAL|ACCEPTED','AIG4_CAM|COMMAND|SAFE_Z|ACCEPTED','AIG4_CAM|COMMAND|EDIT|ACCEPTED','AIG4_CAM|COMMAND|CUT_EDIT|ACCEPTED','AIG4_CAM|COMMAND|AVOID|ACCEPTED','AIG4_CAM|COMMAND|FIXTURE|ACCEPTED','AIG4_CAM|COMMAND|TOOLPATH_LINK|ACCEPTED','AIG4_CAM|COMMAND|PREVIEW|ACCEPTED','AIG4_CAM|COMMAND|SAVE|ACCEPTED','AIG4_CAM|COMMAND|KEEP|ACCEPTED','AIG4_CAM|COMMAND|ADOPT|REJECTED|LOCAL_MESSAGE','AIG4_CAM|COMMAND|FEED|ACCEPTED','AIG4_CAM|COMMAND|ADOPT|ACCEPTED')){if(-not$runtime.Contains($mark)){throw "runtime marker missing: $mark"}}
if(([regex]::Matches($runtime,[regex]::Escape('AIG4_CAM|COMMAND|FREEZE|ACCEPTED'))).Count-lt 2){throw 'freeze/unfreeze evidence missing'}
$active=(Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'active-checkpoint.aig')).FullName)
if($active-notmatch 'LINK\|[^|]+\|DISCONNECTED'){throw 'manual Active disconnect evidence missing'}
if($active-notmatch 'AP\|[^\r\n]*\|10\.0\|20\.0\|30\.0\|G0\|'){throw 'non-zero XYZABC G0 evidence missing'}
if($active-notmatch 'AP\|[^\r\n]*\|10\.0\|20\.0\|30\.0\|G1\|'){throw 'non-zero XYZABC G1 evidence missing'}
if($active-notmatch 'AP\|[^\r\n]*\|1\|1(?:\r?\n|$)'){throw 'manual avoidance flags missing'}
if($active-notmatch 'ZONE\|'){throw 'fixture zone evidence missing'}
$cand=(Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'candidate-checkpoint.aig')).FullName)
if($cand-notmatch 'CANDIDATE\|' -or $cand-notmatch 'SAVED\|' -or $cand-notmatch 'PREVIEW\|(?!-)'){throw 'candidate preview/save evidence missing'}
$before=(Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'recovery-before-checkpoint.aig')).FullName)
$after=(Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'recovered-checkpoint.aig')).FullName)
$beforeActive=([regex]::Match($before,'(?m)^ACTIVE\|.*$')).Value;$afterActive=([regex]::Match($after,'(?m)^ACTIVE\|.*$')).Value
if([string]::IsNullOrWhiteSpace($beforeActive)-or$beforeActive-ne$afterActive){throw 'recovery Active header mismatch'}
if(-not$runtime.Contains('AIG4_CAM|RECOVERY|RESTORED')){throw 'online recovery marker missing'}
foreach($mark in @('AIG4_GLES|FIRST_FRAME|PASS','AIG4_CAM|RECOVERY|RESTORED')){if(-not$offline.Contains($mark)){throw "offline marker missing: $mark"}}
$net=(Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'offline-network.txt')).FullName);if($net-notmatch 'PING_CODE=(?!0(?:\r?\n|$))\d+'){throw 'offline ping-failure proof missing'}
$rs=@{};Get-Content -LiteralPath (Need(Join-Path $EvidenceDir 'rotation-state.txt')).FullName|ForEach-Object{if($_ -match '^([^=]+)=(.*)$'){$rs[$matches[1]]=$matches[2]}}
foreach($k in @('PID_BEFORE','PID_MIDDLE','PID_AFTER','ORIENTATION_BEFORE','ORIENTATION_MIDDLE','ORIENTATION_AFTER','ACTIVE_REV_BEFORE','ACTIVE_REV_AFTER','ACTIVE_DIGEST_BEFORE','ACTIVE_DIGEST_AFTER')){if(-not$rs.ContainsKey($k)){throw "rotation key missing: $k"}}
if($rs.ORIENTATION_BEFORE-eq$rs.ORIENTATION_MIDDLE){throw 'rotation did not change orientation'};if($rs.ORIENTATION_BEFORE-ne$rs.ORIENTATION_AFTER){throw 'rotation did not restore orientation'}
if($rs.ACTIVE_REV_BEFORE-ne$rs.ACTIVE_REV_AFTER -or $rs.ACTIVE_DIGEST_BEFORE-ne$rs.ACTIVE_DIGEST_AFTER){throw 'CAM Active changed across rotation'}
if($rs.PID_BEFORE-ne$rs.PID_MIDDLE -or $rs.PID_BEFORE-ne$rs.PID_AFTER){throw 'rotation recreated authoritative Activity unexpectedly'}
$source=(Get-ChildItem (Join-Path $root 'renderer-android\src\main'),(Join-Path $root 'product-host-android\src\main') -Recurse -File -Include *.kt,*.xml | ForEach-Object {Get-Content -Raw -LiteralPath $_.FullName}) -join "`n"
if($source-match 'Engineering Shell|AIG-CLEAN|NOUI|java\.awt|javax\.swing'){throw 'legacy marker found in fourth runtime source'}
Write-Host 'FOURTH_CAM_STANDALONE_PASS|AIG_CNC|SHA256=' $sha
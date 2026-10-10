param([string]$EvidenceDir='')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
if([string]::IsNullOrWhiteSpace($EvidenceDir)){$EvidenceDir=Join-Path $root 'evidence\android-fourth-nc-397'}
function Need([string]$p){if(-not(Test-Path -LiteralPath $p)){throw "missing evidence: $p"};Get-Item -LiteralPath $p}
function Decode-B64Url([string]$s){$x=$s.Replace('-','+').Replace('_','/');switch($x.Length%4){2{$x+='=='}3{$x+='='}};[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($x))}
$manifestPath=Join-Path $EvidenceDir 'standalone-manifest.txt';Need $manifestPath|Out-Null
$m=@{};Get-Content -LiteralPath $manifestPath|ForEach-Object{if($_ -match '^([^=]+)=(.*)$'){$m[$matches[1]]=$matches[2]}}
foreach($k in @('RUNTIME_HEAD','APK_SHA256','ADB_SERIAL','MODEL','API','GLES','PACKAGE','VERSION_NAME','VERSION_CODE')){if(-not$m.ContainsKey($k)-or[string]::IsNullOrWhiteSpace($m[$k])){throw "manifest key missing: $k"}}
if($m.PACKAGE-ne'com.aigstudio.production.fourth395'-or$m.VERSION_NAME-ne'397-fourth-nc'-or$m.VERSION_CODE-ne'397001'){throw 'manifest package/version mismatch'}
git -C $root cat-file -e ($m.RUNTIME_HEAD+'^{commit}') 2>$null;if($LASTEXITCODE-ne0){throw 'runtime HEAD is not a repo commit'}
$apk=Need(Join-Path $root 'product-host-android\build\outputs\apk\debug\product-host-android-debug.apk')
$sha=(Get-FileHash -Algorithm SHA256 -LiteralPath $apk.FullName).Hash.ToLowerInvariant();if($sha-ne$m.APK_SHA256.ToLowerInvariant()){throw "APK SHA mismatch $sha != $($m.APK_SHA256)"}
$screens=@('home.png','nc.png','nc-direct-xyzabc.png','nc-g999-warning.png','nc-g999-corrected.png','nc-candidate-preview.png','nc-candidate-keep.png','nc-freeze-adopt-reject.png','nc-candidate-adopted.png','nc-block-skip.png','nc-offline-recovery.png','nc-portrait.png','nc-rotation-back.png')
foreach($n in $screens){$x=Need(Join-Path $EvidenceDir $n);if($x.Length-lt10000){throw "screenshot too small: $n"};if($x.LastWriteTimeUtc-lt$apk.LastWriteTimeUtc){throw "stale screenshot older than APK: $n"}}
$logFiles=Get-ChildItem -LiteralPath $EvidenceDir -File | Where-Object{$_.Name -match 'logcat\.txt$'};if(@($logFiles).Count-lt4){throw 'insufficient logcat evidence'}
$logs=($logFiles|ForEach-Object{Get-Content -Raw -LiteralPath $_.FullName})-join"`n"
foreach($mark in @('AIG4_GLES|FIRST_FRAME|PASS','AIG4_SCENE|HOME_TO_NC|PASS','AIG4_NC|COMMAND|KEEP|ACCEPTED','AIG4_NC|COMMAND|SAVE|ACCEPTED','AIG4_NC|COMMAND|ADOPT|REJECTED|LOCAL_MESSAGE','AIG4_NC|COMMAND|ADOPT|ACCEPTED','AIG4_NC|COMMAND|BLOCK_SKIP|ACCEPTED','AIG4_NC|RECOVERY|RESTORED')){if(-not$logs.Contains($mark)){throw "runtime marker missing: $mark"}}
if(([regex]::Matches($logs,[regex]::Escape('AIG4_NC|COMMAND|FREEZE|ACCEPTED'))).Count-lt2){throw 'freeze/unfreeze evidence missing'}
if(-not$logs.Contains('AIG4_NC|COMMAND|KEY.T|ACCEPTED')){throw 'T-key evidence missing'}
$g999=Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'g999-correction-logcat.txt')).FullName
if(([regex]::Matches($g999,'AIG4_NC\|COMMAND\|KEY\.9\|ACCEPTED')).Count-lt3){throw 'G999 entry evidence missing'}
if(([regex]::Matches($g999,'AIG4_NC\|COMMAND\|BACKSPACE\|ACCEPTED')).Count-lt7){throw 'G999 correction backspace evidence missing'}
foreach($n in @('checkpoint-working-xyzabc.aig','checkpoint-candidate.aig','checkpoint-after-save.aig','checkpoint-after-offline-recovery.aig','checkpoint-after-rotation.aig')){Need(Join-Path $EvidenceDir $n)|Out-Null}
$working=Get-Content -LiteralPath (Join-Path $EvidenceDir 'checkpoint-working-xyzabc.aig')
$programLine=$working|Where-Object{$_ -like 'PROGRAM|*'}|Select-Object -First 1;if([string]::IsNullOrWhiteSpace($programLine)){throw 'working PROGRAM missing'}
$program=Decode-B64Url($programLine.Substring(8))
foreach($token in @('G90 G54','S2300 M3','G43 Z30. H1 M8','F150.','X1.','Y2.','Z-3.','A10.','B20.','C30.')){if(-not$program.Contains($token)){throw "working program token missing: $token"}}
if(-not($working|Where-Object{$_ -like 'MOTION|*'})){throw 'MotionProgram digest evidence missing'}
$save=Get-Content -Raw -LiteralPath (Join-Path $EvidenceDir 'checkpoint-after-save.aig');foreach($pat in @('(?m)^CAND\|','(?m)^SAVED\|','(?m)^PREVIEW\|(?!-)')){if($save-notmatch$pat){throw "candidate/save evidence missing: $pat"}}
$off=Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'offline-state.txt')).FullName;if($off-notmatch'(?m)^AIRPLANE=1\r?$'-or$off-notmatch'(?m)^WIFI=0\r?$'-or$off-notmatch'(?m)^PING_CODE=(?!0\r?$)\d+\r?$'){throw 'offline connectivity proof invalid'}
$offlineLog=Get-Content -Raw -LiteralPath (Need(Join-Path $EvidenceDir 'offline-logcat.txt')).FullName;foreach($mark in @('AIG4_GLES|FIRST_FRAME|PASS','AIG4_NC|RECOVERY|RESTORED')){if(-not$offlineLog.Contains($mark)){throw "offline marker missing: $mark"}}
$rotLog=Need(Join-Path $EvidenceDir 'rotation-logcat.txt');if($rotLog.Length-lt1){throw 'rotation logcat empty'}
$r=@{};Get-Content -LiteralPath (Need(Join-Path $EvidenceDir 'rotation-state.txt')).FullName|ForEach-Object{if($_ -match '^([^=]+)=(.*)$'){$r[$matches[1]]=$matches[2]}}
foreach($k in @('PID_BEFORE','PID_AFTER','ROTATION_BEFORE','ROTATION_MIDDLE','ROTATION_AFTER','WORK_REV_BEFORE','WORK_REV_AFTER','WORK_DIGEST_BEFORE','WORK_DIGEST_AFTER','CAND_BEFORE','CAND_AFTER')){if(-not$r.ContainsKey($k)){throw "rotation key missing: $k"}}
if($r.PID_BEFORE-ne$r.PID_AFTER){throw 'rotation restarted process'};if($r.ROTATION_BEFORE-eq$r.ROTATION_MIDDLE-or$r.ROTATION_BEFORE-ne$r.ROTATION_AFTER){throw 'rotation transition/restore invalid'}
if($r.WORK_REV_BEFORE-ne$r.WORK_REV_AFTER-or$r.WORK_DIGEST_BEFORE-ne$r.WORK_DIGEST_AFTER){throw 'Working Copy changed across rotation'};if($r.CAND_BEFORE-ne$r.CAND_AFTER){throw 'Candidate changed across rotation'}
$source=(Get-ChildItem (Join-Path $root 'renderer-android\src\main'),(Join-Path $root 'product-host-android\src\main') -Recurse -File -Include *.kt,*.xml|ForEach-Object{Get-Content -Raw -LiteralPath $_.FullName})-join"`n"
if($source-match'Engineering Shell|AIG-CLEAN|NOUI|java\.awt|javax\.swing'){throw 'legacy/engineering marker found in fourth runtime source'}
Write-Host ('FOURTH_NC_STANDALONE_PASS|AIG_CNC|SHA256='+$sha)
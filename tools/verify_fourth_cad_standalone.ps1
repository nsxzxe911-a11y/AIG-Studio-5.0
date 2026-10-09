$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$evidence = Join-Path $root 'evidence\android-fourth-cad-395'
$apk = Join-Path $root 'product-host-android\build\outputs\apk\debug\product-host-android-debug.apk'
if (-not (Test-Path $apk)) { throw 'fourth APK missing' }
if (-not (Test-Path $evidence)) { throw 'standalone CAD evidence directory missing' }
$manifestPath = Join-Path $evidence 'standalone-manifest.txt'
if (-not (Test-Path $manifestPath)) { throw 'standalone evidence manifest missing' }
$manifest = @{}
Get-Content $manifestPath | ForEach-Object { if ($_ -match '^([^=]+)=(.*)$') { $manifest[$matches[1]]=$matches[2] } }
foreach ($key in @('RUNTIME_HEAD','APK_SHA256','ADB_SERIAL','MODEL','API','GLES')) { if (-not $manifest.ContainsKey($key)) { throw "manifest key missing: $key" } }
$apkHash=(Get-FileHash $apk -Algorithm SHA256).Hash.ToLowerInvariant()
if ($manifest['APK_SHA256'].ToLowerInvariant() -ne $apkHash) { throw 'evidence APK SHA-256 does not match current APK' }
git -C $root cat-file -e ($manifest['RUNTIME_HEAD'] + '^{commit}') 2>$null
if ($LASTEXITCODE -ne 0) { throw 'manifest runtime HEAD is not a commit in this repository' }
$requiredShots=@('home.png','cad.png','cad-line.png','cad-arc.png','cad-layer-hidden.png','cad-layer-restored.png','cad-dimension.png','cad-snap-preview.png','cad-recovered.png','offline-home.png','rotated-cad.png')
foreach($shot in $requiredShots){ $p=Join-Path $evidence $shot; if(-not(Test-Path $p)){throw "screenshot missing: $shot"}; if((Get-Item $p).Length -lt 10000){throw "screenshot too small: $shot"}; if((Get-Item $p).LastWriteTime -lt (Get-Item $apk).LastWriteTime){throw "stale screenshot predates APK: $shot"} }
$runtimePath=Join-Path $evidence 'runtime-logcat.txt'; $offlinePath=Join-Path $evidence 'offline-logcat.txt'; $rotationPath=Join-Path $evidence 'rotation-logcat.txt'; $rotationStatePath=Join-Path $evidence 'rotation-state.txt'
foreach($p in @($runtimePath,$offlinePath,$rotationPath,$rotationStatePath)){if(-not(Test-Path $p)){throw "evidence file missing: $([IO.Path]::GetFileName($p))"}}
$runtime=Get-Content $runtimePath -Raw; $offline=Get-Content $offlinePath -Raw; $rotation=Get-Content $rotationPath -Raw; $all=$runtime+"`n"+$offline+"`n"+$rotation
if($runtime -notmatch 'AIG4_GLES\|VERSION\|OpenGL ES 3\.'){throw 'truthful GLES3 marker missing'}
if($runtime -notmatch 'AIG4_SCENE\|HOME_TO_CAD\|PASS'){throw 'HOME_TO_CAD marker missing'}
$reject=[regex]::Match($runtime,'AIG4_CAD\|COMMAND\|LINE\|REJECTED\|LOCAL_MESSAGE'); if(-not $reject.Success){throw 'local invalid LINE rejection missing'}
if($runtime.Substring($reject.Index+$reject.Length) -notmatch 'AIG4_CAD\|COMMAND\|LINE\|ACCEPTED\|REV=[1-9][0-9]*'){throw 'valid command continuation after rejection missing'}
$arcs=[regex]::Matches($runtime,'AIG4_CAD\|COMMAND\|ARC\|ACCEPTED\|REV=([0-9]+)'); if($arcs.Count -lt 3){throw 'ARC three-tap evidence missing'}; if([int]$arcs[$arcs.Count-1].Groups[1].Value -le [int]$arcs[0].Groups[1].Value){throw 'ARC creation did not advance revision'}
$layers=[regex]::Matches($runtime,'AIG4_CAD\|COMMAND\|LAYER_VIS\.CENTERLINE\|ACCEPTED\|REV=([0-9]+)'); if($layers.Count -lt 2){throw 'layer hide/show evidence missing'}; if($layers[0].Groups[1].Value -ne $layers[1].Groups[1].Value){throw 'layer visibility changed geometry revision'}
if($runtime -notmatch 'AIG4_CAD\|COMMAND\|DIM_VALUE\.25\|ACCEPTED\|REV=[1-9][0-9]*'){throw 'driven dimension revision evidence missing'}
if($runtime -notmatch 'AIG4_CAD\|COMMAND\|SNAP\|ACCEPTED'){throw 'snap mode command evidence missing'}
if($offline -notmatch 'AIG4_GLES\|FIRST_FRAME\|PASS'){throw 'offline first-frame evidence missing'}
if($offline -notmatch 'AIG4_CAD\|RECOVERY\|RESTORED'){throw 'offline autosave recovery evidence missing'}
$rot=@{}; Get-Content $rotationStatePath | ForEach-Object {if($_ -match '^([^=]+)=(.*)$'){$rot[$matches[1]]=$matches[2]}}
foreach($key in @('PID_BEFORE','PID_AFTER','ROTATION_BEFORE','ROTATION_MIDDLE','ROTATION_AFTER','REV_BEFORE','REV_AFTER')){if(-not $rot.ContainsKey($key)){throw "rotation state key missing: $key"}}
if($rot['PID_BEFORE'] -ne $rot['PID_AFTER']){throw 'rotation restarted process'}
if($rot['ROTATION_MIDDLE'] -eq $rot['ROTATION_BEFORE']){throw 'rotation middle state did not change'}
if($rot['ROTATION_AFTER'] -ne $rot['ROTATION_BEFORE']){throw 'rotation did not restore original orientation'}
if([int]$rot['REV_AFTER'] -le [int]$rot['REV_BEFORE']){throw 'CAD revision did not continue after rotation'}
if($rotation -notmatch 'AIG4_CAD\|COMMAND\|LINE\|ACCEPTED\|REV=[1-9][0-9]*'){throw 'rotation CAD command evidence missing'}
if($all -match 'CleanMainActivity|AIG-CLEAN-|Engineering Shell|NOUI|java\.awt|javax\.swing'){throw 'legacy host marker leaked into standalone evidence'}
Write-Host 'FOURTH_CAD_STANDALONE_PASS|com.aigstudio.production.fourth395|SHA256=' $apkHash

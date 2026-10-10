param(
    [Parameter(Mandatory=$true)][string]$EvidenceDir
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$ev=if([IO.Path]::IsPathRooted($EvidenceDir)){$EvidenceDir}else{Join-Path $root ($EvidenceDir -replace '/','\')}
$manifestPath=Join-Path $ev 'evidence-manifest.txt'
if(!(Test-Path $manifestPath)){throw "Missing manifest: $manifestPath"}
$m=Get-Content $manifestPath -Raw | ConvertFrom-StringData
function Need([bool]$ok,[string]$message){if(!$ok){throw $message}}
function NeedText([string]$path,[string]$literal){Need (Test-Path $path) "Missing $path"; $text=[IO.File]::ReadAllText($path); Need ($text.Contains($literal)) "Missing marker '$literal' in $path"}
function Sha([string]$path){(Get-FileHash $path -Algorithm SHA256).Hash.ToLower()}
function NeedPng([string]$name,[string]$expected,[datetime]$apkTime){$p=Join-Path $ev $name; Need (Test-Path $p) "Missing image $name"; $fi=Get-Item $p; Need ($fi.Length -gt 10000) "Image too small $name"; Need ($fi.LastWriteTime -ge $apkTime) "Image predates APK $name"; $b=[IO.File]::ReadAllBytes($p); Need ($b.Length -gt 8 -and $b[0]-eq 137 -and $b[1]-eq 80 -and $b[2]-eq 78 -and $b[3]-eq 71) "Not PNG $name"; Need ((Sha $p) -eq $expected) "Image SHA mismatch $name"}

$apk=Join-Path $root ($m.APK_RELATIVE -replace '/','\')
Need (Test-Path $apk) "Missing APK $apk"
Need ((Sha $apk) -eq $m.APK_SHA256.ToLower()) 'APK SHA mismatch'
Need ((Get-Item $apk).Length -eq [int64]$m.APK_BYTES) 'APK byte length mismatch'
$apkTime=(Get-Item $apk).LastWriteTime
& git -C $root cat-file -e "$($m.SOURCE_SHA)^{commit}" 2>$null
Need ($LASTEXITCODE -eq 0) 'SOURCE_SHA is not a commit'
& git -C $root merge-base --is-ancestor $m.SOURCE_SHA HEAD 2>$null
Need ($LASTEXITCODE -eq 0) 'SOURCE_SHA is not an ancestor of current HEAD'
$buildAtSource=(& git -C $root show "$($m.SOURCE_SHA):product-host-android/build.gradle.kts") -join "`n"
Need ($buildAtSource.Contains("applicationId = `"$($m.PACKAGE)`"")) 'Package mismatch at SOURCE_SHA'
Need ($buildAtSource.Contains("versionCode = $($m.VERSION_CODE)")) 'Version code mismatch at SOURCE_SHA'
Need ($buildAtSource.Contains("versionName = `"$($m.VERSION_NAME)`"")) 'Version name mismatch at SOURCE_SHA'

NeedPng 'home.png' $m.HOME_SHA256 $apkTime
NeedPng 'axis3-landscape.png' $m.LANDSCAPE_SHA256 $apkTime
NeedPng 'axis3-portrait.png' $m.PORTRAIT_SHA256 $apkTime
NeedPng 'offline-axis3.png' $m.OFFLINE_AXIS3_SHA256 $apkTime
NeedPng 'route-cycle-axis3.png' $m.ROUTE_CYCLE_SHA256 $apkTime

$axisLog=Join-Path $ev 'axis3-logcat.txt'
NeedText $axisLog 'AIG4_GLES|FIRST_FRAME|PASS'
NeedText $axisLog 'AIG4_SCENE|HOME_TO_AXIS3|PASS'
NeedText $axisLog 'AIG4_AXIS3|FIRST_FRAME|PASS'
NeedText $axisLog "MOTION=$($m.MOTION_PROGRAM)"
$offlineState=Join-Path $ev 'offline-state.txt'
NeedText $offlineState 'AIRPLANE=1'
$offlineText=[IO.File]::ReadAllText($offlineState)
Need ($offlineText -match 'PING_CODE=[1-9][0-9]*') 'Offline ping unexpectedly succeeded'
$offlineLog=Join-Path $ev 'offline-logcat.txt'
NeedText $offlineLog 'AIG4_GLES|FIRST_FRAME|PASS'
NeedText $offlineLog 'AIG4_SCENE|HOME_TO_AXIS3|PASS'
NeedText $offlineLog 'AIG4_AXIS3|FIRST_FRAME|PASS'
Need ($([IO.File]::ReadAllText($offlineLog)) -match 'AIG4_(CAD|CAM|NC)\|RECOVERY\|(RESTORED|NO_CHECKPOINT)') 'Offline recovery marker missing'
$routeLog=Join-Path $ev 'route-cycle-logcat.txt'
$routeText=[IO.File]::ReadAllText($routeLog)
Need (($routeText.Split('AIG4_SCENE|HOME_TO_AXIS3|PASS').Count-1) -ge 2) 'Route cycle missing second HOME_TO_AXIS3'
Need ($routeText.Contains('AIG4_SCENE|AXIS3_TO_HOME|PASS')) 'Route cycle missing AXIS3_TO_HOME'
$rotationPath=Join-Path $ev 'rotation-state.txt'
Need (Test-Path $rotationPath) 'Missing rotation-state.txt'
$rotation=[IO.File]::ReadAllText($rotationPath)
$p0=[regex]::Match($rotation,'PID_PORTRAIT_BEFORE=(\d+)').Groups[1].Value
$p1=[regex]::Match($rotation,'PID_LANDSCAPE=(\d+)').Groups[1].Value
$p2=[regex]::Match($rotation,'PID_PORTRAIT_AFTER=(\d+)').Groups[1].Value
Need ($p0 -ne '' -and $p0 -eq $p1 -and $p1 -eq $p2) 'PID changed across rotation'
Need ($rotation.Contains('cur=1080x1920') -and $rotation.Contains('cur=1920x1080')) 'Rotation dimensions not proven'
NeedText (Join-Path $ev 'package-state.txt') "versionCode=$($m.VERSION_CODE)"
NeedText (Join-Path $ev 'package-state.txt') "versionName=$($m.VERSION_NAME)"
NeedText (Join-Path $ev 'device-state.txt') 'GLES=OpenGL ES 3.1'
$reg=Join-Path $ev 'regression-summary.txt'
foreach($marker in @('CLEAN_CAD_RUNTIME_PASS','CLEAN_CAM_RUNTIME_PASS','CLEAN_SIM_RUNTIME_PASS','CLEAN_AXIS_RUNTIME_PASS','FOURTH_NC_RUNTIME_PASS','FOURTH_NC_CHECKPOINT_PASS','BUILD SUCCESSFUL')){NeedText $reg $marker}

$renderer=Get-ChildItem (Join-Path $root 'renderer-android\src\main\java') -Recurse -Filter AigGlesRenderer.kt | Select-Object -First 1
Need ($null -ne $renderer) 'AigGlesRenderer.kt missing'
$rendererText=[IO.File]::ReadAllText($renderer.FullName)
Need ($rendererText.Contains('FourthRenderRoute.AXIS3->drawAxis3(p)')) 'Dedicated AXIS3 renderer route missing'
Need (!$rendererText.Contains('SceneId.AXIS3->drawHome')) 'AXIS3 still falls back to HOME'
$bad=Get-ChildItem (Join-Path $root 'renderer-android\src\main'),(Join-Path $root 'product-host-android\src\main') -Recurse -File | Select-String -Pattern 'Engineering Shell|AIG-CLEAN|NOUI|java\.awt|javax\.swing'
Need (!$bad) 'Engineering/desktop shell marker found in product runtime'
Write-Output "FOURTH_AXIS3_STANDALONE_PASS|$($m.PROJECT)|VERSION=$($m.VERSION_NAME)|SHA256=$($m.APK_SHA256)|SOURCE=$($m.SOURCE_SHA)"
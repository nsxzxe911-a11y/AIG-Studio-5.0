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
function Sha([string]$path){(Get-FileHash $path -Algorithm SHA256).Hash.ToLower()}
function NeedText([string]$path,[string]$literal){Need (Test-Path $path) "Missing $path";$text=[IO.File]::ReadAllText($path);Need ($text.Contains($literal)) "Missing marker '$literal' in $path"}
function NeedPng([string]$name,[string]$expected){$p=Join-Path $ev $name;Need (Test-Path $p) "Missing image $name";$fi=Get-Item $p;Need ($fi.Length -gt 10000) "Image too small $name";$b=[IO.File]::ReadAllBytes($p);Need ($b.Length -gt 8 -and $b[0]-eq 137 -and $b[1]-eq 80 -and $b[2]-eq 78 -and $b[3]-eq 71) "Not PNG $name";Need ((Sha $p) -eq $expected.ToLower()) "Image SHA mismatch $name"}

$apk=Join-Path $root ($m.APK_RELATIVE -replace '/','\')
Need (Test-Path $apk) "Missing APK $apk"
Need ((Sha $apk) -eq $m.APK_SHA256.ToLower()) 'APK SHA mismatch'
Need ((Get-Item $apk).Length -eq [int64]$m.APK_BYTES) 'APK byte length mismatch'
& git -C $root cat-file -e "$($m.SOURCE_SHA)^{commit}" 2>$null
Need ($LASTEXITCODE -eq 0) 'SOURCE_SHA is not a commit'
& git -C $root merge-base --is-ancestor $m.SOURCE_SHA HEAD 2>$null
Need ($LASTEXITCODE -eq 0) 'SOURCE_SHA is not an ancestor of current HEAD'
$buildAtSource=(& git -C $root show "$($m.SOURCE_SHA):product-host-android/build.gradle.kts") -join "`n"
Need ($buildAtSource.Contains("applicationId = `"$($m.PACKAGE)`"")) 'Package mismatch at SOURCE_SHA'
Need ($buildAtSource.Contains("versionCode = $($m.VERSION_CODE)")) 'Version code mismatch at SOURCE_SHA'
Need ($buildAtSource.Contains("versionName = `"$($m.VERSION_NAME)`"")) 'Version name mismatch at SOURCE_SHA'

$images=@{
 'home.png'=$m.HOME_SHA256;'cad.png'=$m.CAD_SHA256;'cam.png'=$m.CAM_SHA256;'sim.png'=$m.SIM_SHA256;
 'axis3.png'=$m.AXIS3_SHA256;'axis4.png'=$m.AXIS4_SHA256;'axis5.png'=$m.AXIS5_SHA256;'axis6.png'=$m.AXIS6_SHA256;
 'nc.png'=$m.NC_SHA256;'ai.png'=$m.AI_SHA256;
 'offline-home.png'=$m.OFFLINE_HOME_SHA256;'offline-cad.png'=$m.OFFLINE_CAD_SHA256;'offline-cam.png'=$m.OFFLINE_CAM_SHA256;
 'offline-sim.png'=$m.OFFLINE_SIM_SHA256;'offline-axis6.png'=$m.OFFLINE_AXIS6_SHA256;'offline-nc.png'=$m.OFFLINE_NC_SHA256;'offline-ai.png'=$m.OFFLINE_AI_SHA256
}
foreach($name in $images.Keys){NeedPng $name $images[$name]}

$route=Join-Path $ev 'connected-route.log'
$routeMarkers=@('AIG4_SCENE|HOME_TO_CAD|PASS','AIG4_SCENE|CAD_TO_CAM|PASS','AIG4_SCENE|CAM_TO_SIM|PASS','AIG4_SCENE|SIM_TO_AXIS3|PASS','AIG4_SCENE|AXIS3_TO_AXIS4|PASS','AIG4_SCENE|AXIS4_TO_AXIS5|PASS','AIG4_SCENE|AXIS5_TO_AXIS6|PASS','AIG4_SCENE|AXIS6_TO_NC|PASS','AIG4_SCENE|NC_TO_AI|PASS')
foreach($marker in $routeMarkers){NeedText $route $marker}
$routeText=[IO.File]::ReadAllText($route)
Need (!$routeText.Contains('|UNAVAILABLE|')) 'Connected route contains UNAVAILABLE fallback'

$offlineState=Join-Path $ev 'offline-state.txt'
NeedText $offlineState 'AIRPLANE=1'
$offState=[IO.File]::ReadAllText($offlineState)
Need ($offState -match 'PING_CODE=[1-9][0-9]*') 'Offline ping unexpectedly succeeded'
$offline=Join-Path $ev 'offline-route.log'
foreach($domain in @('CAD','CAM','NC')){NeedText $offline "AIG4_$domain|RECOVERY|RESTORED"}
foreach($marker in $routeMarkers){NeedText $offline $marker}
foreach($marker in @('AIG4_CAD|COMMAND|LINE|ACCEPTED','AIG4_CAM|COMMAND|MANUAL|ACCEPTED','AIG4_SIM|COMMAND|PLAY|STATE=READY','AIG4_NC|COMMAND|BLOCK_SKIP|ACCEPTED','AIG4_AI|COMMAND|VERIFY|ACCEPTED')){NeedText $offline $marker}
NeedText $offline "AIG4_AXIS6|FIRST_FRAME|PASS|MOTION=$($m.MOTION_PROGRAM)|A=10.000|B=20.000|C=30.000|BLOCK=7/8"
$offlineText=[IO.File]::ReadAllText($offline)
Need (!$offlineText.Contains('|UNAVAILABLE|')) 'Offline route contains UNAVAILABLE fallback'

NeedText (Join-Path $ev 'package-state.txt') "versionCode=$($m.VERSION_CODE)"
NeedText (Join-Path $ev 'package-state.txt') "versionName=$($m.VERSION_NAME)"
NeedText (Join-Path $ev 'regression-summary.txt') 'BUILD SUCCESSFUL'

$pageAdapter=Get-ChildItem (Join-Path $root 'production-runtime\src\main\kotlin') -Recurse -Filter PageRuntimeAdapters.kt | Select-Object -First 1
Need ($null -ne $pageAdapter) 'PageRuntimeAdapters.kt missing'
$pageText=[IO.File]::ReadAllText($pageAdapter.FullName)
Need ($pageText.Contains('put(source to target,false)')) 'Page links are not initialized OFF'
Need ($pageText.Contains('PageCapabilityState(page,true') -or $pageText.Contains('launchable=true') -or $pageText.Contains('launchable = true')) 'Independent page launchability missing'

$routeSource=Get-ChildItem (Join-Path $root 'renderer-android\src\main\java') -Recurse -Filter AxisRendererStateSource.kt | Select-Object -First 1
Need ($null -ne $routeSource) 'AxisRendererStateSource.kt missing'
$rs=[IO.File]::ReadAllText($routeSource.FullName)
foreach($scene in @('HOME','CAD','CAM','SIM','AXIS3','AXIS4','AXIS5','AXIS6','NC','AI')){Need ($rs.Contains("SceneId.$scene")) "Dedicated route missing for $scene"}
$nodeResolver=Get-ChildItem (Join-Path $root 'renderer-android\src\main\java') -Recurse -Filter TopLevelNodeResolver.kt | Select-Object -First 1
Need ($null -ne $nodeResolver) 'TopLevelNodeResolver.kt missing'
$nr=[IO.File]::ReadAllText($nodeResolver.FullName)
foreach($scene in @('HOME','CAD','CAM','SIM','AXIS3','AXIS4','AXIS5','AXIS6','NC','AI')){Need ($nr.Contains("SceneId.$scene")) "Node resolver missing $scene"}
Need (!$nr.Contains('else->HomeSceneLayout') -and !$nr.Contains('else -> HomeSceneLayout')) 'Top-level node resolver still has HOME fallback'
$bad=Get-ChildItem (Join-Path $root 'renderer-android\src\main'),(Join-Path $root 'product-host-android\src\main') -Recurse -File | Select-String -Pattern 'Engineering Shell|NOUI|java\.awt|javax\.swing'
Need (!$bad) 'Engineering/desktop shell marker found in product runtime'
Write-Output "FOURTH_INDEPENDENT_PAGES_PASS|$($m.PROJECT)|VERSION=$($m.VERSION_NAME)|SHA256=$($m.APK_SHA256)|SOURCE=$($m.SOURCE_SHA)"

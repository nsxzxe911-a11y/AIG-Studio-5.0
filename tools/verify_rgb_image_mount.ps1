param([string]$Root=(Get-Location).Path)
$ErrorActionPreference='Stop'
function Require([bool]$ok,[string]$msg){ if(-not $ok){ throw $msg } }
$cncAndroid=Join-Path $Root 'app\src\main\java\com\aigstudio\app\AigStudioApplication.kt'
$iiAndroid=Join-Path $Root 'app\src\main\java\com\aigii\app\AigIiApplication.kt'
if(Test-Path $cncAndroid){
  $a=Get-Content $cncAndroid -Raw
  $d=Get-Content (Join-Path $Root 'desktop\src\main\kotlin\com\aigstudio\desktop\HomeRgbDesktop.kt') -Raw
  Require ($a.Contains('HomeCoverDrawable')) 'AIG CNC Android HOME image drawable missing'
  Require ($a.Contains('drawBitmap')) 'AIG CNC Android full bitmap draw missing'
  Require ($d.Contains('drawImage')) 'AIG CNC Windows full image draw missing'
  Write-Output 'AIGCNC_RGB_IMAGE_MOUNT_PASS|ANDROID_DRAW_BITMAP|WINDOWS_DRAW_IMAGE|PALETTE_ONLY_BLOCKED'
} elseif(Test-Path $iiAndroid){
  $a=Get-Content $iiAndroid -Raw
  $d=Get-Content (Join-Path $Root 'desktop\aigii\HomeRgbDesktop.kt') -Raw
  Require ($a.Contains('private val image:Bitmap?')) 'AIG-II Android decoded bitmap not retained'
  Require ($a.Contains('drawBitmap')) 'AIG-II Android full bitmap draw missing'
  Require ($d.Contains('HomeRgbImageBorder')) 'AIG-II Windows image mount border missing'
  Require ($d.Contains('drawImage')) 'AIG-II Windows full image draw missing'
  Write-Output 'AIGII_RGB_IMAGE_MOUNT_PASS|ANDROID_DRAW_BITMAP|WINDOWS_DRAW_IMAGE|PALETTE_ONLY_BLOCKED'
} else { throw 'Unknown AIG project layout' }
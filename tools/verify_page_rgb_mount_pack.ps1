param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$required=@('cad','cam','sim','3ax','4ax','5ax','6ax')
$desktopCandidates=@(
  (Join-Path $Root 'desktop\src\main\resources\aig-generated-rgb\approved\184\runtime-surfaces\desktop'),
  (Join-Path $Root 'desktop\src\main\resources\aig-generated-rgb\approved\427\runtime-surfaces\desktop')
)
$desktop=$desktopCandidates | Where-Object {Test-Path $_} | Select-Object -First 1
if(-not $desktop){throw 'DESKTOP_RGB_PAGE_PACK_MISSING'}
$props=Join-Path $desktop 'sha256.properties'
if(!(Test-Path $props)){throw 'DESKTOP_RGB_PAGE_SHA_MISSING'}
$propText=Get-Content $props -Raw
foreach($id in $required){
  $matches=Get-ChildItem $desktop -File | Where-Object {$_.BaseName -eq $id -and $_.Extension -in @('.png','.jpg','.jpeg')}
  if(-not $matches){throw "DESKTOP_RGB_PAGE_MISSING:$id"}
  if($propText -notmatch "(?m)^$id\.(png|jpg|jpeg)="){throw "DESKTOP_RGB_PAGE_HASH_MISSING:$id"}
}
$status=Join-Path $Root 'shared\rgb-page-mount-status.json'
if(!(Test-Path $status)){throw 'RGB_PAGE_MOUNT_STATUS_MISSING'}
$j=Get-Content $status -Raw | ConvertFrom-Json
foreach($id in @('NC','AI')){if($j.desktop.$id -ne 'WAITING_FULL_SURFACE_ART'){throw "DESKTOP_WAITING_STATE_INVALID:$id"}}
$android=(Get-ChildItem (Join-Path $Root 'app\src\main\java') -Recurse -Filter RuntimeSurfaceAndroidInstaller.kt | Select-Object -First 1).FullName
$desktopKt=(Get-ChildItem (Join-Path $Root 'desktop') -Recurse -Filter RuntimeSurfaceDesktopInstaller.kt | Select-Object -First 1).FullName
if(-not $android -or -not $desktopKt){throw 'RGB_INSTALLER_SOURCE_MISSING'}
$a=Get-Content $android -Raw
$d=Get-Content $desktopKt -Raw
if($a -notmatch 'runtime-surfaces/mobile'){throw 'ANDROID_NOT_MOBILE_ASSET_ROOT'}
if($d -notmatch 'runtime-surfaces/desktop'){throw 'WINDOWS_NOT_DESKTOP_ASSET_ROOT'}
if($d -notmatch 'RGB_PAGE_MOUNT\\|'){throw 'WINDOWS_MOUNT_EVIDENCE_MARKER_MISSING'}
if($d -notmatch 'bindDialogSurface'){throw 'WINDOWS_DIALOG_SURFACE_BINDER_MISSING'}
if($a -match 'MorningBaselineSurfaceAssets\.drawable'){throw 'ANDROID_DESKTOP_BASELINE_SHADOWS_MOBILE_ART'}
Write-Output 'RGB_PAGE_MOUNT_PACK_PASS|DESKTOP_7_FULL_SURFACES|ANDROID_MOBILE_ONLY|NC_AI_WAITING|NO_ICON_STRETCH'
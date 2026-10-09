$ErrorActionPreference='Stop'
$adb='E:\Program Files\Nox\bin\nox_adb.exe'
$dev='127.0.0.1:52025'
$pkg='com.aigstudio.app'
$out='E:\AIG_WORK\worktrees\aigcnc-378-dual-production\evidence\android-379-nox'
New-Item -ItemType Directory -Force $out | Out-Null
function ColdHome {
  & $adb -s $dev shell am force-stop $pkg | Out-Null
  & $adb -s $dev logcat -c
  & $adb -s $dev shell am start -W -n "$pkg/.MainActivity" | Out-Null
  Start-Sleep -Milliseconds 1800
}
function Capture([string]$page,[int]$x,[int]$y,[bool]$multi=$false) {
  ColdHome
  if($multi){ & $adb -s $dev shell input tap 128 1632; Start-Sleep -Milliseconds 900 }
  & $adb -s $dev shell input tap $x $y
  Start-Sleep -Milliseconds 1700
  $log=(& $adb -s $dev logcat -d -s AIG-RGB-SURFACE:I AIG-RGB-HOME:I '*:S') -join "`n"
  $needle="RGB_PAGE_MOUNT|$page|PASS"
  if($log -notmatch [regex]::Escape($needle)){ Write-Host "NOX_PAGE_FAIL|$page"; Write-Host $log; exit 20 }
  & $adb -s $dev shell screencap -p "/sdcard/aigcnc-$($page.ToLower()).png" | Out-Null
  & $adb -s $dev pull "/sdcard/aigcnc-$($page.ToLower()).png" "$out\aigcnc-$($page.ToLower()).png" | Out-Null
  $shot=Get-Item "$out\aigcnc-$($page.ToLower()).png"
  if($shot.Length -lt 10000){ throw "Screenshot too small: $page" }
  $line=($log -split "`n" | Where-Object {$_ -like "*$needle*"} | Select-Object -Last 1)
  Write-Host "NOX_PAGE_PASS|$page|SCREENSHOT=$($shot.Length)|$line"
}
Capture 'CAD' 120 1524
Capture 'CAM' 292 1524
Capture 'SIM' 464 1524
Capture '3AX' 636 1524
Capture 'NC' 808 1524
Capture '4AX' 540 981 $true
Capture '5AX' 540 1077 $true
Capture '6AX' 540 1173 $true
Capture 'AI' 540 1365 $true
Write-Host 'NOX_RUNTIME_9_SURFACES_PASS|AIG_CNC|CAD_CAM_SIM_3AX_4AX_5AX_6AX_NC_AI|SCREENSHOTS=9'

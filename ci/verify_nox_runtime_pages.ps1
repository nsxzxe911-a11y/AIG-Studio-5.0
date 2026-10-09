$ErrorActionPreference='Stop'
$adb='E:\Program Files\Nox\bin\nox_adb.exe'
$dev='127.0.0.1:52025'
$pkg='com.aigstudio.app'
$out='E:\AIG_WORK\worktrees\aigcnc-378-dual-production\evidence\android-380-nox'
New-Item -ItemType Directory -Force $out | Out-Null
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public class NoxWindowRect380 { [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; } [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd,out RECT rect); }
'@
$script:initialPid=''
function GetMainNoxWindow {
  $best=$null; $bestArea=0
  foreach($n in (Get-Process Nox -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowHandle -ne 0})) {
    $rect=New-Object NoxWindowRect380+RECT
    if(-not [NoxWindowRect380]::GetWindowRect($n.MainWindowHandle,[ref]$rect)){ continue }
    $w=$rect.Right-$rect.Left; $h=$rect.Bottom-$rect.Top; $area=$w*$h
    if($w -ge 300 -and $h -ge 300 -and $area -gt $bestArea) {
      $bestArea=$area
      $best=[pscustomobject]@{Left=$rect.Left;Top=$rect.Top;Width=$w;Height=$h;Area=$area}
    }
  }
  if($null -eq $best){ throw 'NOX_MAIN_WINDOW_NOT_FOUND' }
  return $best
}
function CaptureNoxWindow([string]$local) {
  $r=GetMainNoxWindow
  $bmp=New-Object System.Drawing.Bitmap($r.Width,$r.Height)
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.Left,$r.Top,0,0,$bmp.Size)
  $bmp.Save($local,[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
function CurrentPid {
  return ((& $adb -s $dev shell pidof $pkg).Trim() -split '\s+')[0]
}
function AssertAlive([string]$page) {
  $pidText=CurrentPid
  if([string]::IsNullOrWhiteSpace($pidText)){ throw "AIG_PROCESS_EXITED|$page" }
  if($pidText -ne $script:initialPid){ throw "PID_CHANGED|$page|initial=$($script:initialPid)|current=$pidText" }
  $top=(& $adb -s $dev shell dumpsys activity activities | Select-String 'topResumedActivity') -join "`n"
  if($top -notlike "*$pkg*"){ throw "AIG_NOT_FOREGROUND|$page" }
}
function ColdHome {
  & $adb -s $dev shell am force-stop $pkg | Out-Null
  & $adb -s $dev logcat -c
  & $adb -s $dev shell am start -W -n "$pkg/.MainActivity" | Out-Null
  Start-Sleep -Milliseconds 2200
  $script:initialPid=CurrentPid
  if([string]::IsNullOrWhiteSpace($script:initialPid)){ throw 'AIG_CNC_COLD_START_FAILED' }
  AssertAlive 'HOME'
  Write-Host "NOX_COLD_START_PASS|AIG_CNC|PID=$($script:initialPid)"
}
function ReturnHome([bool]$dialog=$false) {
  if($dialog){ & $adb -s $dev shell input keyevent 4 | Out-Null }
  else { & $adb -s $dev shell input tap 980 700 | Out-Null }
  Start-Sleep -Milliseconds 850
  AssertAlive 'HOME_RETURN'
}
function Capture([string]$page,[int]$x,[int]$y,[bool]$multi=$false) {
  if($multi){ & $adb -s $dev shell input tap 128 1632 | Out-Null; Start-Sleep -Milliseconds 650 }
  & $adb -s $dev shell input tap $x $y | Out-Null
  Start-Sleep -Milliseconds 1500
  AssertAlive $page
  $log=(& $adb -s $dev logcat -d -s AIG-RGB-SURFACE:I AIG-RGB-HOME:I '*:S') -join "`n"
  $needle="RGB_PAGE_MOUNT|$page|PASS"
  if($log -notmatch [regex]::Escape($needle)){ throw "NOX_PAGE_FAIL|AIG_CNC|$page" }
  $local="$out\aigcnc-$($page.ToLower()).png"
  CaptureNoxWindow $local
  $shot=Get-Item $local
  if($shot.Length -lt 10000){ throw "NOX_SCREENSHOT_TOO_SMALL|$page|$($shot.Length)" }
  $line=($log -split "`n" | Where-Object {$_ -like "*$needle*"} | Select-Object -Last 1)
  Write-Host "NOX_PAGE_PASS|AIG_CNC|$page|PID=$($script:initialPid)|SCREENSHOT=$($shot.Length)|$line"
}
ColdHome
Capture 'CAD' 120 1524; ReturnHome
Capture 'CAM' 292 1524; ReturnHome $true
Capture 'SIM' 464 1524; ReturnHome $true
Capture '3AX' 636 1524; ReturnHome $true
Capture 'NC' 808 1524; ReturnHome $true
Capture '4AX' 540 981 $true; ReturnHome $true
Capture '5AX' 540 1077 $true; ReturnHome $true
Capture '6AX' 540 1173 $true; ReturnHome $true
Capture 'AI' 540 1365 $true
Write-Host "NOX_RUNTIME_9_SURFACES_PASS|AIG_CNC|SINGLE_COLD_START|SAME_PID=$($script:initialPid)|CAD_CAM_SIM_3AX_4AX_5AX_6AX_NC_AI|SCREENSHOTS=9"

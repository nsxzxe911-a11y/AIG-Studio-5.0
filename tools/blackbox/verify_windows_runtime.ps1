param(
    [Parameter(Mandatory=$true)][string]$ExePath,
    [string]$EvidenceDir = "evidence/blackbox/windows"
)

$ErrorActionPreference='Stop'
$exe=(Resolve-Path $ExePath).Path
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName UIAutomationClient
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AigCncWin32 {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd,out RECT rect);
}
'@

function Save-Shot([IntPtr]$handle,[string]$path) {
  $rect=New-Object AigCncWin32+RECT
  if(-not [AigCncWin32]::GetWindowRect($handle,[ref]$rect)){throw 'GetWindowRect failed'}
  $w=[Math]::Max(1,$rect.Right-$rect.Left);$h=[Math]::Max(1,$rect.Bottom-$rect.Top)
  $bmp=New-Object System.Drawing.Bitmap $w,$h
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  try{$g.CopyFromScreen($rect.Left,$rect.Top,0,0,$bmp.Size)}finally{$g.Dispose()}
  $bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
  $colored=0;$samples=0
  for($x=0;$x -lt $w;$x+=[Math]::Max(1,[int]($w/24))){
    for($y=0;$y -lt $h;$y+=[Math]::Max(1,[int]($h/16))){
      $p=$bmp.GetPixel($x,$y);$samples++
      $mx=[Math]::Max($p.R,[Math]::Max($p.G,$p.B));$mn=[Math]::Min($p.R,[Math]::Min($p.G,$p.B))
      if(($mx-$mn)-ge 20 -and ($p.R+$p.G+$p.B)-ge 80){$colored++}
    }
  }
  $bmp.Dispose()
  [pscustomobject]@{Colored=$colored;Samples=$samples}
}

$proc=Start-Process -FilePath $exe -PassThru
$deadline=(Get-Date).AddSeconds(45)
do{Start-Sleep -Milliseconds 250;$proc.Refresh()}while($proc.MainWindowHandle -eq 0 -and -not $proc.HasExited -and (Get-Date)-lt $deadline)
if($proc.HasExited){throw "AIG CNC EXE exited before UI: $($proc.ExitCode)"}
if($proc.MainWindowHandle -eq 0){throw 'AIG CNC EXE did not expose a visible window within 45s'}

$root=[System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$homeShot=Join-Path $EvidenceDir '00_HOME.png'
$rgb=Save-Shot $proc.MainWindowHandle $homeShot
if($rgb.Colored -lt 4){throw "HOME screenshot lacks RGB/color evidence ($($rgb.Colored)/$($rgb.Samples))"}

$surfaceNames=[ordered]@{
 HOME=@('首頁','HOME');CAD=@('CAD','2D CAD');CAM=@('CAM');SIM=@('SIM','3D SIM');
 '3AX'=@('3AX');'4AX'=@('4AX');'5AX'=@('5AX','5X');'6AX'=@('6AX','6X');NC=@('NC','NC EDIT');AI=@('AI')
}
function Find-Any($root,$names){
  $all=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
  foreach($name in $names){foreach($el in $all){if($el.Current.Name -eq $name){return $el}}}
  return $null
}
$report=@();$index=1
foreach($surface in $surfaceNames.Keys){
  $el=Find-Any $root $surfaceNames[$surface]
  if($surface -eq 'HOME' -and $null -eq $el){$report += 'HOME=MAIN_WINDOW_VISIBLE';continue}
  if($null -eq $el){$report += "$surface=MISSING";continue}
  $inv=$null
  if($el.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$inv)){([System.Windows.Automation.InvokePattern]$inv).Invoke()}
  else{$sel=$null;if($el.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern,[ref]$sel)){([System.Windows.Automation.SelectionItemPattern]$sel).Select()}}
  Start-Sleep -Milliseconds 350
  Save-Shot $proc.MainWindowHandle (Join-Path $EvidenceDir ("{0:D2}_{1}.png" -f $index,$surface)) | Out-Null
  $report += "$surface=VISIBLE_CONTROL_FOUND";$index++
}
$missing=$report|Where-Object{$_ -like '*=MISSING'}
$status=@(
 'PACKAGED_EXE_LAUNCH=PASS','MAIN_WINDOW_VISIBLE=PASS','RGB_HOME_SCREENSHOT=PASS',
 "RGB_COLORED_SAMPLES=$($rgb.Colored)/$($rgb.Samples)",
 $(if($missing.Count -eq 0){'TEN_SURFACE_REACHABILITY=PASS'}else{'TEN_SURFACE_REACHABILITY=REVIEW'}),
 $report
)|ForEach-Object{$_}
$status|Set-Content -Encoding UTF8 (Join-Path $EvidenceDir 'BLACKBOX_STATUS.txt')
$status

param(
  [Parameter(Mandatory=$true)][ValidateSet('AIG_CNC','AIG_II')][string]$Project
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Desktop=Join-Path $Root 'desktop\src\main\resources\aig-generated-rgb\approved\184\runtime-surfaces\desktop'
$Mobile=Join-Path $Root 'app\src\main\assets\aig-generated-rgb\approved\184\runtime-surfaces\mobile'
New-Item -ItemType Directory -Force $Desktop,$Mobile | Out-Null

function C([int]$a,[int]$r,[int]$g,[int]$b){ [System.Drawing.Color]::FromArgb($a,$r,$g,$b) }
function Accent([string]$s){
  switch($s){
    'CAD'  { @(39,233,255) }
    'CAM'  { @(51,243,155) }
    'SIM'  { @(45,225,240) }
    '3AX'  { @(104,168,255) }
    '4AX'  { @(184,92,255) }
    '5AX'  { @(255,77,166) }
    '6AX'  { @(170,92,255) }
    'NC'   { @(255,179,38) }
    'AI'   { @(90,170,255) }
    default{ @(39,233,255) }
  }
}
function New-Skin([string]$Path,[int]$W,[int]$H,[string]$Surface,[int]$Seed){
  $bmp=New-Object System.Drawing.Bitmap($W,$H,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  try{
    $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $rect=New-Object System.Drawing.Rectangle(0,0,$W,$H)
    $bg=New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,(C 255 2 4 7),(C 255 7 17 27),55)
    $g.FillRectangle($bg,$rect);$bg.Dispose()
    $rgb=Accent $Surface;$r=$rgb[0];$gg=$rgb[1];$b=$rgb[2]
    $minor=New-Object System.Drawing.Pen((C 24 $r $gg $b),1)
    $major=New-Object System.Drawing.Pen((C 44 $r $gg $b),1.6)
    $step=[Math]::Max(36,[int]([Math]::Min($W,$H)/13))
    for($x=0;$x -lt $W;$x+=$step){$g.DrawLine($(if((($x/$step)%4)-eq 0){$major}else{$minor}),$x,0,$x,$H)}
    for($y=0;$y -lt $H;$y+=$step){$g.DrawLine($(if((($y/$step)%4)-eq 0){$major}else{$minor}),0,$y,$W,$y)}
    $minor.Dispose();$major.Dispose()
    $edge=New-Object System.Drawing.Pen((C 105 $r $gg $b),[Math]::Max(2,[int]($W/420)))
    $soft=New-Object System.Drawing.Pen((C 55 $r $gg $b),[Math]::Max(2,[int]($W/300)))
    $margin=[int]($W*.045);$g.DrawRectangle($edge,$margin,$margin,$W-2*$margin,$H-2*$margin)
    $cx=[int]($W/2);$cy=[int]($H/2);$u=[int]([Math]::Min($W,$H)*.16)
    switch($Surface){
      'HOME' {
        for($i=1;$i -le 4;$i++){$rr=[int]($u*(.55+$i*.38));$g.DrawEllipse($soft,$cx-$rr,$cy-$rr,$rr*2,$rr*2)}
        for($i=0;$i -lt 8;$i++){$a=($i*45+$Seed*7)*[Math]::PI/180;$x2=[int]($cx+[Math]::Cos($a)*$u*2.5);$y2=[int]($cy+[Math]::Sin($a)*$u*2.5);$g.DrawLine($edge,$cx,$cy,$x2,$y2);$g.FillEllipse((New-Object System.Drawing.SolidBrush((C 160 $r $gg $b))),$x2-5,$y2-5,10,10)}
      }
      'CAD' {
        $g.DrawEllipse($edge,$cx-$u,$cy-$u,$u*2,$u*2);$g.DrawRectangle($soft,$cx-[int]($u*1.55),$cy-[int]($u*.72),[int]($u*3.1),[int]($u*1.44));$g.DrawLine($edge,$cx-$u*2,$cy+$u,$cx+$u*2,$cy-$u)
      }
      'CAM' {
        $p1=New-Object System.Drawing.Point([int]($W*.14),[int]($H*.70));$p2=New-Object System.Drawing.Point([int]($W*.32),[int]($H*.28));$p3=New-Object System.Drawing.Point([int]($W*.70),[int]($H*.78));$p4=New-Object System.Drawing.Point([int]($W*.87),[int]($H*.34));$g.DrawBezier($edge,$p1,$p2,$p3,$p4);for($i=0;$i -lt 7;$i++){$x=[int]($W*(.18+$i*.10));$y=[int]($H*(.54+[Math]::Sin($i+$Seed)*.11));$g.DrawEllipse($soft,$x-12,$y-12,24,24)}
      }
      'SIM' {
        $q=[int]($u*1.7);$off=[int]($u*.55);$g.DrawRectangle($edge,$cx-$q,$cy-$q,$q*2,$q*2);$g.DrawRectangle($soft,$cx-$q+$off,$cy-$q-$off,$q*2,$q*2);$g.DrawLine($soft,$cx-$q,$cy-$q,$cx-$q+$off,$cy-$q-$off);$g.DrawLine($soft,$cx+$q,$cy+$q,$cx+$q+$off,$cy+$q-$off)
      }
      '3AX' {
        $g.DrawLine($edge,$cx,$cy,$cx+$u*2,$cy);$g.DrawLine($edge,$cx,$cy,$cx,$cy-$u*2);$g.DrawLine($edge,$cx,$cy,$cx-[int]($u*1.45),$cy+[int]($u*1.45))
      }
      '4AX' {
        $g.DrawEllipse($edge,$cx-$u*2,$cy-$u,$u*4,$u*2);$g.DrawArc($soft,$cx-$u*2,$cy-$u*2,$u*4,$u*4,205,255);$g.DrawLine($edge,$cx,$cy-$u*2,$cx+[int]($u*.34),$cy-[int]($u*1.63))
      }
      '5AX' {
        $g.DrawEllipse($edge,$cx-$u*2,$cy-$u,$u*4,$u*2);$g.DrawEllipse($soft,$cx-$u,$cy-$u*2,$u*2,$u*4);$g.DrawArc($edge,$cx-[int]($u*1.55),$cy-[int]($u*1.55),[int]($u*3.1),[int]($u*3.1),25,280)
      }
      '6AX' {
        for($i=0;$i -lt 3;$i++){$d=[int]($u*(1.5+$i*.62));$g.DrawEllipse($(if($i%2){$soft}else{$edge}),$cx-$d,$cy-[int]($d*.62),$d*2,[int]($d*1.24))};$pts=New-Object 'System.Drawing.Point[]' 6;for($i=0;$i -lt 6;$i++){$a=($i*60-30)*[Math]::PI/180;$pts[$i]=New-Object System.Drawing.Point([int]($cx+[Math]::Cos($a)*$u),[int]($cy+[Math]::Sin($a)*$u))};$g.DrawPolygon($edge,$pts)
      }
      'NC' {
        $bar=[int]($W*.18);$g.DrawLine($edge,$bar,[int]($H*.18),$bar,[int]($H*.82));for($i=0;$i -lt 13;$i++){$y=[int]($H*(.20+$i*.047));$len=[int]($W*(.26+(($i+$Seed)%5)*.07));$g.DrawLine($(if($i%3){$soft}else{$edge}),$bar+22,$y,[Math]::Min($W-$margin,$bar+$len),$y)}
      }
      'AI' {
        $nodes=@();for($i=0;$i -lt 14;$i++){$a=($i*137+$Seed*19)*[Math]::PI/180;$rad=$u*(.55+($i%5)*.38);$x=[int]($cx+[Math]::Cos($a)*$rad);$y=[int]($cy+[Math]::Sin($a)*$rad*1.35);$nodes+=,@($x,$y)};for($i=1;$i -lt $nodes.Count;$i++){$g.DrawLine($soft,$nodes[$i-1][0],$nodes[$i-1][1],$nodes[$i][0],$nodes[$i][1])};$brush=New-Object System.Drawing.SolidBrush((C 155 $r $gg $b));foreach($n in $nodes){$g.FillEllipse($brush,$n[0]-7,$n[1]-7,14,14)};$brush.Dispose()
      }
    }
    $edge.Dispose();$soft.Dispose()
    $shade=New-Object System.Drawing.SolidBrush((C 74 2 4 7));$g.FillRectangle($shade,[int]($W*.10),[int]($H*.08),[int]($W*.80),[int]($H*.84));$shade.Dispose()
    $highlight=New-Object System.Drawing.Pen((C 110 $r $gg $b),2);$g.DrawRectangle($highlight,[int]($W*.10),[int]($H*.08),[int]($W*.80),[int]($H*.84));$highlight.Dispose()
    $bmp.Save($Path,[System.Drawing.Imaging.ImageFormat]::Png)
  } finally {$g.Dispose();$bmp.Dispose()}
}
function Sha([string]$p){(Get-FileHash $p -Algorithm SHA256).Hash.ToLower()}
function Update-DesktopHashes([string]$dir){
  $p=Join-Path $dir 'sha256.properties';$lines=@(Get-Content $p | Where-Object {$_ -notmatch '^(nc|ai)\.png='});$lines += 'nc.png='+(Sha (Join-Path $dir 'nc.png'));$lines += 'ai.png='+(Sha (Join-Path $dir 'ai.png'));Set-Content $p $lines -Encoding ascii
}
function Write-MobileHashes([string]$dir,[string[]]$names){
  $lines=@('# Dedicated mobile full-surface RGB page assets. Portrait only; no desktop reuse; no icon stretch.')
  foreach($n in $names){$file=$n.ToLower()+'.png';$lines += $file+'='+(Sha (Join-Path $dir $file))}
  Set-Content (Join-Path $dir 'sha256.properties') $lines -Encoding ascii
}
$seed=if($Project -eq 'AIG_CNC'){379}else{458}
foreach($s in @('NC','AI')){New-Skin (Join-Path $Desktop ($s.ToLower()+'.png')) 1280 720 $s $seed}
$mobileNames=if($Project -eq 'AIG_CNC'){@('HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI')}else{@('CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI')}
foreach($s in $mobileNames){New-Skin (Join-Path $Mobile ($s.ToLower()+'.png')) 720 1280 $s ($seed+17)}
Update-DesktopHashes $Desktop
Write-MobileHashes $Mobile $mobileNames
Write-Host "RUNTIME_FULL_SURFACE_ART_GENERATED|$Project|DESKTOP_NC_AI|MOBILE_$($mobileNames.Count)|SHA256"

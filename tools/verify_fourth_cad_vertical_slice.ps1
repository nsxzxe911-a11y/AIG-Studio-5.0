$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$evidence = Join-Path $root 'evidence\android-fourth-cad-395'
$apk = Join-Path $root 'product-host-android\build\outputs\apk\debug\product-host-android-debug.apk'
if (-not (Test-Path $apk)) { throw 'fourth APK missing' }
if (-not (Test-Path $evidence)) { throw 'fourth CAD evidence directory missing' }
$log = Join-Path $evidence 'runtime-logcat.txt'
if (-not (Test-Path $log)) { throw 'runtime logcat evidence missing' }
$requiredShots = @('home.png','cad.png','cad-line.png','cad-tool-group.png','offline-home.png')
foreach ($shot in $requiredShots) {
  $p = Join-Path $evidence $shot
  if (-not (Test-Path $p)) { throw "screenshot missing: $shot" }
  if ((Get-Item $p).Length -lt 10000) { throw "screenshot too small: $shot" }
  if ((Get-Item $p).LastWriteTime -lt (Get-Item $apk).LastWriteTime) { throw "stale screenshot predates APK: $shot" }
}
$text = Get-Content $log -Raw
if ($text -notmatch 'AIG4_GLES\|VERSION\|') { throw 'truthful GLES version marker missing' }
if (([regex]::Matches($text,'AIG4_GLES\|FIRST_FRAME\|PASS')).Count -lt 2) { throw 'online + offline first-frame evidence missing' }
if ($text -notmatch 'AIG4_SCENE\|HOME_TO_CAD\|PASS') { throw 'HOME_TO_CAD marker missing' }
if ($text -notmatch 'AIG4_SCENE\|CAD_TO_HOME\|PASS') { throw 'CAD_TO_HOME marker missing' }
$reject = [regex]::Match($text,'AIG4_CAD\|COMMAND\|LINE\|REJECTED\|LOCAL_MESSAGE')
if (-not $reject.Success) { throw 'local tiny-line rejection marker missing' }
$afterReject = $text.Substring($reject.Index + $reject.Length)
if ($afterReject -notmatch 'AIG4_CAD\|COMMAND\|LINE\|ACCEPTED\|REV=[1-9][0-9]*') { throw 'valid LINE after rejection missing' }
if ($text -notmatch 'AIG4_CAD\|COMMAND\|SELECT\|ACCEPTED') { throw 'SELECT marker missing' }
if ($text -notmatch 'AIG4_CAD\|COMMAND\|UNDO\|ACCEPTED') { throw 'UNDO marker missing' }
if ($text -notmatch 'AIG4_CAD\|COMMAND\|REDO\|ACCEPTED') { throw 'REDO marker missing' }
if ($text -notmatch 'AIG4_CAD\|COMMAND\|SNAP\|ACCEPTED') { throw 'SNAP marker missing' }
if ($text -notmatch 'AIG4_CAD\|COMMAND\|OFFSET\|ACCEPTED\|REV=[1-9][0-9]*') { throw 'advanced OFFSET edit marker missing' }
if ($text -match 'CleanMainActivity|AIG-CLEAN-|Engineering Shell|NOUI') { throw 'legacy host marker leaked into runtime evidence' }
Write-Host 'FOURTH_CAD_VERTICAL_SLICE_PASS|com.aigstudio.production.fourth395'

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$module = Join-Path $root 'product-host-android'
if (-not (Test-Path $module)) { throw 'product-host-android module missing' }
$manifest = Join-Path $module 'src\main\AndroidManifest.xml'
$build = Join-Path $module 'build.gradle.kts'
$activity = Get-ChildItem (Join-Path $module 'src\main') -Recurse -Filter FourthMainActivity.kt -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not (Test-Path $manifest)) { throw 'fourth host manifest missing' }
if (-not (Test-Path $build)) { throw 'fourth host build file missing' }
if (-not $activity) { throw 'FourthMainActivity missing' }
$manifestText = Get-Content $manifest -Raw
$buildText = Get-Content $build -Raw
$source = Get-Content $activity.FullName -Raw
if ($manifestText -match 'CleanMainActivity|Engineering|NOUI') { throw 'legacy launcher reference found' }
if ($manifestText -notmatch 'FourthMainActivity') { throw 'fourth launcher not registered' }
if ($manifestText -notmatch 'orientation\|screenSize\|keyboardHidden') { throw 'configChanges state-preservation contract missing' }
if ($source -match 'java\.awt|javax\.swing|android\.widget|Clean[A-Za-z]*Panel|CleanMainActivity') { throw 'legacy/platform widget UI found in fourth host' }
if ($source -notmatch 'AigGlesView') { throw 'fourth host does not mount AigGlesView' }
if ($source -notmatch 'FourthCadRuntimeAdapter') { throw 'fourth host does not bind headless CAD adapter' }
if ($buildText -notmatch 'project\(":renderer-android"\)') { throw 'renderer dependency missing' }
if ($buildText -notmatch 'project\(":production-runtime"\)') { throw 'headless runtime dependency missing' }
if ($buildText -match 'app-production|desktop') { throw 'legacy UI dependency forbidden' }
if ($buildText -notmatch 'versionCode\s*=\s*(395001|474001)') { throw 'candidate versionCode missing' }
if ($buildText -notmatch 'versionName\s*=\s*"(395-fourth-cad|474-fourth-cad)"') { throw 'candidate versionName missing' }
Write-Host 'FOURTH_HOST_BOUNDARY_PASS'

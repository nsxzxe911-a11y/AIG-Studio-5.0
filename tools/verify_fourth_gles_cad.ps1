$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$renderer = Join-Path $root "renderer-android\src\main\java"
$assets = Join-Path $root "renderer-android\src\main\assets\aig-rgb"
$view = Get-ChildItem $renderer -Recurse -Filter AigGlesView.kt -ErrorAction SilentlyContinue | Select-Object -First 1
$gles = Get-ChildItem $renderer -Recurse -Filter AigGlesRenderer.kt -ErrorAction SilentlyContinue | Select-Object -First 1
$catalog = Get-ChildItem $renderer -Recurse -Filter RgbTextureCatalog.kt -ErrorAction SilentlyContinue | Select-Object -First 1
$plan = Get-ChildItem $renderer -Recurse -Filter RgbNodeTexturePlan.kt -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $view) { throw "AigGlesView.kt missing" }
if (-not $gles) { throw "AigGlesRenderer.kt missing" }
if (-not $catalog) { throw "RgbTextureCatalog.kt missing" }
if (-not $plan) { throw "RgbNodeTexturePlan.kt missing" }
$viewText = Get-Content $view.FullName -Raw
$glesText = Get-Content $gles.FullName -Raw
$catalogText = Get-Content $catalog.FullName -Raw
$planText = Get-Content $plan.FullName -Raw
if ($viewText -notmatch 'setEGLContextClientVersion\(3\)') { throw "GLES3 context not requested" }
if ($viewText -notmatch 'setRenderer\(') { throw "GLSurfaceView renderer not owned" }
if (($viewText + $glesText) -match '\b(Button|ImageView|Clean[A-Za-z]*Panel)\b') { throw "legacy widget/panel dependency found" }
if (($viewText + $glesText) -match 'cad\.png') { throw "full-page cad.png mount forbidden" }
if ($planText -notmatch 'GeneratedLabel' -or $glesText -notmatch 'RgbNodeTexturePlan\.forNode' -or $catalogText -notmatch 'fun labelTexture\(' -or $glesText -notmatch 'labelTexture\(plan\.label\)') { throw 'missing GPU label fallback for nodes without RGB images' }
$required = @('line.png','rect.png','circle.png','hole.png','select.png','tool_group.png','cad.png','workspace.png')
foreach ($name in $required) {
  if (-not (Test-Path (Join-Path $assets "icons\$name"))) { throw "missing per-tool RGB texture: $name" }
}
if (-not (Test-Path (Join-Path $assets 'home\rgb_wallpaper.png'))) { throw 'missing HOME wallpaper texture' }
$provPath = Join-Path $assets 'provenance.json'
if (-not (Test-Path $provPath)) { throw 'provenance.json missing' }
$prov = Get-Content $provPath -Raw | ConvertFrom-Json
$entries = @($prov.assets)
foreach ($name in $required + @('rgb_wallpaper.png')) {
  $entry = $entries | Where-Object { $_.source -eq "engineering-assets/images/$name" }
  if (-not $entry) { throw "missing provenance entry: $name" }
  if ($entry.sha256 -notmatch '^[0-9a-f]{64}$') { throw "invalid SHA-256 provenance: $name" }
  $sourcePath = Join-Path $root ($entry.source -replace '/', '\')
  $runtimePath = Join-Path (Join-Path $root 'renderer-android\src\main\assets') ($entry.runtime -replace '/', '\')
  $sourceHash = (Get-FileHash $sourcePath -Algorithm SHA256).Hash.ToLower()
  $runtimeHash = (Get-FileHash $runtimePath -Algorithm SHA256).Hash.ToLower()
  if ($sourceHash -ne $entry.sha256 -or $runtimeHash -ne $entry.sha256) { throw "RGB texture provenance mismatch: $name" }
}
if ($viewText -notmatch 'GLES30|GLSurfaceView') { throw 'renderer path does not expose GLES surface usage' }
Write-Host 'FOURTH_GLES_CAD_STATIC_PASS'

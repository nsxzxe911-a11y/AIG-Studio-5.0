$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$VersionFile = Join-Path $RepoRoot 'release-version.properties'
if (-not (Test-Path $VersionFile)) { throw 'release-version.properties is required.' }
if (-not (Test-Path (Join-Path $RepoRoot 'settings.gradle.kts'))) { throw 'AIG Studio Gradle root is missing.' }

$Version = ConvertFrom-StringData (Get-Content $VersionFile -Raw)
$VersionName = $Version.versionName
if (-not $VersionName) { throw 'Release version metadata is incomplete.' }

$GitSha = (& git -C $RepoRoot rev-parse HEAD).Trim()
if (-not $GitSha) { throw 'Unable to resolve Git commit SHA.' }

if (-not (Get-Command light.exe -ErrorAction SilentlyContinue)) { throw 'WiX Toolset 3 light.exe is required on the Windows runner.' }
if (-not (Get-Command gradle -ErrorAction SilentlyContinue)) { throw 'Gradle is required.' }
if (-not (Get-Command jpackage -ErrorAction SilentlyContinue)) { throw 'JDK 17+ jpackage is required.' }

& gradle -p $RepoRoot --no-daemon :core:coreRegression :desktop:installDist
if ($LASTEXITCODE -ne 0) { throw 'Studio core regression or desktop runtime build failed.' }

$LibDir = Join-Path $RepoRoot 'desktop\build\install\desktop\lib'
$MainJar = Join-Path $LibDir 'AIG_Studio_PC.jar'
if (-not (Test-Path $MainJar)) { throw 'Studio desktop runtime JAR missing.' }

$SmokeDir = Join-Path $RepoRoot 'build\desktop-smoke'
if (Test-Path $SmokeDir) { Remove-Item -Recurse -Force $SmokeDir }
New-Item -ItemType Directory -Force $SmokeDir | Out-Null
$env:GITHUB_SHA = $GitSha
Push-Location $SmokeDir
try {
  & java -cp "$LibDir\*" com.aigstudio.desktop.DesktopAppKt --smoke
  if ($LASTEXITCODE -ne 0) { throw 'Studio Windows Gradle runtime smoke failed.' }
  $RequiredSmokeEvidence = @(
    'desktop_launch.png',
    'desktop_3d_before.png',
    'desktop_3d.png',
    'desktop_5x_axis_badge_mid.png',
    'desktop_5x_axis_badge_narrow.png',
    'desktop_smoke.txt',
    'REMOVED_CELLS.txt',
    '3D_RUNTIME_EVIDENCE.txt',
    '3D_RUNTIME_SHA256.txt'
  )
  foreach ($name in $RequiredSmokeEvidence) {
    if (-not (Test-Path $name)) { throw "Studio Windows smoke evidence missing: $name" }
  }
  foreach ($name in @('REMOVED_CELLS.txt','3D_RUNTIME_EVIDENCE.txt','3D_RUNTIME_SHA256.txt')) {
    $content = Get-Content $name -Raw
    if ($content -notmatch [regex]::Escape("SOURCE_SHA=$GitSha")) {
      throw "Studio Windows smoke evidence source mismatch: $name"
    }
  }
  $RuntimeEvidence = Get-Content '3D_RUNTIME_EVIDENCE.txt' -Raw
  foreach ($marker in @(
    '5X_AXIS_BADGE_REFLOW=PASS',
    '5X_AXIS_BADGE_REFLOW_2LINE=PASS',
    '5X_AXIS_BADGE_REFLOW_3LINE=PASS',
    '5X_AXIS_BADGE_REFLOW_NO_OVERFLOW=PASS',
    '5X_AXIS_BADGE_REFLOW_PRESERVE=AB_DIRECTION_DEPTH_POSE_ANGLE',
    '5X_AXIS_DEPTH_BEADS=PASS',
    '5X_AXIS_DEPTH_BEADS_SOURCE=PROJECTED_DEPTH_DELTA',
    '5X_AXIS_DEPTH_BEADS_STYLE=DIRECTIONAL_RADIUS_ALPHA'
  )) {
    if ($RuntimeEvidence -notmatch [regex]::Escape($marker)) {
      throw "Studio 206 pose badge smoke evidence missing: $marker"
    }
  }
} finally {
  Pop-Location
}

$PackageOut = Join-Path $RepoRoot 'build\windows-self-contained'
$AppImageOut = Join-Path $RepoRoot 'build\windows-app-image'
$LauncherSmokeDir = Join-Path $RepoRoot 'build\windows-launcher-smoke'
$ReleaseOut = Join-Path $RepoRoot 'release\windows'
$PortableRelease = Join-Path $ReleaseOut 'portable'
$SetupExe = Join-Path $ReleaseOut 'AIG_Studio_SETUP.exe'
$PortableZip = Join-Path $ReleaseOut 'AIG_Studio_PORTABLE.zip'
$SumsFile = Join-Path $ReleaseOut 'SHA256SUMS.txt'
$ManifestFile = Join-Path $ReleaseOut 'RELEASE_MANIFEST.txt'
$UpgradeUuid = '8c54d63a-6ac2-45ea-a474-63d0d88b1f50'
$Product = 'AIG_Studio_Main_Runtime'

foreach ($path in @($PackageOut,$AppImageOut,$LauncherSmokeDir,$ReleaseOut)) {
  if (Test-Path $path) { Remove-Item -Recurse -Force $path }
}
New-Item -ItemType Directory -Force $PackageOut,$AppImageOut,$LauncherSmokeDir,$ReleaseOut | Out-Null

# Build the actual Runtime application image first. The launcher and its sibling
# app/runtime directories are the program; the installer is a separate delivery artifact.
& jpackage --type app-image --name $Product --dest $AppImageOut --input $LibDir --main-jar 'AIG_Studio_PC.jar' --main-class com.aigstudio.desktop.DesktopAppKt --app-version $VersionName --vendor 'AIG' --description 'AIG Studio RGB CNC Workstation'
if ($LASTEXITCODE -ne 0) { throw 'Studio jpackage app-image build failed.' }

$AppImageRoot = Join-Path $AppImageOut $Product
$PortableLauncher = Join-Path $AppImageRoot ($Product + '.exe')
if (-not (Test-Path $PortableLauncher)) { throw 'Studio packaged Runtime launcher missing.' }
$LauncherBytes = [System.IO.File]::ReadAllBytes($PortableLauncher)
if ($LauncherBytes.Length -lt 2 -or $LauncherBytes[0] -ne 0x4D -or $LauncherBytes[1] -ne 0x5A) {
  throw 'Studio packaged Runtime launcher is not valid PE/MZ.'
}

# Execute the packaged launcher itself. --smoke now opens the real visible production
# JFrame and captures desktop_launch.png from that live window.
# Remove prior UI evidence first; the Runtime must recreate it after the real window is visible.
$UiEvidenceDir = Join-Path $env:LOCALAPPDATA 'AIG-Studio\UI'
if (Test-Path $UiEvidenceDir) { Remove-Item -Recurse -Force $UiEvidenceDir }
$env:GITHUB_SHA = $GitSha
$LauncherProbe = Start-Process -FilePath $PortableLauncher -ArgumentList '--smoke' -WorkingDirectory $LauncherSmokeDir -PassThru
$LauncherExited = $LauncherProbe.WaitForExit(60000)
if (-not $LauncherExited) {
  Stop-Process -Id $LauncherProbe.Id -Force -ErrorAction SilentlyContinue
  throw 'Studio packaged Runtime launcher smoke timed out.'
}
$LauncherProbe.Refresh()
if ($LauncherProbe.ExitCode -ne 0) {
  throw ('Studio packaged Runtime launcher smoke failed with exit code ' + $LauncherProbe.ExitCode)
}
foreach ($name in $RequiredSmokeEvidence) {
  $evidencePath = Join-Path $LauncherSmokeDir $name
  if (-not (Test-Path $evidencePath)) { throw "Studio packaged launcher evidence missing: $name" }
}
foreach ($name in @('REMOVED_CELLS.txt','3D_RUNTIME_EVIDENCE.txt','3D_RUNTIME_SHA256.txt')) {
  $evidencePath = Join-Path $LauncherSmokeDir $name
  $content = Get-Content $evidencePath -Raw
  if ($content -notmatch [regex]::Escape("SOURCE_SHA=$GitSha")) {
    throw "Studio packaged launcher evidence source mismatch: $name"
  }
}
$UiReadyMarker = Join-Path $UiEvidenceDir 'runtime-ui.ready'
if (-not (Test-Path $UiReadyMarker)) { throw 'Packaged Studio Runtime did not create UI/runtime-ui.ready' }
$UiReadyText = Get-Content $UiReadyMarker -Raw
if ($UiReadyText -notmatch 'runtime=PRODUCTION_UI' -or $UiReadyText -notmatch 'state=READY') {
  throw 'Studio UI ready marker content invalid'
}
$UiManifest = Join-Path $UiEvidenceDir 'runtime-ui.properties'
if (-not (Test-Path $UiManifest)) { throw 'Packaged Studio Runtime did not create UI/runtime-ui.properties' }
$UiManifestText = Get-Content $UiManifest -Raw
foreach ($marker in @('runtime=PRODUCTION_UI','state=READY','entry=CAD','surfaces=CAD,CAM,SIM,3AX,4AX,5AX,NC,AI','network_blocking=false')) {
  if ($UiManifestText -notmatch [regex]::Escape($marker)) { throw "Studio UI manifest missing: $marker" }
}
Write-Host 'STUDIO_WINDOWS_UI_AUTOLOAD_MANIFEST_GATE_PASS'
Write-Host 'STUDIO_WINDOWS_UI_DIRECTORY_GATE_PASS'
Write-Host 'STUDIO_WINDOWS_APP_IMAGE_LAUNCH_PASS'

# Preserve the complete portable tree because the launcher depends on its sibling
# runtime/app directories. This is the direct-to-UI Runtime artifact.
Copy-Item -Path $AppImageRoot -Destination $PortableRelease -Recurse -Force
$PortableReleaseLauncher = Join-Path $PortableRelease ($Product + '.exe')
if (-not (Test-Path $PortableReleaseLauncher)) { throw 'Studio portable Runtime launcher copy missing.' }
Compress-Archive -Path (Join-Path $PortableRelease '*') -DestinationPath $PortableZip -Force
$PortableHash = (Get-FileHash $PortableZip -Algorithm SHA256).Hash.ToLowerInvariant()
$LauncherHash = (Get-FileHash $PortableReleaseLauncher -Algorithm SHA256).Hash.ToLowerInvariant()

$EvidenceOut = Join-Path $ReleaseOut 'runtime-evidence'
New-Item -ItemType Directory -Force $EvidenceOut | Out-Null
foreach ($name in $RequiredSmokeEvidence) {
  Copy-Item (Join-Path $LauncherSmokeDir $name) (Join-Path $EvidenceOut $name) -Force
}

# Build SETUP separately. Do not label the installer as the Runtime executable.
& jpackage --type exe --name $Product --dest $PackageOut --app-image $AppImageRoot --app-version $VersionName --vendor 'AIG' --description 'AIG Studio RGB CNC Workstation' --win-upgrade-uuid $UpgradeUuid --win-per-user-install --win-dir-chooser --win-shortcut --win-menu --win-menu-group 'AIG'
if ($LASTEXITCODE -ne 0) { throw 'Studio jpackage SETUP build failed.' }

$Installer = Get-ChildItem $PackageOut -Filter '*.exe' | Select-Object -First 1
if (-not $Installer) { throw 'Studio jpackage installer missing.' }
$InstallerBytes = [System.IO.File]::ReadAllBytes($Installer.FullName)
if ($InstallerBytes.Length -lt 2 -or $InstallerBytes[0] -ne 0x4D -or $InstallerBytes[1] -ne 0x5A) {
  throw 'Studio installer is not valid PE/MZ.'
}
Copy-Item $Installer.FullName $SetupExe -Force
$InstallerHash = (Get-FileHash $SetupExe -Algorithm SHA256).Hash.ToLowerInvariant()

@(
  "$InstallerHash  AIG_Studio_SETUP.exe"
  "$PortableHash  AIG_Studio_PORTABLE.zip"
  "$LauncherHash  portable\$Product.exe"
) | Out-File $SumsFile -Encoding ascii

@(
  'product=AIG-Studio'
  "version=$VersionName"
  "git_sha=$GitSha"
  'installer=AIG_Studio_SETUP.exe'
  "installer_sha256=$InstallerHash"
  'portable_zip=AIG_Studio_PORTABLE.zip'
  "portable_zip_sha256=$PortableHash"
  "runtime_launcher=portable\$Product.exe"
  "runtime_launcher_sha256=$LauncherHash"
  'packaged_launcher_smoke=PASS'
  'runtime_evidence=WINDOWS_PACKAGED_LAUNCHER_VISIBLE_UI_CAPTURED'
  'release_state=PRODUCTION_RUNTIME_CANDIDATE_NOT_FINAL'
  'release_class=PRODUCTION_RUNTIME'
) | Out-File $ManifestFile -Encoding ascii

Write-Host ('AIG_STUDIO_VERSION=' + $VersionName)
Write-Host ('AIG_STUDIO_GIT_SHA=' + $GitSha)
Write-Host ('AIG_STUDIO_INSTALLER_SHA256=' + $InstallerHash)
Write-Host ('AIG_STUDIO_PORTABLE_ZIP_SHA256=' + $PortableHash)
Write-Host ('AIG_STUDIO_RUNTIME_LAUNCHER_SHA256=' + $LauncherHash)
Write-Host 'STUDIO_WINDOWS_PACKAGED_RUNTIME_UI_LAUNCH=PASS'

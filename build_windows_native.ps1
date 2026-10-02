$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$VersionFile = Join-Path $RepoRoot 'release-version.properties'
if (-not (Test-Path $VersionFile)) { throw 'release-version.properties is required.' }
if (-not (Test-Path (Join-Path $RepoRoot 'settings.gradle.kts'))) { throw 'AIG Studio Gradle root is missing.' }

$Version = ConvertFrom-StringData (Get-Content $VersionFile -Raw)
$VersionName = $Version.versionName
if (-not $VersionName) { throw 'Release version metadata is incomplete.' }
$VersionParts = $VersionName.Split('.')
if ($VersionParts.Count -ne 3) { throw 'Release version must be MAJOR.MINOR.PATCH.' }
$RollingMajor = [int]$VersionParts[0]
$WindowsMajor = [int][Math]::Floor($RollingMajor / 100)
$WindowsMinor = $RollingMajor % 100
$WindowsBuild = ([int]$VersionParts[1] * 1000) + [int]$VersionParts[2]
if ($WindowsMajor -lt 1 -or $WindowsMajor -gt 255 -or $WindowsBuild -gt 65535) { throw 'Release version cannot be mapped to Windows ProductVersion.' }
$WindowsAppVersion = "$WindowsMajor.$WindowsMinor.$WindowsBuild"

$GitSha = (& git -C $RepoRoot rev-parse HEAD).Trim()
if (-not $GitSha) { throw 'Unable to resolve Git commit SHA.' }

if (-not (Get-Command light.exe -ErrorAction SilentlyContinue)) { throw 'WiX Toolset 3 light.exe is required on the Windows runner.' }
if (-not (Get-Command gradle -ErrorAction SilentlyContinue)) { throw 'Gradle is required.' }
if (-not (Get-Command jpackage -ErrorAction SilentlyContinue)) { throw 'JDK 17+ jpackage is required.' }

& gradle -p $RepoRoot --no-daemon :desktop:installDist
if ($LASTEXITCODE -ne 0) { throw 'Studio desktop runtime build failed.' }

$LibDir = Join-Path $RepoRoot 'desktop\build\install\desktop\lib'
$MainJar = Join-Path $LibDir 'AIG_Studio_PC.jar'
if (-not (Test-Path $MainJar)) { throw 'Studio desktop runtime JAR missing.' }

$SmokeDir = Join-Path $RepoRoot 'build\desktop-smoke'
if (Test-Path $SmokeDir) { Remove-Item -Recurse -Force $SmokeDir }
New-Item -ItemType Directory -Force $SmokeDir | Out-Null
$env:GITHUB_SHA = $GitSha
Push-Location $SmokeDir
try {
  & java "-Daigstudio.version=$VersionName" -cp "$LibDir\*" com.aigstudio.desktop.DesktopAppKt --smoke
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
$ReleaseOut = Join-Path $RepoRoot 'release\windows'
$FinalExe = Join-Path $ReleaseOut 'AIG_Studio_5_0_RGB_FULL_RELEASE_PC.exe'
$SumsFile = Join-Path $ReleaseOut 'SHA256SUMS.txt'
$ManifestFile = Join-Path $ReleaseOut 'RELEASE_MANIFEST.txt'
$UpgradeUuid = '8c54d63a-6ac2-45ea-a474-63d0d88b1f50'
$Product = 'AIG_Studio_5_0_RGB_FULL_RELEASE_PC'

if (Test-Path $PackageOut) { Remove-Item -Recurse -Force $PackageOut }
if (Test-Path $ReleaseOut) { Remove-Item -Recurse -Force $ReleaseOut }
New-Item -ItemType Directory -Force $PackageOut | Out-Null
New-Item -ItemType Directory -Force $ReleaseOut | Out-Null

$EvidenceOut = Join-Path $ReleaseOut 'runtime-evidence'
New-Item -ItemType Directory -Force $EvidenceOut | Out-Null
foreach ($name in $RequiredSmokeEvidence) {
  Copy-Item (Join-Path $SmokeDir $name) (Join-Path $EvidenceOut $name) -Force
}

& jpackage --type exe --name $Product --dest $PackageOut --input $LibDir --main-jar 'AIG_Studio_PC.jar' --main-class com.aigstudio.desktop.DesktopAppKt --app-version $WindowsAppVersion --java-options "-Daigstudio.version=$VersionName" --vendor 'AIG' --description 'AIG Studio RGB CNC Workstation' --win-upgrade-uuid $UpgradeUuid --win-per-user-install --win-dir-chooser --win-shortcut --win-menu --win-menu-group 'AIG'
if ($LASTEXITCODE -ne 0) { throw 'Studio jpackage EXE build failed.' }

$Installer = Get-ChildItem $PackageOut -Filter '*.exe' | Select-Object -First 1
if (-not $Installer) { throw 'Studio jpackage installer missing.' }
$Bytes = [System.IO.File]::ReadAllBytes($Installer.FullName)
if ($Bytes.Length -lt 2 -or $Bytes[0] -ne 0x4D -or $Bytes[1] -ne 0x5A) { throw 'Studio installer is not valid PE/MZ.' }

Copy-Item $Installer.FullName $FinalExe -Force
$Hash = (Get-FileHash $FinalExe -Algorithm SHA256).Hash.ToLowerInvariant()
("$Hash  " + (Split-Path -Leaf $FinalExe)) | Out-File $SumsFile -Encoding ascii

@(
  'product=AIG-Studio'
  "version=$VersionName"
  "windows_app_version=$WindowsAppVersion"
  "git_sha=$GitSha"
  ('artifact=' + (Split-Path -Leaf $FinalExe))
  "sha256=$Hash"
  'release_state=PRODUCTION_RUNTIME_CANDIDATE'
  'release_class=PRODUCTION_RUNTIME'
  'runtime_evidence=WINDOWS_EXECUTABLE_SMOKE_CAPTURED'
) | Out-File $ManifestFile -Encoding ascii

Write-Host ('AIG_STUDIO_VERSION=' + $VersionName)
Write-Host ('AIG_STUDIO_WINDOWS_APP_VERSION=' + $WindowsAppVersion)
Write-Host ('AIG_STUDIO_GIT_SHA=' + $GitSha)
Write-Host ('AIG_STUDIO_EXE_SHA256=' + $Hash)
Write-Host 'STUDIO_WINDOWS_SELF_CONTAINED_BUILD=PASS'

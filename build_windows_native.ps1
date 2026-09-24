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

& gradle -p $RepoRoot --no-daemon :desktop:installDist
if ($LASTEXITCODE -ne 0) { throw 'Studio Gradle desktop runtime build failed.' }

$LibDir = Join-Path $RepoRoot 'desktop\build\install\desktop\lib'
$MainJar = Join-Path $LibDir 'AIG_Studio_PC.jar'
if (-not (Test-Path $MainJar)) { throw 'Studio desktop runtime JAR missing.' }

$SmokeDir = Join-Path $RepoRoot 'build\desktop-smoke'
if (Test-Path $SmokeDir) { Remove-Item -Recurse -Force $SmokeDir }
New-Item -ItemType Directory -Force $SmokeDir | Out-Null
Push-Location $SmokeDir
try {
  & java -cp "$LibDir\*" com.aigstudio.desktop.DesktopAppKt --smoke
  if ($LASTEXITCODE -ne 0) { throw 'Studio Windows Gradle runtime smoke failed.' }
  if (-not (Test-Path 'desktop_launch.png') -or -not (Test-Path 'desktop_3d.png') -or -not (Test-Path 'desktop_smoke.txt')) {
    throw 'Studio Windows smoke evidence missing.'
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

& jpackage --type exe --name $Product --dest $PackageOut --input $LibDir --main-jar 'AIG_Studio_PC.jar' --main-class com.aigstudio.desktop.DesktopAppKt --app-version $VersionName --vendor 'AIG' --description 'AIG Studio RGB CNC Workstation' --win-upgrade-uuid $UpgradeUuid --win-dir-chooser --win-shortcut --win-menu --win-menu-group 'AIG'
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
  "git_sha=$GitSha"
  ('artifact=' + (Split-Path -Leaf $FinalExe))
  "sha256=$Hash"
  'release_state=BUILD_ARTIFACT_ONLY_NOT_FINAL'
) | Out-File $ManifestFile -Encoding ascii

Write-Host ('AIG_STUDIO_VERSION=' + $VersionName)
Write-Host ('AIG_STUDIO_GIT_SHA=' + $GitSha)
Write-Host ('AIG_STUDIO_EXE_SHA256=' + $Hash)
Write-Host 'STUDIO_WINDOWS_SELF_CONTAINED_BUILD=PASS'

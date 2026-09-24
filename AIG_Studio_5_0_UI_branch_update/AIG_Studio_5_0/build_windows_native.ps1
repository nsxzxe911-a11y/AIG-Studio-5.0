$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $Root '..\..')).Path
$VersionFile = Join-Path $Root 'release-version.properties'
if (-not (Test-Path $VersionFile)) { throw 'release-version.properties is required.' }
$Version = ConvertFrom-StringData (Get-Content $VersionFile -Raw)
$VersionName = $Version.versionName
if (-not $VersionName) { throw 'Release version metadata is incomplete.' }

function Refresh-ProcessPath {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}

function Ensure-Tool([string]$Command, [string]$ChocolateyPackage) {
  if (Get-Command $Command -ErrorAction SilentlyContinue) { return }
  if (-not (Get-Command choco -ErrorAction SilentlyContinue)) { throw "$Command is required and Chocolatey is unavailable." }
  choco install $ChocolateyPackage -y --no-progress --limit-output
  if ($LASTEXITCODE -notin @(0, 1641, 3010)) { throw "$ChocolateyPackage installation failed." }
  Refresh-ProcessPath
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) { throw "$Command is still unavailable after installing $ChocolateyPackage." }
}

Ensure-Tool 'kotlinc' 'kotlinc'
Ensure-Tool 'light.exe' 'wixtoolset'
if (-not (Get-Command jpackage -ErrorAction SilentlyContinue)) { throw 'JDK 17+ jpackage is required.' }

$CoreDir = Join-Path $Root 'core\src\main\kotlin\com\aigstudio\core'
$DesktopDir = Join-Path $Root 'desktop\src\main\kotlin\com\aigstudio\desktop'
$Dist = Join-Path $Root 'dist'
$Jar = Join-Path $Dist 'AIG_Studio_5_0_PC.jar'
$PackageOut = Join-Path $Dist 'windows-self-contained'
$ReleaseOut = Join-Path $RepoRoot 'release\windows'
$FinalExe = Join-Path $ReleaseOut 'AIG_Studio_5_0_RGB_FULL_RELEASE_PC.exe'
$FinalHash = Join-Path $ReleaseOut 'AIG_Studio_5_0_RGB_FULL_RELEASE_PC.exe.sha256'
$UpgradeUuid = '8c54d63a-6ac2-45ea-a474-63d0d88b1f50'
$Product = 'AIG_Studio_5_0_RGB_FULL_RELEASE_PC'

New-Item -ItemType Directory -Force $Dist | Out-Null
$Sources = @(Get-ChildItem $CoreDir -Recurse -Filter '*.kt' | Sort-Object FullName | ForEach-Object { $_.FullName })
$DesktopSources = @(Get-ChildItem $DesktopDir -Recurse -Filter '*.kt' | Sort-Object FullName | ForEach-Object { $_.FullName })
if ($Sources.Count -eq 0) { throw 'No Studio core Kotlin sources found.' }
if ($DesktopSources.Count -eq 0) { throw 'No Studio desktop Kotlin sources found.' }
$Sources += $DesktopSources

& kotlinc @Sources -include-runtime -d $Jar
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $Jar)) { throw 'Studio Windows Kotlin build failed.' }

Push-Location $Dist
try {
  & java -cp (Split-Path -Leaf $Jar) com.aigstudio.desktop.DesktopAppKt --smoke
  if ($LASTEXITCODE -ne 0) { throw 'Studio Windows JAR smoke failed.' }
  if (-not (Test-Path 'desktop_launch.png') -or -not (Test-Path 'desktop_3d.png') -or -not (Test-Path 'desktop_smoke.txt')) { throw 'Studio Windows smoke evidence missing.' }
} finally { Pop-Location }

if (Test-Path $PackageOut) { Remove-Item -Recurse -Force $PackageOut }
if (Test-Path $ReleaseOut) { Remove-Item -Recurse -Force $ReleaseOut }
New-Item -ItemType Directory -Force $PackageOut | Out-Null
New-Item -ItemType Directory -Force $ReleaseOut | Out-Null

& jpackage --type exe --name $Product --dest $PackageOut --input $Dist --main-jar (Split-Path -Leaf $Jar) --main-class com.aigstudio.desktop.DesktopAppKt --app-version $VersionName --vendor 'AIG' --description 'AIG Studio RGB CNC Workstation' --win-upgrade-uuid $UpgradeUuid --win-dir-chooser --win-shortcut --win-menu --win-menu-group 'AIG'
if ($LASTEXITCODE -ne 0) { throw 'Studio jpackage EXE build failed.' }
$Installer = Get-ChildItem $PackageOut -Filter '*.exe' | Select-Object -First 1
if (-not $Installer) { throw 'Studio jpackage installer missing.' }
$Bytes = [System.IO.File]::ReadAllBytes($Installer.FullName)
if ($Bytes.Length -lt 2 -or $Bytes[0] -ne 0x4D -or $Bytes[1] -ne 0x5A) { throw 'Studio installer is not valid PE/MZ.' }

Copy-Item $Installer.FullName $FinalExe -Force
$Hash = (Get-FileHash $FinalExe -Algorithm SHA256).Hash.ToLowerInvariant()
$Hash | Out-File $FinalHash -Encoding ascii
Write-Host ('AIG_STUDIO_VERSION=' + $VersionName)
Write-Host ('AIG_STUDIO_EXE_SHA256=' + $Hash)
Write-Host 'STUDIO_WINDOWS_SELF_CONTAINED_BUILD=PASS'

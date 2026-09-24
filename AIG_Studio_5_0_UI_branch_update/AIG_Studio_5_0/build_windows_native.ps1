$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$CoreDir = Join-Path $Root 'core\src\main\kotlin\com\aigstudio\core'
$DesktopDir = Join-Path $Root 'desktop\src\main\kotlin\com\aigstudio\desktop'
$Dist = Join-Path $Root 'dist'
$Jar = Join-Path $Dist 'AIG_Studio_5_0_PC.jar'
$Out = Join-Path $Dist 'windows-self-contained'
$UpgradeUuid = '8c54d63a-6ac2-45ea-a474-63d0d88b1f50'
$Product = 'AIG_Studio_5_0_RGB_FULL_RELEASE_PC'

New-Item -ItemType Directory -Force $Dist | Out-Null
$Sources = @(
  Get-ChildItem $CoreDir -Recurse -Filter '*.kt' |
    Sort-Object FullName |
    ForEach-Object { $_.FullName }
)
$DesktopSources = @(
  Get-ChildItem $DesktopDir -Recurse -Filter '*.kt' |
    Sort-Object FullName |
    ForEach-Object { $_.FullName }
)
if ($Sources.Count -eq 0) { throw 'No Studio core Kotlin sources found.' }
if ($DesktopSources.Count -eq 0) { throw 'No Studio desktop Kotlin sources found.' }
$Sources += $DesktopSources
if (-not (Get-Command kotlinc -ErrorAction SilentlyContinue)) { throw 'kotlinc is required.' }
& kotlinc @Sources -include-runtime -d $Jar
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $Jar)) { throw 'Studio Windows Kotlin build failed.' }

Push-Location $Dist
try {
  & java -cp (Split-Path -Leaf $Jar) com.aigstudio.desktop.DesktopAppKt --smoke
  if ($LASTEXITCODE -ne 0) { throw 'Studio Windows JAR smoke failed.' }
  if (-not (Test-Path 'desktop_launch.png') -or -not (Test-Path 'desktop_3d.png') -or -not (Test-Path 'desktop_smoke.txt')) {
    throw 'Studio Windows smoke evidence missing.'
  }
} finally { Pop-Location }

if (-not (Get-Command jpackage -ErrorAction SilentlyContinue)) { throw 'JDK 17+ jpackage is required.' }
if (Test-Path $Out) { Remove-Item -Recurse -Force $Out }
New-Item -ItemType Directory -Force $Out | Out-Null
& jpackage --type exe --name $Product --dest $Out --input $Dist --main-jar (Split-Path -Leaf $Jar) --main-class com.aigstudio.desktop.DesktopAppKt --app-version 14.0.0 --vendor 'AIG' --description 'AIG Studio RGB CNC Workstation' --win-upgrade-uuid $UpgradeUuid --win-dir-chooser --win-shortcut --win-menu --win-menu-group 'AIG'
if ($LASTEXITCODE -ne 0) { throw 'Studio jpackage EXE build failed.' }
$Installer = Get-ChildItem $Out -Filter '*.exe' | Select-Object -First 1
if (-not $Installer) { throw 'Studio jpackage installer missing.' }
$FinalInstaller = Join-Path $Out ($Product + '.exe')
if ($Installer.FullName -ne $FinalInstaller) { Move-Item $Installer.FullName $FinalInstaller -Force }
$Bytes = [System.IO.File]::ReadAllBytes($FinalInstaller)
if ($Bytes.Length -lt 2 -or $Bytes[0] -ne 0x4D -or $Bytes[1] -ne 0x5A) { throw 'Studio installer is not valid PE/MZ.' }
Get-FileHash $FinalInstaller -Algorithm SHA256
Write-Host 'STUDIO_WINDOWS_SELF_CONTAINED_BUILD=PASS'

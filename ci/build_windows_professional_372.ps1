$ErrorActionPreference='Stop'
$Root=Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$VersionName=(ConvertFrom-StringData (Get-Content (Join-Path $Root 'release-version.properties') -Raw)).versionName
if($VersionName -ne '372.0.0'){throw "Expected Studio 372.0.0, got $VersionName"}
$GitSha=(& git -C $Root rev-parse HEAD).Trim()
if(-not $GitSha){throw 'Unable to resolve Git SHA.'}
if((& git -C $Root status --porcelain)){throw 'BLOCKED_DIRTY_WORKTREE'}
foreach($cmd in @('gradle','jpackage','light.exe')){if(-not(Get-Command $cmd -ErrorAction SilentlyContinue)){throw "$cmd is required."}}

$parts=$VersionName.Split('.')
$rolling=[int]$parts[0]
$WindowsAppVersion=([int][Math]::Floor($rolling/100)).ToString()+'.'+($rolling%100)+'.'+(([int]$parts[1]*1000)+[int]$parts[2])

& gradle -p $Root --no-daemon :desktop:installDist
if($LASTEXITCODE -ne 0){throw 'Studio desktop Gradle build failed.'}
$LibDir=Join-Path $Root 'desktop\build\install\desktop\lib'
$MainJar=Join-Path $LibDir 'AIG_Studio_PC.jar'
if(-not(Test-Path $MainJar)){throw "Studio main JAR missing: $MainJar"}

$ReleaseOut=Join-Path $Root 'release\windows'
$Evidence=Join-Path $ReleaseOut 'runtime-evidence'
$Smoke=Join-Path $Root 'build\desktop-professional-smoke'
$AppImageOut=Join-Path $Root 'build\studio372-app-image'
$PackageOut=Join-Path $Root 'build\studio372-package'
foreach($path in @($ReleaseOut,$Smoke,$AppImageOut,$PackageOut)){if(Test-Path $path){Remove-Item -Recurse -Force $path}}
New-Item -ItemType Directory -Force $ReleaseOut,$Evidence,$Smoke,$AppImageOut,$PackageOut|Out-Null

$env:GITHUB_SHA=$GitSha
Push-Location $Smoke
try{
  & java "-Daigstudio.version=$VersionName" -cp "$LibDir\*" com.aigstudio.desktop.DesktopAppKt --smoke
  if($LASTEXITCODE -ne 0){throw 'Studio direct Runtime smoke failed.'}
  foreach($name in @('desktop_launch.png','desktop_smoke.txt','REMOVED_CELLS.txt')){
    $p=Join-Path $Smoke $name;if(-not(Test-Path $p)){throw "Runtime evidence missing: $name"};if((Get-Item $p).Length -le 0){throw "Runtime evidence empty: $name"}
    Copy-Item $p (Join-Path $Evidence $name) -Force
  }
}finally{Pop-Location}

$DistributionName='AIG_Studio_372_Runtime'
& jpackage --type app-image --name $DistributionName --dest $AppImageOut --input $LibDir --main-jar 'AIG_Studio_PC.jar' --main-class com.aigstudio.bootstrap.DesktopBootstrapKt --app-version $WindowsAppVersion --java-options "-Daigstudio.version=$VersionName" --vendor 'AIG' --description 'AIG Studio 372 Professional RGB CNC Runtime'
if($LASTEXITCODE -ne 0){throw 'Studio app-image packaging failed.'}
$AppRoot=Join-Path $AppImageOut $DistributionName
$Launcher=Join-Path $AppRoot ($DistributionName+'.exe')
if(-not(Test-Path $Launcher)){throw 'Studio portable launcher missing.'}
$bytes=[IO.File]::ReadAllBytes($Launcher);if($bytes[0]-ne 0x4D-or$bytes[1]-ne 0x5A){throw 'Studio portable launcher PE/MZ invalid.'}

$env:AIGSTUDIO_STARTUP_EVIDENCE_DIR=$Evidence
$env:AIGSTUDIO_STARTUP_EVIDENCE_HOLD_MS='2500'
$probe=Start-Process -FilePath $Launcher -WorkingDirectory $AppRoot -PassThru
$startup=Join-Path $Evidence 'desktop_startup_page.png'
$deadline=(Get-Date).AddSeconds(20)
while((Get-Date)-lt$deadline-and-not(Test-Path $startup)){Start-Sleep -Milliseconds 250}
if(-not(Test-Path $startup)){Stop-Process -Id $probe.Id -Force -ErrorAction SilentlyContinue;throw 'Studio packaged EXE did not capture formal startup page.'}
try{Add-Type -AssemblyName System.Drawing.Common -ErrorAction SilentlyContinue;$img=[System.Drawing.Image]::FromFile($startup);$w=$img.Width;$h=$img.Height;$img.Dispose()}catch{Stop-Process -Id $probe.Id -Force -ErrorAction SilentlyContinue;throw "Studio startup PNG decode failed: $($_.Exception.Message)"}
if((Get-Item $startup).Length -le 1000-or$w-lt900-or$h-lt500){Stop-Process -Id $probe.Id -Force -ErrorAction SilentlyContinue;throw "Studio startup screenshot invalid: ${w}x${h}"}
Start-Sleep -Seconds 4
if(-not$probe.HasExited){Stop-Process -Id $probe.Id -Force -ErrorAction SilentlyContinue}
Remove-Item Env:AIGSTUDIO_STARTUP_EVIDENCE_DIR -ErrorAction SilentlyContinue
Remove-Item Env:AIGSTUDIO_STARTUP_EVIDENCE_HOLD_MS -ErrorAction SilentlyContinue

$PortableDir=Join-Path $ReleaseOut 'portable'
Copy-Item $AppRoot $PortableDir -Recurse -Force
$PortableLauncher=Join-Path $PortableDir ($DistributionName+'.exe')
$PortableZip=Join-Path $ReleaseOut 'AIG_Studio_372_PORTABLE.zip'
Compress-Archive -Path (Join-Path $PortableDir '*') -DestinationPath $PortableZip -Force

$UpgradeUuid='8c54d63a-6ac2-45ea-a474-63d0d88b1f50'
& jpackage --type exe --name $DistributionName --dest $PackageOut --app-image $AppRoot --app-version $WindowsAppVersion --vendor 'AIG' --description 'AIG Studio 372 Professional RGB CNC Runtime' --win-upgrade-uuid $UpgradeUuid --win-per-user-install --win-dir-chooser --win-shortcut --win-menu --win-menu-group 'AIG'
if($LASTEXITCODE -ne 0){throw 'Studio installer packaging failed.'}
$installer=Get-ChildItem $PackageOut -Filter '*.exe'|Select-Object -First 1
if(-not$installer){throw 'Studio installer missing.'}
$SetupExe=Join-Path $ReleaseOut 'AIG_Studio_372_SETUP.exe';Copy-Item $installer.FullName $SetupExe -Force
$setupBytes=[IO.File]::ReadAllBytes($SetupExe);if($setupBytes[0]-ne0x4D-or$setupBytes[1]-ne0x5A){throw 'Studio setup PE/MZ invalid.'}

$setupHash=(Get-FileHash $SetupExe -Algorithm SHA256).Hash.ToLowerInvariant()
$portableHash=(Get-FileHash $PortableZip -Algorithm SHA256).Hash.ToLowerInvariant()
$launcherHash=(Get-FileHash $PortableLauncher -Algorithm SHA256).Hash.ToLowerInvariant()
@("$setupHash  AIG_Studio_372_SETUP.exe","$portableHash  AIG_Studio_372_PORTABLE.zip","$launcherHash  portable\$DistributionName.exe")|Out-File (Join-Path $ReleaseOut 'SHA256SUMS.txt') -Encoding ascii
@('product=AIG-Studio',"version=$VersionName","git_sha=$GitSha",'startup_entry=com.aigstudio.bootstrap.DesktopBootstrapKt','startup_visual=startup.png','home_visual=home.png','engineering_shell_default=FALSE','startup_evidence=runtime-evidence\desktop_startup_page.png','runtime_evidence=runtime-evidence\desktop_launch.png','installer=AIG_Studio_372_SETUP.exe','portable_zip=AIG_Studio_372_PORTABLE.zip',"installer_sha256=$setupHash","portable_sha256=$portableHash","runtime_launcher_sha256=$launcherHash")|Out-File (Join-Path $ReleaseOut 'RELEASE_MANIFEST.txt') -Encoding ascii
Write-Host 'STUDIO_372_WINDOWS_PROFESSIONAL_BUILD_PASS|BOOTSTRAP_EXE|CANONICAL_STARTUP|RUNTIME_EVIDENCE|PE_MZ'

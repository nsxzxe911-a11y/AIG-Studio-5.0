# AIG Studio

AIG Studio is the Android + Windows CNC/CAD/CAM runtime project for the current AIG CNC line.

## Current main

- Version: **98.0.0**
- Runtime project root: repository root
- Android versionCode: derived automatically from the major version
- Version source: `release-version.properties`
- Android build/package entry: `build_android_release.sh`
- Android compile/target platform: **API 36 / Android 16 stable**
- Android platform downgrade gate: `:app:verifyAndroidPlatform`
- API 37 preview is not promoted to release validation until it is available from the stable SDK repository
- Adaptive refresh: Auto = interaction up to 120 Hz / idle 30 Hz / thermal 60→30 Hz caps
- Physical Android device path: up to 120 Hz
- Emulator path: capped at 60 Hz / idle 30 Hz so PC emulation does not distort phone performance expectations
- Monitoring default: **CPU temperature + GPU temperature only**
- FPS / RAM / Dropped Frames / full System HUD remain available as optional monitors
- FPS / refresh / temperature / HUD / RGB / thermal controls apply live
- 3D/SIM render-quality changes set a restart-required marker and apply fully after app restart
- CPU/GPU temperatures are read from Android thermal zones when exposed; unavailable sensors show `N/A`
- Battery temperature is no longer presented as CPU/GPU temperature
- CPU/GPU overheat warning is wired to the real temperature probe; the setting is not a placeholder
- FPS/System HUD remain optional and default off
- Emulator verification profile keeps optional heavy monitors off by default
- Emulator monitor sampling: system 2.5 s / temperature 5 s
- Emulator detection has one source of truth: `RuntimeDeviceProfile`
- Core regression locks physical 120 Hz vs emulator 60 Hz policy
- Thermal refresh listener is lifecycle-bound and removed on Activity destroy
- Core regression locks the adaptive 120/30/60/30 policy against regression
- Android Gradle Plugin: **9.4.0** / Gradle: **9.6.0**
- Android Kotlin compilation uses AGP 9 built-in Kotlin; core/desktop Kotlin JVM plugin is **2.2.10**
- Windows build/package entry: `build_windows_native.ps1`
- Android and Windows Kotlin compilation use the same Gradle/Kotlin toolchain
- Windows release runner is pinned to `windows-2025`; WiX is supplied by the runner image, not installed during the build
- Core regression: Gradle task `:core:coreRegression`, executed by the Android release entry
- Release workflow: `.github/workflows/build-download.yml`
- Release outputs: `release/android/`, `release/windows/`, `release/source/`
- Stable Gradle project identity: `AIGStudio`

Version numbers only move forward. Generated build outputs are excluded from version control and do not replace source as the release truth.

## Direct validation evidence for 98.0.0

- Validated source SHA: `0a73647fc2cfd3d4fca9d64e8542a36ce7bb285b`
- GitHub Actions run: `36061841597` = **SUCCESS**
- Android + source job: **SUCCESS**
- Windows EXE job: **SUCCESS**
- Android core regression: **ALL TESTS PASSED**
- Android package: `com.aigstudio.app`, versionName `98.0.0`, versionCode `980000`, compile/targetSdk 36
- APK verification: zipalign + apksigner + package + targetSdk 36 + SHA256 = **PASS**
- Android release manifest version: `98.0.0` = workflow version
- Android release manifest git_sha: `0a73647fc2cfd3d4fca9d64e8542a36ce7bb285b` = workflow SHA
- Source release manifest version/git_sha: **MATCH**
- Android/source artifact: `AIG-Studio-Android-and-Source` (artifact 10834760673, digest `sha256:a89b4b7b5f7b9dcb55bea1d9257201e4c12b9b07d2dced325d8d5afda022d554`)
- Windows release wrapper remains fail-closed through explicit subprocess exit-code checks.
- Windows build + source-bound smoke + PE/MZ + SHA256 verification: **PASS**
- Windows release manifest version/git_sha: **MATCH**
- Windows EXE SHA256: `3e7e75b4dbc9b524fc1332995e0809931b880f0d060e9fffc1f088991a35f1ad`
- Windows artifact: `AIG-Studio-Windows-EXE` (artifact 10834378799, digest `sha256:51d6055beb3fbe032a499f2c8cdeef6b2cda4972ff48ca7686f81dc3f64d8d26`)
- Artifact and smoke evidence remain bound to the exact workflow SHA/version.
- The workflow trigger event is not itself treated as PASS; PASS requires the executed build/verify jobs and bound artifacts above.
- The APK remains a debug/installable artifact; production signing/real-device launch gates are still separate from FINAL.
## Release policy

A version bump does not mean APK/EXE/FINAL PASS.

Current-version evidence is required before FINAL, including build, artifact integrity, install/launch, regression and CNC safety. The release workflow is manual-only; no workflow run means no current build verdict.

## Runtime direction

- Real editable CAD geometry, not static images.
- CAM toolpaths remain separate from drawing geometry.
- Simulation must represent real machining/material removal behavior.
- Fanuc NC safety rules and 0.001 mm precision remain mandatory.
- 3D/5X interaction must be real and movable.
- Mobile UI follows the approved RGB/glass visual direction.
- `ChatGPT AI 更新` is the canonical update feature name.

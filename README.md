# AIG Studio

AIG Studio is the Android + Windows CNC/CAD/CAM runtime project for the current AIG CNC line.

## Current main

- Version: **81.0.0**
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

## Direct validation evidence for 81.0.0

- Validated source SHA: `276f6021e08e7a937edacad36fb0671865dc5618`
- GitHub Actions run: `36052502788` = **SUCCESS**
- Android + source job: **SUCCESS**
- Windows EXE job: **SUCCESS**
- Android core regression: **ALL TESTS PASSED**
- Android package: `com.aigstudio.app`, versionName `81.0.0`, versionCode `810000`, compile/targetSdk 36
- APK verification: zipalign + apksigner + package + targetSdk 36 + SHA256 = **PASS**
- Android release manifest version: `81.0.0` = workflow version
- Android release manifest git_sha: `276f6021e08e7a937edacad36fb0671865dc5618` = workflow SHA
- Source release manifest version/git_sha: **MATCH**
- Android/source artifact: `AIG-Studio-Android-and-Source` (artifact 10830399674, digest `sha256:e603aae8a943bb715ba8a197713973e6de6d77b27b134922b679baba375bbfc2`)
- Windows release wrapper remains fail-closed through explicit subprocess exit-code checks.
- Windows build + source-bound smoke + PE/MZ + SHA256 verification: **PASS**
- Windows release manifest version/git_sha: **MATCH**
- Windows EXE SHA256: `907fe8f04489d1d7d35b69749dff36ab4447a8357cfc0639b3beda95e8be9d7a`
- Windows artifact: `AIG-Studio-Windows-EXE` (artifact 10831660194, digest `sha256:0e9f237529790faadb2f186de7bae5fbb900a5a0d3e592d3ba2e403d23942f66`)
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

# AIG Studio

AIG Studio is the Android + Windows CNC/CAD/CAM runtime project for the current AIG CNC line.

## Current main

- Version: **33.0.0**
- Android versionCode: derived automatically from the major version
- Version source: repository-root `release-version.properties`
- Android build/package entry: repository-root `build_android_release.sh`
- Windows build/package entry: repository-root `build_windows_native.ps1`
- Release workflow: repository-root `.github/workflows/build-download.yml`
- Release outputs: repository-root `release/android/`, `release/windows/`, `release/source/`
- Stable Gradle project identity: `AIGStudio`

Version numbers only move forward. Generated build outputs are excluded from version control and do not replace source as the release truth.

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

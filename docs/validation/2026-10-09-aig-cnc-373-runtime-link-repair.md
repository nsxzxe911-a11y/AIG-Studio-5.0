# AIG CNC 373 Runtime Link Repair Validation

Date: 2026-10-09
Branch: `feat/aig-cnc-373-runtime-link-repair`
Version: `373.0.0`
Scope: focused source/runtime-link validation only; broad automatic regression remains disabled by product policy.

## Implemented

- Shared Settings source of truth for locale, renderer selection, 3D GPU policy, FPS, visual quality, power, RGB, HUD and precision.
- Android Settings bridge: SharedPreferences is persistence only; production locale and renderer selection use shared state.
- Android language selector (`zh-TW` / `en-US`) and dynamic AlertDialog window localization.
- Android renderer truth: `AUTO` selectable; AIG CNC has no production GLES/Vulkan surface/backend in this line, so OpenGL ES / Vulkan are not selectable as implemented backends. HWUI remains platform truth, not relabeled native GLES/Vulkan success.
- Windows language/renderer/FPS shared Settings wiring.
- Windows renderer truth: D3D12 and D3D11 visible but disabled until native backends exist; Java2D is explicitly 2D/diagnostic only.
- Canonical production action contract across HOME/CAD/CAM/SIM/3AX~6AX/NC/AI/Settings.
- Windows CAD CHAMFER/FILLET linked to real `chamferCommand` / `filletCommand` geometry commands.
- Windows NC SINGLE BLOCK / DRY RUN / STEP linked to `NcExecutionTimeline` as `LOCAL PREVIEW ONLY`; no machine-control claim.
- Existing CAM AUTO/MANUAL, Safe-Z, manual avoidance, true material-removal/risk scanner, 3~6AX state and RuntimeLinkStore were confirmed and included in focused action evidence.

## Explicitly disabled / not falsely claimed

- CAD Layer runtime: no complete product layer state/engine chain exists yet.
- AI main-program Working Copy / Verified Main: not connected. `VerifiedWorkingCopy` currently belongs to update-package staging and is not reused as a fake NC-main vault.
- Windows visual quality / power / RGB / HUD runtime settings: no complete Desktop runtime consumer yet; action contract marks this link disabled rather than pretending persistence equals runtime application.
- Windows D3D11/D3D12 and Android Vulkan/GLES are not claimed active without a real production backend and activation evidence.
- Native Android GLES/Vulkan still remain disabled in this line; binary validation does not relabel HWUI as a native GPU backend.

## Fresh focused acceptance

The following command set completed successfully against the 373 tree:

- `:core:sharedSettingsContractRegression`
- `:core:settingsLocalizationContractRegression`
- `:core:settingsAndroidWiringRegression`
- `:core:settingsDesktopWiringRegression`
- `:core:rendererCapabilityNegotiationRegression`
- `:core:rendererVisualQualityWiringRegression`
- `:core:runtimeLinkRegression`
- `:core:productionActionLinkRegression`
- `:core:release373Regression`
- `:app:compileDebugKotlin`
- `:desktop:compileKotlin`
- `git diff --check`

Result: `BUILD SUCCESSFUL`.

Observed non-blocking compiler warnings:

- Android uses existing deprecated `scaledDensity` access in several pre-existing locations.
- Desktop has an existing redundant `else` on an exhaustive `when`.

No broad automatic regression or external workflow was triggered.

## Binary validation PASS

### Android / Nox

- APK: `release/android/AIG_CNC_373_FULL_INSTALLABLE.apk`
- SHA-256: `47494f2df4c7ec6385b1edbc28fec32413828933e43d8e9946bb38caed0fe48f`
- Package: `com.aigstudio.app`, versionName `373.0.0`, versionCode `3730000`, targetSdk 36
- Nox_1 ABI: `x86_64`, ADB serial `127.0.0.1:52025`
- Cold launch: 631 ms; MainActivity focused
- Visible surface: **AIG CNC** black/RGB HOME, not an engineering shell
- Renderer claim remains truthful: no native GLES/Vulkan activation is claimed for this line.

### Windows / x86-64 portable Runtime

- Portable launcher: `release/windows/portable/AIG_CNC_Runtime.exe`
- PE machine: `0x8664` (x86-64)
- EXE SHA-256: `8019af92b163cfd29bce9e5d2c1bde5a50b49f7f74e08e0f1858577c104eb92a`
- Portable ZIP SHA-256: `17a2ece5664fe48a739bdffb7166b63169269fbeae05f045d83a6fe13aac6072`
- Packaged launcher smoke: PASS
- `OFFICIAL_RGB_UI=PASS`
- `MATERIAL_REMOVAL=PASS`, `REMOVED_CELLS=7500`
- `5X_DYNAMIC_TOOL_CHANGE=PASS`
- `5X_DYNAMIC_AXIS_CHANGE=PASS`
- `5X_PROGRESSIVE_MATERIAL_REMOVAL=PASS`
- `ABS_MODE=G90`, `MASTER_ORIGIN=X0.000 Y0.000 Z0.000`
- Setup installer: `release/windows/AIG_CNC_373_SETUP.exe`
- Setup SHA-256: `060dbd9fbb208974f101e4b6e1dc7801aa76dd4d62cbf72d31ea28f24fbe23af`
- Installer build: PASS using official portable WiX 3.14.1 binaries
- Per-user install: PASS, version `3.73.0`
- Installed Runtime smoke: PASS; `OFFICIAL_RGB_UI=PASS`, `REMOVED_CELLS=7500`, 5AX dynamic tool/axis/progressive material removal PASS
- Uninstall: PASS; install directory and uninstall registry entry removed.

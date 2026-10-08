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
- Fresh APK/EXE install, launch, RGB HOME and interactive device evidence are still pending and are not represented by compile PASS.

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

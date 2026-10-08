# AIG CNC 373 Runtime Link Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote AIG CNC 372 to 373 and connect production Settings/localization/renderer selection to shared state and truthful runtime capability, then add an executable action-link audit for all product pages.

**Architecture:** Add one shared settings contract in `core`, keep Android SharedPreferences and Windows Preferences as persistence adapters, and route language/renderer/FPS/quality/power/RGB/HUD/precision changes through shared state before runtime consumers. Existing working refresh/visual-quality chains are preserved. Renderer selection is separate from activation truth; unavailable native backends remain visible but disabled.

**Tech Stack:** Kotlin/JVM 17, Android API 36, Swing desktop, Gradle, existing `RendererCapabilityNegotiator`, `UiPresentationState`, `AdaptiveRefreshController`, `VisualQualityRuntime`, `RuntimeLinkStore`.

**Spec:** `E:/AIG/AIG/AIG-II/docs/superpowers/specs/2026-10-09-aig-453-full-runtime-link-repair-design.md`

## Global Constraints

- Version only increases; target AIG CNC `373.0.0`.
- Production UI remains RGB HOME first; engineering shell is not a startup surface.
- Android Vulkan and Windows D3D11/D3D12 must not report ACTIVE without real backend/first-present evidence.
- Current AIG CNC tree has no production GLES backend; `ANDROID_OPENGL_ES` is disabled in 373 until real GLES is implemented.
- Java2D/HWUI may be shown only as platform/diagnostic truth, never relabeled native 3D GPU.
- Engine numeric truth remains 0.001 mm.
- Do not run disabled broad regression tasks; use focused gates and compile checks only.

## Review Focus

- Selecting an unavailable renderer must fail closed and retain the prior valid selection.
- Locale change must refresh both Activity-root controls and dynamic AlertDialog windows.
- Persisted setting values must restore into shared state on the next startup.
- Android/Windows common setting ids must remain identical while renderer options are platform-specific.
- Existing working `AdaptiveRefreshController -> VisualQualityRuntime` and precision paths must not regress.

---

### Task 1: Shared Settings Contract

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/SharedSettingsContract.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/SharedSettingsContractRegression.kt`
- Modify: `core/build.gradle.kts`

**Interfaces:**
- Produces: `RendererSelection`, `RendererSettingOption`, `SharedSettingsSnapshot`, `SharedSettingsStore`, `SharedSettingsContract.rendererOptions(...)`, `SharedSettingsContract.selectable(...)`.
- Consumes: existing `RendererPlatform`, `RendererBackend`, `RendererCapabilitySnapshot`, `FpsMode`, `PowerMode`.

- [ ] **Step 1: Write failing contract regression** proving defaults, common setting ids, Android/Windows renderer option truth, and fail-closed selection.
- [ ] **Step 2: Run `gradlew.bat :core:sharedSettingsContractRegression`** and verify RED because the contract does not exist.
- [ ] **Step 3: Implement the minimal shared contract/store** without Android/Swing dependencies.
- [ ] **Step 4: Run `gradlew.bat :core:sharedSettingsContractRegression`** and verify PASS.
- [ ] **Step 5: Commit** `feat(settings): add shared settings contract`.

### Task 2: Localization and Production Locale State

**Files:**
- Modify: `core/src/main/kotlin/com/aigstudio/core/UiLocalizationRegistry.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/UiPresentationState.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/SettingsLocalizationContractRegression.kt`
- Modify: `core/build.gradle.kts`

**Interfaces:**
- Consumes: `SharedSettingsStore` from Task 1.
- Produces: complete `settings.*` keys for zh-TW/en-US and `SharedSettingsStore.selectLocale(localeId)` synchronized with `UiPresentationState`.

- [ ] **Step 1: Write failing localization regression** for required Settings keys and production locale mutation.
- [ ] **Step 2: Run focused regression and verify RED.**
- [ ] **Step 3: Add keys and locale synchronization.**
- [ ] **Step 4: Run focused regression and verify PASS.**
- [ ] **Step 5: Commit** `feat(settings): connect locale state and keys`.

### Task 3: Android Settings / Dialog / Renderer Wiring

**Files:**
- Create: `app/src/main/java/com/aigstudio/app/SharedSettingsAndroidBridge.kt`
- Modify: `app/src/main/java/com/aigstudio/app/MainActivity.kt`
- Modify: `app/src/main/java/com/aigstudio/app/RuntimeLocalizationAndroidInstaller.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/SettingsAndroidWiringRegression.kt`
- Modify: `core/build.gradle.kts`

**Interfaces:**
- Consumes: shared settings store and renderer options from Tasks 1-2.
- Produces: Android load/apply persistence bridge, Language selector, truthful Renderer selector, dialog-window localization refresh, shared-state-derived Settings summary.

- [ ] **Step 1: Write failing source/wiring regression** requiring bridge, language selector, renderer selector, dialog-window refresh, and no selectable fake GLES/Vulkan.
- [ ] **Step 2: Run focused regression and verify RED.**
- [ ] **Step 3: Implement bridge and UI wiring.** Preserve existing `AdaptiveRefreshController`, `VisualQualityRuntime`, RGB/HUD and precision consumers.
- [ ] **Step 4: Run `gradlew.bat :core:settingsAndroidWiringRegression :app:compileDebugKotlin`** and verify PASS.
- [ ] **Step 5: Commit** `feat(android): wire shared settings and localization`.

### Task 4: Windows Settings / Renderer Wiring

**Files:**
- Create: `desktop/src/main/kotlin/com/aigstudio/desktop/SharedSettingsDesktopBridge.kt`
- Modify: `desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt`
- Modify: `desktop/src/main/kotlin/com/aigstudio/desktop/RuntimeLocalizationDesktopInstaller.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/SettingsDesktopWiringRegression.kt`
- Modify: `core/build.gradle.kts`

**Interfaces:**
- Consumes: shared settings contract from Tasks 1-2.
- Produces: Windows Language/Renderer selectors with `AUTO`, disabled D3D12/D3D11, Java2D diagnostic truth and shared-state summaries.

- [ ] **Step 1: Write failing desktop wiring regression.**
- [ ] **Step 2: Run focused regression and verify RED.**
- [ ] **Step 3: Implement bridge and Settings UI wiring.**
- [ ] **Step 4: Run `gradlew.bat :core:settingsDesktopWiringRegression :desktop:compileKotlin`** and verify PASS.
- [ ] **Step 5: Commit** `feat(desktop): wire shared settings and renderer selector`.

### Task 5: Product Page Action Link Audit

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/ProductionActionContract.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/ProductionActionLinkRegression.kt`
- Modify: `core/build.gradle.kts`
- Modify only the Android/Desktop page sources that the new audit proves are broken.

**Interfaces:**
- Produces: canonical action ids for `HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI/SETTINGS`, availability state (`CONNECTED` or `DISABLED` with reason key), and audit helpers.
- Consumes: existing page callbacks/runtime commands; does not replace working machining algorithms.

- [ ] **Step 1: Write failing action-link regression** that inventories enabled production actions and rejects enabled no-op/status-only placeholders.
- [ ] **Step 2: Run focused regression and record exact broken action ids.**
- [ ] **Step 3: Repair only the proven broken links or mark genuinely unavailable actions Disabled with localized reason.**
- [ ] **Step 4: Re-run focused regression plus `:core:runtimeLinkRegression` and verify PASS.**
- [ ] **Step 5: Commit** `fix(runtime): connect product page actions`.

### Task 6: Promote 373 and Focused Acceptance

**Files:**
- Modify version/binding files used by the AIG CNC release line.
- Create/update validation note under `docs/validation/`.

**Interfaces:**
- Produces: final AIG CNC 373 exact SHA for AIG-II 453 binding.

- [ ] **Step 1: Write failing release-version regression for `373.0.0`.**
- [ ] **Step 2: Verify RED on the 372 baseline.**
- [ ] **Step 3: Promote version metadata to `373.0.0`.**
- [ ] **Step 4: Run focused settings/localization/renderer/action gates plus Android/Desktop compile checks; run `git diff --check`.**
- [ ] **Step 5: Commit** `release: promote AIG CNC 373 runtime link repair` and record final SHA.
# AIG RGB Global Skin V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply one AIG RGB Glass semantic skin across every formal AIG Studio / AIG-II Runtime surface while preserving separate mobile and Windows layouts and leaving all machining callbacks unchanged.

**Architecture:** Each repo gets a small platform-neutral `AigRgbGlobalSkinV1` contract containing the same 22 surface IDs, palette, widget roles, state semantics, aliases, optional-art policy and red-action hard-lock. Existing Android/Windows theme helpers consume that contract through thin adapters; page builders keep their current layout and callback logic. Skin-only failures fail open to procedural RGB Glass and never trigger regression, rollback, downgrade, engineering-shell fallback or version-control writes.

**Tech Stack:** Kotlin/JVM, Android Views, Swing/AWT, Python focused verifiers, Gradle.

**Spec:** `docs/superpowers/specs/2026-10-05-aig-rgb-global-skin-v1-design.md`

## Global Constraints

- Formal Runtime UI only; engineering shell is never the initial or primary UI.
- Traditional Chinese first; CAD/CAM/SIM/NC/3AX/4AX/5AX/6AX/G/M remain unchanged.
- Background `#020407`; panel `#07111B`; semi-transparent RGB Glass.
- Visual states: NORMAL / PRESSED / SELECTED / DISABLED / WARNING / ALARM.
- Red is status/alarm only and must never invoke regression, rollback, downgrade or version changes.
- `AI_VERSION_CONTROL_WRITE_ENABLED=false`, `RED_CONTROL_CALLBACK_ENABLED=false`, auto/manual rollback/downgrade hard-locks remain false.
- Android and Windows keep separate responsive layout geometry while consuming the same semantic skin contract.
- Existing CAD/CAM/SIM/NC/3AX–6AX callbacks remain authoritative; skin code never duplicates machining logic.
- Missing/invalid optional artwork is WARNING + procedural fallback; Runtime continues.
- No network is required to render the skin.
- Deep CAD/CAM/SIM/NC regression is not run for this skin-only change unless a machining core file is touched.
- **Deferred to the next phase:** button regrouping/redesign and project-name changes. Do not implement them in this plan.

## Review Focus

- Unknown/legacy surface aliases must normalize to a safe formal surface without crashing or showing engineering-shell styling.
- Missing artwork on any surface must preserve live controls and use procedural RGB Glass.
- ALARM/red state must have no callable version-control path.
- Mobile portrait/landscape and Windows layout geometry must remain independent while colors/state semantics stay equal.
- Theme application must not recolor or replace machining canvas geometry/toolpath/material-removal content as fake UI.

---

### Task 1: Studio shared semantic skin contract

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/AigRgbGlobalSkin.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/AigRgbGlobalSkinRegression.kt`
- Modify: `core/build.gradle.kts`
- Create: `ci/verify_aig_rgb_global_skin_v1.py`

**Interfaces:**
- Consumes: no new runtime dependency.
- Produces:
  - `enum class AigRgbSurfaceId`
  - `enum class AigRgbWidgetRole`
  - `enum class AigRgbVisualState`
  - `data class AigRgbSurfaceSpec`
  - `object AigRgbGlobalSkinV1`
  - `fun AigRgbGlobalSkinV1.normalizeSurface(raw:String):AigRgbSurfaceId`
  - `fun AigRgbGlobalSkinV1.surface(raw:String):AigRgbSurfaceSpec`
  - `fun AigRgbGlobalSkinV1.stateColor(state:AigRgbVisualState):Int`
  - `fun AigRgbGlobalSkinV1.versionControlActionAllowed(state:AigRgbVisualState):Boolean`

- [ ] **Step 1: Write the failing Studio regression**

Assert exactly 22 formal surface IDs:
`HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI, SETTINGS, VIEW, PHOTO, CORNER, EDIT, FILE, TOOL, WORK, ALARM, MONITOR, SYNC, LINK`; aliases `3D->SIM`, `5X->5AX`, `6X->6AX`, `NC_EDIT->NC`; palette background `0x020407`, panel `0x07111B`; states and widget roles from the spec; `versionControlActionAllowed(ALARM)==false` and also false for every other state.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `gradlew.bat :core:rgbGlobalSkinRegression --console=plain`
Expected: FAIL because `AigRgbGlobalSkinV1` is not defined.

- [ ] **Step 3: Implement the minimal platform-neutral contract**

Keep Android `Color` / Swing `Color` types out of core; store semantic colors as RGB integers. Unknown strings normalize to `HOME` only as a visual fallback and never as a navigation action.

- [ ] **Step 4: Add the focused Gradle task and static verifier**

`rgbGlobalSkinRegression` runs only `AigRgbGlobalSkinRegression`. `verify_aig_rgb_global_skin_v1.py` verifies all 22 surfaces, hard-lock tokens and that no rollback/downgrade callback symbol appears in the skin contract.

- [ ] **Step 5: Run GREEN verification**

Run: `gradlew.bat :core:rgbGlobalSkinRegression --console=plain`
Expected: `AIG_RGB_GLOBAL_SKIN_PASS|22_SURFACES|BLACK_020407|PANEL_07111B|RED_STATUS_ONLY`

Run: `python ci/verify_aig_rgb_global_skin_v1.py`
Expected: `AIG_RGB_GLOBAL_SKIN_STATIC_PASS|22_SURFACES|NO_VERSION_CALLBACK`

- [ ] **Step 6: Commit**

`git commit -m "feat: add Studio global RGB skin contract"`

### Task 2: Studio Android skin adapter without layout rewrite

**Files:**
- Create: `app/src/main/java/com/aigstudio/app/AigRgbAndroidSkinAdapter.kt`
- Modify: `app/src/main/java/com/aigstudio/app/StudioThemePackRuntime.kt`
- Modify: `app/src/main/java/com/aigstudio/app/MainActivity.kt`
- Test: extend `ci/verify_aig_rgb_global_skin_v1.py`

**Interfaces:**
- Consumes: Task 1 `AigRgbGlobalSkinV1`.
- Produces:
  - `object AigRgbAndroidSkinAdapter`
  - `fun color(rgb:Int):Int`
  - `fun surfaceAccent(surface:String):Int`
  - `fun stateColor(state:AigRgbVisualState):Int`
  - `fun bind(button:RgbGlowButton,surface:String,role:AigRgbWidgetRole):Unit`

- [ ] **Step 1: Extend the verifier to fail before Android binding exists**

Assert `StudioThemePackRuntime` exposes an `aig_rgb_global_v1` palette sourced from Task 1 values and `MainActivity.RgbGlowButton` can bind a semantic surface/role without changing its click listener.

- [ ] **Step 2: Run verifier and confirm RED**

Run: `python ci/verify_aig_rgb_global_skin_v1.py`
Expected: FAIL with `ANDROID_ADAPTER_MISSING` or equivalent focused code.

- [ ] **Step 3: Implement Android adapter and minimal bridges**

Keep `MainActivity` page structure intact. Route existing `StudioProductionTheme` / `RgbGlowButton` visual reads through `AigRgbAndroidSkinAdapter`. Add a semantic `surfaceId` / `widgetRole` binding path at existing shared button/page helper points; do not rewrite individual callbacks or machining canvases.

- [ ] **Step 4: Verify skin coverage and callback preservation statically**

The verifier must prove every formal surface can resolve an Android semantic skin, existing navigation labels for CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI remain present, and no skin method calls `performClick()` or version-control APIs.

- [ ] **Step 5: Compile Android when device/workspace is available**

Run: `gradlew.bat :app:compileDebugKotlin --console=plain`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 6: Commit**

`git commit -m "feat: apply global RGB skin to Studio Android"`

### Task 3: Studio Windows skin adapter without mobile geometry leakage

**Files:**
- Create: `desktop/src/main/kotlin/com/aigstudio/desktop/AigRgbDesktopSkinAdapter.kt`
- Modify: `desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt`
- Test: extend `ci/verify_aig_rgb_global_skin_v1.py`

**Interfaces:**
- Consumes: Task 1 `AigRgbGlobalSkinV1`.
- Produces:
  - `object AigRgbDesktopSkinAdapter`
  - `fun color(rgb:Int):java.awt.Color`
  - `fun surfaceAccent(surface:String):java.awt.Color`
  - `fun applyPanel(panel:JComponent,surface:String,role:AigRgbWidgetRole):Unit`
  - `fun applyButton(button:JButton,surface:String,role:AigRgbWidgetRole):Unit`

- [ ] **Step 1: Add failing verifier assertions for Desktop**

Require `RuntimeGlassPanel`, `AdaptiveGlassToolbar`, `CadToolGrid`, `GlassActionButton` and shared status/panel factories to obtain palette/state semantics from the adapter instead of independent legacy RGB constants where they are chrome.

- [ ] **Step 2: Run verifier and confirm RED**

Run: `python ci/verify_aig_rgb_global_skin_v1.py`
Expected: focused Desktop binding failure.

- [ ] **Step 3: Implement Desktop adapter and replace chrome palette reads**

Preserve Swing layout classes, dimensions, keyboard shortcuts and callbacks. Do not copy Android layout sizes into Desktop. Do not recolor CAD/SIM geometry primitives via this adapter; only UI chrome/HUD/control surfaces.

- [ ] **Step 4: Verify Desktop surface coverage**

Static verifier checks all 22 semantic surfaces, no engineering-shell fallback token, and no rollback/downgrade/regression callback from ALARM/red state.

- [ ] **Step 5: Compile Windows when device/workspace is available**

Run: `gradlew.bat :desktop:compileKotlin --console=plain`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 6: Commit**

`git commit -m "feat: apply global RGB skin to Studio Windows"`

### Task 4: AIG-II shared semantic skin contract and surface-registry expansion

**Files:**
- Create: `shared/aigii/AigRgbGlobalSkin.kt`
- Modify: `shared/aigii/EnvironmentSettings.kt`
- Create: `tests/aigii/AigRgbGlobalSkinRegression.kt`
- Modify: `desktop/build.gradle.kts`
- Create: `ci/verify_aig_rgb_global_skin_v1.py`

**Interfaces:**
- Consumes: spec values; names/signatures mirror Task 1 under package `aigii`.
- Produces: the same 22 surface IDs, aliases, palette, roles, states and hard-lock semantics for AIG-II.

- [ ] **Step 1: Write failing AIG-II regression**

Assert the exact same semantics as Task 1 and require existing `RgbSurfaceSkinContract` to cover all 22 formal surfaces instead of only CAD/CAM/SIM/AXIS/NC. Existing legacy aliases remain accepted.

- [ ] **Step 2: Run focused test and verify RED**

Run: `gradlew.bat :desktop:rgbGlobalSkinRegression --console=plain`
Expected: FAIL before the expanded contract exists.

- [ ] **Step 3: Implement contract and expand `RgbSurfaceSkinContract`**

Preserve current backdrop skin IDs and user preferences. Add defaults for new surfaces without changing machining state. `AXIS` remains a compatibility alias; formal 3AX/4AX/5AX/6AX entries resolve separately.

- [ ] **Step 4: Run GREEN verification**

Expected: `AIGII_RGB_GLOBAL_SKIN_PASS|22_SURFACES|BLACK_020407|PANEL_07111B|RED_STATUS_ONLY`.

- [ ] **Step 5: Commit**

`git commit -m "feat: expand AIG-II global RGB skin contract"`

### Task 5: AIG-II Android and Windows adapters

**Files:**
- Modify: `app/src/main/java/com/aigii/app/ThemeServices.kt`
- Modify: `app/src/main/java/com/aigii/app/AdaptiveProductionNav.kt`
- Modify: `app/src/main/java/com/aigii/app/OfficialHomeScene.kt`
- Modify: `desktop/aigii/DesktopApp.kt`
- Create: `desktop/aigii/AigRgbDesktopSkinAdapter.kt`
- Test: extend `ci/verify_aig_rgb_global_skin_v1.py`

**Interfaces:**
- Consumes: Task 4 `AigRgbGlobalSkinV1`.
- Produces: Android `AigThemeRuntime`/`GlowButton` and Windows `GlowButton`/panel chrome bound to the same semantic surface/state data.

- [ ] **Step 1: Make verifier RED for incomplete AIG-II adapters**

Require HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI, SETTINGS and all work/system pages to resolve through the global contract; require the existing `GlowButton.refreshThemeAll()` path to remain live.

- [ ] **Step 2: Implement Android binding through existing theme services**

Extend `AigUiTheme.surfaceProfiles` / resolver usage instead of creating a second palette. Preserve existing Android layout and all onClick callbacks.

- [ ] **Step 3: Implement Windows binding through the Desktop adapter**

Keep `DesktopRgbSurfaceProfile`, `DesktopRgbWidgetRoleProfile` and Swing geometry platform-specific, but map their semantic inputs to Task 4 surface/state data.

- [ ] **Step 4: Verify missing-art fail-open**

Focused verifier asserts that optional visual absence returns WARNING/procedural fallback and never changes tabs, callbacks, version, rollback state or engineering-shell entry.

- [ ] **Step 5: Compile both targets when device/workspace is available**

Run: `gradlew.bat :app:compileDebugKotlin :desktop:compileKotlin :desktop:verifyDesktopRuntimeResources --console=plain`
Expected: `BUILD SUCCESSFUL` plus existing resource gate pass.

- [ ] **Step 6: Commit**

`git commit -m "feat: apply global RGB skin to AIG-II runtimes"`

### Task 6: Dual-project semantic parity and hard-lock verification

**Files:**
- Create in AIG-II: `ci/verify_aig_rgb_global_skin_dual_project.py`
- Modify in both repos: `AGENTS.md`
- Modify in both repos: current SDD progress ledger for this plan

**Interfaces:**
- Consumes: Task 1 and Task 4 contracts plus Android/Windows adapters.
- Produces: a cross-repo parity result only; no Runtime mutation.

- [ ] **Step 1: Write parity verifier**

Arguments: `<studio-root> <aigii-root>`. Compare normalized 22 surface IDs, aliases, base palette, widget roles, visual states, missing-art policy and `versionControlActionAllowed=false` semantics.

- [ ] **Step 2: Verify intentional drift is detected without rollback**

A temporary copied fixture with one changed palette/surface token must produce `AIG_RGB_GLOBAL_SKIN_DUAL_FAIL|...|STATUS_ONLY|NO_ROLLBACK`.

- [ ] **Step 3: Verify real dual checkouts match**

Run: `python ci/verify_aig_rgb_global_skin_dual_project.py <studio-root> <aigii-root>`
Expected: `AIG_RGB_GLOBAL_SKIN_DUAL_PASS|22_SURFACES|ANDROID_WINDOWS_SEPARATE_LAYOUT|NO_VERSION_CALLBACK`.

- [ ] **Step 4: Update AI maintenance index**

Add one first-hop entry: global UI skin issues -> `AigRgbGlobalSkin.kt` + platform adapter + focused verifier. Explicitly state button regrouping/project-name work is a later phase.

- [ ] **Step 5: Commit**

`git commit -m "test: lock dual-project RGB skin parity"`

### Task 7: Focused UI build and launch evidence

**Files:**
- No machining-core modifications.
- Update: plan progress ledger only with fresh evidence.

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: build/launch evidence; no new feature API.

- [ ] **Step 1: Run Studio focused gates**

Run the global-skin regression/static verifier plus `:app:compileDebugKotlin` and `:desktop:compileKotlin`.

- [ ] **Step 2: Run AIG-II focused gates**

Run the global-skin regression/static verifier plus `:app:compileDebugKotlin`, `:desktop:compileKotlin`, and `:desktop:verifyDesktopRuntimeResources`.

- [ ] **Step 3: Launch Android/Windows when the authorized device is online**

Verify HOME first, then representative core/work/system pages: CAD, CAM, SIM, 6AX, NC, AI, SETTINGS, EDIT, FILE, ALARM, LINK. Confirm live buttons remain clickable, no engineering shell appears, and phone/desktop layouts remain different while visual language matches.

- [ ] **Step 4: Check representative adaptive layouts**

Android portrait + landscape and Windows desktop: no newly introduced overlap/clipping from skin changes. Do not require identical geometry between platforms.

- [ ] **Step 5: Record evidence separately**

Source/static PASS, compile PASS and actual launch evidence must be reported as separate evidence classes. If the device is offline, keep launch as `PENDING_DEVICE`; do not claim PASS.

- [ ] **Step 6: Commit evidence ledger**

`git commit -m "chore: record global RGB skin verification"`

## Deferred Next Phase

After Task 7 is accepted, start a separate design/plan for:

1. button regrouping / one-button-multi-function cleanup;
2. button labels and visual hierarchy;
3. project/product naming changes across Android, Windows, package display text, release metadata and exact-bind surfaces.

Do not mix those changes into Global Skin V1 because they change information architecture and product identity rather than only visual skinning.

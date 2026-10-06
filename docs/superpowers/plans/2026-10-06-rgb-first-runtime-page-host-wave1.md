# RGB-first Runtime Page Host Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy direct `root/homeRoot` Runtime assembly for HOME/CAD/CAM with a modular RGB-first page host that preserves live callbacks, keeps one same-editor left/right description slot, and removes CAD interaction work from the pointer hot path.

**Architecture:** `MainActivity` becomes a thin startup/navigation container. `RuntimePageHost` owns `RGB ASSET -> SKIN -> PAGE MODULE -> CALLBACK -> READY`; page modules own layout, while callback bridges reuse existing CAD/CAM engines. Android and Windows mirror the same platform-neutral surface/state contracts but use native View/Swing modules.

**Tech Stack:** Kotlin/JVM 17, Android View system, Swing desktop, Gradle, Python CI gates.

**Spec:** `docs/superpowers/specs/2026-10-06-rgb-first-runtime-page-host-design.md`

## Global Constraints

- Formal Runtime pages are HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI; Wave 1 migrates HOME -> CAD -> CAM only.
- Every migrated page must mount in exact order: RGB ASSET -> SKIN -> PAGE MODULE -> CALLBACK -> READY.
- Engineering shell is never a formal startup/page fallback.
- The Android editor/frame is single-instance; left/right changes state and replaces the one bottom-description slot atomically.
- Phone portrait, phone landscape, tablet, and desktop must reflow without overlapping text or controls.
- RGB decoding/preload must stay outside pointer/touch hot paths.
- CAD MOVE must render lightweight draft feedback; authoritative geometry commits on release/commit.
- Do not lower version numbers; this branch remains at or above Studio 372.
- Existing CAD/CAM/SIM/NC computation behavior is preserved unless a task explicitly extracts UI-facing glue.

## Review Focus

- Missing/corrupt RGB asset: page stays non-READY, reports a local error, and never falls back to engineering shell.
- Rapid LEFT/RIGHT taps: exactly one bottom-description node remains and it contains only the newest side's text.
- Rotation/resizing during CAD editing: state survives reflow and controls/text do not duplicate or overlap.
- Large CAD drawings with intersection snap enabled: pointer MOVE does not rebuild all pairwise intersections.
- Offline startup: HOME becomes usable without network work blocking the first RGB frame.

---

### Task 1: Platform-neutral editor-side state and mount-state tests

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/ui/RuntimePageUiState.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/ui/RuntimePageUiStateRegression.kt`
- Modify: `core/build.gradle.kts`

**Interfaces:**
- Produces: `enum class EditorSide { LEFT, RIGHT }`
- Produces: `data class BottomDescription(val text: String, val accessibilityText: String)`
- Produces: `data class RuntimePageUiState(val surface: RuntimeSurface, val selectedSide: EditorSide, val bottomDescription: BottomDescription)`
- Produces: `fun RuntimePageUiState.selectSide(side: EditorSide, resolver: (RuntimeSurface, EditorSide) -> BottomDescription): RuntimePageUiState`

- [ ] **Step 1: Write failing regression**

Create a focused Kotlin regression that asserts 100 alternating LEFT/RIGHT updates leave one state object with the final side/text, and that viewport classification changes do not create duplicate description state.

- [ ] **Step 2: Run regression and verify RED**

Run: `./gradlew :core:runtimePageUiStateRegression`
Expected: FAIL because the state types/task do not exist.

- [ ] **Step 3: Implement the minimal immutable state model**

Keep this file platform-neutral; no Android `View`, Swing, bitmap, or engine imports.

- [ ] **Step 4: Run regression and compile**

Run: `./gradlew :core:runtimePageUiStateRegression :core:compileKotlin`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add Runtime page editor-side state contract`

---

### Task 2: Split Android host/mount responsibilities and prove RGB-first failure behavior

**Files:**
- Create: `app/src/main/java/com/aigstudio/app/ui/host/RuntimePageHost.kt`
- Create: `app/src/main/java/com/aigstudio/app/ui/host/RuntimePageMountCoordinator.kt`
- Modify: `app/src/main/java/com/aigstudio/app/ui/AndroidRuntimeUiRegistry.kt`
- Modify: `ci/verify_runtime_page_mount_contract.py`

**Interfaces:**
- Consumes: `RuntimePageUiState`, `RuntimePageMountCatalog`, `AndroidRuntimeUiModule`.
- Produces: `RuntimePageHost.preload(onComplete: (Result<Unit>) -> Unit)`
- Produces: `RuntimePageHost.show(surface: RuntimeSurface, viewport: RuntimeViewport): Result<View>`
- Produces: `RuntimePageHost.currentSurface(): RuntimeSurface?`

- [ ] **Step 1: Extend the mount gate to fail when MainActivity/page modules can bypass the host or when a missing visual can still reach READY**

- [ ] **Step 2: Run gate and verify RED**

Run: `python3 ci/verify_runtime_page_mount_contract.py`
Expected: FAIL because the real host is not wired yet.

- [ ] **Step 3: Extract coordinator from the registry and implement host ownership**

The coordinator remains the only code allowed to advance ASSET/SKIN/VIEW/CALLBACK/READY. RGB preload uses the existing background cache; missing/undecodable assets return failure without substituting engineering UI.

- [ ] **Step 4: Compile**

Run: `./gradlew :app:compileDebugKotlin`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `refactor: make Android Runtime host own RGB-first mounting`

---

### Task 3: Migrate HOME into a real page module

**Files:**
- Create: `app/src/main/java/com/aigstudio/app/ui/pages/home/HomePageModule.kt`
- Create: `app/src/main/java/com/aigstudio/app/ui/bridge/HomeCallbackBridge.kt`
- Modify: `app/src/main/java/com/aigstudio/app/MainActivity.kt`
- Modify: `ci/verify_runtime_page_mount_contract.py`

**Interfaces:**
- Produces: `HomePageModule : AndroidRuntimeUiModule`
- Produces: `HomeCallbackBridge.navigate(target: RuntimeSurface)`
- Consumes: existing HOME view/status/update callbacks via adapter arguments rather than copying their logic.

- [ ] **Step 1: Add a failing HOME host test/gate**

Assert the first formal page is created through `RuntimePageHost.show(HOME, ...)`, canonical `home.png` is mounted first, and `MainActivity` no longer calls `setContentView(homeRoot)` as the normal HOME path.

- [ ] **Step 2: Verify RED**

Run: `python3 ci/verify_runtime_page_mount_contract.py`
Expected: FAIL on direct legacy HOME path.

- [ ] **Step 3: Implement HOME module/bridge and thin MainActivity wiring**

Do not rewrite startup/update logic. Adapt existing callbacks into the module and keep network/update work post-first-frame.

- [ ] **Step 4: Compile + gate**

Run: `./gradlew :app:compileDebugKotlin && python3 ci/verify_runtime_page_mount_contract.py`
Expected: PASS for HOME.

- [ ] **Step 5: Commit**

Commit message: `feat: mount Studio HOME through RGB-first page host`

---

### Task 4: Migrate CAD with one editor, left/right description state, lazy tool groups, and low-latency pointer path

**Files:**
- Create: `app/src/main/java/com/aigstudio/app/ui/pages/cad/CadPageModule.kt`
- Create: `app/src/main/java/com/aigstudio/app/ui/pages/cad/CadToolGroups.kt`
- Create: `app/src/main/java/com/aigstudio/app/ui/pages/cad/CadDescriptionPane.kt`
- Create: `app/src/main/java/com/aigstudio/app/ui/bridge/CadCallbackBridge.kt`
- Create: `app/src/main/java/com/aigstudio/app/ui/pages/cad/CadSnapCandidateCache.kt`
- Modify: `app/src/main/java/com/aigstudio/app/MainActivity.kt`
- Modify: `ci/verify_cad_interaction_latency.py`

**Interfaces:**
- Produces: `CadPageModule : AndroidRuntimeUiModule`
- Produces: `CadDescriptionPane.render(state: RuntimePageUiState)` using exactly one bottom `TextView`.
- Produces: `CadSnapCandidateCache.forRevision(revision: Long, entities: List<...>)` with cached snap candidates/intersections.
- `CadCallbackBridge` forwards tools/edit/commit to existing authoritative CAD engine.

- [ ] **Step 1: Write failing CAD UI/latency gates**

Assert one editor root, one bottom-description role, LEFT/RIGHT atomically replace text, only the selected description is accessibility-visible, tool groups are lazy, and `ACTION_MOVE` does not rebuild pairwise intersections.

- [ ] **Step 2: Verify RED**

Run: `python3 ci/verify_cad_interaction_latency.py && python3 ci/verify_runtime_page_mount_contract.py`
Expected: FAIL on legacy MOVE/snap/UI layout behavior.

- [ ] **Step 3: Implement the single description pane and lazy tool groups**

Keep fixed always-visible actions limited to Undo/Redo/Select/Pan/Fit; DRAW/EDIT/SNAP/FILE groups are created/expanded on demand. LEFT/RIGHT controls change `RuntimePageUiState`; they never insert a second description widget.

- [ ] **Step 4: Implement draft-vs-commit interaction and revision-keyed snap cache**

MOVE updates only lightweight draft/snap lookup. Geometry mutation increments revision; expensive intersection candidates rebuild only when revision or relevant snap modes change. UP/commit performs authoritative geometry update.

- [ ] **Step 5: Compile + gates**

Run: `./gradlew :app:compileDebugKotlin && python3 ci/verify_cad_interaction_latency.py && python3 ci/verify_runtime_page_mount_contract.py`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: migrate low-latency modular CAD Runtime page`

---

### Task 5: Migrate CAM without copying machining logic

**Files:**
- Create: `app/src/main/java/com/aigstudio/app/ui/pages/cam/CamPageModule.kt`
- Create: `app/src/main/java/com/aigstudio/app/ui/pages/cam/CamToolGroups.kt`
- Create: `app/src/main/java/com/aigstudio/app/ui/bridge/CamCallbackBridge.kt`
- Modify: `app/src/main/java/com/aigstudio/app/MainActivity.kt`
- Modify: `ci/verify_runtime_page_mount_contract.py`

**Interfaces:**
- Produces: `CamPageModule : AndroidRuntimeUiModule`
- `CamCallbackBridge` forwards AUTO/MANUAL, inner/outer, direction, G41/G42, Safe-Z, XYZ node editing, and avoidance actions to existing CAM services.

- [ ] **Step 1: Add failing CAM host gate**

Assert `cam.jpg` is the first page visual and every exposed CAM action routes through one callback bridge; no duplicate CAM algorithm appears in UI module code.

- [ ] **Step 2: Verify RED**

Run: `python3 ci/verify_runtime_page_mount_contract.py`
Expected: FAIL until CAM module is registered/wired.

- [ ] **Step 3: Implement CAM module and bridge**

Use lazy groups `SOURCE / TOOLPATH / AVOID / VIEW`; keep manual route priority and existing engine state authoritative.

- [ ] **Step 4: Compile + gate**

Run: `./gradlew :app:compileDebugKotlin && python3 ci/verify_runtime_page_mount_contract.py`
Expected: PASS for HOME/CAD/CAM.

- [ ] **Step 5: Commit**

Commit message: `feat: mount Studio CAM through modular Runtime page host`

---

### Task 6: Mirror Wave 1 on Windows with Swing modules and the same state semantics

**Files:**
- Create: `desktop/src/main/kotlin/com/aigstudio/desktop/ui/host/DesktopRuntimePageHost.kt`
- Refactor: `desktop/src/main/kotlin/com/aigstudio/desktop/ui/DesktopRuntimeUiRegistry.kt`
- Create: `desktop/src/main/kotlin/com/aigstudio/desktop/ui/pages/home/HomePageModule.kt`
- Create: `desktop/src/main/kotlin/com/aigstudio/desktop/ui/pages/cad/CadPageModule.kt`
- Create: `desktop/src/main/kotlin/com/aigstudio/desktop/ui/pages/cam/CamPageModule.kt`
- Modify: current desktop application entry file that directly assembles HOME/CAD/CAM.

**Interfaces:**
- Same surface/state/action contracts as Android; Swing-specific `JComponent` modules only.

- [ ] **Step 1: Add failing desktop host checks to the mount gate**
- [ ] **Step 2: Verify RED**
- [ ] **Step 3: Implement desktop host + three modules**
- [ ] **Step 4: Compile**

Run: `./gradlew :desktop:compileKotlin`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: migrate Studio desktop HOME CAD CAM to RGB-first host`

---

### Task 7: Final Wave 1 evidence and package gate

**Files:**
- Modify: `.github/workflows/modular-ui-contract.yml`
- Modify: `.github/workflows/professional-rgb-runtime-372.yml`
- Create or update: `ci/verify_wave1_runtime_ui.py`

**Interfaces:**
- Produces runtime evidence for HOME/CAD/CAM on Android and Windows.

- [ ] **Step 1: Add failing evidence requirements**

Require actual screenshots/UI dumps for HOME/CAD/CAM, one-description-node check after LEFT/RIGHT taps, no engineering shell text, and package compile success.

- [ ] **Step 2: Run local/source gates and verify failures identify missing runtime evidence only**
- [ ] **Step 3: Build Android + Windows**

Run: `./gradlew :app:assembleDebug :desktop:build`
Expected: SUCCESS.

- [ ] **Step 4: Run focused gates**

Run: `python3 ci/verify_modular_runtime_ui.py && python3 ci/verify_runtime_page_mount_contract.py && python3 ci/verify_cad_interaction_latency.py && python3 ci/verify_wave1_runtime_ui.py`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `test: lock Studio RGB-first HOME CAD CAM Wave 1 evidence`

- [ ] **Step 6: Only after Wave 1 evidence passes, prepare the next versioned package**

Do not claim final Runtime PASS from compile alone. If version metadata/package is advanced, it must be greater than 372 and keep the verified Wave 1 evidence tied to the exact SHA.

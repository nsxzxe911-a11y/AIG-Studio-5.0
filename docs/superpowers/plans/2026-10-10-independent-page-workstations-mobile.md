# Independent Page Workstations Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every top-level Android Runtime page independently usable when neighboring modules are disconnected, while keeping optional CONNECT data exchange and one shared AIG RGB control system.

**Architecture:** Add a shared page-capability/connection contract in `runtime-contract`, adapt existing clean CAD/CAM/SIM/Axis/NC/AI sessions through production-runtime ports, and route every `SceneId` to a real local renderer/layout. CONNECT controls data exchange only; it never determines whether a page may launch or operate locally.

**Tech Stack:** Kotlin/JVM shared contracts, production-runtime adapters, Android GLES renderer, JUnit, Gradle 9.7.

**Spec:** `docs/superpowers/specs/2026-10-10-real-machine-axis-scenes-independent-pages-design.md`

## Global Constraints
- HOME is product cockpit only; never Engineering Shell.
- CAD works without CAM; CAM MANUAL works without CAD; SIM works from available local MotionProgram/CAM/NC-derived motion; NC works without CAM; AI disconnection never breaks other pages.
- CONNECT/DISCONNECT changes data exchange, not page availability.
- Each page owns local status/errors/recovery and never redirects to HOME because a neighbor is unavailable.
- AIG RGB layout/skin changes may not rewrite CAD/CAM/NC domain logic.
- Offline-first startup and local save/recovery remain available.
- No fake buttons: control descriptor -> callback -> shared state/runtime -> result/status.

## Review Focus
- A page entered with all neighbors disconnected must still render and expose its local tools.
- A disconnect during active editing/playback must preserve current local state and not discard work.
- Reconnect must offer/adopt newer shared data through explicit runtime state rather than silent overwrite.
- Local runtime errors remain scoped to their page and never become a global red lock.
- Missing SIM/AI data produces local empty/status state, not synthetic data or HOME fallback.

---

### Task 1: Shared page capability and connection contract

**Files:**
- Create: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/PageCapabilityContract.kt`
- Test: `runtime-contract/src/test/kotlin/PageCapabilityContractRegression.kt`

**Interfaces:**
- Produces: `enum class PageId { HOME, CAD, CAM, SIM, AXIS3, AXIS4, AXIS5, AXIS6, NC, AI }`, `data class PageConnection(val source:PageId,val target:PageId,val connected:Boolean)`, `data class PageLocalStatus(val severity:MessageSeverity,val text:String)`, `data class PageCapabilityState(val page:PageId,val launchable:Boolean,val connections:List<PageConnection>,val status:PageLocalStatus?)`, and `interface PageRuntimePort { fun snapshot(page:PageId):PageCapabilityState }`.
- Required mapping: HOME/CAD/CAM/SIM/AXIS3/AXIS4/AXIS5/AXIS6/NC/AI.

- [ ] **Step 1: Write RED contract tests**
  Assert every page is `launchable=true` with every `PageConnection` false; connection flags are independent values; page-local status can carry INFO/WARNING/ALARM without global availability changing.
- [ ] **Step 2: Run RED**
  `gradle :runtime-contract:test --tests '*PageCapabilityContractRegression*'`; expect missing types.
- [ ] **Step 3: Implement immutable contract**
  Keep the contract transport-neutral and free of Android/UI classes.
- [ ] **Step 4: Run GREEN + full contract tests**
- [ ] **Step 5: Commit**
  `git commit -m "feat(runtime4): add independent page capability contract"`

### Task 2: Production-runtime page adapters

**Files:**
- Create: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthPageRuntimeAdapter.kt`
- Modify only where required: `FourthCadRuntimeAdapter.kt`, `FourthCamRuntimeAdapter.kt`, `FourthAxisRuntimeAdapter.kt`, `FourthNcRuntimeAdapter.kt`
- Create: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthSimRuntimeAdapter.kt`
- Create: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthAiRuntimeAdapter.kt`
- Test: `production-runtime/src/test/kotlin/FourthPageIndependenceRegression.kt`

**Interfaces:**
- Consumes existing `CleanCadSession`, `CleanCamSession`, `CleanSimSession`, `CleanAxisSession`, `CleanNcSession`, `CleanAiSession`.
- Produces `PageRuntimePort.snapshot(pageId)` plus page-local command dispatch without requiring neighbor ports.

- [ ] **Step 1: Write RED disconnected-runtime tests**
  CAD draw/edit, CAM MANUAL node edit, SIM local snapshot/playback state, NC edit/checkpoint, AI local status and axis snapshot must each work with all connection flags false.
- [ ] **Step 2: Run RED**
  Expect missing page adapters.
- [ ] **Step 3: Implement minimal adapters**
  Delegate to existing clean sessions; do not create duplicate domain truth.
- [ ] **Step 4: Add disconnect/reconnect-during-work tests**
  Change connection state after local revision increments; assert revision/data remain intact. Reconnect with newer neighbor data and assert the local revision is not silently overwritten; adoption remains an explicit runtime/sync decision.
- [ ] **Step 5: Run GREEN + full production-runtime suite**
- [ ] **Step 6: Commit**
  `git commit -m "feat(runtime4): adapt standalone page runtimes"`

### Task 3: Route all top-level pages without HOME fallback

**Files:**
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AxisRendererStateSource.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/AxisNavigationLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/skin/SharedVisualPolicy.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/AllPageRouteRegression.kt`

**Interfaces:**
- Produces render routes for `HOME,CAD,CAM,SIM,AXIS3,AXIS4,AXIS5,AXIS6,NC,AI` and matching NAV destinations.

- [ ] **Step 1: Write RED route tests**
  Assert every `SceneId` has a dedicated route; no top-level page maps to `UNAVAILABLE` or `HOME` except HOME itself.
- [ ] **Step 2: Run RED**
  Current SIM/AXIS5/AXIS6/AI routing should fail.
- [ ] **Step 3: Add dedicated route enum values and nav destinations**
- [ ] **Step 4: Run GREEN and existing `SceneRouterRegression`/`AxisSceneHostRegression`**
- [ ] **Step 5: Commit**
  `git commit -m "feat(runtime4): route every product page independently"`

### Task 4: Standalone SIM page

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/SimSceneLayout.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/SimRendererStateSource.kt`
- Modify: `AigGlesRenderer.kt`, `AigGlesView.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/SimStandaloneRegression.kt`

**Interfaces:**
- Consumes `FourthSimRuntimeAdapter` and available local motion/material-removal state.
- Produces SIM viewport, PLAY/STEP/RESET/DISPLAY controls, material-removal HUD/status.

- [ ] **Step 1: Write RED SIM-empty and SIM-with-motion tests**
  Empty local SIM shows local status and controls; motion state renders without requiring CAD/CAM connection; true material-removal numeric evidence remains sourced from runtime, never fabricated by renderer.
- [ ] **Step 2: Run RED**
- [ ] **Step 3: Implement SIM layout/state source/render path**
- [ ] **Step 4: Run GREEN + existing SIM runtime regression**
- [ ] **Step 5: Commit**
  `git commit -m "feat(runtime4): add standalone sim workstation"`

### Task 5: Standalone AI page and page-local status

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/AiSceneLayout.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AiRendererStateSource.kt`
- Modify: `AigGlesRenderer.kt`, `AigGlesView.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/AiStandaloneRegression.kt`

**Interfaces:**
- Consumes `FourthAiRuntimeAdapter` local status/update/repair state.
- Produces AI local status/repair/update surface; AI unavailable/offline is a local message only.

- [ ] **Step 1: Write RED tests**
  AI route renders when offline; AI unavailable never changes CAD/CAM/SIM/NC/Axis launchability.
- [ ] **Step 2: Run RED**
- [ ] **Step 3: Implement minimal AI layout/state source**
- [ ] **Step 4: Run GREEN + existing AI runtime tests**
- [ ] **Step 5: Commit**
  `git commit -m "feat(runtime4): add standalone ai workstation"`

### Task 6: Shared AIG RGB product navigation and CONNECT/DISCONNECT controls

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/ProductControlDeck.kt`
- Modify: page layouts for HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI
- Modify: `skin/RgbSkinTokens.kt`, `scene/RgbGlassButtonNode.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/ProductControlDeckRegression.kt`

**Interfaces:**
- Produces descriptor-driven product controls with `controlId`, semantic action, enabled rule, selected rule, layout group and label/icon.

- [ ] **Step 1: Write RED descriptor tests**
  Every page has navigation + page-specific local tools; CONNECT/DISCONNECT state is visible but never disables page launch or basic local commands.
- [ ] **Step 2: Run RED**
- [ ] **Step 3: Implement shared descriptors and RGB states**
  Keep callbacks bound to runtime commands, not pixel coordinates.
- [ ] **Step 4: Run portrait/landscape layout tests**
  At 1080x1920 and 1920x1080, no control overlap and touch targets >=48dp.
- [ ] **Step 5: Commit**
  `git commit -m "feat(runtime4): unify independent rgb product controls"`

### Task 7: Cross-page independence acceptance

**Files:**
- Create: `tools/verify_fourth_independent_pages.ps1`
- Create new evidence directory at the frozen milestone only.

**Interfaces:**
- Consumes all prior tasks and the real-machine axis plan.
- Produces exact-SHA APK evidence proving all pages enter and remain usable while disconnected.

- [ ] **Step 1: Run all runtime/renderer tests**
  `gradle :runtime-contract:test :production-runtime:test :renderer-android:testDebugUnitTest :product-host-android:testDebugUnitTest` plus CAD/CAM/SIM/Axis/NC/AI regressions.
- [ ] **Step 2: Build APK and record source/APK SHA**
- [ ] **Step 3: Nox disconnected-page pass**
  With all optional connections OFF, enter HOME->CAD->CAM->SIM->3AX->4AX->5AX->6AX->NC->AI and capture route/status markers; no page may fall back to HOME.
- [ ] **Step 4: Recovery/offline pass**
  Airplane mode cold launch, local edit/recovery for CAD/CAM/NC and local page entry for every other page.
- [ ] **Step 5: Run exact verifier and commit evidence**
  `git commit -m "test(runtime4): verify independent product pages"`

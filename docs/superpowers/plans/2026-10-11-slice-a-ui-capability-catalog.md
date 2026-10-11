# Slice A — New UI Capability Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 10 mobile Runtime pages capability-driven so every visible control/value is classified as READY, CORE_WAIT, DISABLED_BY_STATE, or ALARM before SIM/Axis/NC/AI core rebuild work begins.

**Architecture:** Add a shared capability model/catalog in `runtime-contract`, then make Android renderer nodes carry capability metadata and enforce dispatch/readiness at the final input boundary. Existing proven CAD/CAM/SIM/NC/AI actions stay intact; missing new-core features are visible but disabled with no fake action. Axis pages stop treating A/B/C controls as page-name truth and expose profile-driven capability placeholders until Slice B provides Machine/Kinematics profiles.

**Tech Stack:** Kotlin, Android OpenGL ES renderer, Gradle 9.6, JUnit/Kotlin test tasks, Nox Android emulator.

**Spec:** `docs/superpowers/specs/2026-10-11-new-ui-core-capability-design.md`

## Global Constraints

- Visible primary pages are exactly `HOME / CAD / CAM / SIM / 3AX / 4AX / 5AX / 6AX / NC / AI`; `MULTIFUNCTION` may remain only as an internal compatibility route.
- Mobile first; do not modify Windows Desktop layout in Slice A.
- Black AIG RGB skin, Traditional Chinese product UI, shared top navigation, adaptive full canvas remain unchanged.
- `CORE_WAIT` is visible/disabled and has no dispatchable action; no fake callback.
- Dynamic fields with no authoritative state show `—`, `未連線`, or `待評估`; never use baked demo numbers as fallback.
- Image-map/hitbox may locate UI only; it may not gate Runtime State visibility.
- Evaluations/estimates/safety/collision remain Core responsibilities; Slice A does not invent them in renderer code.
- End-to-end numeric precision remains `0.001 mm`.
- Versions only increase; do not use downgrade installs.
- Machine appearance, kinematics, and scene modules are separate concerns; Slice A must not hard-code one 4AX/5AX/6AX machine form.
- AIG CNC and AIG-II must keep capability IDs, readiness semantics, and tests in parity.

## Execution Precondition

Before Task 1, preserve the currently verified `mobile-runtime-truth` WIP in each existing worktree as its own checkpoint commit (renderer truth overlay + tests + debug version metadata only; exclude `baseline.exit`). Then create fresh Slice A implementation worktrees from those checkpointed branch heads using the git-worktree workflow. Do not mix the previous truth-overlay diff into the first capability commit and do not discard it.

## File Structure and Twin-Repo Path Rule

This plan is implemented in both worktrees. Every AIG CNC source path containing `com/aigstudio` has an exact AIG-II twin at the same relative path with `com/aigstudio` replaced by `com/aigii`. Example: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/ui/UiCapability.kt` maps exactly to `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/ui/UiCapability.kt`. Test filenames are identical in both repos. Product behavior and test assertions are identical; only package/product namespace differs.

Responsibility map:
- `runtime-contract/.../ui/UiCapability.kt`: capability types, readiness semantics, visible primary page set.
- `runtime-contract/.../ui/UiCapabilityCatalog.kt`: declarative 10-page capability inventory only; no runtime or renderer dependencies.
- `renderer-android/.../scene/UiCapabilityBinding.kt`: maps existing renderer control IDs to catalog capability state and provides final dispatch eligibility.
- `renderer-android/.../scene/MobileCapabilitySurface.kt`: creates READY/CORE_WAIT control/status presentation without inventing Core values.
- `renderer-android/.../scene/UnifiedMobileControlShell.kt`: composes capability controls with the existing page shell/ribbon.
- Page descriptor/layout files: declare page-local control placement/labels and reuse existing real actions.
- `AxisControlDeck.kt`: exposes profile-ready generic axis controls; does not own kinematics.
- `AigGlesView.kt`: final input boundary enforcing capability dispatch gate before existing RuntimePort dispatch logic.

## Review Focus

- **Legacy page leak:** `MULTIFUNCTION` or legacy navigation must never reappear in the visible 10-page set. Task 1 and Task 8 pin exact page order and Nox navigation.
- **CORE_WAIT accidental dispatch:** a stale action/binding must not execute even if a future renderer change forgets to disable the visual node. Task 3 adds an explicit final dispatch gate test.
- **Axis hard-coding:** 4AX/5AX/6AX UI must not infer physical rotary layout from page name. Task 6 tests that profile-dependent controls stay generic/CORE_WAIT until a Machine Profile exists.
- **Demo telemetry leak:** absent state must not expose fixed percent/RPM/XYZ/ABC/time values from skin art. Task 4 and Task 8 test placeholder/masking behavior.
- **Dual-project drift:** AIG CNC and AIG-II catalogs/contracts must remain semantically identical. Task 8 compares normalized source digests and runs both build/test suites.

---

### Task 1: Shared Capability Types and Visible Page Set

**Files:**
- Create (AIG CNC): `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/ui/UiCapability.kt`
- Create (AIG-II): `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/ui/UiCapability.kt`
- Test (AIG CNC): `runtime-contract/src/test/kotlin/UiCapabilityContractRegression.kt`
- Test (AIG-II): `runtime-contract/src/test/kotlin/UiCapabilityContractRegression.kt`

**Interfaces:**
- Produces: `enum class CapabilityDisposition { KEEP, UPGRADE, REBUILD }`
- Produces: `enum class CapabilityReadiness { READY, CORE_WAIT, DISABLED_BY_STATE, ALARM }`
- Produces: `enum class CapabilityBindingKind { NAVIGATION, COMMAND, STATE, EVALUATION }`
- Produces: `data class UiCapabilitySpec(val id:String,val page:PageId,val disposition:CapabilityDisposition,val binding:CapabilityBindingKind,val defaultReadiness:CapabilityReadiness)`
- Produces: `data class UiCapabilityState(val spec:UiCapabilitySpec,val readiness:CapabilityReadiness,val reason:String?=null)` with `fun canDispatch():Boolean = readiness==READY`.
- Produces: `object PrimaryMobilePages { val ordered:List<PageId> }` with exact order `HOME,CAD,CAM,SIM,AXIS3,AXIS4,AXIS5,AXIS6,NC,AI`.

- [ ] **Step 1: Write failing contract tests**

Assert exact 10-page order, exclusion of `MULTIFUNCTION`, nonblank capability IDs, and `canDispatch()` true only for `READY`.

- [ ] **Step 2: Run tests and confirm RED**

AIG CNC:
`E:\AIG_WORK\tools\gradle-9.6.0\bin\gradle.bat -p E:\AIG_WORK\worktrees\aigcnc-mobile-runtime-truth :runtime-contract:test --tests *UiCapabilityContractRegression*`

AIG-II:
`E:\AIG_WORK\tools\gradle-9.6.0\bin\gradle.bat -p E:\AIG_WORK\worktrees\aigii-mobile-runtime-truth :runtime-contract:test --tests *UiCapabilityContractRegression*`

Expected: FAIL because `UiCapability*` types do not exist.

- [ ] **Step 3: Implement the minimal capability types in both namespaces**

Validate IDs with uppercase dotted segments (`PAGE.DOMAIN.NAME` shape); do not add renderer or runtime behavior here.

- [ ] **Step 4: Re-run focused tests**

Expected: both PASS.

- [ ] **Step 5: Commit only Task 1 files in each repo**

Commit message: `feat: add shared UI capability contract`

---

### Task 2: Complete 10-Page Capability Catalog

**Files:**
- Create (AIG CNC): `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/ui/UiCapabilityCatalog.kt`
- Create (AIG-II): `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/ui/UiCapabilityCatalog.kt`
- Test: `runtime-contract/src/test/kotlin/UiCapabilityCatalogRegression.kt` in both repos.

**Interfaces:**
- Consumes: `UiCapabilitySpec`, `PrimaryMobilePages` from Task 1.
- Produces: `object UiCapabilityCatalog { fun forPage(page:PageId):List<UiCapabilitySpec>; fun require(id:String):UiCapabilitySpec; val all:List<UiCapabilitySpec> }`.
- Navigation capability per destination page: `<PAGE>.NAV.OPEN` with `KEEP/NAVIGATION/READY`.

Catalog minimums to pin in tests:
- HOME: `HOME.MACHINE.STATUS`, `HOME.PROJECT.STATUS`, `HOME.MODULES.READINESS`, `HOME.SYNC.STATUS`, `HOME.WORK.REVISION` as `UPGRADE/STATE/CORE_WAIT`; `HOME.NC.STATUS`, `HOME.AI.STATUS` as `KEEP/STATE/READY`.
- CAD: existing draw/select/snap/layer/dimension/undo/redo/trim/extend/offset/array/chamfer/fillet/topology as `KEEP/COMMAND/READY`; `CAD.ORIGIN.SET`, `CAD.PHOTO.ALIGN`, `CAD.PHOTO.SCALE`, `CAD.SELECTION.PROPERTIES`, `CAD.CONSTRAINT.STATUS` as `UPGRADE/*/CORE_WAIT` until contracts exist.
- CAM: current Manual/Auto/Tool/Diameter/Depth/Safe-Z/Feed/Speed/Side/Direction/Lead/Region/points/avoidance/zones/freeze/preview/adopt/save as `KEEP/COMMAND/READY`; `CAM.EVAL.CLEARANCE`, `CAM.EVAL.AVOIDANCE`, `CAM.EVAL.PATH_VALIDITY`, `CAM.EVAL.RISK`, `CAM.EVAL.LENGTH`, `CAM.EVAL.ESTIMATED_TIME` as `UPGRADE/EVALUATION/CORE_WAIT`.
- SIM: Run/Step/Reset/Display plus removed cells/min depth/removed volume/block as `KEEP`; `SIM.EVAL.PROGRESS`, `SIM.EVAL.ELAPSED`, `SIM.EVAL.REMAINING`, `SIM.EVAL.COLLISION`, `SIM.EVAL.SAFETY` as `REBUILD/EVALUATION/CORE_WAIT`.
- AXIS3/4/5/6: pose/program/block state as `KEEP/STATE/READY`; profile selection, execution Play/Pause/Stop, spindle/feed/tool, generic linear/rotary jog, limits/pose-safety/collision as `REBUILD/*/CORE_WAIT`.
- NC: editor/validate/machine-profile/candidate/preview/adopt/save and editor block-skip as `KEEP/COMMAND/READY`; `NC.EXEC.SINGLE_BLOCK`, `NC.EXEC.DRY_RUN`, `NC.EXEC.BLOCK_SKIP`, `NC.EXEC.OPTIONAL_STOP`, `NC.EXEC.RUN`, `NC.EXEC.PAUSE`, `NC.EXEC.STOP`, `NC.EXEC.CURRENT_BLOCK`, `NC.EXEC.SAFETY_INTERLOCK` as `REBUILD/*/CORE_WAIT`.
- AI: Open/Stage/Verify/Promote/Restore and vault state as `KEEP`; structured CAD/CAM/SIM/Axis/NC diagnosis, recommendation, patch proposal, verification result as `UPGRADE/*/CORE_WAIT`.

- [ ] **Step 1: Write catalog tests**

Assert every `PrimaryMobilePages.ordered` page has a `<PAGE>.NAV.OPEN` capability, all IDs are globally unique, `MULTIFUNCTION` has no visible catalog, and each critical ID above has the exact disposition/readiness.

- [ ] **Step 2: Run focused tests and confirm RED**

Run `:runtime-contract:test --tests *UiCapabilityCatalogRegression*` in both worktrees.

- [ ] **Step 3: Implement catalog only**

Keep the catalog declarative; no RuntimePort calls and no renderer imports.

- [ ] **Step 4: Re-run Task 1 + Task 2 tests**

Expected: PASS in both repos.

- [ ] **Step 5: Commit**

Commit message: `feat: catalog new mobile UI capabilities`

---

### Task 3: Renderer Capability Metadata and Final Dispatch Gate

**Files:**
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/RgbGlassButtonNode.kt`
- Modify twin: `renderer-android/src/main/java/com/aigii/runtime4/renderer/scene/RgbGlassButtonNode.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/professional/AigComponentNodeAdapter.kt` and AIG-II twin.
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/UiCapabilityBinding.kt` and AIG-II twin.
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt` and AIG-II twin.
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/UiCapabilityDispatchRegression.kt` and AIG-II twin.

**Interfaces:**
- Consumes: `UiCapabilityCatalog.require(id)`.
- Adds optional node metadata: `capabilityId:String?`, `capabilityReadiness:CapabilityReadiness` defaulting to `READY` for legacy nodes during migration.
- Produces: `object UiCapabilityBinding { fun stateFor(controlId:String,page:PageId):UiCapabilityState?; fun canDispatch(node:RgbGlassButtonNode):Boolean }`; `AigComponentNodeAdapter` passes `descriptor.page` to this resolver.
- Final dispatch invariant: `canDispatch` is false when node disabled or readiness is not `READY`, even if an action object is accidentally present.

- [ ] **Step 1: Write failing tests for stale-action protection**

Build a synthetic node with a non-null action but `CORE_WAIT`; assert `UiCapabilityBinding.canDispatch(node)==false`. Also assert READY+enabled dispatches and DISABLED_BY_STATE does not.

- [ ] **Step 2: Run focused renderer test and confirm RED**

Run `:renderer-android:testDebugUnitTest --tests *UiCapabilityDispatchRegression*` in both worktrees.

- [ ] **Step 3: Add metadata/binding and one final guard in `AigGlesView`**

Do not rewrite individual RuntimePort dispatch code; gate immediately before existing dispatch selection.

- [ ] **Step 4: Run existing renderer navigation/action regressions plus new test**

Expected: no existing READY action changes behavior; CORE_WAIT cannot dispatch.

- [ ] **Step 5: Commit**

Commit message: `feat: enforce mobile capability readiness`

---

### Task 4: Generic Capability Surface, Placeholder HUD, and No-Demo Fallback

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/MobileCapabilitySurface.kt` and AIG-II twin.
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/UnifiedMobileControlShell.kt` and AIG-II twin.
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/PrimaryPageNavigationLayout.kt` and AIG-II twin.
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/MobileRuntimeTruthOverlayPlan.kt` and AIG-II twin (from the preserved precondition checkpoint).
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt` and AIG-II twin only to consume capability placeholder/status output through the existing truth-overlay path.
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/MobileCapabilitySurfaceRegression.kt` and AIG-II twin.

**Interfaces:**
- Produces: `MobileCapabilitySurface.controls(page:PageId,existing:List<RgbGlassButtonNode>):List<RgbGlassButtonNode>`.
- Produces: `MobileCapabilitySurface.statusText(state:UiCapabilityState,value:String?):String` returning real value only when provided; fallback is exactly `—`, `未連線`, or `待評估` according to capability class.
- Existing real buttons are retained and tagged with catalog capability IDs; catalog capabilities without a real action become disabled CORE_WAIT buttons with no command/action binding.
- `PrimaryPageNavigationLayout` tags the 10 buttons with `<PAGE>.NAV.OPEN` and continues exact same geometry.

- [ ] **Step 1: Write failing surface tests**

Assert 10 nav buttons keep exact page order/geometry semantics, CORE_WAIT generated controls have `enabled=false` and no action, and missing evaluation state never renders numeric placeholders such as `0`, `68%`, fixed RPM, or fixed XYZABC.

- [ ] **Step 2: Run focused test and confirm RED**

- [ ] **Step 3: Implement generic capability surface and integrate with `UnifiedMobileControlShell`**

Do not move viewport rectangles or re-layout the approved page skins in this task.

- [ ] **Step 4: Run navigation, adaptive-layout, image-backed, and capability tests**

Expected: PASS; no visible MULTIFUNCTION navigation.

- [ ] **Step 5: Commit**

Commit message: `feat: render capability-driven mobile controls`

---

### Task 5: HOME / CAD / CAM / SIM Capability Integration

**Files:**
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/professional/HomeProfessionalDescriptor.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/professional/CadProfessionalDescriptor.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/professional/CamProfessionalDescriptor.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/professional/SimProfessionalDescriptor.kt`
- Modify corresponding AIG-II namespace twins.
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/PrimaryCapabilityPageRegression.kt` and AIG-II twin.

**Interfaces:**
- Consumes: catalog/readiness from Tasks 2–4.
- Existing proven actions keep their current `AigUiAction`/command mapping.
- New HOME aggregation, CAD photo/origin/constraint, CAM evaluation, and SIM evaluation items are visible CORE_WAIT entries with no fabricated action/value.

- [ ] **Step 1: Write failing page integration tests**

For each of HOME/CAD/CAM/SIM assert at least one known READY capability retains a real action/state source and every named gap capability is visible as CORE_WAIT with no dispatchable action.

- [ ] **Step 2: Run focused test and confirm RED**

- [ ] **Step 3: Attach descriptors to capability surface**

Do not implement any missing Core evaluator here.

- [ ] **Step 4: Run all renderer unit tests**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: capability-map home cad cam sim UI`

---

### Task 6: Profile-Ready 3AX / 4AX / 5AX / 6AX UI Without Hard-Coded Machine Form

**Files:**
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/AxisControlDeck.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/Axis3SceneLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/Axis4SceneLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/Axis5SceneLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/Axis6SceneLayout.kt`
- Modify corresponding AIG-II twins.
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/AxisCapabilitySurfaceRegression.kt` and AIG-II twin.

**Interfaces:**
- Consumes: page-specific axis capabilities from Task 2.
- Slice A behavior: pose/program/block state stays READY; `PROFILE.SELECT`, execution commands, spindle/feed/tool, generic jog, limits/safety/collision stay CORE_WAIT until Slice B.
- `AxisControlDeck` must not decide physical rotary installation from `AxisMode` alone. Do not generate active `A−/A+/B−/B+/C−/C+` commands from page name when no Machine Profile exists.
- Keep the live 3D viewport path intact.

- [ ] **Step 1: Write failing axis tests**

Assert all four pages expose profile-selection capability; no profile means profile-dependent controls are CORE_WAIT/no action; AXIS4/5/6 do not claim a physical A/B/C rotary layout as READY; pose/program/block remain READY.

- [ ] **Step 2: Run focused test and confirm RED**

- [ ] **Step 3: Refactor Axis control deck to capability-driven placeholders**

Preserve One Scene / One Renderer / No Overlay and existing viewport ownership.

- [ ] **Step 4: Run Axis renderer/regression tests**

Expected: PASS; no fake jog dispatch.

- [ ] **Step 5: Commit**

Commit message: `feat: make axis UI machine-profile ready`

---

### Task 7: NC / AI Capability Integration

**Files:**
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/NcSceneLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/NcSceneController.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/AiSceneLayout.kt`
- Modify corresponding AIG-II twins.
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/NcAiCapabilitySurfaceRegression.kt` and AIG-II twin.

**Interfaces:**
- NC existing editor/validate/candidate actions stay READY; NC execution subsystem controls are CORE_WAIT and actionless.
- AI existing vault Open/Stage/Verify/Promote/Restore stay READY where already wired; cross-module diagnosis/recommendation/patch/verification capabilities are CORE_WAIT.

- [ ] **Step 1: Write failing NC/AI readiness tests**

Assert editor `ToggleBlockSkip` capability remains distinct from future `NC.EXEC.BLOCK_SKIP`; only the editor operation is READY in Slice A. Assert AI cross-module cards cannot dispatch without Core output.

- [ ] **Step 2: Run focused test and confirm RED**

- [ ] **Step 3: Integrate NC/AI layouts with the catalog**

Do not implement NC execution or AI cross-module evaluator in Slice A.

- [ ] **Step 4: Run renderer tests**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: capability-map nc and ai UI`

---

### Task 8: Dual-Project Parity, Full Build, and Nox Fast Loop

**Files:**
- Create evidence: `E:\AIG_WORK\fast-loop\evidence\20261011-slice-a-capabilities\`
- No product-code changes unless a failing test identifies a specific defect; any defect fix gets its own RED→GREEN commit.

**Interfaces:**
- Consumes all Slice A tasks.
- Produces evidence that 10 pages show correct READY/CORE_WAIT behavior without changing viewport layout or enabling fake actions.

- [ ] **Step 1: Run normalized contract/catalog parity check**

Compare AIG CNC vs AIG-II `UiCapability.kt` and `UiCapabilityCatalog.kt` after replacing package prefix `com.aigstudio` / `com.aigii`; expected normalized SHA equality.

- [ ] **Step 2: Run full tests and Android debug builds**

AIG CNC:
`E:\AIG_WORK\tools\gradle-9.6.0\bin\gradle.bat -p E:\AIG_WORK\worktrees\aigcnc-mobile-runtime-truth test :product-host-android:assembleDebug`

AIG-II:
`E:\AIG_WORK\tools\gradle-9.6.0\bin\gradle.bat -p E:\AIG_WORK\worktrees\aigii-mobile-runtime-truth test :product-host-android:assembleDebug`

Expected: `BUILD SUCCESSFUL` in both.

- [ ] **Step 3: Install only a higher-version AIG CNC debug APK to Nox**

Read installed `versionCode` first. If the worktree APK is not higher, increment debug/product-host version metadata before rebuild; never use `adb install -d`.

- [ ] **Step 4: Capture all 10 pages**

Capture HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI plus return-to-HOME. Verify exact shared nav, live viewport presence, CORE_WAIT controls disabled, and no fixed demo telemetry leaks.

- [ ] **Step 5: Run 3→4→5→6→3 axis switching loop**

Minimum Fast Loop: 20 cycles in Slice A; assert no extra overlay/parallel scene mount and no fake jog dispatch. The formal 100-cycle axis endurance remains for the later complete Axis slice.

- [ ] **Step 6: Write `audit.md` in the evidence directory**

For each page record READY controls, CORE_WAIT controls, authoritative dynamic fields, remaining Core gaps, and screenshot filename.

- [ ] **Step 7: Final Slice A checkpoint commits**

Commit only verified Slice A product/test changes. Do not merge main, push, or release without a separate user instruction.

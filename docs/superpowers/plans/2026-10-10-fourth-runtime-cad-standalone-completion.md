# Fourth Runtime CAD Standalone Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining fourth-architecture CAD standalone slice after the proven GLES3 vertical slice: ARC creation, layer state, driven dimensions, local autosave/recovery, and visible snap feedback, with fresh Nox evidence in both AIG CNC and AIG-II.

**Architecture:** Keep `runtime-contract -> FourthCadRuntimeAdapter -> proven CAD core -> renderer-android -> product-host-android`. New UI remains GPU Scene Nodes only. AIG CNC reuses `DrawingDocument/CadLayerState/DimensionDriveEngine`; AIG-II reuses `ProjectState/CadEngine/DimensionEngine` and receives only the minimum layer-parity additions required by the shared contract.

**Tech Stack:** Kotlin/JVM 17, Android API 36, OpenGL ES 3.x, Gradle 9.6, Nox Android 12.

**Spec:** `docs/superpowers/specs/2026-10-09-aig-fourth-runtime-architecture-design.md`

## Global Constraints

- Fourth architecture only; no `CleanMainActivity`, `Clean*Panel`, Swing/AWT, NOUI, engineering shell, Android Button/TextView/ImageView functional overlays, or full-page CAD screenshot substrate.
- Android rendering stays GLES3; authoritative CAD data stays in the headless runtime/core.
- 0.001 mm is the minimum CAD machining resolution.
- Errors are local messages only; no whole-page red lock and no global product FAIL state.
- AIG RGB assets remain direct GPU node textures when available; missing art uses GLES-generated label textures, never hidden platform widgets.
- CAD must remain fully usable without CAM/SIM/NC/AI or cross-module CONNECT/DISCONNECT.
- AIG CNC and AIG-II must expose the same fourth-runtime contract semantics even when their internal CAD cores differ.
- Each task is TDD: watch RED, implement minimal GREEN, run full related suite, then commit.

## Review Focus

- Degenerate ARC inputs must reject locally and the next valid CAD command must still work.
- Hidden layers must stop rendering/hit-selection without deleting geometry or changing precision.
- Driven dimensions must reject values below 0.001 mm (diameter below 0.002 mm where applicable) and keep Undo/Redo valid.
- Corrupt or partial recovery data must be ignored/rejected locally; it must never replace a valid in-memory project.
- Snap feedback must never mutate geometry by itself and must disappear/refresh deterministically when snap mode changes.

---

### Task 1: Interactive ARC through the fourth runtime contract

**Files:**
- Modify: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/CadContract.kt`
- Modify: `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/CadContract.kt`
- Modify: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanCadSession.kt`
- Modify: `production-runtime/src/main/kotlin/com/aigii/production/runtime/CleanCadSession.kt`
- Modify: both `FourthCadRuntimeAdapter.kt`
- Modify: both `renderer-android/.../scene/CadSceneLayout.kt`
- Test: both `production-runtime/src/test/kotlin/.../FourthCadRuntimeAdapterRegression.kt`
- Test: both `renderer-android/src/test/.../CadSceneGraphRegression.kt`

**Interfaces:**
- Produce `CadTool.ARC` and `CadCommand.ToggleArcDirection`.
- Extend `CadState` with `arcClockwise:Boolean=false` and `arcStage:Int=0`.
- `CleanCadSession.addArc(cx,cy,radius,startDeg,sweepDeg)` writes a real core arc.

- [ ] Write RED tests proving `CAD.ARC` is a real GPU node, a center/start/end three-tap sequence creates one `CadPrimitiveSnapshot.Arc`, revision increments only when the arc is committed, CW/CCW toggle changes sweep sign, and a zero-radius/zero-sweep attempt returns a local WARNING without locking the next command.
- [ ] Run focused contract/adapter/scene tests; expected RED is missing `CadTool.ARC`, arc state, or `addArc`.
- [ ] Implement the minimal contract/session/adapter state machine: tap 1=center, tap 2=start, tap 3=end; radius is center→start; start/end define sweep; default CCW; `ToggleArcDirection` flips direction. Add `CAD.ARC` and `CAD.ARC_DIR` Scene Nodes with generated labels unless approved RGB assets already exist.
- [ ] Run focused tests and existing CAD regressions; expected GREEN with no regression to LINE/RECT/CIRCLE/HOLE.
- [ ] Commit `feat(runtime4): add standalone ARC tool` in both repositories.

### Task 2: Layer parity and layer Scene controls

**Files:**
- Modify: both `runtime-contract/.../CadContract.kt`
- Modify: AIG CNC `CleanCadSession.kt`
- Modify: AIG-II `shared/aigii/Core.kt` and `CleanCadSession.kt`
- Modify: both `FourthCadRuntimeAdapter.kt`
- Modify: both `CadSceneLayout.kt` and `CadSceneController.kt`
- Test: new `CadLayerRuntimeRegression.kt` in both production-runtime test trees
- Test: renderer scene tests in both repositories

**Interfaces:**
- Add contract enum `CadLayer { WORKPIECE, DIMENSIONS, CENTERLINE, TOOLPATH, SIMULATION, ORIGIN }`.
- Extend `CadState` with `activeLayer:CadLayer`, `layerVisibility:Map<CadLayer,Boolean>`.
- Add commands `SetActiveLayer(layer)`, `ToggleLayerVisibility(layer)`, `AssignSelectionToLayer(layer)`.

- [ ] Write RED tests: new geometry inherits active layer; selected geometry can be reassigned; toggling WORKPIECE visibility preserves geometry count but removes hidden geometry from render/selection exposure; Undo/Redo preserves layer assignment.
- [ ] Run focused tests; expected RED is missing layer contract or AIG-II per-entity layer parity.
- [ ] AIG CNC adapts existing `DrawingDocument/CadLayerState`. AIG-II extends `LayerState` minimally with active layer + per-entity assignment and includes layer state in `ProjectState` snapshot/restore so Undo/Redo is truthful.
- [ ] Add `CAD.LAYERS` popup GPU nodes; no Android widgets. Hidden geometry is filtered by runtime/session visibility, not deleted by renderer code.
- [ ] Run focused tests plus full existing CAD suite; expected GREEN and 0.001 mm unchanged.
- [ ] Commit `feat(runtime4): add standalone CAD layers` in both repositories.

### Task 3: Driven dimensions through Command/State

**Files:**
- Modify: both `runtime-contract/.../CadContract.kt`
- Modify: both `CleanCadSession.kt`
- Modify: both `FourthCadRuntimeAdapter.kt`
- Modify: both CAD Scene files
- Test: new `CadDimensionRuntimeRegression.kt` in both repositories

**Interfaces:**
- Add `CadDimensionKind { LENGTH, RADIUS, DIAMETER, WIDTH, HEIGHT }` and `CadDimensionSnapshot(id,targetKind,valueMm)`.
- Extend `CadState` with `dimensions:List<CadDimensionSnapshot>`.
- Add `CadCommand.ApplySelectedDimension(kind,valueMm)`.

- [ ] Write RED tests for LINE length, CIRCLE/HOLE radius/diameter, RECT width/height, invalid sub-resolution values, and Undo/Redo after a driven change.
- [ ] Run focused tests and confirm missing dimension contract/adapter is the RED cause.
- [ ] AIG CNC delegates to `DimensionDriveEngine/RectDimensionDriveEngine`; AIG-II delegates to `DimensionEngine`. `CleanCadSession` owns the translation from current selection to the core dimension target.
- [ ] Add `CAD.DIMENSION` GPU popup with deterministic presets for test evidence (`1`, `5`, `10`, `25` mm) plus the runtime command surface; no numeric platform dialog in this task.
- [ ] Run focused + complete CAD regressions; expected GREEN.
- [ ] Commit `feat(runtime4): add driven CAD dimensions` in both repositories.

### Task 4: Local atomic autosave and recovery

**Files:**
- Create: both `production-runtime/.../CadCheckpointCodec.kt`
- Modify: both `CleanCadSession.kt` and `FourthCadRuntimeAdapter.kt`
- Create: both `product-host-android/.../CadAutosaveController.kt`
- Modify: both `FourthMainActivity.kt`
- Test: new `CadCheckpointRegression.kt` in production-runtime and `CadAutosaveControllerRegression.kt` in product-host-android where feasible as local JVM/unit tests

**Interfaces:**
- Add sibling contract `CadPersistencePort { fun exportCheckpoint():String; fun restoreCheckpoint(raw:String):CadDispatchResult }` implemented by `FourthCadRuntimeAdapter`.
- Checkpoint schema identifier: `AIG_CAD_CHECKPOINT_V1`.
- `CadAutosaveController.saveNow()` writes `cad-checkpoint.tmp`, fsync/close, then atomic replace to `cad-checkpoint.aig`; `restoreIfPresent()` validates schema before calling the runtime port.

- [ ] Write RED tests for round-trip geometry including ARC, layers, topology and dimensions; corrupt/truncated schema rejection; restore must not replace a valid live state on failure.
- [ ] Run tests and confirm RED due to missing codec/persistence port.
- [ ] Implement deterministic text checkpoint codecs in production-runtime without depending on legacy `MainActivity`. Preserve entity identity needed by topology/layers/dimensions. Host stores under its local app project directory and autosaves after accepted geometry mutations and on `onPause()`; recovery runs before first CAD interaction, never before GLES first-frame creation.
- [ ] Run round-trip tests, host boundary gate, offline startup build, and full CAD suite; expected GREEN.
- [ ] Commit `feat(runtime4): add CAD autosave recovery` in both repositories.

### Task 5: Visible snap marker and HUD state

**Files:**
- Modify: both `CadContract.kt`, `FourthCadRuntimeAdapter.kt`
- Modify: both `AigGlesRenderer.kt`, `CadViewportNode.kt`, and CAD Scene/HUD files
- Test: new `CadSnapPresentationRegression.kt` in both renderer-android test trees

**Interfaces:**
- Extend `CadState` with `snapPreview:CadPoint?`.
- Pointer movement/down updates preview from the authoritative snap engine; geometry mutation still happens only on commit commands.

- [ ] Write RED tests that ENDPOINT/MIDPOINT/CENTER/INTERSECTION/HORIZONTAL/VERTICAL/TANGENT modes expose the expected preview coordinate, OFF clears it, and preview updates do not increment CAD revision.
- [ ] Run focused tests; expected RED is missing `snapPreview`/render marker.
- [ ] Implement runtime preview state and render a small GPU cross/diamond marker plus current `SNAP=<mode>` label texture/HUD. No renderer-owned snap calculation.
- [ ] Run focused tests + existing `cleanCadSnapRegression`; expected GREEN.
- [ ] Commit `feat(runtime4): show CAD snap feedback` in both repositories.

### Task 6: Current-APK Nox standalone CAD acceptance

**Files:**
- Modify: both `tools/verify_fourth_cad_vertical_slice.ps1` or create `tools/verify_fourth_cad_standalone.ps1`
- Refresh: both `evidence/android-fourth-cad-*/*`
- Modify: both `docs/superpowers/progress/2026-10-09-fourth-runtime-cad-progress.md`

**Interfaces:**
- Acceptance proof is tied to the exact APK SHA-256 produced after Tasks 1–5.

- [ ] Write/extend verifier first so it REDs on missing new evidence markers: ARC creation, layer hide/show without deletion, driven dimension revision, autosave/relaunch recovery, snap preview, local-error-then-valid-command continuation, offline first frame, rotation state retention.
- [ ] Build both APKs, install to the current Nox device by discovered ADB serial (never hard-code the previous port), run the scenario, capture screenshots/logcat, then rerun the verifier.
- [ ] Run full contract + production-runtime + legacy CAD regressions + renderer tests + GLES gate + host boundary + standalone evidence gate + `git diff --check`; expected all GREEN.
- [ ] Commit source-independent evidence/progress separately as `test(runtime4): verify standalone CAD on Nox`.
- [ ] Record exact branch, HEAD, APK SHA-256, Nox model/API/GLES and remaining scope. CAD Standalone is complete only after this gate; CAM remains a separate next plan.

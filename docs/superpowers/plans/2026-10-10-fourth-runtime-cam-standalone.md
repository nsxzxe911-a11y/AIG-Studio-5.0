# Fourth Runtime CAM Standalone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fourth-runtime CAM module that works without CAD, preserves full XYZABC state, separates CAM strategy from Active/Candidate toolpaths, supports safe manual avoidance/versioning/persistence, and renders through real GLES3 Scene Nodes with fresh Nox evidence in both AIG CNC and AIG-II.

**Architecture:** Keep the fourth-runtime dependency direction `GPU Scene -> CamCommand -> CamRuntimePort -> headless CAM core -> CamState -> renderer`. Source snapshots, strategy, Active Toolpath and Candidate Toolpath are separate authoritative objects; local CAM->TOOLPATH connect/disconnect controls regeneration only and never grants shared mutable ownership. AIG CNC adapts its existing `CamSettings/ManualCamPoint/ManualCamPathEngine`; AIG-II first closes its missing C-axis parity in `ToolPoint/ManualCamPathEngine`, then exposes the same fourth-runtime CAM contract.

**Tech Stack:** Kotlin/JVM 17, Android, OpenGL ES 3.x, Gradle 9.7.0, Nox Android 12, deterministic local checkpoint encoding and SHA-256 digests.

**Spec:** `docs/superpowers/specs/2026-10-10-fourth-runtime-cam-nc-sim-design.md`

## Global Constraints

- Fourth architecture only; no legacy `CleanCamPanel`, engineering shell, NOUI host, Swing/AWT parent, Android Button/TextView functional overlay, or full-page screenshot CAM UI.
- Android CAM rendering stays on the single GLES3 surface and real Scene Nodes.
- CAM must be fully usable with Source `NONE`; CAD is never required for MANUAL.
- Public toolpath state is always complete `X Y Z A B C`; 3AX data stores A/B/C as `0.000`, never omits fields.
- CAM strategy, Active Toolpath, Candidate Toolpath, source snapshots and fixture zones are separate versioned state.
- `CAM -> TOOLPATH DISCONNECTED` protects the Active Toolpath from CAM regeneration; reconnect creates a Candidate only.
- Candidate preview/adoption never silently overwrites Active; keep/adopt/save-as-new are explicit commands.
- AI/photo/CAD source data is read-only input. Photo orientation/calibration may affect source XY only and must never directly overwrite Z/A/B/C.
- AI orientation suggestions are candidate-only; no AI action writes Active Toolpath directly.
- `FREEZE ACTIVE` prevents regeneration/adoption from modifying Active until explicit unfreeze; it is not a global lock.
- Fixture/Clamp/KeepOut/SafeClearance data is authoritative project data and persists even before advanced automatic avoidance is complete.
- Errors and alarms are local page/control/node messages only. No whole-page red state, global red overlay, global FAIL screen, or product lockout.
- A rejected edit must leave valid Active/Candidate state intact and the immediately following valid command must still work.
- 0.001 mm machining precision is preserved end-to-end.
- Offline launch/recovery must not depend on network, AI service, Drive, CAD, NC or SIM.
- Each task uses TDD: focused RED -> minimal GREEN -> related regression suite -> commit.

## Review Focus

- A/B/C values at +/-360 degrees and zero must round-trip through manual edit, avoidance, candidate adoption and persistence without truncation; out-of-range/non-finite input rejects locally.
- A disconnected or frozen Active Toolpath must remain byte-equivalent in its canonical digest after strategy/source/candidate changes until the user explicitly adopts or edits Active.
- Safe-Z changes must never leave a rapid node below Safe-Z; invalid G0-below-Safe-Z edits reject without corrupting the path.
- Corrupt/truncated CAM checkpoints must never replace the last valid in-memory/atomic checkpoint state.
- Source updates (including PHOTO/AI_CAMERA calibrated XY) must never change Z/A/B/C or Active Toolpath merely by being selected/updated.

---

### Task 1: Full XYZABC fourth-runtime CAM contract and AIG-II C-axis parity

**Files:**
- Create: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/CamContract.kt`
- Create: `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/CamContract.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/Cam.kt`
- Modify: `shared/aigii/Core.kt`
- Modify: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanCamSession.kt`
- Modify: `production-runtime/src/main/kotlin/com/aigii/production/runtime/CleanCamSession.kt`
- Test: `production-runtime/src/test/kotlin/CleanCamSessionRegression.kt` in both repositories
- Create test: `production-runtime/src/test/kotlin/FourthCamAxisParityRegression.kt` in both repositories

**Interfaces:**
- Produce `enum class CamMotionKind { G0, G1, G2, G3 }`.
- Produce `data class CamPointSnapshot(val x:Double,val y:Double,val z:Double,val a:Double,val b:Double,val c:Double,val motion:CamMotionKind,val arcI:Double?=null,val arcJ:Double?=null,val manualOverride:Boolean=false,val avoidance:Boolean=false)`.
- Produce `CamContourSide { OUTSIDE, INSIDE }`, `CamContourDirection { CCW, CW }`, `CamSourceKind { NONE, CAD_SNAPSHOT, AI_CAMERA, PHOTO }`, `CamSourceLinkState { CONNECTED, DISCONNECTED }`, `CamToolpathLinkState { CONNECTED, DISCONNECTED }`, `CamZoneKind { FIXTURE, CLAMP, KEEP_OUT }`.
- Produce `CamSourcePoint(xMm:Double,yMm:Double)`, `CamContourSnapshot(points:List<CamSourcePoint>)`, and `CamZoneSnapshot(id:String,kind:CamZoneKind,minX:Double,minY:Double,maxX:Double,maxY:Double,safeClearanceMm:Double)`; source points intentionally have no Z/A/B/C fields.
- Extend AIG CNC `CleanCamPoint` to expose A/B/C and motion metadata already present in `ManualCamPoint`.
- Extend AIG-II `ToolPoint` with `axisC:Double=0.0`; all copies, validators, manual path functions and derived machining fingerprints that include axis state must preserve C.

- [ ] **Step 1: Write failing parity tests.** Assert a MANUAL point created with `A=15.0,B=-20.0,C=35.0` returns the exact XYZABC values in both repositories; boundary `+/-360.0` survives; `360.001`, NaN and infinity reject locally; avoidance insertion preserves the source point A/B/C on lift/traverse/landing nodes.
- [ ] **Step 2: Run focused tests to verify RED.** Run both production-runtime tests and `cleanCamRegression`; expected RED is missing `CamContract`, missing A/B/C projection, and AIG-II missing `axisC`.
- [ ] **Step 3: Implement the minimum axis-parity changes.** Add the contract types, extend AIG-II `ToolPoint`/manual engine/validation/copy paths with C, and expose complete motion/ABC through both `CleanCamSession` projections. Do not add UI yet.
- [ ] **Step 4: Run focused + existing CAM/core tests.** Expected GREEN with legacy MANUAL/AUTO/Safe-Z behavior unchanged.
- [ ] **Step 5: Commit** `feat(runtime4): unify CAM XYZABC contract` in both repositories.

### Task 2: Authoritative CAM strategy, source, Active/Candidate state and runtime adapter

**Files:**
- Extend: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/CamContract.kt` and `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/CamContract.kt`
- Create: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthCamRuntimeAdapter.kt`
- Create: `production-runtime/src/main/kotlin/com/aigii/production/runtime/FourthCamRuntimeAdapter.kt`
- Modify: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanCamSession.kt` and `production-runtime/src/main/kotlin/com/aigii/production/runtime/CleanCamSession.kt`
- Create test: both `production-runtime/src/test/kotlin/FourthCamRuntimeAdapterRegression.kt`

**Interfaces:**
- Produce `CamMachiningRegion(minX:Double,minY:Double,maxX:Double,maxY:Double)` and `CamStrategySnapshot(toolNumber:Int,toolDiameterMm:Double,depthMm:Double,safeZMm:Double,feedMmMin:Double,spindleRpm:Double,side:CamContourSide,direction:CamContourDirection,leadInMm:Double,leadOutMm:Double,machiningRegion:CamMachiningRegion?,revision:Long,digest:String)`.
- Produce immutable `CamSourceSnapshot(kind,sourceId,sourceRevision,digest,contours,zones)` where contours are calibrated workpiece-XY data only.
- Produce `CamToolpathVersion(id,revision,digest,points,frozen,sourceRevision,strategyRevision)` and `CamCandidateToolpath(id,revision,digest,points,sourceRevision,strategyRevision)`.
- Produce `CamSaveRecord(revision:Long,kind:String,id:String,digest:String,message:String)` and `CamState(source,sourceLink,strategy,toolpathLink,active,candidate,savedCandidates,zones,saveHistory,previewCandidateId,message)`. `CamState.initial()` uses no source, `sourceLink=DISCONNECTED`, `toolpathLink=CONNECTED`, no Active/Candidate, and the current CAM core defaults. `StartManual` creates Active V1 and switches `toolpathLink=DISCONNECTED`.
- Produce `CamCommand` for `StartManual`, `SetToolNumber`, `SetToolDiameter`, `SetDepth`, `SetSafeZ`, `SetFeed`, `SetSpeed`, `SetContourSide`, `SetContourDirection`, `SetLeadIn`, `SetLeadOut`, `SetMachiningRegion`, `SelectSource`, `DisconnectSource`, `ConnectSource`, `ConnectToolpath`, `DisconnectToolpath`, `GenerateCandidate`, `PreviewCandidate`, `KeepActiveToolpath`, `AdoptCandidate`, `SaveCandidateAsNewVersion`, `FreezeActive`, `UnfreezeActive`, `ClearLocalMessage`.
- Produce `CamDispatchResult(accepted:Boolean,state:CamState)`, `CamRuntimePort.snapshot()/dispatch()`.

- [ ] **Step 1: Write RED state-isolation tests.** MANUAL with Source NONE must create Active V1 and set CAM->TOOLPATH DISCONNECTED; strategy change while DISCONNECTED must not change Active digest; `ConnectToolpath` must create/refresh Candidate when generation is possible while leaving Active unchanged; `PreviewCandidate` sets `previewCandidateId` only; `KeepActiveToolpath` clears/rejects the candidate preview without changing Active; `SaveCandidateAsNewVersion` appends a saved version without adopting it; `AdoptCandidate` changes Active only when not frozen; Freeze blocks adoption locally without global lock; subsequent valid command succeeds.
- [ ] **Step 2: Run focused tests; expected RED** for missing runtime adapter/state/commands.
- [ ] **Step 3: Implement deterministic strategy/source/version state.** Use existing CAM core for validation/generation. Candidate IDs/revisions are monotonic; canonical digest is SHA-256 of deterministic domain serialization. `GenerateCandidate` never mutates Active.
- [ ] **Step 4: Add Review Focus tests** proving source replacement and strategy edits cannot mutate disconnected/frozen Active and A/B/C is preserved in candidate/adoption.
- [ ] **Step 5: Run `test` + `cleanCamRegression` + new runtime regression.** Expected GREEN.
- [ ] **Step 6: Commit** `feat(runtime4): add isolated CAM runtime state` in both repositories.

### Task 3: Manual toolpath editor, Safe-Z avoidance and first-class fixture zones

**Files:**
- Extend: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/CamContract.kt` and `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/CamContract.kt`
- Modify: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthCamRuntimeAdapter.kt` and `production-runtime/src/main/kotlin/com/aigii/production/runtime/FourthCamRuntimeAdapter.kt`
- Modify: AIG CNC `CleanCamSession.kt` and core `Cam.kt` only where missing core operation is required
- Modify: AIG-II `CleanCamSession.kt` and `shared/aigii/Core.kt` only where missing core operation is required
- Create test: both `production-runtime/src/test/kotlin/FourthCamManualEditRegression.kt`

**Interfaces:**
- Add commands `AddPoint`, `DeletePoint`, `ReplacePointXYZABC`, `SetMotionKind`, `InsertAvoidance`, `AddZone`, `RemoveZone`, `SetSafeClearance` using the Task 1 `CamZoneSnapshot`.
- `ReplacePointXYZABC(index,x,y,z,a,b,c,motion)` edits Active only and marks the node `manualOverride=true`.
- `InsertAvoidance(afterIndex,landingX,landingY,landingZ)` inserts lift/traverse/landing using current Safe-Z and copies A/B/C from the source node unless explicitly edited later.
- Initial zone representation is deterministic axis-aligned XY bounds plus `safeClearanceMm`; advanced automatic collision routing is not required in this task.

- [ ] **Step 1: Write RED manual-edit tests.** Cover G0/G1 conversion, XYZABC edit, insert/delete, minimum-two-node protection, G0 below Safe-Z rejection, avoidance sequence `lift -> Safe-Z -> new XY -> descend`, A/B/C preservation, and fixture/clamp/keep-out CRUD.
- [ ] **Step 2: Run focused tests to confirm RED.**
- [ ] **Step 3: Implement minimal core-backed editing.** Reuse `ManualCamPathEngine`; add only missing C-aware/delete/motion helpers needed by the adapter. Every accepted Active edit increments Active revision/digest; strategy revision does not change for point-only edits.
- [ ] **Step 4: Run invalid-then-valid continuation tests.** Expected local WARNING/ALARM only; no state-wide failed/locked boolean and no unrelated command rejection.
- [ ] **Step 5: Run full CAM/core regression suite.** Expected GREEN and 0.001 mm unchanged.
- [ ] **Step 6: Commit** `feat(runtime4): add CAM manual path editing` in both repositories.

### Task 4: CAM atomic persistence, revision history and recovery gate

**Files:**
- Create: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CamCheckpointCodec.kt`
- Create: `production-runtime/src/main/kotlin/com/aigii/production/runtime/CamCheckpointCodec.kt`
- Extend: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/CamContract.kt` and `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/CamContract.kt` with `CamPersistencePort`
- Modify: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthCamRuntimeAdapter.kt` and `production-runtime/src/main/kotlin/com/aigii/production/runtime/FourthCamRuntimeAdapter.kt`
- Create: `product-host-android/src/main/java/com/aigstudio/runtime4/host/CamAutosaveController.kt`
- Create: `product-host-android/src/main/java/com/aigii/runtime4/host/CamAutosaveController.kt`
- Test: both `production-runtime/src/test/kotlin/CamCheckpointRegression.kt`
- Test: both `product-host-android/src/test/.../CamAutosaveControllerRegression.kt`

**Interfaces:**
- `CamPersistencePort { fun exportCheckpoint():String; fun restoreCheckpoint(raw:String):CamDispatchResult }`.
- Checkpoint schema identifier `AIG_CAM_CHECKPOINT_V1`.
- Persist source snapshot/reference, strategy, link state, Active, Candidate/saved candidates, zones, freeze, revision/digests and save history.
- `CamAutosaveController.saveNow()` uses temp file + fsync/close + atomic replace to `cam-checkpoint.aig`.

- [ ] **Step 1: Write RED round-trip tests** with non-zero A/B/C, disconnected Active, Candidate, freeze, zones and history; restored digests must equal pre-save digests.
- [ ] **Step 2: Write RED corrupt/truncated checkpoint tests.** Restore rejection must preserve the pre-existing live state and emit only a local CAM warning.
- [ ] **Step 3: Implement codec/persistence and atomic host controller.** Recovery may start only after the real GLES first frame, matching the proven CAD lifecycle rule; first CAM command is gated until recovery completes.
- [ ] **Step 4: Run focused persistence/host tests and CAM regressions.** Expected GREEN.
- [ ] **Step 5: Commit** `feat(runtime4): persist CAM working state` in both repositories.

### Task 5: Real CAM GPU Scene, navigation, active/candidate preview and local message presentation

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/CamSceneController.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/CamSceneLayout.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/CamViewportNode.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt` and `renderer-android/src/main/java/com/aigii/runtime4/renderer/gpu/AigGlesView.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt` and `renderer-android/src/main/java/com/aigii/runtime4/renderer/gpu/AigGlesRenderer.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/CamRendererStateSource.kt` and `renderer-android/src/main/java/com/aigii/runtime4/renderer/gpu/CamRendererStateSource.kt`; leave the existing CAD `RendererStateSource.kt` unchanged
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/HomeSceneLayout.kt` and `renderer-android/src/main/java/com/aigii/runtime4/renderer/scene/HomeSceneLayout.kt` to expose real `NAV.CAM`
- Modify: `product-host-android/src/main/java/com/aigstudio/runtime4/host/FourthMainActivity.kt` and `product-host-android/src/main/java/com/aigii/runtime4/host/FourthMainActivity.kt` to construct/inject CAM runtime + autosave controller
- Test: both renderer test trees with `CamSceneGraphRegression.kt` and `CamPresentationRegression.kt`

**Interfaces:**
- CAM Scene Nodes include real hitboxes for MANUAL, AUTO/Candidate generate, Source connect/disconnect, CAM<->TOOLPATH connect/disconnect, tool number/diameter, depth, Safe-Z, feed, speed, side, direction, lead-in/out, machining region, add/edit/avoidance, freeze, keep/adopt/save candidate, and HOME/CAM navigation.
- `CAM.VIEWPORT` renders Active and Candidate as distinct GPU polylines/arc segments from runtime state; Candidate is preview-only. `AigGlesView` receives both `CadRuntimePort` and `CamRuntimePort`; `AigGlesRenderer` receives both runtime ports plus both scene controllers and routes draw/input strictly by `SceneId`.
- Local CAM warning/alarm appears only in CAM HUD/node presentation; no whole-page red overlay.

- [ ] **Step 1: Write RED scene tests.** Every enabled CAM control must map `NodeId -> CamCommand`; CAM navigation must not fall through to CAD controls; no Android widget overlay/legacy panel marker is present.
- [ ] **Step 2: Write RED presentation tests.** Active and Candidate use separate presentation collections; selected/edited node state comes from CamState; local warning marker does not alter global backdrop/page state.
- [ ] **Step 3: Implement CAM Scene Controller/Layout/Viewport and inject CAM runtime into the single GLES surface.** Keep One Surface / no overlay; use approved RGB textures where present and generated GLES label textures otherwise.
- [ ] **Step 4: Run renderer tests + CAD scene regressions + host boundary gate.** CAD must remain unchanged and HOME->CAD/HOME->CAM routing must be deterministic.
- [ ] **Step 5: Commit** `feat(runtime4): add standalone CAM GLES scene` in both repositories.

### Task 6: Calibrated PHOTO/AI_CAMERA source snapshots and AUTO Candidate generation

**Files:**
- Extend: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/CamContract.kt` and `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/CamContract.kt`
- Create: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CamSourceAdapter.kt` and `production-runtime/src/main/kotlin/com/aigii/production/runtime/CamSourceAdapter.kt`
- Modify: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthCamRuntimeAdapter.kt` and `production-runtime/src/main/kotlin/com/aigii/production/runtime/FourthCamRuntimeAdapter.kt`
- Create test: both `production-runtime/src/test/kotlin/CamSourceIsolationRegression.kt`
- Optional host integration only if an existing approved image-picker/photo pipeline is found during execution; otherwise this task stops at a truthful calibrated-source ingestion API and does not add a fake camera button.

**Interfaces:**
- `CamSourceAdapter.fromCalibratedContours(kind:CamSourceKind,sourceId:String,sourceRevision:Long,contours:List<CamContourSnapshot>,zones:List<CamZoneSnapshot>):CamSourceSnapshot` accepts `PHOTO` or `AI_CAMERA` and calibrated workpiece XY only.
- Task 1 `CamSourcePoint(xMm,yMm)` contains no Z/A/B/C fields by design.
- `SelectSource` + `GenerateCandidate` may generate AUTO Candidate from the immutable calibrated contour snapshot using existing CAM generation semantics; it never mutates CAD or Active.
- `OrientationCandidate(a,b,c)` may be stored as preview metadata only; adoption into Active is explicitly excluded until the later multi-axis/SIM validation plan.

- [ ] **Step 1: Write RED source-isolation tests.** Rotated/reordered source metadata or a new PHOTO revision changes only source/candidate state; Active XYZABC digest remains unchanged until explicit adoption. Source points cannot carry Z/A/B/C.
- [ ] **Step 2: Run focused tests; expected RED** for missing source adapter/AUTO source path.
- [ ] **Step 3: Implement calibrated contour ingestion and Candidate generation.** Reuse core CAM generation from immutable geometry conversion where possible; do not claim image recognition accuracy or add mock/fake AI inference.
- [ ] **Step 4: Run source isolation + full CAM tests.** Expected GREEN.
- [ ] **Step 5: Commit** `feat(runtime4): accept calibrated CAM photo sources` in both repositories.

### Task 7: Current-APK Nox CAM Standalone acceptance

**Files:**
- Create: both `tools/verify_fourth_cam_standalone.ps1`
- Create/refresh: `evidence/android-fourth-cam-*/*`
- Create: both `docs/superpowers/progress/2026-10-10-fourth-runtime-cam-progress.md`

**Interfaces:**
- Acceptance proof is bound to the exact APK SHA-256 built after Tasks 1-6 and the runtime source HEAD recorded in the evidence manifest.

- [ ] **Step 1: Write verifier first so it REDs on missing evidence.** Required markers: HOME->CAM first-frame navigation, MANUAL without CAD, XYZABC non-zero edit, G0/G1 edit, Safe-Z avoidance with ABC preservation, CAM->TOOLPATH disconnect protection, reconnect Candidate without Active overwrite, keep/adopt/save-as-new, freeze local rejection then valid continuation, fixture zone state, save/relaunch recovery, offline launch/recovery, and rotation with same authoritative CAM revision/digest after recreation.
- [ ] **Step 2: Discover current Nox ADB serial dynamically.** Never hard-code the previous port. Record model/API/GLES; build both APKs from the task branch and record SHA-256 before install.
- [ ] **Step 3: Install and execute the real touch scenario on both APKs.** Capture HOME, CAM, manual path, avoidance, disconnected/candidate preview, local warning, recovered CAM and rotated CAM screenshots plus logcat and state manifest.
- [ ] **Step 4: Run complete post-evidence gates.** Both repos: runtime-contract tests, production-runtime tests, `cleanCamRegression`, new CAM regressions, renderer/host unit tests, existing complete CAD regression suite, GLES static gate, host-boundary gate, CAM standalone verifier and `git diff --check`.
- [ ] **Step 5: If any product source changes after evidence capture, invalidate and recapture the APK-bound evidence.** Do not rewrite manifest hashes to fit a rebuilt APK.
- [ ] **Step 6: Commit evidence/progress** as `test(runtime4): verify standalone CAM on Nox` in both repositories and record exact branch/HEAD/APK SHA/device evidence. CAM Standalone is complete only here; NC Editor remains the next independent plan.

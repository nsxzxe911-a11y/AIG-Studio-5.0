# Fourth Runtime NC Editor Standalone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone fourth-runtime NC/G-code editor for AIG CNC and AIG-II that works without CAD/CAM, preserves XYZABC into a shared MotionProgram, protects handwritten working copies from CAM reposts, persists offline, and runs as a real GLES scene with local-only diagnostics.

**Architecture:** Reuse the existing Fanuc semantic authority, editor alarm router, execution timeline, modal/safety policies and post cores. Add fourth-runtime contracts around `NcWorkingCopy`, `NcCandidate`, `MotionProgram`, and `NcMachineProfileSnapshot`; the NC renderer remains a thin GPU client of `NcRuntimePort`. CAM post enters NC only as candidate data. Direct handwritten G-code is authoritative when CAM->NC is disconnected.

**Tech Stack:** Kotlin/JVM, Android GLES 3.x, existing Fanuc NC core, Gradle 9.7, JDK 17, Nox Android 12/API32.

**Spec:** `docs/superpowers/specs/2026-10-10-fourth-runtime-cam-nc-sim-design.md`

## Global Constraints

- Versions only increase: AIG CNC NC milestone = `397-fourth-nc` / versionCode `397001`; AIG-II NC milestone = `476-fourth-nc` / versionCode `476001`.
- Direct NC/G-code entry must require neither CAD nor CAM.
- No Android `Button`/`TextView` overlay is the functional NC control surface; NC uses the existing one-Surface GLES runtime.
- No whole-page/product red state. Parser/safety/machine-profile problems are local line/control messages only.
- Handwritten `NcWorkingCopy` is never silently replaced by CAM repost output.
- CAM post output is `NcCandidate`; reconnect/repost requires preview then explicit keep/adopt/save-as-new.
- `FREEZE ACTIVE` blocks replacement/edit adoption only; it is not a global app lock.
- Shared motion data preserves X/Y/Z/A/B/C, G0/G1/G2/G3, arc data, F/S/T, relevant M events/cycles, and source line provenance.
- 3AX still stores A/B/C = 0 where absent; no parser path truncates C.
- Current CAM post cores are not certified for non-zero C output. CAM->NC post with non-zero C must produce a local warning/candidate rejection until a later verified 6AX post task; direct handwritten C remains parseable/preservable for SIM.
- 0.001 mm data precision remains unchanged.
- Persistence is local-first/offline, atomic, revision+digest based.
- Existing CAD/CAM fourth-runtime gates must remain green.

## Review Focus

1. An invalid line such as `G999 X0.` must highlight/report only that line; a following valid edit/validate command must still succeed.
2. A working copy containing non-zero C must survive edit/save/recovery/parser normalization without being zeroed even though CAM post-C remains blocked.
3. `CAM -> NC DISCONNECTED` plus manual edits must survive receiving a new CAM post candidate without changing Active/Working program digest.
4. Rotation/recreation and offline restart must preserve NC revision, cursor, freeze/link state, candidate and MotionProgram digest.
5. Machine-profile mismatch (unsupported axis, travel limit, unconfigured custom M/G34 policy) must be local diagnostic data and must not crash or globally lock the runtime.

---

### Task 1: NC contract, MachineProfile and shared MotionProgram XYZABC

**Files:**
- Create: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/NcContract.kt`
- Create: `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/NcContract.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/FanucNc.kt`
- Modify: `shared/aigii/Core.kt`
- Test: `production-runtime/src/test/kotlin/FourthNcContractRegression.kt` in both projects
- Modify: `production-runtime/build.gradle.kts` in both projects

**Interfaces:**
- Produces `NcAxisRangeSnapshot(min:Double,max:Double)` and `NcMachineProfileSnapshot(id:String,axisCount:Int,x/y/z/a/b/c:NcAxisRangeSnapshot?,customCodes:Set<String>,g34Profile:String,revision:Long,digest:String)`.
- Produces `NcMotionKind { NONE, G0, G1, G2, G3, CYCLE }`.
- Produces `MotionBlockSnapshot(lineNumber:Int, raw:String, x/y/z/a/b/c:Double?, motion:NcMotionKind, arcI/J/K:Double?, feed:Double?, spindle:Double?, tool:Int?, mCodes:List<String>, cycleCode:String?)`.
- Produces `MotionProgram(id:String,revision:Long,digest:String,blocks:List<MotionBlockSnapshot>)`.
- Produces `NcWorkingCopy`, `NcCandidate`, `NcDiagnostic`, `NcState`, `NcCommand`, `NcDispatchResult`, `NcRuntimePort`, `NcPersistencePort`.
- Extends existing `NcMachineTravelLimits` with optional C range and `rangeFor('C')`; existing A/B behavior remains source-compatible.

- [ ] **Step 1: Write the failing contract regression**

Assert that the public contract carries C at every motion/machine boundary, 3AX values may be absent/zero without removing the C field, `NcMachineTravelLimits.verified(...,cMin,cMax)` validates C, and invalid ranges reject locally at construction.

- [ ] **Step 2: Run the regression and confirm RED**

Run each project's `:production-runtime:fourthNcContractRegression`; expected failure is unresolved NC fourth-runtime symbols / missing C travel support.

- [ ] **Step 3: Implement the minimal contracts and C travel parity**

Keep all domain state immutable data classes. Reuse existing `RuntimeMessage` / `MessageSeverity`; do not create a second global error type.

- [ ] **Step 4: Run focused + existing NC/CAM/CAD tests**

Expected marker: `FOURTH_NC_CONTRACT_PASS|<PROJECT>|XYZABC|MOTION_PROGRAM|MACHINE_PROFILE|C_TRAVEL`.

- [ ] **Step 5: Commit**

`feat(runtime4): add NC XYZABC motion contract`

### Task 2: Direct handwritten working copy, local diagnostics and MotionProgram parser

**Files:**
- Create: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/NcMotionAdapter.kt`
- Create: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthNcRuntimeAdapter.kt`
- Create AIG-II equivalents under `com/aigii/production/runtime/`
- Modify: both `CleanNcSession.kt`
- Test: `production-runtime/src/test/kotlin/FourthNcRuntimeRegression.kt` in both projects

**Interfaces:**
- Consumes existing `NcSemanticAuthority`, `NcExecutionTimeline`, `NcEditorAlarmRouter`, `NcModalTracker`, machine limits and optional-code policies.
- Produces `NcMotionAdapter.parse(program:String, profile:NcMachineProfileSnapshot, revision:Long): Pair<MotionProgram,List<NcDiagnostic>>`.
- `FourthNcRuntimeAdapter` implements `NcRuntimePort` and owns Working Copy / cursor / diagnostics / normalized motion.

- [ ] **Step 1: Write RED tests for direct entry**

Cover: no CAD/CAM objects required; set/insert/backspace/delete/new-block/block-skip/cursor operations; G90/G54/G43/H/T/M/S/F; G0/G1/G2/G3; A/B/C; G81/G73/G83; M98/M99; G34/custom M-code diagnostics; `G999` local line warning followed by a successful valid edit.

- [ ] **Step 2: Run focused RED**

Expected failures: missing runtime adapter / parser behavior.

- [ ] **Step 3: Implement editor and parser adapter**

Parsing normalizes CRLF to LF, uses existing core for authority/alarm decisions, tracks modal absolute/incremental coordinates, never drops A/B/C, and returns diagnostics instead of throwing for ordinary user-line errors. Catastrophic internal exceptions become a local `ALARM` message while preserving last Working Copy.

- [ ] **Step 4: Run focused GREEN and full legacy NC suite**

Expected marker: `FOURTH_NC_RUNTIME_PASS|<PROJECT>|DIRECT_EDIT|LOCAL_DIAGNOSTIC|XYZABC|MOTION_PROGRAM`.

- [ ] **Step 5: Commit**

`feat(runtime4): add standalone NC working copy`

### Task 3: CAM post candidate ingress, disconnect, preview, adopt, save and freeze

**Files:**
- Create: both `production-runtime/.../NcPostBridge.kt`
- Modify: CNC `core/.../FanucNc.kt` to expose a toolpath/settings post entry without weakening existing gates.
- Modify: AIG-II `shared/aigii/Core.kt` with equivalent safe post entry/bridge as needed.
- Modify: both `FourthNcRuntimeAdapter.kt`
- Test: both `FourthNcCandidateRegression.kt`

**Interfaces:**
- Produces `NcPostBridge.fromCam(active:CamToolpathVersion,strategy:CamStrategySnapshot,profile:NcMachineProfileSnapshot): NcCandidate`.
- Candidate generation with any non-zero C returns a rejected result/local warning until verified 6AX post exists; Working Copy is unchanged.
- Commands cover `ConnectCam`, `DisconnectCam`, `ReceiveCandidate`, `PreviewCandidate`, `KeepWorkingCopy`, `AdoptCandidate`, `SaveCandidateAsNewVersion`, `FreezeActive`, `UnfreezeActive`.

- [ ] **Step 1: Write RED candidate-isolation tests**

Prove disconnected handwritten edits survive repost, reconnect/post creates Candidate only, preview does not mutate Working Copy, adopt is explicit, save-as-new preserves history, freeze blocks adoption but not inspect/save, and non-zero C post rejection leaves Working Copy intact.

- [ ] **Step 2: Run RED**

Expected failure: candidate/post bridge commands absent.

- [ ] **Step 3: Implement minimal safe bridge**

Refactor existing post logic only enough to accept already-authoritative CAM toolpath data; do not add a second post algorithm. Preserve existing G90/G54/G43/H, T/M/S/F, G0/G1/G2/G3, M98 P4/P5/M99 conventions and process gates.

- [ ] **Step 4: Run GREEN + post/core regressions**

Expected marker: `FOURTH_NC_CANDIDATE_PASS|<PROJECT>|DISCONNECT|PREVIEW|ADOPT|SAVE_VERSION|FREEZE|C_POST_BLOCKED_LOCAL`.

- [ ] **Step 5: Commit**

`feat(runtime4): isolate NC post candidates`

### Task 4: Atomic NC persistence and first-frame recovery gate

**Files:**
- Create: both `production-runtime/.../NcCheckpointCodec.kt`
- Create: both `product-host-android/.../NcAutosaveController.kt`
- Create tests: `NcCheckpointRegression.kt`, `NcAutosaveControllerRegression.kt`
- Modify later in Task 6: `FourthMainActivity.kt` for real first-frame completion.

**Interfaces:**
- Checkpoint stores Working Copy text/digest/revision/cursor/freeze, CAM link state, Candidate/saved candidates, selected machine profile, diagnostics source identity and MotionProgram digest.
- `RecoveringNcRuntimePort` rejects/gates NC commands until real first GLES frame calls `completeRecovery()`.

- [ ] **Step 1: Write RED round-trip/corruption tests**

Cover multiline UTF-8 G-code, non-zero C, cursor, freeze/link/candidate, corrupt checkpoint rejection preserving last live Working Copy, and atomic temp-file replacement.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement codec/controller/recovery wrapper**

Use revision+digest verification and local warning on corrupt input; no fallback to legacy NC UI.

- [ ] **Step 4: Run GREEN + restart/offline unit regressions**

Expected marker: `FOURTH_NC_CHECKPOINT_PASS|<PROJECT>|ATOMIC|RECOVERY|XYZABC|CANDIDATE|CORRUPT_REJECT`.

- [ ] **Step 5: Commit**

`feat(runtime4): persist NC working state`

### Task 5: GPU NC scene, handwritten editor and CNC keypad

**Files:**
- Create: both renderer packages `NcSceneController.kt`, `NcSceneLayout.kt`, `NcEditorViewportNode.kt`, `NcRendererStateSource.kt`
- Modify: both `AigGlesRenderer.kt`, `AigGlesView.kt`, `HomeSceneLayout.kt`, `RgbGlassButtonNode.kt`
- Add approved RGB NC icon texture if already present; otherwise use generated GPU label texture for the NC node.
- Test: `NcSceneGraphRegression.kt`, `NcPresentationRegression.kt`, `NcInputConnectionRegression.kt` in both projects

**Interfaces:**
- NC is one scene on the existing single GLES surface: `HOME -> NC` and back.
- GPU editor shows line numbers, cursor, Working/Candidate identity, local line diagnostics and status; no whole-page red clear color.
- `AigGlesView` implements IME input through an input connection that dispatches `NcCommand.InsertText/Backspace/...`; it must not create a hidden `EditText` or Android overlay.
- GPU CNC keypad provides at least G/M, X/Y/Z, A/B/C, F/S/T, 0-9, `.`, `-`, EOB/newline, Insert, Delete, Block Skip.

- [ ] **Step 1: Write RED scene/input tests**

Every enabled NC GPU node must bind a real `NcCommand`; IME text and CNC keypad must change authoritative Working Copy; local diagnostic must not change global background/alarm state.

- [ ] **Step 2: Run renderer RED**

- [ ] **Step 3: Implement scene/controller/render/input connection**

Keep NC text rendering clipped/scrolled in GPU viewport and separate from machining truth. Navigation never dispatches NC commands to CAD/CAM controllers.

- [ ] **Step 4: Run renderer/host GREEN + existing CAD/CAM gates**

Expected renderer markers include `AIG4_SCENE|HOME_TO_NC|PASS` and `AIG4_NC|COMMAND|...`.

- [ ] **Step 5: Commit**

`feat(runtime4): add standalone NC GLES editor`

### Task 6: Host recovery wiring, version bump and acceptance controls

**Files:**
- Modify: both `FourthMainActivity.kt`
- Modify: both `product-host-android/build.gradle.kts`
- Modify/create host regressions proving first-frame recovery and autosave

**Interfaces:**
- Activity owns CAD/CAM/NC recovering ports; the same real GLES `FirstFrameSignal` completes all recoveries.
- onPause atomically saves NC if recovery completed.
- Version metadata bumps only upward to 397/476 NC milestones while applicationId remains stable.

- [ ] **Step 1: Write/extend host RED tests**

Prove NC commands gated before first frame, recovery completes from first frame, onPause save works, and CAD/CAM recovery still works.

- [ ] **Step 2: Implement minimal host wiring/version bump**

- [ ] **Step 3: Run full JVM/Android unit suite + GLES/host boundary gates**

- [ ] **Step 4: Commit**

`feat(runtime4): wire NC host recovery`

### Task 7: Exact-SHA Nox NC standalone acceptance

**Files:**
- Create: `tools/verify_fourth_nc_standalone.ps1` in both projects
- Create evidence dirs: `evidence/android-fourth-nc-397/` and `evidence/android-fourth-nc-476/`
- Create: `docs/superpowers/progress/2026-10-10-fourth-runtime-nc-progress.md`

**Interfaces:**
- Evidence manifest binds `RUNTIME_HEAD`, APK SHA256, package, version, Nox model/API/GLES.

- [ ] **Step 1: Build current-source APKs and record SHA**

No product source may change after evidence capture without invalidating evidence.

- [ ] **Step 2: Nox direct-entry evidence**

Prove HOME->NC, handwritten program entry with G90/G54/G43/H/T/M/S/F and XYZABC, local `G999` diagnostic then correction, block-skip/keypad actions, MotionProgram digest, and no CAD/CAM prerequisite.

- [ ] **Step 3: Candidate/isolation evidence**

Prove manual NC edit, CAM repost Candidate preview, keep/adopt/save-as-new, disconnect protection, Freeze local rejection, and non-zero-C CAM post local block without Working Copy loss.

- [ ] **Step 4: Recovery/offline/rotation evidence**

Prove offline launch, exact Working Copy revision/digest restore, candidate restore, non-zero C preservation, PID/revision/digest stability across orientation change, and non-empty rotation logcat.

- [ ] **Step 5: Final verifier + full regressions**

Expected markers:
`FOURTH_NC_STANDALONE_PASS|AIG_CNC|SHA256=<sha>` and `FOURTH_NC_STANDALONE_PASS|AIG_II|SHA256=<sha>` plus existing CAM/CAD/GLES/host gates.

- [ ] **Step 6: Commit evidence/progress**

`test(runtime4): verify standalone NC on Nox`
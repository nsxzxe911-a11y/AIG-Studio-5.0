# Real-Machine Axis Scenes Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the provisional 4AX block/trunnion geometry and add production-grade 5AX/6AX Android GLES scenes whose kinematic chains are grounded in verified physical machines while preserving AIG-generic industrial design.

**Architecture:** Keep `MotionProgram -> AxisRuntimePort -> AxisRendererStateSource` as the only motion truth. Add pure-Kotlin machine-profile descriptors for physical joints/pivots/limits and let `AxisGlesSceneRenderer` render each page from its own profile; shared shader/material/camera/HUD infrastructure remains common. No vendor CAD/texture is shipped and no second mutable motion model is introduced.

**Tech Stack:** Kotlin, Android OpenGL ES 3.0/3.1, Gradle 9.7, JUnit, Nox Android API 32.

**Spec:** `docs/superpowers/specs/2026-10-10-real-machine-axis-scenes-independent-pages-design.md`

## Global Constraints
- 4AX physical reference: HRT210-style single rotary table; no twin-column trunnion.
- 5AX physical reference: TRT210/TR210-style dual rotary tilting table; AIG convention remains XYZ+A+B.
- 6AX physical reference: NIC-74-style XYZ + A/B/C physically plausible milling kinematics; not a robot placeholder.
- Final geometry is AIG-generic; do not ship vendor CAD, logos, textures, housings or trademarks.
- One Scene / One Renderer / No Overlay; no Canvas/WebView/second GLSurfaceView used to fake 5AX/6AX.
- Authoritative motion stays in `MotionProgram`; renderer interpolation and GPU matrices never write back.
- 0.001 mm HUD precision; projection is 3AX XYZ, 4AX XYZ+A, 5AX XYZ+A+B, 6AX XYZ+A+B+C.
- Touch controls remain >=48dp; portrait and landscape must both work.
- Missing motion/assets produce a local message; never HOME fallback, Engineering Shell or crash.
- Version only rises after implementation gates pass.

## Review Focus
- Rotary pivot placement: rotating a workpiece must occur around the profile-declared physical center, not world origin.
- Axis projection: 4AX must zero B/C, 5AX must zero C, 6AX must preserve nonzero C.
- Empty motion: every axis page still renders its machine and local status without synthetic motion.
- Scene switching: stale async scene requests cannot remount an old axis after a newer request.
- Orientation changes: portrait/landscape must preserve active scene, motion revision and current pose.

---

### Task 1: Pure machine-profile contract

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/machine/MachineProfile.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/machine/AxisMachineProfiles.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/MachineProfileRegression.kt`

**Interfaces:**
- Consumes: `AxisMode` from `runtime-contract`.
- Produces: `enum class MachineAxis { X, Y, Z, A, B, C }`, `enum class JointKind { LINEAR, ROTARY }`, `data class MachineVec3(val x:Float,val y:Float,val z:Float)`, `data class MachineJointSpec(val id:String,val axis:MachineAxis,val kind:JointKind,val parentId:String?,val pivot:MachineVec3,val min:Double,val max:Double)`, `data class MachinePartSpec(val id:String,val parentJointId:String?,val size:MachineVec3,val offset:MachineVec3)`, `data class MachineProfile(val mode:AxisMode,val profileId:String,val joints:List<MachineJointSpec>,val parts:List<MachinePartSpec>,val workpieceAnchor:MachineVec3,val toolAnchor:MachineVec3)`, and profile values `MachineProfile3Ax`, `MachineProfile4AxHrtStyle`, `MachineProfile5AxTrunnionStyle`, `MachineProfile6AxNicStyle`.

- [ ] **Step 1: Write the failing profile tests**
  Assert: 4AX has exactly one rotary joint A and no fake left/right trunnion dependency; 5AX has nested A then B rotary joints; 6AX has A/B/C rotary joints plus XYZ linear semantics; every profile has unique `profileId`, workpiece anchor, tool anchor and finite pivots/limits.
- [ ] **Step 2: Run RED**
  Run `gradle :renderer-android:testDebugUnitTest --tests '*MachineProfileRegression*'`; expect unresolved profile types.
- [ ] **Step 3: Implement the minimal profile contract**
  `MachineJointSpec(axis: MachineAxis, kind: JointKind, parentId: String?, pivot: MachineVec3, min: Double, max: Double)` and `MachineProfile(mode, profileId, joints, parts, workpieceAnchor, toolAnchor)`; encode only geometry/kinematics decisions fixed by the spec.
- [ ] **Step 4: Run GREEN and renderer suite**
  Run targeted test then full `:renderer-android:testDebugUnitTest`; expect PASS.
- [ ] **Step 5: Commit**
  `git commit -m "feat(runtime4): add physical machine profiles"`

### Task 2: Rebuild 4AX as a real single rotary-table machine

**Files:**
- Replace: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/Axis4Mesh.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/Axis4Presentation.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AxisGlesSceneRenderer.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/Axis4MachineProfileRegression.kt`
- Test: existing `Axis4MeshRegression.kt`, `Axis4PresentationRegression.kt`, `Axis4SceneLayoutRegression.kt`

**Interfaces:**
- Consumes: `MachineProfile4AxHrtStyle`; `AxisRendererStateSource.snapshotForFrame(AxisMode.AXIS4)`.
- Produces: HRT-style VMC + rotary housing/platter/chuck/workpiece render path and A-axis pivot transform.

- [ ] **Step 1: Write RED tests for physical structure and pivot**
  Assert required parts `BASE`, `COLUMN`, `TABLE`, `ROTARY_HOUSING`, `PLATTER`, `CHUCK`, `WORKPIECE`, `SPINDLE`, `TOOL`; reject `SUPPORT_LEFT`, `SUPPORT_RIGHT`, `TRUNNION`; assert A=10.000 is passed to the rotary workholding transform and B/C remain zero.
- [ ] **Step 2: Run RED**
  Expect current provisional trunnion geometry to fail the new structure assertions.
- [ ] **Step 3: Implement HRT-style geometry**
  Rebuild generic proportions from the profile; mount the rotary unit on the VMC table; rotate platter/chuck/workpiece around the profile A pivot only.
- [ ] **Step 4: Run focused + full renderer tests**
  Expect all 4AX and existing 3AX tests PASS; verify `AxisFrameEvidence.axis4Marker` still preserves motion/A/block.
- [ ] **Step 5: Commit**
  `git commit -m "feat(runtime4): rebuild axis4 from rotary table kinematics"`

### Task 3: Add real 5AX trunnion page

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/Axis5SceneLayout.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/Axis5Mesh.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/Axis5Presentation.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AxisRendererStateSource.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AxisGlesSceneRenderer.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/AxisNavigationLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/skin/SharedVisualPolicy.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/Axis5SceneRegression.kt`

**Interfaces:**
- Consumes: `MachineProfile5AxTrunnionStyle`, `AxisMode.AXIS5`.
- Produces: `FourthRenderRoute.AXIS5`, `Axis5SceneLayout.nodes(...)`, `Axis5Presentation.from(AxisSceneState)`, `drawAxis5(...)`.

- [ ] **Step 1: Write RED navigation/layout/presentation tests**
  Assert `NAV.5AX -> SceneId.AXIS5`, render route AXIS5, >=48dp controls, selected 5AX nav, exact XYZ+A+B HUD, and C=0 projection.
- [ ] **Step 2: Write RED kinematic tests**
  Assert A tilt parent contains B rotary platter/workpiece child; changing A moves the B/workpiece frame, changing B rotates the platter within A, and neither mutates the source pose.
- [ ] **Step 3: Run RED**
  Expect missing AXIS5 route/layout/renderer symbols.
- [ ] **Step 4: Implement minimum 5AX scene**
  Add AIG-generic dual-axis trunnion geometry with physically nested A/B pivots; reuse shared GLSL/material/camera only.
- [ ] **Step 5: Run GREEN + axis host cycle test**
  Extend `AxisSceneHostRegression` with 3->4->5->3 latest-request-wins sequence; all renderer tests PASS.
- [ ] **Step 6: Commit**
  `git commit -m "feat(runtime4): add real axis5 trunnion scene"`

### Task 4: Add real vertical 6AX XYZ+A+B+C page

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/Axis6SceneLayout.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/Axis6Mesh.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/Axis6Presentation.kt`
- Modify the same route/renderer/navigation files from Task 3.
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/Axis6SceneRegression.kt`

**Interfaces:**
- Consumes: `MachineProfile6AxNicStyle`, `AxisMode.AXIS6`.
- Produces: `FourthRenderRoute.AXIS6`, `Axis6SceneLayout.nodes(...)`, `Axis6Presentation.from(...)`, `drawAxis6(...)`.

- [ ] **Step 1: Write RED tests**
  Assert `NAV.6AX -> SceneId.AXIS6`, >=48dp layout, XYZ+A+B+C HUD with nonzero C preserved, and three physically nested rotary joints.
- [ ] **Step 2: Add RED transform test**
  Feed A=10/B=20/C=30 and assert each declared pivot receives its own angle in parent-child order; source `AxisSceneState` remains unchanged.
- [ ] **Step 3: Run RED**
  Expect missing AXIS6 route/layout/renderer symbols.
- [ ] **Step 4: Implement minimum NIC-style generic 6AX machine**
  Use a vertical milling body with swivel-tool rotary chain matching the approved profile; no robot arm and no flat Canvas imitation.
- [ ] **Step 5: Run GREEN + full renderer suite**
  Extend host regression to 3->4->5->6->3 and verify no HOME fallback.
- [ ] **Step 6: Commit**
  `git commit -m "feat(runtime4): add real axis6 milling scene"`

### Task 5: AIG RGB axis control deck and local-page behavior

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/AxisControlDeck.kt`
- Modify: `Axis3SceneLayout.kt`, `Axis4SceneLayout.kt`, `Axis5SceneLayout.kt`, `Axis6SceneLayout.kt`
- Modify: `scene/AxisNavigationLayout.kt`, `skin/RgbSkinTokens.kt`, `scene/RgbGlassButtonNode.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/AxisControlDeckRegression.kt`

**Interfaces:**
- Produces: `AxisControlDescriptor(controlId, action, group, label, enabled, selected)` and `AxisControlDeck.forMode(mode)`.

- [ ] **Step 1: Write RED control-deck tests**
  Every axis page must expose VIEW/AXIS/PLAY/DISPLAY; 4AX adds A controls, 5AX adds A/B, 6AX adds A/B/C; controls remain local when neighboring modules are disconnected.
- [ ] **Step 2: Run RED**
  Expect missing descriptor/deck types.
- [ ] **Step 3: Implement descriptor-driven deck**
  Layout and RGB state consume descriptors; callbacks continue through existing shared state/runtime paths rather than hard-coded screen coordinates.
- [ ] **Step 4: Run GREEN at portrait and landscape dimensions**
  Assert no overlapping bounds and all touch targets >=48dp at 1080x1920 and 1920x1080.
- [ ] **Step 5: Commit**
  `git commit -m "feat(runtime4): add independent rgb axis control decks"`

### Task 6: APK + Nox acceptance and immutable evidence

**Files:**
- Modify: `product-host-android/build.gradle.kts` only after all prior gates are green.
- Create: `tools/verify_fourth_real_axis_scenes.ps1`
- Create: new evidence directory for the new frozen version; never modify 398/477 historical evidence.

**Interfaces:**
- Consumes all previous tasks.
- Produces exact APK SHA, device logs, screenshots, rotation/offline/stress evidence.

- [ ] **Step 1: Run full project regression before version bump**
  Run `:runtime-contract:test :production-runtime:test :renderer-android:testDebugUnitTest :product-host-android:testDebugUnitTest` plus existing CAD/CAM/SIM/NC regressions; expect all PASS.
- [ ] **Step 2: Bump version upward and assembleDebug**
  Package ID unchanged; record source SHA, APK SHA-256 and bytes.
- [ ] **Step 3: Nox visual validation**
  Capture HOME, 4AX, 5AX, 6AX portrait/landscape; HUD must show authoritative nonzero rotary values from recovered MotionProgram where available.
- [ ] **Step 4: Nox lifecycle validation**
  Offline cold launch, portrait->landscape->portrait PID continuity, and at least 100 cycles of 3->4->5->6->3 without stale overlay/mount.
- [ ] **Step 5: Run exact verifier**
  Verifier checks SHA/version/package/source ancestor, images/log markers, physical profile IDs, no HOME fallback, no Engineering Shell, no flat Canvas 5/6AX path.
- [ ] **Step 6: Commit evidence separately**
  `git commit -m "test(runtime4): verify real machine axis scenes on Nox"`

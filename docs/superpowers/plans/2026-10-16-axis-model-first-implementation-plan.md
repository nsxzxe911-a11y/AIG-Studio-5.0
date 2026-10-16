# 3AX-6AX Model-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver real, movable, Authority-matched 3AX/4AX/5AX/6AX machine models first, with camera motion isolated from CNC kinematics; expose only 3AX to productId=AIG and expose 3AX-6AX to productId=AIG_II.

**Architecture:** Reuse the existing `Machining3DView`, `Machining3D` core, gesture camera, toolpath/material data, and `AxisCockpitSkinContract`; do not rewrite the renderer. Introduce an explicit machine scene-graph/kinematic contract whose rigid components have named pivots and axis ownership, then build 3AX -> 4AX -> 5AX -> 6AX incrementally. Model pose is driven by XYZ/A/B/C machine state, while orbit/pan/zoom remains a view-only transform applied after machine pose. Authority assets are visual truth; runtime meshes remain real geometry, never image skins.

**Tech Stack:** Kotlin/JVM core, Android Kotlin View/Canvas/GPU-backed rendering path already present in the project, Gradle regression tasks, Android emulator/Nox runtime evidence.

**Spec:** `docs/superpowers/specs/2026-10-16-dual-project-product-capability-authority-design.md`

## Global Constraints

- Product identity resolution is `RGB Authority -> product family -> Product Capability Authority -> MAX_AXIS -> runtime binding`.
- `AIG`: `MAX_AXIS=3`; never expose or activate 4AX/5AX/6AX.
- `AIG_II`: `MAX_AXIS=6`; formal 3AX/4AX/5AX/6AX models are mandatory.
- Shared CAD/CAM/3D/SIM/NC/AI cores are not deleted or forked while model work proceeds.
- Authority layout: left controls about 8%, central true 3D machining viewport 65%-75% (target 72% landscape), right true-data area about 22%.
- Camera yaw/pitch/pan/zoom is view-only and MUST NOT mutate X/Y/Z/A/B/C machine state.
- Runtime models are real mesh/scene geometry; no full-page Authority image, fake hitbox skin, video-only animation, or engineering-shell fallback.
- Existing 0.001 mm, G90, NC/Fanuc and safety semantics are not redefined by model work.
- No release APK/EXE is produced from this line until all required model evidence is green.

## Authority fingerprints

- 3AX SHA-256 `4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28`: vertical VMC / vise / workpiece / blue toolpath.
- 4AX SHA-256 `a46c11e6f08b28dde24df066ac697c4b965079de1cb4df5091e58c7ab60d4a26`: horizontal A axis / chuck / XYZ+A.
- 5AX SHA-256 `e8d8b0304873cd6768d93d20a495fa8969c9ec72adb09ba9810da5b3b25ec5b3`: A/B trunnion / impeller / large five-axis work view.
- 6AX SHA-256 `73f34e958bb22925ceed32b986443240b9322a77bf0cadbc1b81f62501683be6`: A/B/C / swing head / multi-face machining / impeller.

## Review Focus

- Camera gestures while A/B/C are non-zero: the machine pose must not drift or be rewritten by the camera.
- Axis wrap/boundary poses such as A=360, B=180, C=360: scene transforms must remain finite and continuous.
- Missing or mismatched Authority fingerprint: model evidence must BLOCK rather than fall back to an engineering or generic shell.
- Product capability mismatch: AIG must reject 4AX/5AX/6AX even if those model definitions are compiled in shared code; AIG II must require all four models.
- Low-end/mobile rendering path: model detail may reduce through LOD, but pivots, tool/workpiece position, axis pose and Authority silhouette must remain semantically identical.

---

## File Structure

**Create**
- `core/src/main/kotlin/com/aigstudio/core/AxisMachineModelContract.kt` — model identities, Authority fingerprints, axis ownership, rigid-part/pivot scene graph and product capability filtering.
- `core/src/test/kotlin/com/aigstudio/core/AxisMachineModelContractRegression.kt` — cross-axis scene-graph and capability RED/GREEN contract.
- `core/src/test/kotlin/com/aigstudio/core/AxisMachinePoseRegression.kt` — exact XYZ/A/B/C transform and camera-isolation evidence.
- `ci/verify_axis_model_authority_contract.py` — fail-closed static contract for four hashes, required pages, no engineering fallback.

**Modify**
- `core/src/main/kotlin/com/aigstudio/core/Machining3D.kt` — consume the scene-graph contract and produce posed rigid machine components; do not move material-removal math into model code.
- `core/src/main/kotlin/com/aigstudio/core/AxisCockpitSkinContract.kt` — bind each axis mode to the new model key while preserving 72% landscape viewport and existing camera presets.
- `core/src/main/kotlin/com/aigstudio/core/SixAxisToolDirection.kt` — retain canonical A/B tool-vector semantics; only add adapter data needed by the 6AX model if a failing test proves it necessary.
- `app/src/main/java/com/aigstudio/app/Machining3DView.kt` — render posed rigid parts from model output, preserving orbit/pan/zoom as a post-pose view transform.
- `app/src/main/java/com/aigstudio/app/AxisCockpitSkinInstaller.kt` — install the real 3D viewport and surrounding Authority cockpit layout; never install an image as interactive runtime.
- `app/src/main/java/com/aigstudio/app/MainActivity.kt` — only minimal page/model selection binding; do not reintroduce modal formal pages.
- `core/src/test/kotlin/com/aigstudio/core/AxisCockpitSkinRegression.kt` — require unique model keys and Authority hashes in addition to skin keys.
- `ci/verify_android_axis_page_persistence_contract.py` — require model pose persistence, not just selected navigation label.

---

### Task 1: Lock the four machine-model contracts and product capability filter

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/AxisMachineModelContract.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/AxisMachineModelContractRegression.kt`
- Create: `ci/verify_axis_model_authority_contract.py`
- Modify: `core/src/main/kotlin/com/aigstudio/core/AxisCockpitSkinContract.kt`
- Test: `core/src/test/kotlin/com/aigstudio/core/AxisMachineModelContractRegression.kt`

**Interfaces:**
- Produces: `enum class AxisMachineMode { AX3, AX4, AX5, AX6 }`
- Produces: `data class AxisMachineModelSpec(val mode:AxisMachineMode, val modelKey:String, val authoritySha256:String, val rotaryAxes:List<String>, val machineStyle:String)`
- Produces: `object AxisMachineModelContract { fun spec(mode:AxisMachineMode):AxisMachineModelSpec; fun allowedModes(productId:String,maxAxis:Int):List<AxisMachineMode> }`
- Consumes: current `AxisCockpitSkinContract.mode(id:String)`.

- [ ] **Step 1: Write the failing contract regression**

Assert exact Authority SHA values, unique `modelKey` values, `AX3=[]`, `AX4=[A]`, `AX5=[A,B]`, `AX6=[A,B,C]`, `allowedModes("AIG",3)==[AX3]`, and `allowedModes("AIG_II",6)==[AX3,AX4,AX5,AX6]`.

- [ ] **Step 2: Run the regression and confirm RED**

Run the existing project mechanism used for standalone Kotlin regression mains, targeting `AxisMachineModelContractRegression`.
Expected: FAIL because `AxisMachineModelContract` does not exist.

- [ ] **Step 3: Implement the minimal model contract**

Add only identity/capability data; do not add geometry yet. Bind `AxisCockpitModeSkin` to the model key without changing current camera/viewport constants.

- [ ] **Step 4: Add the fail-closed CI authority verifier**

`ci/verify_axis_model_authority_contract.py` must fail if any of the four exact SHA values are absent, AIG allows >3 axes, AIG II lacks 3-6, or any formal model fallback contains `Engineering`, `Debug`, `Renderer`, `OpenGL`, or generic modal substitution markers.

- [ ] **Step 5: Run regression + verifier and confirm GREEN**

Expected markers:
`AXIS_MACHINE_MODEL_CONTRACT_PASS|AIG=3AX|AIG_II=3AX,4AX,5AX,6AX`
`AXIS_MODEL_AUTHORITY_CONTRACT_PASS`

- [ ] **Step 6: Commit**

`git commit -m "feat(models): lock 3ax-6ax authority and capability contract"`

---

### Task 2: Define rigid-part scene graph and isolate camera from machine pose

**Files:**
- Modify: `core/src/main/kotlin/com/aigstudio/core/AxisMachineModelContract.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/AxisMachinePoseRegression.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/Machining3D.kt`
- Modify: `app/src/main/java/com/aigstudio/app/Machining3DView.kt`

**Interfaces:**
- Produces: `enum class MachineJointAxis { X, Y, Z, A, B, C, FIXED }`
- Produces: `data class MachineRigidPartSpec(val id:String, val parentId:String?, val jointAxis:MachineJointAxis, val pivot:Vec3, val role:MachineComponentRole)`
- Produces: `data class MachineAxisPose(val x:Double,val y:Double,val z:Double,val a:Double,val b:Double,val c:Double)`
- Produces: `fun AxisMachineModelContract.parts(mode:AxisMachineMode):List<MachineRigidPartSpec>`
- Produces: `fun MachineModel3D.withPose(pose:MachineAxisPose):MachineModel3D`
- Consumes: existing camera values in `Machining3DView`; those remain view transform only.

- [ ] **Step 1: Write RED pose tests**

Test that camera yaw/pitch changes do not alter `MachineAxisPose`; zero pose is finite; A/B/C=360 remains finite; child rigid parts inherit the correct parent transform; tool and workpiece follow different owned joints where required.

- [ ] **Step 2: Run and confirm RED**

Expected: missing scene-graph/pose interfaces.

- [ ] **Step 3: Implement hierarchical rigid transforms**

Use rigid matrix/point transforms for parent -> child composition. Do not use skeletal skin weights: CNC machine parts are rigid. Keep camera rotation entirely in `Machining3DView.project/rotate` after world/model pose.

- [ ] **Step 4: Run pose regression and existing 6AX tool-direction regression**

Expected: both PASS; no change to canonical A/B cutting-vector semantics.

- [ ] **Step 5: Commit**

`git commit -m "feat(models): add rigid axis scene graph and isolated pose"`

---

### Task 3: Deliver the 3AX model first

**Files:**
- Modify: `core/src/main/kotlin/com/aigstudio/core/AxisMachineModelContract.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/Machining3D.kt`
- Modify: `app/src/main/java/com/aigstudio/app/Machining3DView.kt`
- Modify: `app/src/main/java/com/aigstudio/app/AxisCockpitSkinInstaller.kt`
- Test: `core/src/test/kotlin/com/aigstudio/core/AxisMachinePoseRegression.kt`

**Interfaces:**
- Consumes: `MachineAxisPose`, rigid scene graph.
- Produces: model key `machine-3ax-vmc-v1` with fixed base/column, XYZ moving structure, spindle/holder/tool, vise, stock and toolpath context.

- [ ] **Step 1: Add RED 3AX structure assertions**

Require vertical VMC silhouette roles, vise/fixture, stock, spindle/tool; no A/B/C-owned rigid part; X/Y/Z movement changes the expected moving chain only.

- [ ] **Step 2: Implement minimal Authority-shaped 3AX geometry**

Use deterministic procedural rigid meshes compatible with the existing renderer. Prioritize correct silhouette, proportions, pivot chain and machining window over PBR detail.

- [ ] **Step 3: Bind 3AX to the formal cockpit viewport**

Landscape central viewport target `0.72`; preserve left/right Authority bands; keep blue toolpath visibly distinct from the machine.

- [ ] **Step 4: Run core tests + Android compile**

Expected: 3AX model contract/pose/cockpit tests PASS; Android compile succeeds.

- [ ] **Step 5: Capture 3AX runtime evidence**

Evidence must include: zero pose, non-zero XYZ pose, orbit-camera pose, reset view; verify machine coordinates unchanged by camera gesture.

- [ ] **Step 6: Commit**

`git commit -m "feat(models): deliver authority-based 3ax vmc model"`

---

### Task 4: Add the 4AX horizontal A-axis model

**Files:**
- Modify: `core/src/main/kotlin/com/aigstudio/core/AxisMachineModelContract.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/Machining3D.kt`
- Modify: `app/src/main/java/com/aigstudio/app/Machining3DView.kt`
- Test: `core/src/test/kotlin/com/aigstudio/core/AxisMachinePoseRegression.kt`

**Interfaces:**
- Produces: model key `machine-4ax-horizontal-a-v1`.
- Axis ownership: XYZ linear chain plus rotary `A`; chuck/workpiece are children of the A rotary assembly.

- [ ] **Step 1: Add RED 4AX pivot tests**

Assert only A rotary is exposed; changing A rotates chuck/workpiece around the A pivot while spindle/tool world chain remains mechanically consistent; A=0/90/180/360 all finite.

- [ ] **Step 2: Implement horizontal rotary/chuck rigid geometry**

Match Authority silhouette: horizontal A-axis, chuck, workpiece, XYZ+A HUD semantics.

- [ ] **Step 3: Run 3AX + 4AX regressions**

Expected: 3AX remains unchanged; 4AX passes pivot tests.

- [ ] **Step 4: Capture 4AX runtime evidence**

Capture A=0, A=90, A=180 plus independent camera orbit.

- [ ] **Step 5: Commit**

`git commit -m "feat(models): add horizontal 4ax rotary model"`

---

### Task 5: Add the 5AX A/B trunnion model

**Files:**
- Modify: `core/src/main/kotlin/com/aigstudio/core/AxisMachineModelContract.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/Machining3D.kt`
- Modify: `app/src/main/java/com/aigstudio/app/Machining3DView.kt`
- Test: `core/src/test/kotlin/com/aigstudio/core/AxisMachinePoseRegression.kt`

**Interfaces:**
- Produces: model key `machine-5ax-ab-trunnion-v1`.
- Axis ownership: nested A/B trunnion with workpiece/impeller attached to the correct downstream table node.

- [ ] **Step 1: Add RED nested-pivot tests**

Assert A and B have different pivots and nested transforms; A-only, B-only and A+B poses produce distinct finite workpiece transforms; no C model joint exists.

- [ ] **Step 2: Implement trunnion/impeller-oriented rigid geometry**

Match Authority: large machining window, A/B cradle/trunnion, impeller/workpiece and small tool. PBR remains out of scope for this pass.

- [ ] **Step 3: Run 3AX/4AX/5AX regressions**

Expected: previous models remain green; 5AX nested pose PASS.

- [ ] **Step 4: Capture 5AX runtime evidence**

Capture neutral pose, A tilt, B rotate, combined A+B, independent camera orbit.

- [ ] **Step 5: Commit**

`git commit -m "feat(models): add 5ax ab trunnion model"`

---

### Task 6: Add the 6AX A/B/C swing-head/multi-face model

**Files:**
- Modify: `core/src/main/kotlin/com/aigstudio/core/AxisMachineModelContract.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/Machining3D.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/SixAxisToolDirection.kt` only if required by a failing adapter test
- Modify: `app/src/main/java/com/aigstudio/app/Machining3DView.kt`
- Test: `core/src/test/kotlin/com/aigstudio/core/AxisMachinePoseRegression.kt`

**Interfaces:**
- Produces: model key `machine-6ax-abc-multiface-v1`.
- Axis ownership: A/B/C all explicit; C rotation is mechanically visible but must preserve the existing contract that C does not alter the cutting-axis direction vector when it is rotation about the tool/spindle axis.

- [ ] **Step 1: Add RED 6AX hierarchy tests**

Require A/B/C parts and pivots; combined A/B/C transform finite; C produces visible rigid rotation while `SixAxisToolDirectionContract.fromRotaryAB(a,b)` remains unchanged by C.

- [ ] **Step 2: Implement swing-head/multi-face rigid geometry**

Match Authority: A/B/C, swing head, impeller/multi-face workpiece and clearly visible tool contact orientation.

- [ ] **Step 3: Run complete axis model regression set**

Expected: 3AX/4AX/5AX/6AX all PASS plus existing `SixAxisToolDirection` regression PASS.

- [ ] **Step 4: Capture 6AX runtime evidence**

Capture neutral, A-only, B-only, C-only, combined A/B/C, side-cut pose, orbit-camera pose.

- [ ] **Step 5: Commit**

`git commit -m "feat(models): add 6ax abc multiface model"`

---

### Task 7: Enforce product separation without duplicating model core

**Files:**
- Modify: `core/src/main/kotlin/com/aigstudio/core/AxisMachineModelContract.kt`
- Modify: `app/src/main/java/com/aigstudio/app/MainActivity.kt`
- Modify: `ci/verify_axis_model_authority_contract.py`
- Test: `core/src/test/kotlin/com/aigstudio/core/AxisMachineModelContractRegression.kt`

**Interfaces:**
- Consumes: `allowedModes(productId,maxAxis)`.
- Produces: fail-closed model/page registration for the product identified by RGB Authority + capability manifest.

- [ ] **Step 1: Add RED product-isolation tests**

AIG must reject navigation/model selection for AX4/AX5/AX6; AIG II must reject startup/release evidence if any AX3-AX6 model is missing.

- [ ] **Step 2: Bind formal model navigation to capability results**

Do not delete 4-6 shared definitions; simply make them unavailable to AIG runtime registration.

- [ ] **Step 3: Run contract verifier**

Expected: `AIG=3AX_ONLY`, `AIG_II=3AX_4AX_5AX_6AX`, no identity inference from repo name/theme default.

- [ ] **Step 4: Commit**

`git commit -m "feat(models): enforce aig vs aig-ii axis capability"`

---

### Task 8: Runtime persistence, performance and Authority evidence gate

**Files:**
- Modify: `ci/verify_android_axis_page_persistence_contract.py`
- Modify: `ci/verify_android_axis_page_persistence.sh`
- Create: `ci/verify_axis_model_runtime_evidence.py`
- Modify: existing axis model/cockpit tests only as required by RED evidence.

**Interfaces:**
- Consumes: runtime screenshots/state dumps for each allowed axis mode.
- Produces: evidence record containing product identity, mode, Authority SHA, model key, XYZABC pose, camera pose, viewport fraction, and persistence result.

- [ ] **Step 1: Write RED evidence verifier**

Require two snapshots per model with non-default model pose persisted; require camera pose separately reported; require viewport fraction within 0.65..0.75; reject engineering-shell/modal evidence.

- [ ] **Step 2: Run against current runtime and confirm RED where evidence is absent**

Do not weaken the verifier to fit existing screenshots.

- [ ] **Step 3: Add only the runtime state/evidence plumbing needed for GREEN**

No feature work outside the model line.

- [ ] **Step 4: Run Android build and per-axis runtime evidence**

Required order: 3AX -> 4AX -> 5AX -> 6AX. AIG evidence stops at 3AX; AIG II evidence requires all four.

- [ ] **Step 5: Performance check**

Verify camera interaction remains smooth at the configured 60 Hz target and no static hidden page consumes active animation work. LOD may simplify mesh detail but not change pivots or axis state.

- [ ] **Step 6: Final model-first gate**

Expected markers:
`AXIS_MODEL_3AX_RUNTIME_PASS`
`AXIS_MODEL_4AX_RUNTIME_PASS`
`AXIS_MODEL_5AX_RUNTIME_PASS`
`AXIS_MODEL_6AX_RUNTIME_PASS`
`CAMERA_KINEMATICS_ISOLATION_PASS`
`AXIS_MODEL_AUTHORITY_EVIDENCE_PASS`

- [ ] **Step 7: Commit**

`git commit -m "test(models): gate 3ax-6ax runtime authority evidence"`

---

### Task 9: Model-first handoff before CAM/SIM/NC reintegration

**Files:**
- Create: `docs/evidence/axis-model-first-handoff.md`

**Interfaces:**
- Consumes: all Task 1-8 evidence.
- Produces: exact model keys, exact commits, Authority hashes, runtime screenshot identifiers, supported axes by product, known remaining non-model gaps.

- [ ] **Step 1: Record verified model inventory**

For each of 3AX/4AX/5AX/6AX, record geometry style, joint hierarchy, pose evidence and Authority SHA.

- [ ] **Step 2: Explicitly list what this milestone does NOT claim**

Do not claim CAM, material removal, NC, AI, or full product completion merely because models pass.

- [ ] **Step 3: Run `git diff --check` and the complete model-first regression suite**

Expected: zero whitespace errors and all model-first gates green.

- [ ] **Step 4: Commit**

`git commit -m "docs(models): record verified 3ax-6ax model handoff"`

---

## Self-Review Result

- Spec coverage: model-first scope covers product identity, 3AX/4AX/5AX/6AX capability separation, Authority matching, formal runtime viewport, true callbacks/state, camera isolation and no engineering fallback. Shared CAD/CAM/NC cores are intentionally preserved but not claimed complete by this milestone.
- Type consistency: all later tasks consume `AxisMachineMode`, `AxisMachineModelSpec`, `MachineRigidPartSpec`, and `MachineAxisPose` defined in Tasks 1-2.
- Review Focus coverage: camera isolation -> Task 2/8; angle boundaries -> Task 2/4/5/6; Authority mismatch -> Task 1/8; product mismatch -> Task 1/7; mobile LOD/performance -> Task 8.
- Proportion: geometry implementations are specified by required interfaces, pivots, silhouettes and tests rather than pasted bodies.

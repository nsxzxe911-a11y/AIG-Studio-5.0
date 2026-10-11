# Fourth Runtime 4AX Mobile Implementation Plan

**Goal:** Extend the verified 3AX Fourth Runtime milestone to a real 4AX Android GPU scene with an A-axis trunnion/workholding rotation driven by the existing MotionProgram, while modularizing axis rendering before 5AX/6AX growth.

**Baseline evidence:** 3AX exact-SHA checkpoints are immutable: AIG CNC evidence head `d8a7f851cd9bb4989df108fe4c0167be3f6dec32`; AIG-II evidence head `2355b035e95022f256c14569aae160cd07f15ed1`.

**Architecture:** Keep AxisRuntimePort/MotionProgram as the only axis truth. Extract axis-specific GLES drawing from AigGlesRenderer into a dedicated axis scene renderer module, then add AXIS4 layout/navigation/mesh and A-axis model transforms. Current verified Android backend remains GLES3; Vulkan remains a later backend milestone.

## Constraints
- Do not rewrite 398/477 3AX evidence.
- One Scene / One Renderer / No Overlay.
- 4AX = XYZ + A; B/C must remain zero through AxisPoseSnapshot.forMode(AXIS4).
- A rotation is presentation/kinematics only and may never mutate MotionProgram.
- 4AX must be visually distinct from 3AX: independent left/right rotary supports + trunnion/workholding body.
- Missing/empty motion is a local message, not HOME fallback or crash.
- Preserve phone portrait/landscape and >=48dp controls.
- Keep AigGlesRenderer as dispatch/orchestration; axis-specific mesh/camera/model code moves to a separate module before adding more axes.
- Version only rises after implementation gates pass: next target CNC 399, AIG-II 478.

### Task 1 — Modularize existing axis GPU rendering without behavior change
- Create `renderer-android/.../gpu/AxisGlesSceneRenderer.kt`.
- Move 3AX camera/model/HUD drawing out of `AigGlesRenderer` while preserving markers and screenshots semantics.
- Add unit/static regression proving AigGlesRenderer delegates AXIS3 and no longer contains machine-part transform logic.
- Run renderer + host tests. Commit: `refactor(runtime4): modularize axis gpu scene rendering`.

### Task 2 — 4AX route and adaptive layout
- Extend SharedVisualPolicy: `NAV.4AX -> SceneId.AXIS4` only after layout/runtime route exists.
- Add `Axis4SceneLayout.kt`; add 4AX entry to HOME and axis nav bars.
- Extend render route policy with `FourthRenderRoute.AXIS4`; AXIS5/6 remain UNAVAILABLE.
- TDD portrait/landscape bounds, 48dp controls, selected state, latest-request-wins route behavior.
- Commit: `feat(runtime4): route fourth runtime to axis4 scene`.

### Task 3 — Real 4AX mesh and A rotation
- Add `Axis4Mesh.kt` with independent BASE/COLUMN/SUPPORT_LEFT/SUPPORT_RIGHT/TRUNNION/WORKPIECE/SPINDLE/TOOL volumes.
- Add AXIS4 draw path in AxisGlesSceneRenderer.
- Use `AxisRendererStateSource.snapshotForFrame(AxisMode.AXIS4)`; HUD must show exact XYZ + A to 0.001 display precision.
- Rotate trunnion/workpiece by the authoritative A value; B/C stay zero.
- Add first-frame marker `AIG4_AXIS4|FIRST_FRAME|PASS|MOTION=...|A=...`.
- Unit tests prove true 3D mesh, dedicated AXIS4 route, A transform input preserved, no HOME fallback.
- Run contract/runtime/renderer/host gates. Commit: `feat(runtime4): render real gles3 axis4 trunnion scene`.

### Task 4 — 399/478 APK + Nox exact evidence
- Bump only versionCode/versionName: CNC 399001 / `399-fourth-axis4`; AIG-II 478001 / `478-fourth-axis4`. Package IDs unchanged.
- Run full CAD/CAM/SIM/Axis/NC regressions + assembleDebug.
- Record source SHA + APK SHA-256.
- Nox: HOME -> 4AX, portrait, landscape, rotation continuity, route cycle, offline cold launch; verify A value is visible and nonzero from recovered MotionProgram.
- Add standalone exact verifier and evidence manifests without modifying 3AX evidence.
- Commit evidence separately.
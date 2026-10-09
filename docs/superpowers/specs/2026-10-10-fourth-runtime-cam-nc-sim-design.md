# AIG-II / AIG CNC Fourth Runtime CAM -> NC -> SIM Modular Design

Date: 2026-10-10
Status: Approved written design
Scope: AIG-II + AIG CNC, fourth-runtime CAM first, with NC Editor and 3AX/4AX/5AX/6AX SIM contracts reserved now

## 1. Purpose

Continue the fourth runtime after CAD Standalone without recreating tight coupling between CAD, CAM, NC, and simulation.

The product must support all of these professional workflows without forcing the user through CAD:

- CAD snapshot -> CAM -> toolpath -> NC -> SIM.
- AI camera/photo -> CAM -> toolpath -> SIM.
- CAM strategy disconnected from toolpath -> manual toolpath editing/fixture avoidance -> SIM.
- Direct handwritten G-code -> NC working copy -> 3AX/4AX/5AX/6AX SIM.

The core rule is isolation: source geometry, CAM strategy, active toolpath, candidate toolpath, NC working copy, NC candidate, and SIM view state are separate versioned objects. Linking means controlled data flow, never shared mutable ownership.

## 2. Delivery decomposition

This design intentionally spans three independent subprojects so that each can be implemented and accepted without waiting for the others:

1. Fourth Runtime CAM Standalone.
2. Fourth Runtime NC Editor Standalone.
3. Fourth Runtime 3AX/4AX/5AX/6AX SIM Preview and true simulation.

The first implementation plan after this spec is CAM Standalone only. NC and SIM contracts are defined now so CAM does not choose an incompatible data model.

Cross-module Shared Link Graph remains a later stage. Local link state inside the CAM workflow is allowed now only where it protects working copies and candidate generation; it must not become a global permission system.

## 3. Non-negotiable no-red-lock policy

Neither AIG-II nor AIG CNC may use a whole-page red state, whole-product red state, global red overlay, global FAIL screen, or red lockout to represent ordinary domain/runtime errors.

Warnings, alarms, invalid values, collisions, unsupported commands, parser issues, stale sources, candidate failures, and machine-profile mismatches are localized to the relevant page, control, field, block, toolpath node, or machine axis.

Red may be used only as local visual emphasis for the affected warning/alarm. A failed command rejects that command only. The user must remain able to inspect, edit, save, switch pages, and correct unrelated data.

Examples:

- `G0 Z2.000` below `Safe-Z 8.000` rejects that edit and highlights the affected CAM/toolpath node; CAM remains usable.
- Invalid G-code highlights the NC block and reports the reason in the NC page; CAD/CAM/SIM are not globally locked.
- Candidate generation failure leaves the current Active Toolpath untouched and usable.
- Axis travel/collision warnings appear on the relevant axis/SIM function, not as an application-wide red state.

Crashes are not an error-display mechanism. Expected user/domain errors become local messages.

## 4. Authoritative module boundaries

The fourth runtime uses the existing dependency direction:

`GPU RGB Scene -> Command -> Runtime Port -> Headless Core -> Authoritative State -> Renderer redraw`

Renderer/UI code never owns machining truth.

The following authoritative domains remain separate:

- `SourceState`: source identity and immutable snapshot/revision.
- `CamStrategyState`: machining strategy parameters.
- `ToolpathVersion`: active executable path working copy.
- `CandidateToolpath`: newly generated path not yet active.
- `NcWorkingCopy`: directly editable G-code program.
- `NcCandidate`: generated/re-posted G-code not yet active.
- `MotionProgram`: normalized parsed motion representation consumed by simulation.
- `SimState`: playback/view/material-removal state; never mutates CAM or NC.
- `MachineProfile`: machine axis semantics, limits, rotary centers, custom M-codes and post/parser capabilities.

## 5. Source model: CAD and AI photo are read-only inputs

CAM source types:

- `NONE`
- `CAD_SNAPSHOT`
- `AI_CAMERA`
- `PHOTO`
- future import formats may be added without changing CAM ownership rules.

CAD integration is snapshot-based. CAM receives a CAD revision copy and must never receive mutable ownership of the CAD document.

Example:

`CAD Rev 31 -> CamSourceSnapshot(sourceRevision=31)`

Changing tool diameter, Safe-Z, lead-in/out, side/direction, avoidance, or manual path nodes must never mutate CAD Rev 31.

When CAD later reaches Rev 32, CAM may report that a newer source exists. It must not silently replace Rev 31 or regenerate the active toolpath.

The user may keep the current source, load the newer snapshot, or create a new CAM version.

## 6. AI camera/photo coordinate isolation

Camera/photo processing is a source pipeline, not a machine-axis controller:

`Image Pixel -> EXIF normalization -> PHOTO ALIGN -> PHOTO SCALE(mm) -> calibrated photo XY -> workpiece XY -> CAM local XYZ -> machine XYZABC`

AI/photo is allowed to identify contours, holes, machining regions, fixture/clamp/keep-out regions, and other source features.

Photo orientation, EXIF, perspective correction, and AI recognition must never directly overwrite Z/A/B/C.

AI may propose an `OrientationCandidate(A,B,C)`, but it is preview-only until explicitly adopted after 3D/machine checks. The active toolpath is never changed merely because an AI orientation suggestion exists.

## 7. CAM strategy state

`CamStrategyState` owns at least:

- tool identity and diameter
- cut depth
- Safe-Z
- feed
- spindle speed
- contour side: INSIDE / OUTSIDE
- contour direction: CW / CCW
- lead-in / lead-out
- machining region
- source reference/revision
- strategy revision and digest

MANUAL remains first-class and may operate with no CAD source.

AUTO may use a CAD snapshot or calibrated AI camera/photo source. AUTO output is a Candidate Toolpath until adopted; it does not directly replace Active Toolpath.

## 8. Full XYZABC toolpath model from the start

Every toolpath node carries complete axis state even when the current machine mode uses fewer axes:

`X Y Z A B C`

and motion metadata sufficient for at least:

- G0 rapid
- G1 linear feed
- G2/G3 arc feed
- feed/spindle/tool references where relevant
- manual override marker
- avoidance marker
- source/revision provenance

3AX data still stores `A=0, B=0, C=0`. Switching the renderer from 3AX to 4AX/5AX/6AX must never require converting or truncating the underlying data.

Current migration gap discovered during design review:

- AIG CNC core `ManualCamPoint` already contains A/B/C, but the current `CleanCamSession` projection exposes only X/Y/Z/rapid and therefore drops A/B/C at that adapter boundary.
- AIG-II current `ToolPoint` contains A/B but not C.

CAM implementation Task 1 must unify the public fourth-runtime toolpath contract to XYZABC and close both gaps before UI work depends on it.

## 9. CAM -> TOOLPATH connect/disconnect semantics

CAM strategy and toolpath are not the same object.

`CAM -> TOOLPATH CONNECTED` means strategy changes are allowed to generate a new Candidate Toolpath.

`CAM -> TOOLPATH DISCONNECTED` means the current Active Toolpath becomes an independent working copy. The user may change X/Y/Z/A/B/C, G0/G1 type, start/end points, Safe-Z routing, insert/delete nodes, and fixture avoidance without CAM recalculation overwriting the path.

Reconnecting never overwrites Active Toolpath. It generates a Candidate Toolpath and requires an explicit choice:

- keep current manual/active toolpath
- adopt CAM candidate
- save candidate as a new toolpath version

Previewing a candidate is read-only with respect to Active Toolpath.

## 10. Fixture, clamp and keep-out handling

Fixture data is first-class project data, not merely a screen annotation:

- `FixtureZone`
- `ClampZone`
- `KeepOutZone`
- `SafeClearance`

CAM AUTO may use this information to generate an avoidance candidate. Manual toolpath editing may insert the explicit sequence:

`lift -> Safe-Z -> new XY -> descend`

When inserting avoidance into an existing multi-axis path, the original node A/B/C orientation is preserved unless the user explicitly edits or adopts a new orientation candidate.

Fixture profiles are saveable and reusable for the project/setup.

## 11. Candidate and version model

Generated data is candidate data until adoption.

At minimum the project can retain:

- `CAM Strategy Vn`
- `Active Toolpath Vn`
- `Candidate Toolpath Vn`
- source snapshot revision
- link states
- manual override metadata
- revision/digest
- save history

Actions produce local informational messages such as:

- `CAM V12 saved`
- `Toolpath V7 saved`
- `Candidate V8 created`
- `Candidate V8 saved as new version`
- `Active = Toolpath V7`
- `CAM -> TOOLPATH = DISCONNECTED`

A candidate generation error never invalidates the previously active version.

## 12. Active Freeze

A verified path or NC program may be marked `FREEZE ACTIVE`.

Freeze means AI, photo updates, CAM regeneration, source updates and repost operations can only create candidates; they cannot alter the frozen active version.

Freeze is not a global application lock and must not turn the page/product red. The user may inspect, simulate, save, copy, or explicitly unfreeze the active version.

## 13. NC Editor: direct handwritten G-code is a first-class entry

NC must not require CAD or CAM.

A professional user can open NC directly and type/edit Fanuc-style G-code. The current product requirements remain available, including relevant G90/G54/G43/H, T/M/S/F, G0/G1/G2/G3, cycles, custom M-codes, subprogram conventions and machine-specific rules.

CAM post output enters NC as `NcCandidate`, not by overwriting a manually edited `NcWorkingCopy`.

`CAM -> NC` therefore follows the same safe adoption pattern:

- preview/compare
- keep current NC
- adopt generated NC candidate
- save candidate as a new NC version

When NC is disconnected from CAM, handwritten edits remain authoritative in the NC working copy.

## 14. Shared Motion Model

CAM toolpaths and parsed NC must converge on one normalized `MotionProgram` model instead of maintaining separate simulation semantics.

The model must preserve at least:

- X/Y/Z/A/B/C
- G0/G1/G2/G3 semantics
- arc center data
- F/S/T state needed for preview/validation
- M-code events that affect machine simulation or state
- drilling/cycle expansion or explicit normalized cycle semantics
- source block/node provenance

`CAM Toolpath -> Post G-code -> Parser -> MotionProgram` supports round-trip comparison against the original toolpath. Coordinate, arc, orientation, Safe-Z or motion differences become explicit local warnings; they are never silently declared equivalent.

## 15. SIM and 3AX/4AX/5AX/6AX preview

SIM is a read-only consumer of selected motion data. It may preview:

- Active Toolpath
- Candidate Toolpath
- NC Working Copy through parser/normalized MotionProgram
- NC Candidate

SIM never writes back into CAM or NC.

The preview page always identifies its exact source version/revision/digest, for example:

`SIM Source = NC V17` or `SIM Source = Candidate Toolpath V13`.

3AX/4AX/5AX/6AX are renderer/machine capabilities, not different truncated data formats:

- 3AX displays XYZ.
- 4AX displays XYZ + A.
- 5AX displays XYZ + A + B.
- 6AX displays XYZ + A + B + C.

If a program containing rotary motion is viewed in a lower-axis scene, the application preserves the data and locally warns that a higher-axis machine preview is recommended. It does not delete or zero the hidden rotary values.

One Scene / One Renderer / No Overlay remains mandatory for the machine scenes.

## 16. Machine Profile is independent

Machine semantics do not live inside CAM strategy or the NC text editor.

`MachineProfile` owns at least:

- supported axis count
- A/B/C rotary definitions and sign conventions
- travel limits
- rotary centers/pivots
- supported post/parser features
- machine-specific custom M-codes such as configurable lock/unlock codes
- G34/vendor formatting policy
- tool change/post conventions

The same source/toolpath/NC data can therefore be evaluated against a selected machine profile without rewriting the underlying project data.

Machine-profile mismatch is a local warning/validation result, not a global application failure.

## 17. Coordinate-system separation

Coordinates are transformed through explicit layers. They are not a single mutable origin shared by all modules:

`Master Origin -> Work Offset (G54...) -> Fixture -> Part/Source -> CAM -> Machine XYZABC`

Photo calibration has its own transform before entering workpiece XY and may not directly alter Master Origin.

All machining-domain coordinates retain 0.001 mm precision end to end. Renderer quality/FPS/resolution settings must not reduce data precision.

## 18. Persistence and recovery

CAM project persistence must retain, at minimum:

- source snapshot/reference
- CAM strategy
- active toolpath
- manual overrides
- candidate versions
- link states
- fixture/keep-out data
- revision/digest
- save history
- freeze state

Persistence is local-first and available offline.

A save checkpoint is atomic: a corrupt or partial new checkpoint must not destroy the last valid active data.

Android activity/renderer recreation must not lose authoritative CAM/toolpath revision. GPU resources may be rebuilt independently from machining state.

## 19. Fourth-runtime command contracts

CAM commands will be exposed through `CamRuntimePort`, not Android platform controls or legacy CAM panels.

Representative command set:

- `SelectSource`
- `ConnectSource` / `DisconnectSource`
- `SetToolDiameter`
- `SetDepth`
- `SetSafeZ`
- `SetFeed`
- `SetSpeed`
- `SetContourSide`
- `SetContourDirection`
- `SetMachiningRegion`
- `SetLeadIn` / `SetLeadOut`
- `ConnectToolpath` / `DisconnectToolpath`
- `GenerateCandidate`
- `PreviewCandidate`
- `KeepActiveToolpath`
- `AdoptCandidate`
- `SaveCandidateAsNewVersion`
- `AddPoint`
- `DeletePoint`
- `ReplacePointXYZABC`
- `SetMotionKind`
- `InsertAvoidance`
- `FreezeActive` / `UnfreezeActive`
- `ClearLocalMessage`

Commands return accepted/rejected results plus authoritative state. Rejection is local and non-fatal.

## 20. GPU UI requirements

CAM fourth-runtime UI follows the already-approved renderer architecture:

`GPU RGB Node -> HitBox -> CamCommand -> CamRuntimePort -> State -> GPU redraw`

No Android `Button`/`TextView` overlay may become the functional CAM control surface. No legacy `CleanCamPanel`, engineering shell or full-page screenshot skin may become the official CAM parent.

Approved RGB art may be mounted as modular textures/materials on real scene nodes. Generated GPU text labels are acceptable where dedicated art is not yet available.

Enabled controls must have real callbacks and state effects; decorative fake buttons fail acceptance.

## 21. CAM Standalone first implementation boundary

The first implementation plan after approval of this spec covers CAM Standalone only and must not require NC or SIM completion.

CAM Standalone must prove:

1. No CAD source is required to create a MANUAL path.
2. Public fourth-runtime point state is complete XYZABC in both projects.
3. G0/G1/manual cut/rapid nodes can be created and edited.
4. Safe-Z changes and avoidance insertion are real core operations.
5. Side/direction/lead-in/lead-out/strategy state is authoritative and versioned.
6. Source and strategy can be saved/restored offline.
7. CAM -> TOOLPATH disconnect protects manual edits from regeneration.
8. Reconnect creates a Candidate Toolpath and never overwrites Active Toolpath.
9. Keep/adopt/save-as-new candidate actions work and preserve revision/digest history.
10. Local invalid edits are rejected without global red lock and a following valid command still succeeds.
11. Fixture/clamp/keep-out data can be represented and persisted even if advanced auto-avoidance is implemented in a later CAM checkpoint.
12. Android rotation/recreation preserves authoritative revision and working-copy state.
13. All enabled RGB controls prove HitBox -> Command -> Runtime Result -> State change.
14. 0.001 mm precision remains unchanged.

AI photo source ingestion may be introduced in the CAM plan as a later task after the standalone manual/version/link foundation is green. AI orientation remains candidate-only.

## 22. Later NC standalone acceptance contract

The NC implementation plan must independently prove direct G-code entry with no CAD/CAM dependency, working-copy persistence, local Fanuc/parser messages, candidate post adoption, and conversion to the shared MotionProgram without global red lock.

A manually edited NC program must never be silently replaced by CAM repost output.

## 23. Later SIM / multi-axis acceptance contract

The SIM implementation plan must independently prove that Active/Candidate Toolpath and parsed NC sources can be previewed with explicit source identity, XYZABC preservation, 3AX/4AX/5AX/6AX machine selection, and no write-back into CAM/NC.

True material-removal simulation remains required for final SIM acceptance; a wireframe or line-only fake simulation does not satisfy the product gate.

## 24. Explicit exclusions from the first CAM plan

The first CAM plan does not implement:

- final Shared Link Graph across every module
- full NC Editor implementation
- final Fanuc post/parser integration UI
- true 3D material-removal SIM
- final 3AX/4AX/5AX/6AX machine animation pages
- Windows D3D11 parity
- AI auto-edit of active path/program

These are not removed requirements. They are sequenced later so CAM can become independently trustworthy before downstream modules consume it.

## 25. Checkpoint and evidence policy

Implementation uses short checkpoints and TDD. Each checkpoint records project, branch/HEAD, scope, tests and runtime evidence.

Static/compile-only success is insufficient for final Android acceptance. Current-APK Nox/real-device evidence must bind the tested APK hash and prove real GPU controls, persistence/recovery, local warning behavior and relevant rotation/recreation behavior.

If product source changes after APK evidence is captured, the evidence is stale and must not be reused as proof of the new APK.

Versions only move forward. A failed new candidate/build/test does not authorize fallback to a legacy engineering host.
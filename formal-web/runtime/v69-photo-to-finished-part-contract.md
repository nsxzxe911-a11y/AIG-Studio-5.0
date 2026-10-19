# AIG V69 — PHOTO / CAD / NC-FIRST → Finished Part Workflow Contract

Version: 69.0.0 | Parent: V68 commit `f50120ab8de98b8e34e9ad7bb83f7eb8dcfd75db` | Scope: both AIG-II and AIG Studio 5.0

## One-stop goal
Allow a real user to start with CAMERA, PHOTO, CAD drawing, or existing NC/G-code, and end with an auditable digital manufacturing package. A real machined physical part requires operator-approved CNC setup, dry run, machine operation, and inspection. Never mark physical completion from a rendering.

## Workflow graph (not forced CAD-first)
- CAMERA → orientation/EXIF → PHOTO ALIGN → reference scale with user-entered known length in mm → vectorize/trace → CAD editing → CAM.
- PHOTO → orientation/EXIF → PHOTO ALIGN → calibrated scale → trace → CAD editing → CAM.
- CAD → dimensioned drawing or 3D geometry → CAM.
- CAM MANUAL → manually specified X/Y/Z (+ A/B/C as relevant), safe retracts, fixture avoidance → SIM (CAD optional).
- NC-FIRST → edit/import G-code → parse → coordinate/work offset/tool check → 3D path → SIM (CAD/CAM optional).
- CAM → real toolpath + safe Z + lead-in/out + holder/fixture model → SIM → NC POST/VERIFY → EXPORT.
- Axis choice 3AX / 4AX / 5AX / 6AX changes valid motion/kinematics; unsupported A/B/C never silently discarded or simulated as XYZ.
- AI is a sidecar planner and inspector, not a hidden automatic machine-output authorizer.

## Fixed global UI
Top bar: PROJECT / SOURCE / CAD / CAM / 3D PATH / 3AX / 4AX / 5AX / 6AX / SIM / NC / AI / EXPORT.
Main viewport: 3D machining, stock, holder, fixture, toolpath, with no scroll-follow during playback.
Fixed button lanes: EDIT | VIEW | RUN | VERIFY | FILE | DANGER, from V68; never reorder on mobile or Windows.
A workflow breadcrumb shows actual stage, completed gates, and BLOCKED issues without navigating away from current viewport.
Subpage buttons get immutable Page ID, Subpage ID, Button ID, Command ID, with a real callback and observable state transition.
Always preserve original V68 controls; secondary advanced actions are collapsible, never fake or deleted.

## Data contracts
Each project has immutable projectId and revision; sourceKind = CAMERA | PHOTO | CAD | CAM_MANUAL | NC_FIRST.
Persist local-first: source image hash, EXIF orientation, scale calibration mm-per-pixel + calibration uncertainty, Master Origin XYZ (0.001 mm), CAD revision, CAM revision, machine axis profile, NC working copy, simulation evidence, validation record, artifact digests.
Never claim 0.001 mm accuracy merely because coordinates are formatted to three decimals: photo calibration, geometry, interpolation, post and machine must each pass independent tolerance checks.
Connect/disconnect are separate CAD→CAM, CAM→SIM, SIM→NC, NC→MACHINE contracts; disconnected modules remain independently usable.
On error: isolate affected stage; keep HOME, original canvas, local revisions and other modules. No global reset or canvas clear.

## Stage Gate
1. SOURCE: original file/camera capture saved, EXIF normalized, PHOTO scale calibrated or marked uncalibrated. Uncalibrated photo blocks dimensionally accurate manufacturing.
2. CAD: dimensions, origin, layer geometry, edit/undo/redo, autosave and reload verified.
3. CAM: genuine strategy/point list and machine-compatible axis values, safe Z, clamps and stock dimensions validated. A strategy label alone is FAIL.
4. SIM: true material removal evidence (volume and stock state delta), stable camera, tool/holder/workpiece collision checks. Wireframe animation alone is FAIL.
5. NC: Fanuc syntax/parser, G90/G54/G43/H, T/M/S/F, tool offsets, limits, A/B/C support, dry run and single-block verification; unsupported code BLOCKED.
6. EXPORT: deliver CAD, CAM, verified NC, 3D preview, simulation metrics, validation report and digests with explicit digital/physical completion states.
7. MACHINE: NC→MACHINE stays disconnected by default; requires explicit operator approval and independent machine-side safety checks.

## Acceptance
- Four separate source-to-export e2e tests: CAMERA, PHOTO, CAD, NC_FIRST; fifth test CAM_MANUAL without CAD.
- Android 360px / 1440×3088 and desktop 1920px / 3840×2160 UI screenshots; no horizontal page overflow, no auto-scroll on NC playback, main machining viewport remains usable.
- Every page/subpage and command real-button ID maps to a callback, changed state, and corresponding core result.
- PHOTO scale without known reference: BLOCKED; simulated removed volume zero if no cutting; CNC danger output never auto-triggered.
- Release is BLOCKED until exact dual-project source SHA, browser/runtime tests, Android APK, Windows EXE and safety Gate are verified.

## Status at creation
Design/implementation contract only. V68 fixed-button layout and source Gate are inherited; V69 photo-to-finished-part e2e implementation, actual cutting and digital export remain PENDING. Do not report as a completed working feature.

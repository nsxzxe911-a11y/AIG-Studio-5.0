# AIG Page Autonomy + AI Machining Orchestrator Progress

Plan: `docs/superpowers/plans/2026-10-17-page-autonomy-ai-machining-orchestrator-implementation.md`
Branch: `architecture/page-autonomy-ai-orchestrator-after-588`
Trusted baseline: Builder #588 `3bdeed6cb4a504a65b23ba9ad355ba34d2af0e9b`

## Completed focused work

### Task 1 — Page runtime foundation

RED evidence: focused Kotlin compile failed because `PageId`, `PageRuntime`, `PageResult`, `PageMessage`, `ButtonDangerClass` and related contracts did not exist.

GREEN evidence:

`PAGE_RUNTIME_CONTRACT_PASS|10_PAGES|37_SUBPAGES|LOCAL_REJECT_NO_MUTATION|MESSAGES|DANGER_CLASS`

Implemented stable Page/Subpage IDs, page-local results/messages, runtime snapshots and bridge payload types, plus issue owner routing by stable PageId.

### Task 2 — Professional command ownership

RED evidence: focused Kotlin compile failed because `PageCommandCatalog` did not exist.

GREEN evidence:

`PAGE_COMMAND_CATALOG_PASS|UNIQUE|PAGE_OWNERSHIP|3AX_4AX_5AX_6AX|PROFESSIONAL_COMMAND_FAMILIES|NO_WRONG_PAGE`

Implemented HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI typed command ownership. Axis applicability is locked to 3AX=XYZ, 4AX=XYZ+A, 5AX=XYZ+A/B, 6AX=XYZ+A/B/C. `NC.OUTPUT.SEND_MACHINE` is `CNC_OUTPUT`.

### Task 3 — Per-page professional button manifests

RED evidence: page-manifest verifier failed with `PAGE_MANIFEST_MISSING:HOME` before manifests existed.

GREEN evidence:

`PAGE_DEPARTMENT_MANIFEST_PASS|10_PAGES|122_BUTTONS|TYPED_CALLBACK|LOCAL_MESSAGES|NO_FAKE_BOUNDS`

Button counts: HOME 5, CAD 20, CAM 16, SIM 9, 3AX 11, 4AX 13, 5AX 15, 6AX 17, NC 11, AI 5; total 122.

### Task 4 — CAD + CAM autonomous page runtimes

RED evidence: focused Kotlin compile failed with unresolved `CadPageRuntime` and `CamPageRuntime` before adapters existed.

Focused GREEN evidence:

`TASK4_ADAPTER_GREEN`

Binding evidence:

`CAD_CAM_BINDING_GREEN|CAD=20|CAM=16|REAL_CORE_SYMBOLS|NO_TOAST|NO_STRATEGY_STRING`

Implemented:
- `core/src/main/kotlin/com/aigstudio/core/CadPageRuntime.kt`
- `core/src/main/kotlin/com/aigstudio/core/CamPageRuntime.kt`
- focused regression tests and `ci/verify_cad_cam_page_runtimes.py`

CAD routes drawing/edit/history/snap/photo/file commands through existing `History`, `CadEditEngine`, `Geometry`, `CadSnapEngine`, and semantic RECT/HOLE IDs.

CAM is MANUAL-first and binds to existing `ManualCamPathEngine`, `CamEngine`, and `CamWorkflowEngine`. MANUAL point edits preserve A/B/C posture, Safe-Z and G0/G1 semantics. AUTO contour/finish/generate produce real toolpath evidence; AUTO DRILL creates real `Rapid -> Feed -> Rapid` paths at CAD `HOLE:` centers. AUTO ROUGH may consume existing pocket generation without silently changing page mode to MANUAL.

### Task 5 — SIM + 3AX/4AX/5AX/6AX autonomous page runtimes

RED evidence: `SimPageRuntime.kt` / `AxisPageRuntime.kt` were absent before Task 5 implementation.

Focused Axis GREEN evidence from Kotlin compile/run:

`AXIS_PAGE_RUNTIME_PASS|3AX_XYZ|4AX_A|5AX_AB|6AX_ABC|STATE_PERSISTENCE|VIEW_PRESET|NC_FIRST_AXIS_PRECHECK|LOCAL_REJECT`

Focused SIM GREEN evidence from Kotlin compile/run:

`SIM_PAGE_RUNTIME_PASS|TRUE_MATERIAL_REMOVAL|REMOVED_VOLUME|PROGRESSIVE_PLAYBACK|3D_MESH|COLLISION_LOCAL|UNMODELED_WARNING_ONLY`

Implemented:
- `core/src/main/kotlin/com/aigstudio/core/SimPageRuntime.kt`
- `core/src/main/kotlin/com/aigstudio/core/AxisPageRuntime.kt`
- `core/src/test/kotlin/com/aigstudio/core/SimPageRuntimeRegression.kt`
- `core/src/test/kotlin/com/aigstudio/core/AxisPageRuntimeRegression.kt`
- `ci/verify_sim_axis_page_runtimes.py`

SIM binds to real `Machining3DEngine.build`, numeric `RemovalField3D`, `ProgressiveMachining3D.frame`, and `MachiningRiskScanner.inspect`. Removed volume is calculated from negative material-removal field depth × grid cell area; collision/overcut blocks acceptance, while absent fixture modeling remains an explicit UNMODELED warning rather than a fake collision-clear claim.

Axis runtime persists local XYZ/A/B/C state and uses `AxisCockpitSkinContract`. 4AX cannot mutate B/C, 5AX cannot mutate C, and 6AX supports A/B/C. Rejected axis commands restore the pre-command snapshot and remain page-local. NC-first on axis pages currently performs axis-word precheck and `AXIS_WORD_TRACE` preview only; it deliberately does not impersonate full Fanuc parsing/verification, which belongs to the NC department in Task 6.

## Verification boundary

Task 1–5 results above are focused contract/adapter evidence. Task 4–5 GREEN runs use the actual committed page-runtime source with focused Kotlin API-mirroring harnesses plus source-binding checks against known real core APIs. This is not yet a full repository Gradle suite, Android APK, Windows EXE, emulator, or Release Gate PASS.

The authorized Windows machine remains offline. Existing release workflow is manual `workflow_dispatch`; no automatic release workflow trigger was added or enabled.

## Next execution point

Continue Task 6: implement autonomous `NcPageRuntime` and `HomePageRuntime`. NC must own editor/parser/preview/verify/output, inline local alarms, single-block/dry-run/block-skip/custom M-code policy, and machine output fail-closed until verification. HOME owns project/settings/sync state and must remain unaffected by child-page failures.

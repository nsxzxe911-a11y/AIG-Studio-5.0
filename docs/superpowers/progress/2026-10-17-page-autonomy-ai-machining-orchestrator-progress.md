# AIG Page Autonomy + AI Machining Orchestrator Progress

Plan: `docs/superpowers/plans/2026-10-17-page-autonomy-ai-machining-orchestrator-implementation.md`
Branch: `architecture/page-autonomy-ai-orchestrator-after-588`
Trusted baseline: Builder #588 `3bdeed6cb4a504a65b23ba9ad355ba34d2af0e9b`

## Completed focused work

### Task 1 — Page runtime foundation

RED evidence: focused Kotlin compile failed because `PageId`, `PageRuntime`, `PageResult`, `PageMessage`, `ButtonDangerClass` and related contracts did not exist.

GREEN evidence:

`PAGE_RUNTIME_CONTRACT_PASS|10_PAGES|37_SUBPAGES|LOCAL_REJECT_NO_MUTATION|MESSAGES|DANGER_CLASS`

Implemented:
- `PageRuntimeContract.kt`
- `PageRuntimeContractRegression.kt`
- stable Page/Subpage IDs
- page-local results/messages
- runtime snapshot and bridge payload types
- issue owner routing by stable PageId

### Task 2 — Professional command ownership

RED evidence: focused Kotlin compile failed because `PageCommandCatalog` did not exist.

GREEN evidence:

`PAGE_COMMAND_CATALOG_PASS|UNIQUE|PAGE_OWNERSHIP|3AX_4AX_5AX_6AX|PROFESSIONAL_COMMAND_FAMILIES|NO_WRONG_PAGE`

Implemented:
- `PageCommandCatalog.kt`
- `PageCommandCatalogRegression.kt`
- HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI typed command ownership
- axis applicability locked to 3AX=XYZ, 4AX=XYZ+A, 5AX=XYZ+A/B, 6AX=XYZ+A/B/C
- `NC.OUTPUT.SEND_MACHINE` classified as `CNC_OUTPUT`

### Task 3 — Per-page professional button manifests

RED evidence: page-manifest verifier failed with `PAGE_MANIFEST_MISSING:HOME` before manifests existed.

GREEN evidence from the complete generated manifest set:

`PAGE_DEPARTMENT_MANIFEST_PASS|10_PAGES|122_BUTTONS|TYPED_CALLBACK|LOCAL_MESSAGES|NO_FAKE_BOUNDS`

Implemented:
- `ci/verify_page_department_manifests.py`
- ten page-local manifests under `design/ui/pages/`

Button counts: HOME 5, CAD 20, CAM 16, SIM 9, 3AX 11, 4AX 13, 5AX 15, 6AX 17, NC 11, AI 5; total 122.

### Task 4 — CAD + CAM autonomous page runtimes

RED evidence: focused Kotlin compile of the Task 4 regression harness failed with unresolved `CadPageRuntime` and `CamPageRuntime` before the adapters existed.

Focused GREEN evidence:

`TASK4_ADAPTER_GREEN`

Binding evidence:

`CAD_CAM_BINDING_GREEN|CAD=20|CAM=16|REAL_CORE_SYMBOLS|NO_TOAST|NO_STRATEGY_STRING`

Implemented:
- `core/src/main/kotlin/com/aigstudio/core/CadPageRuntime.kt`
- `core/src/main/kotlin/com/aigstudio/core/CamPageRuntime.kt`
- `core/src/test/kotlin/com/aigstudio/core/CadPageRuntimeRegression.kt`
- `core/src/test/kotlin/com/aigstudio/core/CamPageRuntimeRegression.kt`
- `ci/verify_cad_cam_page_runtimes.py`

CAD now routes drawing/edit/history/snap/photo/file commands through the page runtime. Geometry operations bind to existing `History`, `CadEditEngine`, `Geometry`, `CadSnapEngine`, and semantic RECT/HOLE IDs.

CAM is MANUAL-first and binds to existing `ManualCamPathEngine`, `CamEngine`, and `CamWorkflowEngine`. MANUAL point edits preserve A/B/C posture, Safe-Z and G0/G1 semantics. AUTO contour/finish/generate produce actual toolpath evidence. AUTO DRILL generates real `Rapid -> Feed -> Rapid` toolpaths at CAD `HOLE:` centers. AUTO ROUGH may consume the existing pocket generator without silently changing the page mode back to MANUAL.

## Verification boundary

Task 1–4 results above are focused contract/adapter evidence. Task 4 GREEN used a focused Kotlin adapter harness plus source-binding checks against the real engine API names. This is not yet a full repository Gradle suite, Android APK, Windows EXE, emulator, or Release Gate PASS.

The authorized Windows machine remains offline. Existing release workflow is manual `workflow_dispatch`; no automatic release workflow trigger was added or enabled.

## Next execution point

Continue Task 5: implement `SimPageRuntime` plus autonomous `AxisPageRuntime` for 3AX/4AX/5AX/6AX, with true material-removal evidence, page-local collision state, axis applicability enforcement, persistent machine state, and NC-first subpages.

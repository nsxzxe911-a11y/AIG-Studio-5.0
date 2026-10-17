# AIG Page Autonomy + AI Machining Orchestrator Progress

Plan: `docs/superpowers/plans/2026-10-17-page-autonomy-ai-machining-orchestrator-implementation.md`
Branch: `architecture/page-autonomy-ai-orchestrator-after-588`
Trusted packaged release baseline: Builder #588 `3bdeed6cb4a504a65b23ba9ad355ba34d2af0e9b`
Latest verified feature checkpoint: `e91feb6f1597bae7ca75b5139d5b523b832ebef4`
Verification run: `39021780774` — completed / success

## Completed implementation work

### Task 1 — Page runtime foundation

Focused GREEN:
`PAGE_RUNTIME_CONTRACT_PASS|10_PAGES|37_SUBPAGES|LOCAL_REJECT_NO_MUTATION|MESSAGES|DANGER_CLASS`

Stable Page/Subpage IDs, page-local results/messages, snapshots, typed bridge payloads and issue ownership are implemented.

### Task 2 — Professional command ownership

Focused GREEN:
`PAGE_COMMAND_CATALOG_PASS|UNIQUE|PAGE_OWNERSHIP|3AX_4AX_5AX_6AX|PROFESSIONAL_COMMAND_FAMILIES|NO_WRONG_PAGE`

3AX=XYZ, 4AX=XYZ+A, 5AX=XYZ+A/B, 6AX=XYZ+A/B/C. `NC.OUTPUT.SEND_MACHINE` remains CNC-output classified.

### Task 3 — Per-page professional manifests

Focused GREEN:
`PAGE_DEPARTMENT_MANIFEST_PASS|10_PAGES|122_BUTTONS|TYPED_CALLBACK|LOCAL_MESSAGES|NO_FAKE_BOUNDS`

HOME 5, CAD 20, CAM 16, SIM 9, 3AX 11, 4AX 13, 5AX 15, 6AX 17, NC 11, AI 5 = 122 buttons.

### Task 4 — CAD + CAM autonomous runtimes

CAD:
- real DRAW/EDIT/UNDO/REDO/SNAP/photo state
- `OPEN/SAVE` retain AIG internal CAD format
- `IMPORT/EXPORT` use real ASCII DXF through `CadDxfCodec`

CAM:
- MANUAL-first, works without CAD
- real G0/G1, Safe-Z, point insert/edit/delete and A/B/C preservation
- real AUTO and DRILL toolpaths
- real Fanuc Post output
- POST preview increments revision
- rejected commands restore runtime state atomically and append only a CAM-local message

Verified marker:
`CAM_PAGE_RUNTIME_PASS|MANUAL_FIRST|G0_G1|SAFE_Z|ABC_PRESERVED|COMP|TOOL_REGION|AUTO_REAL_TOOLPATH|DRILL_REAL_TOOLPATH|FANUC_POST_NC|P4_P5|POST_REVISION|REJECT_ATOMIC|LOCAL_RUNTIME`

### Task 5 — SIM + 3AX/4AX/5AX/6AX autonomous runtimes

SIM is bound to `Machining3DEngine`, `ProgressiveMachining3D`, numeric removal fields and `MachiningRiskScanner`.

Formal SIM accept requires:
- fixture coverage modeled
- collisionCount=0
- overcutCount=0

NC-first performs:
Fanuc fail-closed compatibility → G0/G1/G2/G3 + A/B/C trace → canned-cycle expansion → Machining3D → material removal → mesh → collision/overcut/fixture preflight.

Verified markers:
`SIM_ACCEPTANCE_POLICY_PASS|FIXTURE_COVERAGE_REQUIRED`
`SIM_PAGE_RUNTIME_PASS|TRUE_MATERIAL_REMOVAL|REMOVED_VOLUME|PROGRESSIVE_PLAYBACK|3D_MESH|STRICT_PREFLIGHT|MODELED_FIXTURE_REQUIRED|LOCAL_BLOCK`
`AXIS_PAGE_RUNTIME_PASS|3AX_XYZ|4AX_A|5AX_AB|6AX_ABC|STATE_PERSISTENCE|VIEW_PRESET|NC_FIRST_FANUC_PARSE|NC_FIRST_G34_G83|NC_FIRST_TRUE_3D|NC_FIRST_MATERIAL_REMOVAL|NC_FIRST_PREFLIGHT|LOCAL_REJECT`

### Task 6 — NC + HOME autonomous runtimes

NC owns editor/parser/preview/verify/output, local alarms, single-block, dry-run, block-skip, custom M-code state and fail-closed machine dispatch.

Machine output requires verified + prepared state and active NC_MACHINE connection.

SIM→NC import requires:
- verified=true
- preflightReady=true
- fixtureCoverage=MODELED
- collisionCount=0
- overcutCount=0

NC preview now returns structured `executionActions` and `executionDomains` from READY timeline events.

Verified marker:
`NC_PAGE_RUNTIME_PASS|EDITOR|INTERLOCK_PARSER|TIMELINE_PREVIEW|STRUCTURED_ACTION_EVIDENCE|VERIFY|INLINE_ALARM|SINGLE_BLOCK|DRY_RUN|BLOCK_SKIP|CUSTOM_M|6AX_C_COMPAT|G34_G83_PROFILE|M98_L_REPEAT|MACHINE_FAIL_CLOSED`

HOME owns project/settings/sync state and remains local-first/offline-ready.

### Task 7 — Typed CONNECT bridges

Typed CAD_CAM, CAM_SIM, SIM_NC and NC_MACHINE contracts are implemented. Disconnect is data-flow-only and preserves page runtime data. `MACHINE` remains only a compatibility alias for NC_MACHINE and both statuses synchronize.

Verified markers:
`RUNTIME_TYPED_BRIDGE_PASS|CAD_CAM|CAM_SIM|SIM_NC|NC_MACHINE|MACHINE_ALIAS_SYNC|DISCONNECT_PRESERVES_DATA|STALE_REJECT|DIGEST_REJECT|NO_OVERWRITE`
`RUNTIME_PAGE_BRIDGE_PASS|CAD_CAM_GEOMETRY|CAM_SIM_MANUAL_ABC|DISCONNECT_PRESERVE|SIM_NC_STRICT_PREFLIGHT|MODELED_FIXTURE|STALE_NO_OVERWRITE`

### Task 8 — AI Machining Orchestrator

Routes:
- CAD_FIRST
- MANUAL_CAM_FIRST
- NC_FIRST
- REUSE_VERIFIED_STAGE

AI does not own machining truth or machine output. SIM reuse requires verified + preflightReady + fixture coverage known/modeled; legacy `verified=true` alone is rejected. Web AI follows the same rule.

Verified markers:
`MACHINING_ORCHESTRATOR_PASS|NC_FIRST|MANUAL_CAM_FIRST|CAD_FIRST|REUSE_STRICT_PREFLIGHT|LEGACY_UNMODELED_REUSE_REJECTED|UNSAFE_FAST_ROUTE_REJECTED|SIM_NC_REQUIRED`
`AI_PAGE_RUNTIME_PASS|ASSIST|PLAN|OPTIMIZE|AUDIT|RECOVERY|STRICT_SIM_REUSE|LEGACY_UNMODELED_REJECTED|ORCHESTRATOR_ONLY|NO_DOMAIN_MUTATION|LOCAL_ERROR`

### Task 9 — Cross-platform runtime routing — VERIFIED CHECKPOINT

Verified workflow run: `39021780774`
Verified feature commit: `e91feb6f1597bae7ca75b5139d5b523b832ebef4`

Production surfaces are now wired to typed routers:
- Android `MainActivity` formal navigation calls `PageRuntimeRouter`; old CAD Toast-only callback is removed.
- Windows `DesktopApp` formal navigation calls `PageRuntimeRouter`.
- Web formal 10-page navigation uses `AigPageRuntimeRouter`; AI page/runtime is included.

Shared Gate:
`PAGE_RUNTIME_CROSS_PLATFORM_PASS|10_PAGES|122_BUTTONS|ANDROID|WINDOWS|WEB|NAV_AND_COMMAND_IDS|REAL_ROUTER_INTEGRATION|WEB_AI_STRICT_REUSE`

The same run also passed:
- all six shared runtime/static gates
- `:core:testClasses`
- `:core:pageAutonomyRegression`
- Android `:app:assembleDebug`
- Desktop `:desktop:compileKotlin`

Gradle evidence:
`BUILD SUCCESSFUL in 1m 34s`
`58 actionable tasks: 58 executed`

The workflow promoted five verified production files in commit `e91feb6f1597bae7ca75b5139d5b523b832ebef4`:
- `app/src/main/java/com/aigstudio/app/MainActivity.kt`
- `desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt`
- `web/index.html`
- `core/src/main/kotlin/com/aigstudio/core/NcFirstMotion.kt`
- `core/src/main/kotlin/com/aigstudio/core/NcPageRuntime.kt`

## Latest Fanuc compatibility state

### 6AX C axis

C is validated fail-closed for finite value, one C word/block and ±360°, then sanitized only before the legacy XYZAB parser. Original NC text and 6AX preview retain C.

Marker:
`NC_SIX_AXIS_COMPAT_PASS|C_VALIDATION|LEGACY_SANITIZE|FAIL_CLOSED`

### G34 + G81/G73/G83

Studio profile: `XY_J0_I_DIAMETER_K_COUNT`.
- J0 uses configured default start angle
- I is PCD diameter; I30 => radius 15 mm
- K6 => six holes
- G83 R3 Z-20 Q2 expands into deterministic peck motion
- G81 standard
- G73 conservative full-R retract; machine-specific micro-retract is not guessed

NC-first preserves legal feed motion above Z0 in the true NC trace while the material-removal projection removes material only below stock.

Markers:
`NC_CANNED_CYCLE_PLANNER_PASS|G81|G73_CONSERVATIVE|G83|G34_K6|G98_G99_RETURN`
`NC_FIRST_MOTION_PASS|G90|G0_G1_G2|ABC|G34_I_DIAMETER_K_COUNT|G81|G73_CONSERVATIVE|G83|AIR_FEED_TRACE|G98_G99|TRUE_3D|MATERIAL_REMOVAL|PREFLIGHT_FAIL_CLOSED|AXIS_MODE`

### M98 P... L...

Valid repeat L is one positive integer; invalid/duplicate L fails closed. Valid L is removed only from the legacy parser mirror; original NC text is preserved.

Marker:
`FANUC_M98_REPEAT_PASS|P_SUBPROGRAM|L_REPEAT|POSITIVE_INTEGER|FAIL_CLOSED`

### Fanuc Post P4/P5

- no P4: INLINE_M6 → `Tn M6`
- P4 supplied: default SUBPROGRAM → `Tn` then `M98 P4`
- inline M6 plus P4 requires explicit INLINE_THEN_SUBPROGRAM
- optional P5 and M99/M30
- G80 cancellation before end housekeeping

Marker:
`FANUC_POST_RUNTIME_PASS|G90_G54|TOOL_SPINDLE_G43|G0_G1_G3|ABC|SAFE_Z|G80|P4_P5|M99_M30|NO_DUPLICATE_TOOL_CHANGE`

## Verification boundary

`e91feb6f1597bae7ca75b5139d5b523b832ebef4` is a verified Task 9 source/compile checkpoint. It proves focused regressions, Android debug assemble and Desktop Kotlin compile for this feature state.

It does NOT yet prove the final release:
- no formal packaged release APK/EXE evidence for this feature SHA yet
- no fresh emulator/Nox/device visual Authority evidence for this feature SHA yet
- no final Task 10 Release Gate yet
- no release version bump yet
- no AIG-II exact-SHA bind update yet

Builder #588 remains the last trustworthy packaged release baseline until Task 10 finishes.

## Next execution point — Task 10 pre-release closure

1. run fresh formal APK/EXE packaging and integrity checks for the verified feature SHA;
2. run formal Runtime launch + RGB HOME/page/Authority visual evidence on Android and Windows where available;
3. verify No-Fake, SIM/NC safety, precision, 3–6AX and NC-first evidence at release level;
4. only after those gates are green, advance release version and update AIG-II exact Studio SHA bind;
5. then run the Dual-Project Single-Gate and publish artifacts only from the verified exact pair.

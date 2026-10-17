# AIG Page Autonomy + AI Machining Orchestrator Progress

Plan: `docs/superpowers/plans/2026-10-17-page-autonomy-ai-machining-orchestrator-implementation.md`
Branch: `architecture/page-autonomy-ai-orchestrator-after-588`
Trusted release baseline: Builder #588 `3bdeed6cb4a504a65b23ba9ad355ba34d2af0e9b`
Latest pre-document implementation checkpoint: `ec76a225b7effdea313bde1b2d0e5ab938af710e`

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

Implemented `CadPageRuntime` and `CamPageRuntime` over existing geometry/CAM cores.

CAD:
- real DRAW/EDIT/UNDO/REDO/SNAP/photo state
- `OPEN/SAVE` retain AIG internal CAD format
- `IMPORT/EXPORT` default to real ASCII DXF through `CadDxfCodec`
- no Toast-only command implementation

CAM:
- MANUAL-first, works without CAD
- real G0/G1, Safe-Z, point insert/edit/delete and A/B/C preservation
- real AUTO contour/finish/generate and DRILL toolpaths
- real Fanuc Post output, not strategy strings
- POST preview increments revision
- rejected CAM commands are atomic: state/toolpaths/settings/revision are restored; only a CAM-local message is appended

Focused atomicity GREEN:
`CAM_REJECT_ATOMIC_GREEN|BAD_POST_ROLLBACK|BAD_DRILL_ROLLBACK`

### Task 5 — SIM + 3AX/4AX/5AX/6AX autonomous runtimes

SIM is bound to `Machining3DEngine`, `ProgressiveMachining3D`, numeric removal fields and `MachiningRiskScanner`.

Safety correction supersedes the old warning-only rule:
- fixture coverage `UNMODELED` may be previewed but is NOT formal ACCEPT
- formal SIM accept requires zero collision, zero overcut and modeled fixture coverage
- SIM→NC export requires the same strict preflight evidence

Focused policy GREEN:
`SIM_ACCEPTANCE_POLICY_PASS|FIXTURE_COVERAGE_REQUIRED`

Axis runtimes preserve independent XYZ/A/B/C state and real machining preview state. NC-first no longer uses `AXIS_WORD_TRACE`.

NC-first now performs:
Fanuc fail-closed compatibility → parser/interlock → G0/G1/G2/G3 + A/B/C motion trace → canned-cycle expansion → `Machining3D` → true material removal → mesh → collision/overcut/fixture preflight.

### Task 6 — NC + HOME autonomous runtimes

`NcPageRuntime` owns editor/parser/preview/verify/output, local alarms, single-block, dry-run, block-skip, custom M-code state and fail-closed machine dispatch.

Machine output requires verified+prepared state and active NC_MACHINE connection.

SIM→NC import now also requires:
- `verified=true`
- `preflightReady=true`
- `fixtureCoverage=MODELED`
- collisionCount=0
- overcutCount=0

`HomePageRuntime` owns project/settings/sync state and local-first/offline-ready behavior.

### Task 7 — Typed CONNECT bridges

Typed CAD_CAM, CAM_SIM, SIM_NC and NC_MACHINE contracts are implemented. Disconnect remains data-flow-only and preserves page runtime data. Revision/digest stale payload protection remains fail-closed.

### Task 8 — AI Machining Orchestrator

Routes implemented:
- CAD_FIRST
- MANUAL_CAM_FIRST
- NC_FIRST
- REUSE_VERIFIED_STAGE

AI does not own domain truth or machine output. Reuse safety was upgraded: a SIM evidence record is reusable only when verified + preflightReady + fixture coverage known/modeled; legacy `verified=true` alone is not enough.

Focused GREEN:
`AI_SIM_REUSE_SAFETY_PASS|VERIFIED|PREFLIGHT|FIXTURE_COVERAGE`

### Task 9 — Cross-platform runtime routing

Android/Desktop typed `PageRuntimeRouter` implementations and Web `AigPageRuntimeRouter` inventory exist for the 10 formal pages and per-page command IDs. Production integration verifier requires actual MainActivity/Desktop/Web surfaces to invoke these routers; a router file by itself does not count as completion.

## Latest Fanuc compatibility upgrades

### 6AX C axis compatibility

The legacy deterministic Fanuc interlock is XYZAB. A forward compatibility façade validates C fail-closed (finite, one C word per block, ±360°) and only then sanitizes C before the legacy parser. 6AX runtime retains C for motion/preview evidence.

Focused GREEN:
`NC_SIX_AXIS_COMPAT_PASS|C_VALIDATION|LEGACY_SANITIZE|FAIL_CLOSED`

### G34 + G81/G73/G83 true NC-first

The Studio Fanuc profile uses `XY_J0_I_DIAMETER_K_COUNT`:
- J0 uses configured default start angle
- I is pitch-circle diameter
- I30 therefore produces radius 15 mm
- K6 produces six holes
- G83 R3 Z-20 Q2 is expanded into deterministic peck motion

G81 standard and G83 full-R retract are modeled. G73 uses a conservative full-R retract model because micro-retract distance is machine-parameter-specific; it is not guessed.

Focused markers:
`NC_CANNED_CYCLE_GEOMETRY_PASS|G34_PCD|I_DIAMETER_RADIUS|K_HOLES|G83_PECK`
`NC_CANNED_CYCLE_PLANNER_PASS|G81|G83|G34_K6|G98_G99_RETURN`

### M98 P... L... compatibility

Legacy interlock documentation allowed L repeat but did not recognize address L. `StudioFanucProgramCompatibility` now validates M98 L before delegating to the legacy deterministic parser:
- one L word only
- positive integer only
- valid L is sanitized only for the legacy parser
- original NC text remains intact

Focused GREEN:
`FANUC_M98_REPEAT_PASS|P_SUBPROGRAM|L_REPEAT|POSITIVE_INTEGER|FAIL_CLOSED`

### Fanuc Post P4/P5 and tool-change safety

`FanucPostRuntime` supports optional tool-change subprogram, end subprogram and M99/M30 ending, plus G80 cancellation before end housekeeping.

Tool-change semantics are explicit:
- no P4: `INLINE_M6` → `Tn M6`
- P4 supplied: default `SUBPROGRAM` → `Tn` then `M98 P4`
- inline M6 plus P4 is allowed only through explicit `INLINE_THEN_SUBPROGRAM`

This prevents accidental double tool change.

Focused GREEN:
`FANUC_TOOLCHANGE_MODE_GREEN|INLINE_M6|SUBPROGRAM_P4|EXPLICIT_BOTH`

## Current verification boundary

The implementation above is source-bound and has focused Kotlin/CI-contract evidence where listed. It is NOT yet a fresh full-repository Gradle, Android APK, Windows EXE, emulator/Nox, device screenshot or final Release Gate PASS for this feature head.

Do not rewrite Builder #588 as proof of these newer changes. Builder #588 remains the last trustworthy packaged release baseline; this feature branch is later implementation work.

No release version bump and no AIG-II exact-SHA bind update have been performed for this feature line yet.

## Next execution point

Continue latest-incompatibility sweep and Task 9/10 closure:
1. verify production Android/Desktop/Web surfaces still route through typed PageRuntime without Toast/legacy bypass;
2. run fresh static/focused regressions for CAD/CAM/SIM/Axis/NC/AI and bridge contracts;
3. when a full builder/device environment is available, run Gradle + Android + Windows + formal Runtime visual evidence;
4. only after all required evidence is green, advance release version, build artifacts and update AIG-II exact bind.

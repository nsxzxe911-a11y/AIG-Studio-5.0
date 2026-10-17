# AIG Dual-Project Auto Product Mode — Design

Date: 2026-10-18
Status: USER-APPROVED DESIGN / SPEC REVIEW PENDING
Execution mode: Fail-Closed, forward-only, checkpoint-resumable

## 1. Goal

Deliver AIG-II and AIG as finished products under one Dual-Project Single-Gate. Work resumes from the latest trustworthy checkpoint, never restarts completed work, never rolls back versions, and never claims PASS without runtime/build/evidence proof.

## 2. Latest trustworthy continuation point

Repository: `nsxzxe911-a11y/AIG-Studio-5.0`
Branch: `work/aig-authority-v7-reverse-engineering`
Observed HEAD at spec creation: `1806b31ecc8935968be1736ae17e7fd3b7e310c2`

Important forward-only ruling:
- HEAD `1806b31...` contains the stale policy `fail closed HOME visual until native 4K Authority`.
- The user has clarified that both projects already have mounted RGB baseline/corrected visuals for Mobile and Desktop.
- Therefore the native-4K-wait interpretation must be superseded by a NEW forward commit, not by reset/revert/rollback.
- Runtime-mounted approved Authority identity has priority over older source/reference manifests when deciding whether a formal page visual exists.
- Source manifests remain provenance/evidence, not a reason to erase or replace an already-approved mounted visual.

## 3. Visual Authority

Single visual source of truth: AIG-II RGB approved revision chain.

Authority chain per page:
`10/5 RGB baseline -> approved Mobile/Desktop revision -> last approved page revision -> Runtime mounted Authority`

Rules:
- Mobile and Desktop have separate platform Authority chains.
- Both projects use the AIG-II RGB visual system for shared pages.
- Runtime lookup is exact `Authority ID / Registry / SHA` only.
- No filename similarity fallback.
- No semantic similarity fallback.
- No recency fallback.
- No generated-image auto-promotion.
- MAIN / SUBPAGE / MASTER / CROP_SOURCE / REFERENCE / CANDIDATE roles remain distinct.
- A missing exact Authority ID is a BLOCK; never substitute a similar image.
- Existing approved Runtime visuals are preserved unless a later user-approved page revision explicitly supersedes them.

Known corrected page set to register as the current revision chain:

Mobile:
- `01_HOME_MOBILE_HIGHRES.png`
- `02_CAD_MOBILE_HIGHRES.png`
- `03_CAM_MOBILE_HIGHRES.png`
- `04_SIM_MOBILE_HIGHRES.png`
- `05_3AX_MOBILE_HIGHRES.png`
- `06_4AX_MOBILE_HIGHRES.png`
- `07_5AX_MOBILE_HIGHRES.png`
- `08_6AX_MOBILE_HIGHRES.png`
- `09_NC_MOBILE_HIGHRES.png`
- `10_AI_MOBILE_HIGHRES.png`

Desktop:
- `01_HOME_DESKTOP_4K.png`
- `02_CAD_DESKTOP_4K.png`
- `03_CAM_DESKTOP_4K.png`
- `04_SIM_DESKTOP_4K.png`
- `05_3AX_DESKTOP_4K.png`
- `06_4AX_DESKTOP_4K.png`
- `07_5AX_DESKTOP_4K.png`
- `08_6AX_DESKTOP_4K.png`
- `09_NC_DESKTOP_4K.png`
- `10_AI_DESKTOP_4K.png`

The names above identify the approved revision chain; final activation must bind exact file/library identity and SHA, not filename alone.

## 4. Product scope

### AIG-II
Formal pages:
`HOME / CAD / CAM / SIM / 3AX / 4AX / 5AX / 6AX / NC / AI`

Targets:
- Android Runtime
- Windows Runtime
- Web Runtime

### AIG
Formal pages:
`HOME / CAD / CAM / SIM / 3AX / NC / AI`

AIG intentionally does NOT mount `4AX / 5AX / 6AX`.
Shared core contracts may remain reusable, but product navigation, Runtime page mounting, and product-facing controls must not expose those pages.

Targets:
- Android Runtime
- Windows Runtime
- Web Runtime

## 5. Architecture

Stable semantic chain:
`Authority Visual -> Page/Subpage ID -> Region -> Button ID -> Command ID -> Shared State/Core -> Runtime Result/Message`

Each page and subpage must be independently operable and independently verifiable before cross-page orchestration is accepted.

Required identity layers:
- Project ID
- Platform ID
- Page ID
- Subpage ID
- Authority Visual ID
- Region ID
- Button ID
- Command ID
- Runtime State ID / Message ID where applicable

Coordinates for responsive control binding use normalized bounds where possible. Raster visuals provide appearance only; dynamic status, coordinates, alarms, values, and messages remain Runtime-driven.

## 6. Phase order

### Phase 1 — Authority / Registry closure

- Resolve all 20 main-page corrected visuals by exact identity.
- Record platform, page, role, exact SHA, source chain, approval state, and Runtime mount identity.
- Replace stale empty/incorrect Active Slots by forward commits only.
- Preserve 10/5 lineage and later page-specific corrections.
- Do not regenerate pages that already have an approved visual.

Completion evidence:
- exact Registry records
- SHA evidence
- page/platform role evidence
- no similarity fallback
- duplicate/conflict detection

### Phase 2 — Runtime page mount closure

AIG-II:
- mount and verify all 10 pages.

AIG:
- mount and verify the 7 allowed pages.
- prove `4AX/5AX/6AX` are not mounted/exposed.

Verify actual Runtime resolution hits the exact Registry entry and approved visual identity.

### Phase 3 — Real UI wiring

For every formal page/subpage:
- Page ID
- Subpage ID
- Button ID manifest
- Command ID
- real callback
- Shared State update
- Runtime result/status
- page-owned error path

No fake buttons. No image-only interactions. No baked Runtime truth.

### Phase 4 — Core closure

CAD:
- real drawing/editing chain
- Line / Rect / Circle / Arc / Hole / Chamfer / Fillet
- Trim / Extend / Offset / Array
- multi-select, Undo/Redo, layers, SNAP, dimensions, save/recovery contracts

CAM:
- MANUAL first priority
- real X/Y/Z node path generation
- G0/G1, Safe-Z, entry/exit, inside/outside, direction
- G41/G42 and real machining strategy outputs where applicable
- multi-axis nodes retain A/B/C where applicable

SIM:
- real material removal with numeric evidence
- synchronized tool/toolpath/workpiece state
- no fake wireframe-only acceptance

3AX–6AX:
- approved large machining viewport layout
- true axis state and controls
- true renderer/model persistence
- A/B/C only where product/page supports them

NC:
- Fanuc parser and verification
- G90/G54/G43/H, T/M/S/F, G0/G1/G2/G3, G80, M6, M8, M99
- O4/M98 P4, O5/M98 P5
- G34 I/J/K + G81/G73/G83
- G92 X0 Y0, M00/M01
- Single Block / Dry Run / Block Skip
- custom M-code support
- NC-first workflow

AI:
- local CAD/CAM/NC context
- Working Copy / Verified Main / Immutable Vault semantics
- orchestrates outputs only after page-level contracts are independently valid

Precision:
- end-to-end 0.001 mm
- Master Origin X0.000 Y0.000 Z0.000
- absolute-coordinate SIM/NC consistency where specified

## 7. Error handling / Fail-Closed execution

Error classes:
`PRODUCT / IMAGE / DATA / CODE / BUILD / CI / TOOL / SERVER / NETWORK / PERMISSION`

Rules:
- Find the FIRST BROKEN LINK before changing code or assets.
- Tool/server/network failures do not authorize product-code changes.
- Retry only bounded, safe, idempotent operations.
- Repeated infrastructure failures trigger documentation/schema/alternate-path research, not random retries.
- Isolate page/module errors when safe; keep independent pages usable.
- Exceptions must never initialize/reset/clear user work or overwrite Verified Main.
- CNC dangerous output failures stop only the unsafe action and remain blocked until verified.
- Every completed unit records checkpoint evidence.

Checkpoint fields:
`STEP / INPUT SHA / OUTPUT SHA / PASS-FAIL / EVIDENCE / NEXT STEP`

## 8. Runtime and build targets

Both projects must prove:
- Android build + launch
- Windows EXE build + launch
- Web Runtime launch
- correct formal RGB Runtime entry
- no Engineering shell as formal entry
- page navigation and adaptive layout
- real callbacks/state/result paths
- artifact identity and SHA
- screenshot/runtime evidence

## 9. Dual-Project Single-Gate

The final Gate is one joint acceptance contract with project-specific scope.

Required Gate families:
- Authority / Registry identity
- Product scope
- Runtime launch
- Formal RGB HOME / page visuals
- No engineering shell
- No fake UI / no fake core
- UI callback/state chain
- CAD core
- CAM core
- SIM true material removal
- NC/Fanuc
- NC-first
- 0.001 mm precision / coordinate consistency
- 3AX–6AX for AIG-II
- AIG exclusion of 4AX/5AX/6AX
- Android artifact
- Windows artifact
- Web Runtime evidence
- integrity / exact SHA linkage

Any required FAIL => overall BLOCK.
No partial success may be reported as final product PASS.

## 10. Completion contract

A phase or task is complete only with real evidence. Final completion requires all of:
- correct approved Authority identity
- real Runtime mount
- real UI callback/state chain
- real core result
- Gate PASS
- commit SHA
- artifact SHA where applicable
- Runtime screenshot/evidence
- cross-project exact linkage for Single-Gate

Only then may the result be called `Dual-Project Single-Gate Product PASS`.

## 11. Forward-only policy

- Versions only advance.
- Existing PASS checkpoints remain evidence; they do not freeze development.
- No reset/rebase/checkout-to-old-baseline as a fix.
- Stale or wrong forward commits are superseded by newer corrective commits with explicit evidence.
- After a disconnect, resume from the newest verified checkpoint and ledger; do not reconstruct the project from memory.

## 12. Immediate first implementation objective after plan approval

The first implementation plan must begin by reconciling the current branch state with the approved Authority rule:
1. audit the current HEAD and latest commits after `09c11de6`;
2. identify exactly what `1806b31...` changed and whether later commits exist;
3. create a RED Gate proving that mounted approved Runtime Authority must not be blocked merely because an older source/reference manifest is sub-4K;
4. forward-fix that stale decision without restoring any engineering shell or fake derivative;
5. rebuild Current Active Registry from exact mounted Mobile/Desktop approved identities;
6. proceed through phases 2–6 without restarting previously verified work.

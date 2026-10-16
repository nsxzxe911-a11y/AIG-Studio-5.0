# Dual-Project Product Capability Authority Design

Date: 2026-10-16
Status: USER-APPROVED DESIGN

## 1. Purpose

Prevent AIG and AIG II from being mixed by repository names, stale engineering shells, theme defaults, or incomplete builder evidence. Product identity and runtime capability must be derived from a machine-verifiable Product Capability Authority, cross-checked against approved RGB Authority assets, then verified through real runtime callbacks and core results.

## 2. Product Identity

### AIG
- `productId = AIG`
- `MAX_AXIS = 3`
- Formal axis pages: `3AX` only.
- Must never expose or activate 4AX / 5AX / 6AX product pages.

### AIG II
- `productId = AIG_II`
- `MAX_AXIS = 6`
- Formal axis pages: `3AX`, `4AX`, `5AX`, `6AX`.
- Missing any required axis page is a release-blocking failure.

Repository names and historical theme names are NOT authoritative product identity.

## 3. Mandatory Shared Core

The following functional domains are mandatory in BOTH products and must not be removed when axis capability changes:

1. CAD geometry and editing
   - Line / Rect / Circle / Arc / Hole / Chamfer / Fillet
   - Trim / Extend / Offset / Array where supported by stable inventory
   - Undo / Redo
   - SNAP and exact input
   - dimensions / measurement
   - transient live preview / rubber-band geometry
   - Save / Open / AutoSave / Recovery / Import / Export / Text where part of release inventory

2. CAM
   - AUTO and MANUAL
   - MANUAL independent from CAD
   - G0 / G1 node editing
   - Safe-Z
   - lead-in / lead-out
   - G41 / G42
   - tool diameter / depth / feed / spindle / direction
   - fixture and clamp avoidance
   - toolpath generation must produce actual machining moves, not display strings

3. 3D Toolpath + SIM
   - real 3D toolpath
   - real material removal with numerical evidence
   - collision / overcut checks
   - state persistence
   - no fake wireframe or video-only simulation

4. G-code / NC
   - editable G-code field
   - parser and semantic validation
   - Fanuc post requirements
   - alarm routed into G-code editing context
   - NC-first flow
   - single block / dry run / block skip
   - CNC safety interlocks

5. AI Update / Apply
   - consumes CAD / CAM / SIM / NC context
   - proposes changes without silently destroying user state
   - explicit apply path
   - Working Copy / Verified Main / Immutable Vault semantics where present

6. Persistence / precision
   - local-first Save / Recovery
   - sync contract where enabled
   - Master Origin X0.000 Y0.000 Z0.000
   - end-to-end 0.001 mm
   - G90 absolute-coordinate consistency

## 4. Axis-Specific Capability

Axis capability is separate from shared core.

- AIG: XYZ / 3AX only.
- AIG II: XYZ + A/B/C capability according to 3AX/4AX/5AX/6AX page.
- Shared CAM / SIM / NC contracts remain common; rotary coordinates are enabled only when the product/page capability permits them.
- AI navigation and commands must derive visibility and enablement from `MAX_AXIS`, never by deleting common core code.

## 5. RGB Authority and Product Resolution

Resolution order:

1. Read Product Capability Authority (`productId`, `MAX_AXIS`, required formal pages).
2. Read approved RGB Authority manifest and asset identities.
3. Cross-check the axis pages visible in Authority assets against `MAX_AXIS`.
4. Bind formal runtime pages.
5. Bind `Button ID -> Shared Command -> Runtime/Core -> Result/Status`.
6. Run runtime evidence.

If Product Capability Authority and RGB Authority disagree, release is BLOCKED. Do not guess from repository name, branch name, theme ID, old engineering page, or builder number.

## 6. Missing Authority Image Rule

A missing secondary-page image is NEVER permission to fall back to Engineering Shell.

Allowed behavior:
- use an already approved Authority image when available;
- otherwise generate/use a provisional AIG RGB page from the same design system and mark its visual authority status as pending approval.

Forbidden behavior:
- Engineering / Debug / Renderer / OpenGL / Builder shell as a formal page;
- generic AlertDialog used as the formal product page;
- pasted full-page screenshot with fake hit boxes;
- image-only PASS without functional callback evidence.

## 7. Formal Page Architecture

Each formal page is a first-class runtime page host, not a modal substitute.

AIG required formal product surface:
- HOME
- CAD
- CAM
- SIM / 3D Toolpath
- 3AX
- NC / G-code
- AI

AIG II required formal product surface:
- HOME
- CAD
- CAM
- SIM / 3D Toolpath
- 3AX
- 4AX
- 5AX
- 6AX
- NC / G-code
- AI

Secondary work pages such as NC-first remain formal RGB runtime pages.

## 8. Gate Contract

A page passes only when ALL of the following are true:

1. `PRODUCT_IDENTITY_PASS`
2. `RGB_AUTHORITY_PASS`
3. `FORMAL_PAGE_HOST_PASS`
4. `AXIS_CAPABILITY_PASS`
5. `BUTTON_ID_PASS`
6. `SHARED_COMMAND_PASS`
7. `CORE_CALLBACK_PASS`
8. `RUNTIME_RESULT_PASS`
9. `STATE_PERSISTENCE_PASS` where stateful
10. `NO_ENGINEERING_FALLBACK_PASS`

Any missing item is FAIL/BLOCK.

A visual screenshot alone cannot prove core completion. A callback that only changes text, Toast, or modal state cannot prove core completion.

## 9. Specialist AI Work Split

- CAD specialist: geometry, editing, SNAP, exact input, preview, persistence.
- CAM specialist: AUTO/MANUAL, compensation, Safe-Z, strategy, fixture avoidance, real toolpath.
- 3D/SIM specialist: rendering, tool motion, material removal, collision/overcut.
- 3AX specialist: XYZ machine state and Authority runtime.
- 4AX specialist: A-axis kinematics and controls (AIG II only).
- 5AX specialist: A/B kinematics, trunnion/head motion (AIG II only).
- 6AX specialist: A/B/C kinematics and multi-face machining (AIG II only).
- NC/Fanuc specialist: G-code field, parser, post, alarm, safety, NC-first.
- AI Update specialist: context, suggestions, apply/rollback semantics.
- Integrator/Gate specialist: shared contracts, capability isolation, dual-project exact evidence.

No specialist may replace another module with a placeholder shell.

## 10. Migration Order

1. Inventory and fingerprint shared core in both projects.
2. Add Product Capability Authority and fail closed on mismatch.
3. Recover CAD including live preview.
4. Recover CAM real toolpath.
5. Recover 3D toolpath and material removal.
6. Recover AIG 3AX runtime.
7. Recover AIG II 3AX/4AX/5AX/6AX runtime.
8. Recover NC/G-code/Fanuc and NC-first.
9. Recover AI Update/Apply.
10. Run dual-project Gate and produce APK/EXE only after all required runtime evidence is green.

## 11. Acceptance Rule

A build/Gate success is necessary but not sufficient for final product acceptance. Final acceptance requires machine-verifiable artifacts plus real installed runtime behavior. Any occurrence of wrong axis pages, missing shared core, display-only callbacks, modal/generic shell formal pages, or Engineering Shell fallback blocks release.

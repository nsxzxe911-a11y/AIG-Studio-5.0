# AIG Studio 5.0 — Autonomous Page Runtime + AI Machining Orchestrator Design

Date: 2026-10-17
Baseline: Builder #588, commit `3bdeed6cb4a504a65b23ba9ad355ba34d2af0e9b`
Status: design approved in conversation; written-spec review required before implementation

## 1. Goal

Complete HOME / CAD / CAM / SIM / 3AX / 4AX / 5AX / 6AX / NC / AI as independently operable production runtimes. Every page owns its buttons, callbacks, subpages, state, messages, errors and domain data. Cross-page CONNECT / DISCONNECT transports data only; it must never be required for a page to remain usable.

After page autonomy is complete, add a production AI Machining Orchestrator that reads verified page outputs and selects a faster safe machining route, including both CAD-first and NC-first workflows. AI coordinates existing domain cores; it does not replace CAD, CAM, SIM, NC, axis kinematics, CNC safety or machine-output gates.

## 2. Existing #588 gaps this design addresses

1. `design/ui/button-manifest-v1.json` currently models only the ten global navigation buttons. It does not provide stable IDs for page-local buttons or subpage routes.
2. `NAV_CAD` currently points to a Toast callback rather than a real CAD workspace transition, so a nonblank callback string is not sufficient evidence of a functional button.
3. `RuntimeLinks.kt` correctly defines data-flow-only disconnect semantics, but the link contract has no typed payload/version boundary between page runtimes.
4. `continuity/ai-responsibility-routing.json` is a maintenance/audit/rework routing contract. Production machining orchestration must be a separate contract so maintenance AI cannot be confused with machining decisions.
5. Page-local messages/errors are not yet represented by one shared isolation contract.

## 3. Architecture

### 3.1 Stable runtime identities

Add a shared runtime identity contract with stable string IDs. IDs are API-like: once released they are not silently renamed or reused.

Primary page IDs:

- `HOME`
- `CAD`
- `CAM`
- `SIM`
- `3AX`
- `4AX`
- `5AX`
- `6AX`
- `NC`
- `AI`

Each primary page declares its own subpage IDs. Initial required IDs:

- HOME: `HOME.MAIN`, `HOME.PROJECTS`, `HOME.SETTINGS`
- CAD: `CAD.MAIN`, `CAD.DRAW`, `CAD.EDIT`, `CAD.VIEW`, `CAD.PHOTO`, `CAD.FILE`
- CAM: `CAM.MAIN`, `CAM.AUTO`, `CAM.MANUAL`, `CAM.TOOL`, `CAM.REGION`, `CAM.POST_PREVIEW`
- SIM: `SIM.MAIN`, `SIM.MATERIAL`, `SIM.COLLISION`, `SIM.PLAYBACK`, `SIM.RESULT`
- 3AX: `3AX.MACHINE`, `3AX.NC_FIRST`
- 4AX: `4AX.MACHINE`, `4AX.NC_FIRST`
- 5AX: `5AX.MACHINE`, `5AX.NC_FIRST`
- 6AX: `6AX.MACHINE`, `6AX.NC_FIRST`
- NC: `NC.EDITOR`, `NC.PARSER`, `NC.PREVIEW`, `NC.VERIFY`, `NC.OUTPUT`
- AI: `AI.ASSIST`, `AI.PLAN`, `AI.AUDIT`, `AI.RECOVERY`

Subpage IDs describe destinations, not screen coordinates. Mobile, Desktop and Web must use the same IDs even when layouts differ.

### 3.2 Per-page button manifests

Replace the single navigation-only concept with a two-level manifest system:

- Global manifest owns only global navigation and product-wide controls.
- Each page owns `design/ui/pages/<PAGE>/button-manifest.json` for page-local and subpage-local buttons.

Each entry requires:

- `buttonId` — globally stable identifier, e.g. `CAD.DRAW.LINE`, `CAM.MANUAL.ADD_POINT`, `SIM.PLAYBACK.SINGLE_BLOCK`, `NC.EDITOR.INSERT`
- `pageId`
- `subpageId`
- `commandId`
- `ownerDomain`
- `callbackContract`
- `messageChannel`
- `dangerClass` (`NORMAL`, `CAUTION`, `CNC_OUTPUT`)
- `availabilityRule`
- optional Authority RGB asset/bounds metadata

A button is considered functional only when the command reaches a domain/runtime result. Toast-only, label-only, state-string-only or image-only callbacks do not count as verified functionality.

### 3.3 Page-local runtime boundary

Each page exposes the same small interface while retaining its own implementation:

- `dispatch(command)`
- `snapshot()`
- `messages()`
- `exportPayload(targetLink)`
- `importPayload(sourceLink, payload)`

A page may call its own domain core directly. It must not reach into another page's UI internals.

Required ownership:

- CAD owns geometry, drawing/editing, photo alignment/scale, undo/redo, file-facing CAD state.
- CAM owns AUTO/MANUAL toolpaths, tooling, compensation, Safe-Z, lead in/out, machining regions and post-preview inputs.
- SIM owns playback, true material removal, collision state and simulation result evidence.
- 3AX/4AX/5AX/6AX own their machine views, axis/JOG state, kinematic visualization and NC-first work pages.
- NC owns G-code editor, parser, Fanuc semantics, inline alarms, verification and machine-output preparation.
- AI owns assistance/planning/orchestration state only; it never becomes the source of CAD/CAM/SIM/NC truth.

### 3.4 Local message and fault isolation

Add a page-scoped message contract:

- `INFO`
- `NOTICE`
- `WARNING`
- `ALARM`
- `BLOCKED_ACTION`

Every message includes `pageId`, optional `subpageId`, `code`, `detail`, `relatedButtonId`, and timestamp/revision metadata.

Normal validation errors, missing assets, network failures or optional-module exceptions isolate to the owning page/action. They must not initialize, clear, reset or replace unrelated pages. CNC-dangerous output may block only the unsafe output/action while preserving editable data.

### 3.5 Typed CONNECT / DISCONNECT bridges

Keep the existing rule: disconnect affects data flow only and preserves local runtime data.

Production machining bridges:

1. `CAD_CAM`
   - geometry + origin + units + revision/digest
2. `CAM_SIM`
   - toolpath + tooling + stock/fixture + axis orientation + revision/digest
3. `SIM_NC`
   - verified simulation result + accepted toolpath/post context + evidence digest
4. `NC_MACHINE`
   - verified NC output only; guarded by CNC safety and explicit machine connection

GPU/network/cloud sync remain infrastructure state and are not machining workflow bridges.

Payload contracts are versioned. A receiver validates schema/revision/digest before accepting data. Rejecting an incoming payload does not invalidate the receiver's existing local working copy.

### 3.6 Production AI Machining Orchestrator

Create a new production contract separate from `ai-responsibility-routing.json`.

Inputs:

- requested result/part objective
- available CAD geometry
- available CAM toolpath
- existing NC program
- target axis mode (3/4/5/6AX)
- tooling/stock/fixture information
- current page verification snapshots
- operator constraints

Outputs a `MachiningPlan`, not direct machine motion. A plan contains:

- `planId`
- `objective` (`FASTEST_SAFE`, `MIN_REWORK`, `MIN_TOOL_CHANGES`, `OPERATOR_SELECTED`)
- ordered stages
- required page/subpage IDs
- bridge operations required
- evidence required before advancing
- estimated relative cost/time score
- reasons for route selection
- blockers/warnings

Initial route candidates:

- CAD-first: `CAD -> CAM -> SIM -> NC -> MACHINE`
- Manual-CAM-first where CAD is unnecessary: `CAM.MANUAL -> SIM -> NC -> MACHINE`
- NC-first: `NC.EDITOR -> parse -> axis 3D preview -> SIM/material removal -> NC.VERIFY -> MACHINE`
- Reuse-existing-stage: start from the latest verified compatible artifact rather than rebuilding upstream work.

The orchestrator prefers the shortest compatible verified route. It may skip unnecessary authoring stages, but it may not skip required safety/verification gates before machine output.

### 3.7 AI stage advancement rule

AI may automatically prepare/navigate/transfer data between connected pages when contracts validate, but machine output remains governed by CNC safety and machine connection policy.

Advancement algorithm:

1. discover existing verified artifacts and revisions
2. discard stale/incompatible cross-page payloads
3. generate candidate routes
4. score candidates for the selected objective
5. choose the best safe route
6. dispatch only page-owned commands through public page contracts
7. collect page result/evidence
8. on local failure, return only that stage to its owning page; preserve other verified artifacts
9. re-plan from the newest verified checkpoint
10. permit `NC_MACHINE` only after required verification and CNC safety checks pass

## 4. Required implementation sequence

### Phase A — identity and manifest foundation

- add shared `RuntimePageId` / `RuntimeSubpageId` contract
- add per-page manifests and uniqueness/schema validator
- migrate global navigation to typed page routes
- change verification from "callback string is nonblank" to command-result evidence

### Phase B — button completion page by page

Order is chosen to preserve machining dependency flow while keeping pages independently testable:

1. CAD buttons/subpages
2. CAM buttons/subpages, MANUAL first
3. SIM buttons/subpages and material-removal evidence
4. NC editor/parser/preview/verify/output buttons
5. 3AX/4AX/5AX/6AX machine + NC-first subpages
6. HOME project/settings routing
7. AI assist/plan/audit/recovery subpages

Every page passes its own contract tests before any cross-page bridge is required.

### Phase C — bridge contracts

- CAD_CAM
- CAM_SIM
- SIM_NC
- NC_MACHINE

For each bridge test CONNECT, DISCONNECT, stale payload rejection, revision/digest behavior and preservation of both pages' local state.

### Phase D — production AI orchestration

- add machining plan contract
- route scoring
- verified checkpoint reuse
- CAD-first / Manual-CAM-first / NC-first plans
- stage-local retry/re-plan
- UI plan explanation and operator override

## 5. Testing and Gate additions

New static/unit gates:

- every primary page ID is unique and stable
- every declared subpage ID has a route on Android, Desktop and Web
- every page-local button ID is unique
- every button resolves to a typed command
- every typed command has a domain/runtime result test
- no production button is verified by Toast/text/image presence alone
- every page remains operable with all machining bridges disconnected
- a page exception cannot reset another page
- CONNECT transfers only validated payloads
- DISCONNECT preserves local data
- AI plan cannot bypass SIM/NC/CNC safety requirements for machine output
- AI failure leaves manual page workflows operational
- Android/Desktop/Web share the same Page ID and Button ID inventory

Release evidence remains platform-specific: Android APK and Windows EXE must still launch the approved RGB Runtime and runtime screenshots must prove the correct production pages, not an engineering shell.

## 6. Compatibility and migration

- Preserve existing stable global Button IDs (`NAV_HOME` ... `NAV_AI`).
- Preserve existing `RuntimeLinkContract.DISCONNECT_POLICY` semantics.
- Add new contracts without changing geometry precision, Fanuc semantics, material-removal math or axis kinematics unless a page-specific test proves a needed fix.
- Existing maintenance AI routing remains intact; production machining orchestration is a separate file/type and may consume maintenance findings only as warnings/blockers.
- Version only moves forward from #588; #588 remains the rollback/evidence checkpoint, not a code target to overwrite.

## 7. Definition of complete

This architecture is complete only when:

1. each page and subpage opens by stable ID on Android, Desktop and Web;
2. each visible production button has a stable Button ID and reaches a real runtime/core result;
3. each page works with all cross-page machining links disconnected;
4. cross-page links transfer versioned validated data without sharing UI internals;
5. AI can select and explain the fastest safe compatible route from current project state;
6. CAD-first and NC-first both reach verified NC output;
7. no AI or page failure destroys unrelated working copies or verified checkpoints;
8. machine output remains subject to CNC safety and explicit machine connection.

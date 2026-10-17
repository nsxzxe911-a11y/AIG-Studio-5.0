# AIG Page Autonomy + AI Machining Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI into independently operable professional page departments with stable Page/Subpage/Button IDs, real command→core→result evidence, typed CONNECT bridges, and a final AI machining orchestrator that selects the fastest safe verified route.

**Architecture:** Keep the existing proven engines and approved RGB surfaces, but move page identity, button ownership, messages, and bridge payloads behind small shared contracts instead of adding more logic to `MainActivity.kt`, `DesktopApp.kt`, or `web/index.html`. Each page owns its local runtime and can work while disconnected; Android/Desktop/Web are adapters over the same IDs and command semantics. Production AI reads page snapshots/results and composes routes, but it never bypasses SIM/NC/machine safety gates.

**Tech Stack:** Kotlin/JVM shared core + Android, Kotlin desktop, HTML/JavaScript web runtime, JSON UI manifests, Python CI verifiers, Gradle.

**Spec:** `docs/superpowers/specs/2026-10-17-page-autonomy-ai-machining-orchestrator-design.md`

## Global Constraints

- Trusted baseline: branch `architecture/page-autonomy-ai-orchestrator-after-588`, design HEAD parent = Builder #588 exact SHA `3bdeed6cb4a504a65b23ba9ad355ba34d2af0e9b`; never roll back or downgrade.
- Formal startup stays approved RGB Runtime UI; engineering shell is not a production page.
- Stable primary IDs: `HOME`, `CAD`, `CAM`, `SIM`, `3AX`, `4AX`, `5AX`, `6AX`, `NC`, `AI`.
- Stable subpage IDs are exactly those approved in the spec; Android/Desktop/Web must use the same strings.
- Every functional button must produce evidence through `Button ID → PageCommand → page runtime/core → PageResult`; Toast-only, label-only, image-only, and state-string-only callbacks are invalid.
- `CONNECT/DISCONNECT` controls data flow only; local page runtime data survives disconnect.
- Local page errors stay local; no ordinary page error may reset HOME, clear another page, or initialize the whole application.
- Precision and machining semantics remain 0.001 mm; NC output remains Fanuc-oriented and machine output stays guarded.
- AI maintenance/recovery remains separate from Production Machining AI.
- AI may propose/prepare/navigate/transfer; it may not bypass collision/material-removal/NC verification or machine authorization.
- Follow `AGENTS.md`: focused verifier first; full Android/Windows compile only at phase gates; no PASS claim without fresh evidence.
- `release-version.properties` is currently `370.0.0`; any release version change may only increase it.
- After the verified Studio feature HEAD exists, AIG-II exact-bind must be updated to that Studio SHA before a dual-project release claim.

## Review Focus

1. **Disconnected page use:** CAD/CAM/SIM/NC and each axis page must still execute local commands while their outgoing bridge is disconnected; pin in Tasks 1, 7, and 8.
2. **Wrong-page command injection:** a CAD button/command sent to CAM must return a local rejected result without changing CAM state; pin in Task 2.
3. **Stale bridge payload:** revision/digest mismatch must be rejected without overwriting destination working state; pin in Task 7.
4. **AI unsafe shortcut:** route scoring must never choose a faster candidate that omits required SIM/NC verification before `NC_MACHINE`; pin in Task 8.
5. **Cross-platform ID drift:** Android/Desktop/Web and JSON/Kotlin catalogs must fail CI if page/subpage/button IDs diverge; pin in Tasks 3 and 9.

---

### Task 1: Foundation Department — Page identity, runtime, result, messages, and transfer types

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/PageRuntimeContract.kt`
- Create: `core/src/main/kotlin/com/aigstudio/core/RuntimeBridgePayload.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/PageRuntimeContractRegression.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/RuntimeIssueRouting.kt`

**Interfaces:**
- Produces: `enum class PageId { HOME, CAD, CAM, SIM, AX3, AX4, AX5, AX6, NC, AI }` where external IDs map to `3AX/4AX/5AX/6AX` through `PageCatalog.externalId(page)`.
- Produces: `data class SubpageId(val page: PageId, val value: String)` and one canonical `PageCatalog` containing exactly the approved external page/subpage strings.
- Produces: `enum class ButtonDangerClass { NORMAL, CAUTION, DANGEROUS_OUTPUT }`.
- Produces: `data class PageCommand(val page: PageId, val subpage: SubpageId, val commandId: String, val arguments: Map<String,String> = emptyMap())`.
- Produces: `data class PageSnapshot(val page: PageId, val subpage: SubpageId, val revision: Long, val fields: Map<String,String>)`.
- Produces: `sealed interface PageResult` with `Success(commandId, revision, evidence)`, `Rejected(commandId, reason)`, `Blocked(commandId, reason)`, and `Failure(commandId, message)` result variants.
- Produces: `enum class PageMessageSeverity { INFO, NOTICE, WARNING, ALARM, BLOCKED_ACTION }` and `data class PageMessage(val page: PageId, val severity: PageMessageSeverity, val code: String, val text: String)`.
- Produces: `data class RuntimeBridgePayload(val schema: String, val revision: Long, val digest: String, val sourcePage: PageId, val targetPage: PageId, val body: Map<String,String>)`.
- Produces: `interface PageRuntime { fun dispatch(command: PageCommand): PageResult; fun snapshot(): PageSnapshot; fun messages(): List<PageMessage>; fun exportPayload(target: RuntimeLinkId): RuntimeBridgePayload?; fun importPayload(source: RuntimeLinkId, payload: RuntimeBridgePayload): PageResult }`.

- [ ] **Step 1: Write failing contract tests** asserting all ten external primary IDs, every approved subpage ID, page/subpage ownership, danger classes, message severities, and wrong-page command rejection without snapshot mutation.
- [ ] **Step 2: Run RED** with `./gradlew :core:test --tests '*PageRuntimeContractRegression*'`; expected failure is missing contract/catalog types.
- [ ] **Step 3: Implement the minimal contracts**; keep external IDs stable and make rejection a normal page-local result rather than a runtime reset exception.
- [ ] **Step 4: Run GREEN** with the focused test and then `./gradlew :core:test`.
- [ ] **Step 5: Commit** as `feat: add autonomous page runtime contracts`.

### Task 2: Command Ownership Department — Typed per-page command catalogs

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/PageCommandCatalog.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/PageCommandCatalogRegression.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt`

**Interfaces:**
- Consumes: Task 1 types.
- Produces: `data class PageCommandDefinition(val commandId: String, val page: PageId, val allowedSubpages: Set<SubpageId>, val dangerClass: ButtonDangerClass, val requiresCoreResult: Boolean = true)` and `object PageCommandCatalog`.
- Produces command families for HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI without replacing existing geometry/CAM/SIM/NC engines.

- [ ] **Step 1: Write failing tests** for unique command IDs, correct page ownership, axis applicability (3AX XYZ; 4AX +A; 5AX +A/B; 6AX +A/B/C), and wrong-page injection rejection.
- [ ] **Step 2: Run RED**: `./gradlew :core:test --tests '*PageCommandCatalogRegression*'`.
- [ ] **Step 3: Implement the command catalog**. Minimum professional coverage: CAD draw/edit/undo/redo/file/photo/snap; CAM AUTO/MANUAL/compensation/strategy/tool/region/Safe-Z/node editing/post preview; SIM playback/material removal/collision/view/result; axis jog/view/NC-first; NC editor/parser/preview/verify/output/single-block/dry-run/block-skip/custom M-code; HOME project/settings/sync/status; AI assist/plan/audit/recovery/optimize.
- [ ] **Step 4: Run GREEN** focused test then full core tests.
- [ ] **Step 5: Commit** as `feat: define professional page command ownership`.

### Task 3: UI Manifest Department — Per-page Button ID manifests and validators

**Files:**
- Create: `design/ui/pages/HOME/button-manifest.json`
- Create: `design/ui/pages/CAD/button-manifest.json`
- Create: `design/ui/pages/CAM/button-manifest.json`
- Create: `design/ui/pages/SIM/button-manifest.json`
- Create: `design/ui/pages/3AX/button-manifest.json`
- Create: `design/ui/pages/4AX/button-manifest.json`
- Create: `design/ui/pages/5AX/button-manifest.json`
- Create: `design/ui/pages/6AX/button-manifest.json`
- Create: `design/ui/pages/NC/button-manifest.json`
- Create: `design/ui/pages/AI/button-manifest.json`
- Modify: `design/ui/button-manifest-v1.json`
- Modify: `core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt`
- Modify: `ci/verify_ui_button_manifest_consistency.py`

**Interfaces:**
- Consumes: `PageCatalog`, `PageCommandCatalog`.
- Produces per-button fields: `buttonId`, `pageId`, `subpageId`, `commandId`, `ownerDomain`, `callbackContract`, `messageChannel`, `dangerClass`, `availabilityRule`, optional `assetId`, optional normalized bounds.
- Keeps `design/ui/button-manifest-v1.json` as global navigation only.

- [ ] **Step 1: Change the Python verifier first** so it expects ten page manifests, rejects duplicate IDs, unknown page/subpage/command ownership, blank/Toast-only callback contracts, and removes the obsolete hard-coded `len(json_entries) == 10` assumption.
- [ ] **Step 2: Run RED**: `python ci/verify_ui_button_manifest_consistency.py`; expected failure = missing page manifests/new schema.
- [ ] **Step 3: Add all ten page manifests and update Kotlin manifest types**; preserve unverified authority bounds as null rather than inventing coordinates.
- [ ] **Step 4: Run GREEN**: verifier plus `./gradlew :core:test`.
- [ ] **Step 5: Commit** as `feat: split button manifests by page department`.

### Task 4: CAD + CAM Departments — Real command adapters over existing engines

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/CadPageRuntime.kt`
- Create: `core/src/main/kotlin/com/aigstudio/core/CamPageRuntime.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/CadPageRuntimeRegression.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/CamPageRuntimeRegression.kt`
- Reuse/modify only as required: `Document.kt`, `Geometry.kt`, `CadAdvancedTools.kt`, `CadExactInput.kt`, `CadProfileTools.kt`, `Cam.kt`, `CamWorkflowEngine.kt`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `class CadPageRuntime(...) : PageRuntime`, `class CamPageRuntime(...) : PageRuntime`.
- CAD result evidence includes geometry/state revision; CAM result evidence includes actual toolpath/node/revision, never strategy-name strings alone.

- [ ] **Step 1: Write CAD RED tests** for LINE/RECT/CIRCLE/ARC/HOLE, TRIM/EXTEND/OFFSET/ARRAY/CHAMFER/FILLET, undo/redo, exact input, and disconnected local operation.
- [ ] **Step 2: Run CAD RED**, implement minimal adapter over existing CAD engines, then CAD GREEN.
- [ ] **Step 3: Write CAM RED tests** for MANUAL-first node add/edit/delete, G0/G1, XYZ plus A/B/C retention where applicable, Safe-Z, compensation, and at least one AUTO strategy producing non-empty toolpath evidence.
- [ ] **Step 4: Run CAM RED**, implement minimal adapter over `Cam.kt`/`CamWorkflowEngine.kt`, then CAM GREEN.
- [ ] **Step 5: Run full core tests and commit** as `feat: add autonomous CAD and CAM page runtimes`.

### Task 5: SIM + 3AX/4AX/5AX/6AX Departments — Independent machining visualization runtimes

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/SimPageRuntime.kt`
- Create: `core/src/main/kotlin/com/aigstudio/core/AxisPageRuntime.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/SimPageRuntimeRegression.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/AxisPageRuntimeRegression.kt`
- Reuse/modify only as required: `Machining3D.kt`, `SixAxisToolDirection.kt`, `AxisCockpitSkinContract.kt`

**Interfaces:**
- Produces: `class SimPageRuntime(...) : PageRuntime` and `class AxisPageRuntime(val pageId: PageId, ...) : PageRuntime` supporting only axes allowed by `pageId`.
- Axis runtime owns both `<AX>.MACHINE` and `<AX>.NC_FIRST` subpages while sharing a safe common implementation.

- [ ] **Step 1: Write SIM RED tests** for play/pause/single-block/stop/reset, numeric material removal, collision isolation, and disconnected operation.
- [ ] **Step 2: Run SIM RED**, implement adapter, then GREEN.
- [ ] **Step 3: Write Axis RED tests** proving allowed-axis enforcement, 3AX–6AX state persistence, NC-first availability on all four axis pages, and no 6AX A/B/C state leakage into 5AX.
- [ ] **Step 4: Run Axis RED**, implement adapter, then GREEN.
- [ ] **Step 5: Run full core tests and commit** as `feat: add autonomous SIM and axis page runtimes`.

### Task 6: NC + HOME Departments — Independent editor/output and project control runtimes

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/NcPageRuntime.kt`
- Create: `core/src/main/kotlin/com/aigstudio/core/HomePageRuntime.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/NcPageRuntimeRegression.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/HomePageRuntimeRegression.kt`
- Reuse/modify only as required: `FanucNc.kt`, `ProjectRepository.kt`, `ProjectSync.kt`, `EnvironmentSettings.kt`

**Interfaces:**
- Produces `NcPageRuntime` for `NC.EDITOR/PARSER/PREVIEW/VERIFY/OUTPUT` and `HomePageRuntime` for `HOME.MAIN/PROJECTS/SETTINGS`.
- NC result carries parser diagnostics, coordinate/axis evidence, verification state, and `machineEligible=false` until explicit verification gates pass.

- [ ] **Step 1: Write NC RED tests** for editor→parser→preview→verify, inline alarm locality, Fanuc modal basics, block skip/single block/dry run, custom M-code policy, NC-first without CAD/CAM, and machine output blocked before verification.
- [ ] **Step 2: Run NC RED**, implement adapter over `FanucNc.kt`, then GREEN.
- [ ] **Step 3: Write HOME RED tests** for project/settings/sync, local-first behavior, and proving a child-page error cannot clear project state or force HOME reset.
- [ ] **Step 4: Run HOME RED**, implement adapter, then GREEN.
- [ ] **Step 5: Run full core tests and commit** as `feat: add autonomous NC and HOME page runtimes`.

### Task 7: CONNECT Department — Versioned typed data bridges with revision + digest

**Files:**
- Modify: `core/src/main/kotlin/com/aigstudio/core/RuntimeLinks.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/RuntimeBridgePayload.kt`
- Replace/expand: `core/src/test/kotlin/com/aigstudio/core/RuntimeLinkRegression.kt`

**Interfaces:**
- Consumes Task 1 `RuntimeBridgePayload`.
- Produces: `RuntimeLinkId` semantics `CAD_CAM`, `CAM_SIM`, `SIM_NC`, `NC_MACHINE`, `GPU_3D` (keep compatibility migration for prior `MACHINE` identifier at adapters only) plus bridge validators.
- `DISCONNECT_POLICY` remains exactly `DATA_FLOW_ONLY_PRESERVE_RUNTIME_DATA`.

- [ ] **Step 1: Write RED tests** for disconnect preserving source/destination snapshots, valid transfer, stale revision rejection, digest mismatch rejection, wrong source/target rejection, and no overwrite on any rejected payload.
- [ ] **Step 2: Run RED**: `./gradlew :core:test --tests '*RuntimeLinkRegression*'`.
- [ ] **Step 3: Implement version/digest validation** and keep network/cloud status separate from module connections.
- [ ] **Step 4: Run GREEN** focused and full core tests.
- [ ] **Step 5: Commit** as `feat: add typed autonomous runtime bridges`.

### Task 8: AI Machining Department — Safe fastest-route orchestrator

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/MachiningOrchestrator.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/MachiningOrchestratorRegression.kt`
- Reuse but do not merge with maintenance AI: `AiAssist.kt`, `continuity/ai-responsibility-routing.json`

**Interfaces:**
- Produces: `enum class MachiningRouteKind { CAD_FIRST, MANUAL_CAM_FIRST, NC_FIRST, REUSE_VERIFIED_STAGE }`, `data class MachiningStageEvidence(...)`, `data class MachiningRouteCandidate(...)`, `data class MachiningPlan(...)`, and `class MachiningOrchestrator { fun plan(input: MachiningPlanInput): MachiningPlan }`.
- Route ordering: safety eligibility first; then reuse verified work; then estimated machining/preparation time; then fewer transformations/rework. Missing required verification makes a route ineligible regardless of speed.

- [ ] **Step 1: Write RED tests** for selecting NC-first when valid NC exists, MANUAL-CAM-first when no CAD is needed, reusing verified SIM/NC stages, and rejecting a faster route that omits SIM/NC safety evidence.
- [ ] **Step 2: Run RED** with focused orchestrator tests.
- [ ] **Step 3: Implement deterministic planning** from snapshots/evidence only; `plan()` must not mutate page runtimes.
- [ ] **Step 4: Run GREEN** focused and full core tests.
- [ ] **Step 5: Commit** as `feat: add safe fastest machining orchestrator`.

### Task 9: Platform Integration Department — Android, Desktop, Web use the same IDs and real page results

**Files:**
- Create: `app/src/main/java/com/aigstudio/app/PageRuntimeRouter.kt`
- Create: `desktop/src/main/kotlin/com/aigstudio/desktop/PageRuntimeRouter.kt`
- Create: `web/runtime/page-runtime-router.js`
- Modify focused symbols only: `app/src/main/java/com/aigstudio/app/MainActivity.kt`
- Modify focused symbols only: `desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt`
- Modify: `web/index.html`
- Create: `ci/verify_page_runtime_cross_platform.py`
- Modify: `ci/verify_formal_global_navigation.py`

**Interfaces:**
- Consumes Tasks 1–8.
- Produces platform routers mapping every manifest `buttonId` to identical `pageId/subpageId/commandId` semantics and displaying `PageResult/PageMessage` without domain logic in UI files.

- [ ] **Step 1: Write cross-platform verifier first**; assert all manifest IDs appear in Android/Desktop/Web routers, no production button is Toast-only, and global navigation reaches a page router.
- [ ] **Step 2: Run RED**: `python ci/verify_page_runtime_cross_platform.py`.
- [ ] **Step 3: Add platform routers and replace only relevant dispatch symbols** in the three large UI surfaces; do not refactor unrelated monolith code.
- [ ] **Step 4: Run GREEN**: cross-platform verifier, formal navigation verifier, relevant web verifiers, and core tests.
- [ ] **Step 5: Compile phase gate**: `./gradlew :app:assembleDebug :desktop:compileKotlin`; compile success alone is not runtime PASS.
- [ ] **Step 6: Commit** as `feat: wire autonomous page runtimes across platforms`.

### Task 10: Release/Gate Department — Runtime evidence, upward version, and AIG-II exact bind

**Files:**
- Modify only after prior tasks green: `release-version.properties`
- Modify as required: `ci/department_autocheck.py`, `ci/fast_review.py`, `ci/verify_production_runtime.py`
- AIG-II: update the existing Studio exact-SHA binding file discovered from the current `release/aigii-427-studio-588-bind` lineage; do not invent a new binding location.

**Interfaces:**
- Consumes verified feature HEAD from Tasks 1–9.
- Produces one Studio feature SHA, fresh Android/Windows/Web evidence, and one AIG-II exact bind to that SHA.

- [ ] **Step 1: Add focused Gate assertions** that all ten departments have non-empty manifests, real result evidence, local error isolation, and bridge/orchestrator regressions green.
- [ ] **Step 2: Run focused verifiers**: page manifest, cross-platform routing, navigation, NC/SIM/CAM focused checks, then `python ci/fast_review.py`.
- [ ] **Step 3: Run full suite/builds**: `./gradlew :core:test :app:assembleDebug :desktop:compileKotlin` plus existing web runtime verifier.
- [ ] **Step 4: Advance `versionName` only upward** after the above is green; rerun version verifier and builds.
- [ ] **Step 5: Capture runtime evidence** for formal RGB HOME and representative CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI button→result behavior. Compile success alone is not runtime evidence.
- [ ] **Step 6: Commit Studio checkpoint**, record exact SHA, update AIG-II exact binding to it, and run dual-project gate without rollback/downgrade behavior.
- [ ] **Step 7: Final report** separates VERIFIED evidence from NOT-YET-VERIFIED items; missing device/runtime proof is never labeled PASS.

## Execution Order and Parallelism

- Task 1 lands first.
- Tasks 2–3 depend on Task 1 and land before page runtimes.
- After Tasks 1–3, Tasks 4, 5, and 6 are independent professional departments and may execute in parallel worktrees/subagents.
- Task 7 begins once CAD/CAM/SIM/NC runtimes exist.
- Task 8 depends on page snapshots/results and Task 7 bridge semantics.
- Task 9 integrates completed departments.
- Task 10 alone may make a release/checkpoint claim and exact-bind AIG-II.

## Self-Review Result

- Spec coverage: all approved page IDs/subpages, page autonomy, Button ID manifests, real callbacks/results, local messaging, CONNECT contracts, CAD-first/MANUAL-CAM/NC-first/reuse routes, AI safety limits, cross-platform parity, and dual-project exact binding are assigned.
- TDD coverage: every production behavior task begins with a failing focused test/verifier and requires observed RED before implementation.
- Type consistency: `PageId`, `SubpageId`, `ButtonDangerClass`, `PageCommand`, `PageSnapshot`, `PageResult`, `PageRuntime`, and `RuntimeBridgePayload` are all defined in Task 1 and reused later; Task 7 extends bridge behavior instead of defining a late dependency.
- Monolith control: `MainActivity.kt`, `DesktopApp.kt`, and `web/index.html` are adapter integration points only; new domain logic lives in focused files.
- Review-focus gaps are pinned to Tasks 1/2/3/7/8/9 with explicit failure tests.

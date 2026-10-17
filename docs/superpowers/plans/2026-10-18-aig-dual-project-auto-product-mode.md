# AIG Dual-Project Auto Product Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish AIG-II and AIG as Android, Windows, and Web products under one fail-closed Dual-Project Single-Gate, resuming only from verified checkpoints and preserving the approved AIG-II RGB Authority revision chain.

**Architecture:** Use AIG-II RGB as the single visual authority source while keeping project scope separate. Runtime resolution is exact Registry/ID/SHA only; semantic IDs connect page/subpage regions to real Button IDs, Command IDs, Shared State/Core, and Runtime results. A final joint gate validates both products, their scope, artifacts, runtime evidence, and exact SHA linkage.

**Tech Stack:** Kotlin/Gradle Android + Windows desktop, Web Runtime, Python CI verifiers, GitHub Actions, exact SHA-256 Authority/Artifact manifests.

**Spec:** `docs/superpowers/specs/2026-10-18-aig-dual-project-auto-product-mode-design.md`

## Global Constraints

- Forward-only: never reset/rebase/checkout to an older implementation as a fix.
- Latest verified checkpoint wins; after disconnect resume from ledger + git evidence, not memory.
- AIG-II pages: `HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI`.
- AIG pages: `HOME/CAD/CAM/SIM/3AX/NC/AI`; `4AX/5AX/6AX` must not be product-mounted.
- Visual authority chain: `10/5 RGB baseline -> approved platform revision -> last approved page revision -> Runtime mounted Authority`.
- Runtime image lookup: exact Authority ID / Registry / SHA only. No filename, semantic, recency, or generated-image fallback.
- MAIN / SUBPAGE / MASTER / CROP_SOURCE / REFERENCE / CANDIDATE roles never auto-promote across roles.
- Dynamic status, coordinates, alarms, values, and messages remain Runtime-driven; raster images are appearance only.
- End-to-end coordinate/geometry precision target: `0.001 mm`.
- Any required Single-Gate failure blocks final PASS.
- No Engineering shell as formal startup/runtime UI.
- No fake button, fake callback, fake material removal, or image-only functional acceptance.

## Review Focus

1. Stale source/reference manifests must never override an already-approved mounted Runtime Authority identity.
2. AIG product projection must not expose 4AX/5AX/6AX even when shared core/visual registries contain them.
3. Registry conflict, missing exact ID, or SHA mismatch must fail closed instead of substituting another asset.
4. Tool/server/network failures must not mutate product state or trigger resets/rollbacks.
5. Single-Gate must distinguish source identity, runtime evidence, and artifact identity so partial success cannot be reported as final PASS.

---

### Task 1: Reconcile Authority Policy and Current Active Registry

**Files:**
- Modify: `design/ui/aigii-rgb-master-registry-v2.json`
- Modify: `ci/verify_aigii_rgb_master_registry_v2.py`
- Create or modify only if already part of the branch contract: `design/ui/*authority*manifest*.json`
- Modify: `.github/workflows/aig-authority-v7-focused-gate.yml`

**Interfaces:**
- Consumes: approved AIG-II Mobile/Desktop revision identities from the spec and existing Library/manifest SHA evidence.
- Produces: exact Current Active Registry entries keyed by project/platform/page/role, with SHA and lineage; fail-closed resolver contract for later tasks.

- [ ] **Step 1: Write RED verifier cases for stale-policy rejection**

Add tests/assertions proving:
- an approved mounted Runtime Authority is not blocked solely because an older provenance/source manifest is sub-target-resolution;
- a missing exact Authority ID fails;
- a SHA mismatch fails;
- semantic/filename fallback is forbidden;
- AIG projection excludes 4AX/5AX/6AX.

- [ ] **Step 2: Run verifier and confirm RED for the current stale policy**

Run: `python3 ci/verify_aigii_rgb_master_registry_v2.py`

Expected: FAIL on the stale/current-active policy mismatch, not on syntax or missing unrelated files.

- [ ] **Step 3: Forward-fix Registry records**

Update Registry status/slots without rolling back prior commits. Preserve source provenance separately from Runtime-active approval. Bind every activated record by exact ID and SHA.

- [ ] **Step 4: Run Registry verifier to GREEN**

Run: `python3 ci/verify_aigii_rgb_master_registry_v2.py`

Expected: PASS with exact-ID-only and product-scope evidence.

- [ ] **Step 5: Run focused Authority Gate**

Run the existing focused gate commands locally/CI and verify no existing Authority/Product/Region/Skin contract regresses.

- [ ] **Step 6: Commit checkpoint**

Record: `STEP / INPUT SHA / OUTPUT SHA / PASS-FAIL / EVIDENCE / NEXT STEP`.

---

### Task 2: Exact Runtime Authority Resolver and Page Mount Closure

**Files:**
- Modify: `app/src/main/java/com/aigstudio/app/PageRuntimeRouter.kt`
- Modify: `desktop/src/main/kotlin/com/aigstudio/desktop/PageRuntimeRouter.kt`
- Modify: Web runtime resolver/router files under `web/runtime/` and `web/index.html` only where required.
- Test/verify: existing cross-platform and Authority resolver verifiers; add focused resolver verifier if absent.

**Interfaces:**
- Consumes: Current Active Registry from Task 1.
- Produces: deterministic `Project + Platform + Page + Role -> exact Authority record` resolution and page-mount proof for Android/Windows/Web.

- [ ] **Step 1: Write failing resolver/mount tests**

Assertions:
- AIG-II resolves all 10 formal pages by exact record;
- AIG resolves exactly 7 formal pages;
- AIG `4AX/5AX/6AX` navigation/mount requests are rejected or unavailable by product contract;
- wrong SHA/role/page cannot fall through to a similar asset.

- [ ] **Step 2: Verify RED**

Run the narrow resolver tests/verifiers and confirm they fail for missing exact resolver behavior.

- [ ] **Step 3: Implement the minimal exact resolver/mount changes**

Use Registry identity, never file discovery or visual similarity.

- [ ] **Step 4: Verify GREEN across Android/Windows/Web contracts**

Run: existing resolver/product/cross-platform verification commands plus required Gradle compile tasks.

- [ ] **Step 5: Commit checkpoint**

---

### Task 3: Page/Subpage/Button/Command Real Wiring Closure

**Files:**
- Modify: `core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt`
- Modify: `core/src/main/kotlin/com/aigstudio/core/AigProductUiContract.kt`
- Modify page-specific Runtime/UI adapters only where a real callback/state/result link is missing.
- Test: existing button-manifest, Runtime control, cross-platform semantic consistency verifiers/tests.

**Interfaces:**
- Consumes: mounted formal pages from Task 2.
- Produces: stable `Page ID -> Subpage ID -> Button ID -> Command ID -> callback -> Shared State -> Runtime Result/Message` chains.

- [ ] **Step 1: Generate/verify manifests and write RED tests for every missing link**

Require every formal control to have stable semantic identity and a real callback/state path. Dynamic messages must be Runtime-driven.

- [ ] **Step 2: Verify RED only on actual missing links**

- [ ] **Step 3: Implement minimal wiring page-by-page**

Do not refactor already-green core paths.

- [ ] **Step 4: Verify each page independently**

A page cannot depend on another page being connected to pass its own control/core verification.

- [ ] **Step 5: Verify product projection**

AIG remains 7-page; AIG-II remains 10-page.

- [ ] **Step 6: Commit checkpoint**

---

### Task 4: Core Functional Closure

**Files:**
- Modify only the existing CAD/CAM/SIM/axis/NC/AI core files proven by repository inspection to own each behavior.
- Test: existing unit/integration Gate tests; add one RED test per missing behavior before implementation.

**Interfaces:**
- Consumes: real Command IDs/Shared State from Task 3.
- Produces: real functional results for CAD, CAM, SIM, 3AX–6AX, NC, and AI orchestration.

- [ ] **Step 1: Audit core behavior against the spec and stable inventory**

Classify each item as `PASS_EVIDENCED / RED_MISSING / BLOCKED_DEPENDENCY`; do not rewrite existing PASS behavior.

- [ ] **Step 2: CAD RED→GREEN**

Verify real drawing/editing, multi-select, Undo/Redo, layers/SNAP/dimensions, Trim/Extend/Offset/Array, and save/recovery contracts required by the existing product.

- [ ] **Step 3: CAM RED→GREEN**

Verify MANUAL-first real node/path generation, G0/G1, Safe-Z, entry/exit, inside/outside, direction, G41/G42, and A/B/C retention where applicable.

- [ ] **Step 4: SIM RED→GREEN**

Require true material-removal numeric evidence and synchronized tool/toolpath/workpiece state.

- [ ] **Step 5: 3AX–6AX RED→GREEN**

Preserve large machining viewport and true axis/renderer/model persistence. A/B/C exposure follows page/product capability.

- [ ] **Step 6: NC RED→GREEN**

Verify Fanuc parser, required G/M codes, drilling cycles, subprograms, custom M-code, Single Block/Dry Run/Block Skip, NC-first, and safety gates.

- [ ] **Step 7: AI RED→GREEN**

Verify local CAD/CAM/NC context and Working Copy / Verified Main / Immutable Vault semantics. AI orchestration consumes independently valid page outputs.

- [ ] **Step 8: Precision/coordinate consistency GREEN**

Verify 0.001 mm and required master/absolute-coordinate contracts.

- [ ] **Step 9: Commit checkpoint**

---

### Task 5: Formal Runtime Visual Acceptance and No-Fake Gate

**Files:**
- Modify: Runtime visual binding/CSS/layout files only where evidence shows a mismatch.
- Verify: Web, Android, Windows screenshot/runtime evidence tooling already present in the repo.

**Interfaces:**
- Consumes: Registry, page mounts, real controls, real core results.
- Produces: formal RGB Runtime acceptance evidence for both products/platforms.

- [ ] **Step 1: Write/enable RED visual acceptance checks for wrong shell/wrong Authority/wrong page**

- [ ] **Step 2: Verify Runtime opens formal RGB UI, not Engineering shell**

- [ ] **Step 3: Verify approved Authority visual identity and live Runtime overlays coexist correctly**

No baked dynamic values may be treated as Runtime truth.

- [ ] **Step 4: Capture page evidence**

AIG-II: 10 pages. AIG: 7 pages. Capture exact build/commit identity with evidence.

- [ ] **Step 5: Commit checkpoint**

---

### Task 6: Android / Windows / Web Product Builds

**Files:**
- Modify build/package configuration only when a build test proves a real defect.
- Verify existing Android/Windows/Web build workflows and artifact manifests.

**Interfaces:**
- Consumes: product-ready Runtime/core from Tasks 1–5.
- Produces: launchable Android APK, Windows EXE/installer as applicable, Web Runtime evidence, artifact SHA records.

- [ ] **Step 1: Run Android build/verify for both product scopes**

Expected: build succeeds; launch enters formal RGB Runtime; artifact SHA recorded.

- [ ] **Step 2: Run Windows build/verify for both product scopes**

Expected: EXE/installer validation succeeds; launch enters formal RGB Runtime; artifact SHA recorded.

- [ ] **Step 3: Run Web build/runtime verification for both product scopes**

Expected: formal Runtime starts and page navigation/product scope matches Registry/contracts.

- [ ] **Step 4: Classify any failure before fixing**

Allowed classes: `PRODUCT / IMAGE / DATA / CODE / BUILD / CI / TOOL / SERVER / NETWORK / PERMISSION`.

- [ ] **Step 5: Commit/package checkpoint**

---

### Task 7: Dual-Project Single-Gate

**Files:**
- Create or modify: `ci/verify_dual_project_single_gate.py`
- Create or modify: final joint GitHub Actions Gate workflow under `.github/workflows/`.
- Create: final Gate evidence manifest under the repository's established evidence location.

**Interfaces:**
- Consumes: all task outputs, commit SHAs, Authority identities, Runtime evidence, artifact SHAs.
- Produces: one joint PASS/BLOCK result with project-specific page scope.

- [ ] **Step 1: Write RED Single-Gate test/validator**

The Gate must fail if any required Authority, Runtime, core, product scope, no-fake, build, artifact, evidence, precision, or SHA-link requirement is absent or failed.

- [ ] **Step 2: Verify RED against incomplete evidence**

- [ ] **Step 3: Feed exact outputs from Tasks 1–6 into the Gate manifest**

- [ ] **Step 4: Run complete Single-Gate**

Expected only when truly complete:
`DUAL_PROJECT_SINGLE_GATE_PRODUCT_PASS`

- [ ] **Step 5: Upload/finalize build artifacts and evidence**

Record exact AIG-II SHA, AIG SHA, APK/EXE artifact identities, Authority Registry version, and Runtime evidence.

- [ ] **Step 6: Commit final checkpoint**

---

### Task 8: Final Verification and Handoff

**Files:**
- Create/update final handoff/checkpoint document in the repository's established handoff location.

**Interfaces:**
- Consumes: Single-Gate PASS from Task 7.
- Produces: durable disconnect-safe continuation/handoff record.

- [ ] **Step 1: Run full verification suite again from clean checkout/build context where supported**

- [ ] **Step 2: Confirm artifacts and evidence correspond to the same verified commits**

- [ ] **Step 3: Confirm no required Gate is skipped, neutralized, or converted from FAIL to warning**

- [ ] **Step 4: Write final handoff**

Include:
- project/version/commit SHAs
- Registry/Authority version and exact identities
- Android artifacts + SHA
- Windows artifacts + SHA
- Web Runtime evidence
- Gate results
- known non-blocking issues only
- next trusted checkpoint

- [ ] **Step 5: Final completion claim**

Only after every requirement above is evidenced may the result be called:
`Dual-Project Single-Gate Product PASS`.

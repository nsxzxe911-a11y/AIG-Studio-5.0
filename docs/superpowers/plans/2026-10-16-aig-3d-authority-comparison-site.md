# AIG 3D Authority Comparison Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one fixed web comparison site that keeps AIG/AIG II Authority identity, generated GLB model evidence, and Android/Windows Runtime evidence visible together so 3AX–6AX model work can be compared without relying on chat history or local folders.

**Architecture:** `AIG-II` is the canonical website source because it must represent the full 3AX–6AX capability set; the site itself contains both product views, with AIG limited to 3AX and AIG II exposing 3AX/4AX/5AX/6AX. `AIG-Studio-5.0` stores an exact source-pointer manifest and a capability/parity verifier instead of a second copy of the site. The site is static, data-driven, append-only for model/runtime evidence, and can publish before any GLB exists by displaying `MODEL_PENDING`/`RUNTIME_PENDING` without fake PASS.

**Tech Stack:** Static HTML/CSS/JavaScript, JSON evidence manifests, `@google/model-viewer` 4.4.0 pinned for GLB preview, Python 3 standard-library CI verifiers, GitHub Pages Actions (`actions/checkout@v6`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`).

**Spec:** `docs/superpowers/specs/2026-10-16-aig-3d-authority-comparison-site-design.md`

## Global Constraints

- AIG product capability is exactly `3AX`; it must not expose 4AX/5AX/6AX as supported product pages.
- AIG II product capability is exactly `3AX, 4AX, 5AX, 6AX`.
- Canonical Authority SHA-256 values are immutable:
  - 3AX `4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28`
  - 4AX `a46c11e6f08b28dde24df066ac697c4b965079de1cb4df5091e58c7ab60d4a26`
  - 5AX `e8d8b0304873cd6768d93d20a495fa8969c9ec72adb09ba9810da5b3b25ec5b3`
  - 6AX `73f34e958bb22925ceed32b986443240b9322a77bf0cadbc1b81f62501683be6`
- Re-encoded/cropped/resized Library copies are labeled `REFERENCE_DERIVATIVE`; they never become `AUTHORITY_ORIGINAL`.
- Final PASS requires Runtime evidence; `MODEL_VISUAL_PASS` is not product PASS.
- Build success alone is not product PASS.
- Missing model/package/runtime evidence must remain visible as a pending/fail/block state; never hide it and never synthesize PASS.
- Camera state is never counted as A/B/C kinematic motion.
- The comparison site is evidence/UI only; it must not become another CAD/CAM/SIM/NC core.
- Model/runtime history is append-only; newer candidate evidence does not overwrite prior versions.
- Deployment workflow is manual/callable only in the first implementation; do not add push/schedule triggers that bypass the existing release discipline.

## Review Focus

- AIG route requested with `4AX/5AX/6AX`: site must reject/fall back to 3AX and show capability mismatch rather than render an unsupported page.
- Authority preview bytes differ from canonical SHA because they are derived: site must label them `REFERENCE_DERIVATIVE` while still displaying canonical Authority SHA separately.
- GLB missing or model-viewer CDN unavailable: metadata/status/evidence columns must remain usable and show `MODEL_PENDING` or viewer unavailable, not a blank PASS panel.
- Runtime record says `RUNTIME_PASS` but screenshot/package SHA/evidence is incomplete: verifier must fail the build/publish gate.
- Model loads, then page/product/axis changes: stale model/runtime state must not leak into the newly selected axis page.

---

### Task 1: Canonical evidence schema and seeded Authority data

**Files:**
- Create: `web/authority-compare/data/site.json`
- Create: `web/authority-compare/data/authority.json`
- Create: `web/authority-compare/data/models.json`
- Create: `web/authority-compare/data/runtime.json`
- Create: `ci/verify_3d_authority_site_contract.py`

**Interfaces:**
- Consumes: immutable product capability and Authority SHA values from the approved spec.
- Produces: JSON records consumed by all later site tasks; verifier entry point `python ci/verify_3d_authority_site_contract.py`.

- [ ] **Step 1: Write the failing contract verifier**
  - Assert `AIG.supportedAxes == ["3AX"]`.
  - Assert `AIG_II.supportedAxes == ["3AX","4AX","5AX","6AX"]`.
  - Assert the four Authority SHA values exactly match Global Constraints.
  - Assert seed model states are `MODEL_PENDING` and seed runtime states are `RUNTIME_PENDING`.
  - Assert no seed record is `RUNTIME_PASS`.

- [ ] **Step 2: Run verifier and confirm RED**
  - Run: `python ci/verify_3d_authority_site_contract.py`
  - Expected: FAIL because evidence JSON files do not exist.

- [ ] **Step 3: Add minimal JSON evidence manifests**
  - `site.json`: schema version, product IDs, capability matrix, default product/axis.
  - `authority.json`: axis, canonical SHA, visual description, preview asset status/path.
  - `models.json`: empty candidate history per axis with `MODEL_PENDING` current status.
  - `runtime.json`: empty Android/Windows evidence history per axis with `RUNTIME_PENDING` current status.

- [ ] **Step 4: Run verifier and confirm GREEN**
  - Expected: `AIG_3D_AUTHORITY_SITE_CONTRACT_PASS`.

- [ ] **Step 5: Commit**
  - Commit message: `feat(site): seed 3d authority evidence contract`.

### Task 2: Static shell, product capability routing, and three-column comparison layout

**Files:**
- Create: `web/authority-compare/index.html`
- Create: `web/authority-compare/app.css`
- Create: `web/authority-compare/app.js`
- Modify: `ci/verify_3d_authority_site_contract.py`

**Interfaces:**
- Consumes: `site.json`, `authority.json`, `models.json`, `runtime.json`.
- Produces: hash-routed product/axis view and stable Authority / Model / Runtime columns.

- [ ] **Step 1: Extend failing tests for routing and static structure**
  - Verify required DOM anchors exist: `product-selector`, `axis-nav`, `authority-panel`, `model-panel`, `runtime-panel`, `status-strip`.
  - Verify unsupported AIG axes are not emitted from capability data.
  - Verify default route resolves to AIG 3AX.

- [ ] **Step 2: Run verifier and confirm RED**
  - Expected: missing site shell/anchors.

- [ ] **Step 3: Implement the static shell**
  - Product selector values: `AIG`, `AIG_II`.
  - Axis nav derives only from selected product capability data.
  - Hash state format: `#product=AIG&axis=3AX` or `#product=AIG_II&axis=6AX`.
  - Invalid product/axis combinations resolve to the selected product's first supported axis and display a capability warning.
  - Three columns remain distinct at all times; no column substitutes another.

- [ ] **Step 4: Run verifier and confirm GREEN**
  - Expected: site structure and capability routing checks pass.

- [ ] **Step 5: Commit**
  - Commit message: `feat(site): add authority model runtime comparison shell`.

### Task 3: Authority/reference presentation and status semantics

**Files:**
- Create: `web/authority-compare/assets/reference/README.md`
- Modify: `web/authority-compare/app.js`
- Modify: `web/authority-compare/app.css`
- Modify: `ci/verify_3d_authority_site_contract.py`

**Interfaces:**
- Consumes: Authority metadata plus optional reference-derivative image paths.
- Produces: visible canonical SHA, preview classification, visual description, and explicit pending/fail/pass badges.

- [ ] **Step 1: Add failing tests for Authority classification**
  - A preview whose bytes are not the canonical original must display `REFERENCE_DERIVATIVE`.
  - Canonical SHA text must remain the immutable original SHA even when preview is derivative.
  - No derivative asset can set `AUTHORITY_READY` unless its actual SHA equals the canonical SHA.

- [ ] **Step 2: Run verifier and confirm RED**.

- [ ] **Step 3: Implement Authority/reference rendering**
  - Show preview image when available.
  - Show canonical SHA, preview classification, source dimensions when known, and visual description.
  - Show explicit missing-preview state without blocking model/runtime metadata display.

- [ ] **Step 4: Run verifier and confirm GREEN**.

- [ ] **Step 5: Commit**
  - Commit message: `feat(site): distinguish authority originals from reference derivatives`.

### Task 4: Interactive GLB model viewer with deterministic fallback

**Files:**
- Create: `web/authority-compare/viewer.js`
- Modify: `web/authority-compare/index.html`
- Modify: `web/authority-compare/app.js`
- Modify: `web/authority-compare/app.css`
- Modify: `ci/verify_3d_authority_site_contract.py`

**Interfaces:**
- Consumes: current candidate record from `models.json` with `modelSha256`, `assetPath`, `parts[]`, `pivots[]`, `supportedAxes[]`, `lodProfile`, `pbrStatus`, `runtimeCompatible`.
- Produces: interactive orbit/zoom GLB preview, model metadata tree, and a non-blank deterministic fallback when no GLB/viewer is available.

- [ ] **Step 1: Add failing viewer tests**
  - Require pinned `@google/model-viewer` version `4.4.0`, not an unversioned/latest URL.
  - Require model panel to retain metadata and GLB download link when viewer fails.
  - Require axis/page change to clear previous model source before binding the new candidate.

- [ ] **Step 2: Run verifier and confirm RED**.

- [ ] **Step 3: Implement viewer adapter**
  - Use pinned model-viewer module for GLB orbit/zoom.
  - `viewer.js` exposes `bindModel(record)` and `clearModel()`.
  - No model asset => `MODEL_PENDING` placeholder, not a fake mesh.
  - Display part tree and pivots next to the viewer; Camera remains a view-only concept.

- [ ] **Step 4: Run verifier and confirm GREEN**.

- [ ] **Step 5: Commit**
  - Commit message: `feat(site): add pinned glb comparison viewer`.

### Task 5: Runtime/release evidence integrity and package-presence gate

**Files:**
- Create: `web/authority-compare/data/releases.json`
- Create: `ci/verify_3d_authority_asset_integrity.py`
- Modify: `web/authority-compare/app.js`
- Modify: `web/authority-compare/app.css`

**Interfaces:**
- Consumes: Runtime screenshot/build/package metadata and repository asset paths.
- Produces: release evidence panel and hard verifier that rejects unsupported PASS claims or missing packaged assets.

- [ ] **Step 1: Write failing integrity tests**
  - `RUNTIME_PASS` requires Runtime screenshot path, exact build identity, axis-state evidence, persistence evidence, and package SHA fields.
  - `MODEL_VISUAL_PASS` may exist without Runtime PASS, but UI must label it non-final.
  - Missing referenced file path => `ASSET_MISSING` and non-zero verifier exit.
  - SHA mismatch => `SHA_MISMATCH` and non-zero verifier exit.

- [ ] **Step 2: Run verifier and confirm RED**.

- [ ] **Step 3: Implement release/runtime evidence rendering and integrity checks**
  - Runtime panel has separate Android/Windows entries.
  - Release chain is displayed as source → runtime asset → package inclusion → unpacked SHA → loader success → visible offline evidence.
  - Seed release state remains pending until real artifacts arrive.

- [ ] **Step 4: Run both verifiers and confirm GREEN**
  - `python ci/verify_3d_authority_site_contract.py`
  - `python ci/verify_3d_authority_asset_integrity.py`

- [ ] **Step 5: Commit**
  - Commit message: `feat(site): gate runtime and packaged asset evidence`.

### Task 6: Cross-project AIG pointer and capability/parity guard

**Files (AIG-II):**
- Create: `web/authority-compare/data/source-identity.json`

**Files (AIG-Studio-5.0):**
- Create: `docs/evidence/aig-3d-authority-site-source.json`
- Create: `ci/verify_aig_3d_authority_site_pointer.py`

**Interfaces:**
- Consumes: AIG-II canonical source repository, branch/commit/site schema identity.
- Produces: one-way pointer from AIG to canonical comparison site plus AIG-specific hard gate forbidding 4AX/5AX/6AX capability exposure.

- [ ] **Step 1: Write failing AIG pointer verifier**
  - Require canonical repo identity `nsxzxe911-a11y/AIG-II`.
  - Require site schema ID to match AIG-II `source-identity.json`.
  - Require local AIG capability to equal exactly `["3AX"]`.
  - Reject local copied site source directories to prevent dual-site drift.

- [ ] **Step 2: Run verifier and confirm RED**.

- [ ] **Step 3: Add canonical source identity and AIG pointer manifest**
  - Pointer carries canonical repository, canonical site path, schema ID, and last verified commit SHA.
  - AIG does not duplicate website implementation files.

- [ ] **Step 4: Run AIG pointer verifier and confirm GREEN**.

- [ ] **Step 5: Commit both repositories**
  - AIG-II: `feat(site): publish canonical source identity`.
  - AIG: `chore(site): bind AIG to canonical 3d comparison source`.

### Task 7: Manual GitHub Pages deployment and live smoke gate

**Files:**
- Create: `.github/workflows/aig-3d-authority-pages.yml`
- Create: `ci/verify_3d_authority_pages_bundle.py`
- Modify: `web/authority-compare/data/releases.json`

**Interfaces:**
- Consumes: verified static site directory and both CI verifiers.
- Produces: manually published GitHub Pages site URL and recorded deployment/build identity.

- [ ] **Step 1: Write failing Pages bundle test**
  - Require publish directory `web/authority-compare` to contain `index.html`, CSS/JS, all JSON manifests, and every referenced local asset.
  - Require no `RUNTIME_PASS` with incomplete evidence before upload.
  - Require workflow to run contract + integrity + bundle verifiers before Pages upload.
  - Require manual/callable triggers only.

- [ ] **Step 2: Run bundle verifier and confirm RED**.

- [ ] **Step 3: Add manual Pages workflow**
  - Actions versions: `actions/checkout@v6`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`.
  - Permissions: `contents: read`, `pages: write`, `id-token: write`.
  - Upload path: `web/authority-compare`.
  - Environment: `github-pages`.
  - Trigger: `workflow_dispatch` and optional `workflow_call`; no push/schedule trigger.

- [ ] **Step 4: Run local/static verifiers and confirm GREEN**
  - `python ci/verify_3d_authority_site_contract.py`
  - `python ci/verify_3d_authority_asset_integrity.py`
  - `python ci/verify_3d_authority_pages_bundle.py`
  - AIG repo: `python ci/verify_aig_3d_authority_site_pointer.py`

- [ ] **Step 5: Trigger the Pages workflow once and smoke-check the live site**
  - Confirm AIG shows only 3AX.
  - Confirm AIG II shows 3AX/4AX/5AX/6AX.
  - Confirm canonical Authority SHA text is visible on every axis page.
  - Confirm missing GLB/runtime evidence shows pending state rather than PASS.
  - Confirm mobile and desktop layouts retain all three evidence columns/sections without hiding status metadata.
  - If Pages is unavailable for the private repository/account, publish the exact verified `web/authority-compare` bundle to an equivalent static host and record that URL plus bundle SHA in `releases.json`; do not fork the source.

- [ ] **Step 6: Commit deployment gate**
  - Commit message: `ci(site): add verified manual pages deployment`.

## Self-Review Result

- Spec coverage: product identity, Authority SHA, derivative classification, three-column evidence, model/pivot metadata, Runtime evidence, package presence, performance/thermal metadata fields, append-only history, explicit statuses, and static hosting are all assigned to tasks.
- Step scan: each task has one RED/GREEN cycle and one independently reviewable deliverable.
- Type consistency: all later tasks consume the four JSON manifests created in Task 1; cross-project identity is introduced only in Task 6.
- Review Focus tests are assigned across Tasks 2–5.
- Proportion: implementation remains a small static evidence site plus CI verifiers; no CAD/CAM/SIM/NC logic is duplicated.

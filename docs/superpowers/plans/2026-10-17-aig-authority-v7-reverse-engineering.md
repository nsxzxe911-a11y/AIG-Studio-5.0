# AIG Authority V7 Reverse Engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest the approved AIG Authority set, enforce the AIG-only 7-page boundary, and wire the reverse-engineered visual/control contracts into the existing Runtime without fake controls or baked Runtime messages.

**Architecture:** Add a canonical Authority catalog and reverse-control manifests under `design/ui/`, validated by focused CI scripts. Keep visuals separate from semantic Button/Command IDs; Web is wired first for executable evidence, while Android/Windows adapters consume the same semantic contract and remain gated until fresh native build/render evidence exists.

**Tech Stack:** JSON contracts, Python CI verifiers, JavaScript Web Runtime, Kotlin shared/Android/Desktop contracts, PNG Authority assets.

**Spec:** `docs/superpowers/specs/2026-10-17-aig-authority-v7-reverse-engineering.md`

## Global Constraints
- AIG production pages are exactly `HOME/CAD/CAM/SIM/3AX/NC/AI`.
- `4AX/5AX/6AX` are excluded from AIG production navigation/contracts.
- Visual ID is not a function primary key.
- Button ID and Command ID are separate stable IDs.
- MESSAGE/VALUE content is Runtime-driven, never baked pixels.
- Source images below 3840x2160 remain `native4K=false`.
- No rollback/downgrade/regression mode.
- Every stage needs evidence before PASS.

## Review Focus
- Cross-project contamination: AIG must not expose 4AX/5AX/6AX.
- Authority drift: file SHA/dimensions must match the catalog.
- Semantic drift: visual/layout updates must not change Button/Command IDs.
- Fake UI: baked text/hot zones must not be accepted as Runtime controls.
- Native evidence: Web PASS must not be misreported as Android/Windows PASS.

---

### Task 1: Canonical AIG Authority catalog
**Files:**
- Create: `design/ui/authority/aig-authority-v7.json`
- Create: `ci/verify_aig_authority_v7.py`
- Add: `design/ui/authority/aig-v7/*.png`

**Interfaces:**
- Consumes: approved image SHA/dimensions from the 2026-10-17 Authority ingestion session.
- Produces: canonical Visual ID -> asset/SHA/page/subpage metadata.

- [ ] Write verifier first; expect missing catalog/assets to fail.
- [ ] Run verifier and observe RED.
- [ ] Add catalog/assets.
- [ ] Run verifier; expect `AIG_AUTHORITY_V7_PASS`.

### Task 2: AIG 7-page product boundary + dual-ID contract
**Files:**
- Create: `design/ui/aig-product-contract-v1.json`
- Create: `ci/verify_aig_product_contract_v1.py`
- Modify: `web/runtime/page-runtime-router.js`
- Modify: `design/ui/button-manifest-v1.json`
- Modify: `core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt`

**Interfaces:**
- Consumes: Task 1 Visual IDs.
- Produces: 7 production Page IDs, stable navigation Button IDs, distinct Command IDs.

- [ ] Write verifier first; current 10-page contract must fail.
- [ ] Run RED and record 4AX/5AX/6AX contamination.
- [ ] Implement the 7-page boundary and dual IDs.
- [ ] Run focused contract verifier and existing button-manifest verifier.

### Task 3: Region + skin manifests
**Files:**
- Create: `design/ui/region-manifest-v1.json`
- Create: `design/ui/skin-manifest-v1.json`
- Create: `ci/verify_ui_region_manifest.py`
- Create: `ci/verify_ui_skin_contract.py`
- Create: `ci/extract_ui_regions.py`
- Create: `ci/build_ui_skins.py`

**Interfaces:**
- Consumes: Authority catalog and product contract.
- Produces: pixel/normalized region contracts and clean skin contracts.

- [ ] Write region/skin RED verifiers.
- [ ] Add initial verified navigation and message-frame regions.
- [ ] Generate crops/clean frames.
- [ ] Run region/skin GREEN gates and save Stage evidence.

### Task 4: Web native controls + Runtime messages
**Files:**
- Modify: `web/index.html`
- Create/modify: focused Web verification scripts as needed.

**Interfaces:**
- Consumes: Button/Command IDs and skins.
- Produces: native `<button>` controls, Runtime-driven message/status content.

- [ ] Add failing Web verifier for native controls/dual IDs/no baked messages.
- [ ] Wire navigation and one representative HOME/AI control path.
- [ ] Run executable Web Runtime and capture Stage screenshots.

### Task 5: Cross-platform adapters and fresh native gate
**Files:**
- Modify/add Android/Desktop semantic adapter files only where needed.
- Create: `ci/verify_reverse_ui_cross_platform_contract.py`

**Interfaces:**
- Consumes: shared semantic contract.
- Produces: Mobile/Desktop/Web semantic consistency with platform-specific visual mappings.

- [ ] Run cross-platform contract RED/GREEN.
- [ ] Build Android/Windows where available.
- [ ] Do not mark native PASS without fresh render evidence.

### Task 6: Final acceptance checkpoint
- [ ] Run all focused verifiers.
- [ ] Run relevant Web build and Android/Desktop compile gates.
- [ ] Record PASS/BLOCKED honestly per platform.
- [ ] Save evidence/checkpoint; do not merge/publish without explicit instruction.

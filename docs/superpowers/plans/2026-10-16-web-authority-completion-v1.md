# Web Authority Completion V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every formal Web Runtime surface stay in AIG BLACK RGB product UI, add the missing AI surface, and hard-fail engineering-asset fallback.

**Architecture:** Extend the existing single-file Web Runtime without replacing its working CAD/CAM/SIM/axis/NC implementations. Treat approved imagery as immutable provenance and use procedural RGB Glass for pages whose approved full-page art is still pending. Add focused static gates before any deeper platform build.

**Tech Stack:** HTML/CSS/JavaScript, Python focused verifiers, existing AIG Studio CI.

**Spec:** `docs/superpowers/specs/2026-10-16-web-authority-completion-v1-design.md`

## Global Constraints
- Base is Builder #588 exact SHA `3bdeed6cb4a504a65b23ba9ad355ba34d2af0e9b`.
- Formal navigation order: HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI.
- Formal Web Runtime must never reference `engineering-assets/`.
- Missing approved art uses procedural BLACK RGB Glass and remains explicitly pending; it is never mislabeled as user-approved.
- HOME remains the default route.
- CNC machine output remains disabled in Web Runtime.

## Review Focus
- A missing full-page image still produces a formal RGB page, never a blank or engineering shell.
- AI page remains formal navigation after reload/hash routing.
- Utility pages stay nested and do not enter the formal ribbon.
- Engineering asset paths are rejected even if visually similar to approved assets.
- Existing CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC routes remain reachable.

---

### Task 1: Strengthen formal Web gates

**Files:**
- Modify: `ci/verify_formal_web_navigation.py`
- Create: `ci/verify_web_authority_isolation.py`

**Interfaces:**
- Consumes: `web/index.html` formal page registry and visual runtime markup.
- Produces: focused pass/fail contracts for AI presence and engineering-asset isolation.

- [ ] **Step 1: Write failing assertions** requiring `AI` in formal navigation and forbidding `engineering-assets/` in Web Runtime.
- [ ] **Step 2: Run focused verifiers and confirm RED** because #588 has no AI formal page.
- [ ] **Step 3: Keep tests minimal**: no production edit in this task.
- [ ] **Step 4: Commit RED gate.**

### Task 2: Add formal AI Runtime page

**Files:**
- Modify: `web/index.html`

**Interfaces:**
- Consumes: existing `pages`, navigation routing, BLACK RGB Glass components.
- Produces: `AI` formal route and `aiPage()` product surface.

- [ ] **Step 1: Add `AI` to formal pages in the fixed order.**
- [ ] **Step 2: Add `aiPage()` using existing product panels/fields; expose Working Copy, Verified Main, Immutable Vault, and CAD/CAM/SIM/NC context indicators.**
- [ ] **Step 3: Keep machine output disabled and do not introduce Engineering/Debug controls.**
- [ ] **Step 4: Run Task 1 verifiers and confirm GREEN.**
- [ ] **Step 5: Commit AI formal surface.**

### Task 3: Encode no-engineering fallback contract

**Files:**
- Create: `design/approved/web-runtime-surface-authority-v1.json`
- Modify: `ci/verify_web_authority_isolation.py`

**Interfaces:**
- Consumes: formal surface list and existing approved/provisional asset policy.
- Produces: explicit per-surface `USER_APPROVED_VISUAL_TARGET` or `APPROVED_ASSET_PENDING_INGEST` status with `PROCEDURAL_RGB_GLASS` fallback.

- [ ] **Step 1: Extend the verifier first to require a manifest entry for every formal surface and reject `ENGINEERING` fallback values.**
- [ ] **Step 2: Run verifier and confirm RED because the manifest does not yet exist.**
- [ ] **Step 3: Create the manifest without falsely upgrading provisional art to approved.**
- [ ] **Step 4: Run focused Web verifiers and confirm GREEN.**
- [ ] **Step 5: Commit authority manifest and gate.**

### Task 4: Focused regression and handoff

**Files:**
- Verify only; no production edit unless a focused regression reveals a defect.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: evidence that formal Web navigation and authority isolation are green before deeper CAD/CAM/SIM/NC completion work.

- [ ] **Step 1: Run `python ci/verify_formal_web_navigation.py`.**
- [ ] **Step 2: Run `python ci/verify_web_authority_isolation.py`.**
- [ ] **Step 3: Run existing Web runtime verifier(s) used by #588.**
- [ ] **Step 4: Record any remaining core-functional gaps separately; do not claim whole-project completion from Web-surface PASS alone.**

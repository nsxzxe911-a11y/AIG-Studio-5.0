# AIG RGB Responsive Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the formal Traditional-Chinese AIG RGB runtime so Mobile, Landscape/Tablet, and Desktop use different optimized layouts while sharing the same page identity, command bindings, safety hierarchy, and RGB product style across every main page, subpage, and nested subpage.

**Architecture:** Use a contract-first page registry and responsive layout engine as the source of truth. Web becomes the fastest formal proof surface (`web/runtime/`), then Android and Windows consume the same page/label/layout contract without replacing their native interaction models. AIG-II and AIG Studio 5.0 share the design/command contract but keep separate product identity and capability manifests.

**Tech Stack:** HTML/CSS/JavaScript formal Web Runtime, Kotlin Android Runtime, Kotlin/JVM Windows Runtime, Python CI gates, existing Shared Command/Core contracts.

**Spec:** `docs/AIG_RGB_FULL_UIUX_EXPANSION_SPEC.md`, `docs/AIG_RGB_ZHTW_AI_LAYOUT_ADDENDUM.md`, `docs/AIG_RGB_RESPONSIVE_DUAL_TEMPLATE_SPEC.md`

## Global Constraints

- User-visible labels default to Traditional Chinese (zh-TW); CNC standard codes such as G/M codes, XYZABC, F/S/T/H remain standard identifiers.
- Formal colors remain background `#020407`, panel `#07111B`, AIG RGB Glass states Normal/Pressed/Selected/Disabled/Alarm.
- Every main/sub/nested page stays inside the formal AIG product shell; engineering/debug/placeholder fallback is forbidden.
- Stable Page-ID / Panel-ID / Button-ID must survive responsive re-layout and device rotation.
- Button-ID -> Shared Command -> Runtime/Core -> Result/Status mapping must not be changed by layout generation.
- Mobile portrait, mobile landscape/tablet, and desktop may differ in layout but not in product identity or functional inventory.
- 3D/SIM/axis/NC viewport remains dominant; mobile landscape target is 65%–75% primary viewport.
- Orientation/layout changes must not reset edits, camera state, axis state, or simulation state.
- No whole-authority-image fake Runtime; approved Authority remains visual/layout reference only.
- Every independently completed task ends in a focused gate and commit before the next task.

## Review Focus

- Device rotation with unsaved edits: state persists and only layout changes.
- Very narrow mobile widths: functions collapse into groups/drawers but remain reachable.
- Nested subpages never lose RGB shell/navigation or enter engineering UI.
- Axis pages in landscape keep the primary viewport dominant.
- AI-reordered buttons keep stable IDs and Shared Command bindings.

---

### Task 1: Shared RGB Page Contract and zh-TW Terminology

**Files:** create `web/runtime/page-contract.js`, `web/runtime/zh-TW.js`, `web/runtime/rgb-tokens.css`, focused CI contract tests.

- [ ] RED-test required main pages, Traditional-Chinese labels, stable IDs, RGB tokens, and forbidden engineering markers.
- [ ] Implement minimal page registry/terminology/tokens without changing callbacks.
- [ ] Require focused gate PASS and commit exact SHA.

### Task 2: Responsive Mobile/Landscape/Desktop Master Engine

**Files:** create `web/runtime/layout-engine.js`, `web/runtime/runtime-state.js`, `web/runtime/index.html`, responsive layout CI tests.

- [ ] RED-test 1440×3088, 1080×2316, 720×1544, phone landscape, and 3840×2160.
- [ ] Preserve runtime state and Button-ID bindings across layout switches.
- [ ] Implement mobile/landscape/desktop master profiles and viewport ratio rules.
- [ ] Commit after focused PASS.

### Task 3: Formal Nested Page Generator

**Files:** create `web/runtime/page-renderer.js`, `web/runtime/subpages.js`, nested-route CI tests.

- [ ] RED-test representative child/grandchild routes.
- [ ] Require formal shell inheritance and forbid engineering/debug/placeholder markers.
- [ ] Implement data-driven nested rendering from parent masters.
- [ ] Commit after PASS.

### Task 4: CAD Multifunction and Extended Product Pages

**Files:** extend `web/runtime/subpages.js`, create `web/runtime/command-dispatch.js`, modify existing native UI adapters only after Web contract passes.

- [ ] Preserve all CAD commands while grouping under `智慧繪圖`, `智慧編輯`, `倒角／圓角`, `陣列`, `尺寸`, `鎖點`, `圖片校正`, `檔案`.
- [ ] Add Tool/Fixture/Machine/Display/Recovery pages and command-search/favorites/recent/workspace shortcuts.
- [ ] Keep full function tree reachable and real callbacks unchanged.
- [ ] Commit after focused gates.

### Task 5: Axis/SIM/NC/AI Responsive Production Surfaces

- [ ] RED-test viewport dominance, axis identity, NC persistence, and no rotation reset.
- [ ] Implement responsive production surfaces and collapse controls before shrinking the main viewport.
- [ ] Keep CNC Safety Gates and fail-closed behavior unchanged.
- [ ] Commit after native/Web gates.

### Task 6: Dual-Project Capability Parity

- [ ] Use the same visual/ID/terminology contract in AIG-II and Studio while preserving separate product capability manifests.
- [ ] Never expose an unsupported product capability as functional.
- [ ] Commit exact pair SHAs only after both focused suites pass.

### Task 7: Formal Web Deployment and Final Gate

- [ ] Pages must deploy the formal `web/runtime/` bundle, never Authority compare/engineering shell as the product homepage.
- [ ] Capture main/child/grandchild plus portrait/landscape/desktop runtime evidence.
- [ ] Run Dual-Project Single-Gate with exact SHAs.
- [ ] Only after fresh GREEN evidence produce the next APK/EXE/Web release checkpoint.

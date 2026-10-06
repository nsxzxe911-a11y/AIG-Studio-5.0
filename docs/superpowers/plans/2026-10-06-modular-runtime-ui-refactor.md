# Modular Runtime UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic Runtime UI composition with small responsive modules while keeping all CAD/CAM/SIM/NC/model behavior real and unchanged.

**Architecture:** Put cross-platform surface IDs, viewport classes and action dispatch in pure Kotlin. Android and Windows implement presentation adapters around the same contract. Each Runtime page owns its layout only; domain services own machining logic, geometry, state and persistence.

**Tech Stack:** Kotlin, Android View, JVM desktop, existing AIG Runtime/core services.

**Spec:** `docs/design/professional-rgb-runtime-372.md`

## Global Constraints
- Forward-only versions; no downgrade.
- Production Runtime only; engineering shell must not become the default surface.
- Morning-approved AIG RGB remains the visual authority.
- HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI are independent modules.
- UI modules may dispatch typed actions but must not duplicate CAD/CAM/SIM/NC algorithms.
- Android/Windows use the same surface and action contract.
- Phone portrait, phone landscape and desktop must be adaptive, not stretched screenshots.

## Review Focus
- Rotation/resizing keeps the active module and state.
- Missing optional artwork falls back to procedural RGB skin without losing callbacks.
- 3AX/4AX/5AX/6AX keep live model state and are never replaced by static images.
- Offline startup reaches production UI without waiting for network.
- NC/CAD/CAM errors remain domain-local and do not crash unrelated modules.

---

### Task 1: Shared UI contract
**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/ui/RuntimeUiContract.kt`
- Test: `ci/verify_modular_runtime_ui.py`

- [ ] Define Runtime surfaces, viewport classes, responsive policy and typed action dispatch.
- [ ] Verify all ten production surfaces are present and engineering-shell tokens are absent.

### Task 2: Presentation registry
**Files:**
- Create Android registry under `app/src/main/java/com/aigstudio/app/ui/`.
- Create desktop registry under `desktop/`.

- [ ] Registry selects modules by surface only.
- [ ] Main host owns navigation; modules do not navigate by directly constructing other pages.

### Task 3: Extract visual primitives
- [ ] Move RGB button, skin, asset and responsive helpers out of `MainActivity.kt` without behavior changes.
- [ ] Keep each primitive focused and reusable by every page.

### Task 4: Split production pages
- [ ] Extract HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI one at a time.
- [ ] Each page keeps real callbacks and real Runtime/model data sources.
- [ ] Commit and verify after every page; do not batch all pages into one giant rewrite.

### Task 5: Thin host
- [ ] Reduce `MainActivity` to lifecycle, module host, navigation and top-level orchestration.
- [ ] Desktop host follows the same contract.

### Task 6: Runtime evidence
- [ ] Build Android APK and Windows EXE.
- [ ] Capture production HOME and every primary page in portrait/landscape/desktop.
- [ ] Reject engineering-shell first surface or static-model substitution.

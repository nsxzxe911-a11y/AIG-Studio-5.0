# Professional RGB Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Studio 372 and AIG-II 429 with Morning-approved professional RGB surfaces layered over the real CNC Runtime, then produce verified downloadable Android APK and Windows EXE artifacts.

**Architecture:** Package the canonical `uiux/assets` library into both platform builds, define one surface-to-visual/model policy, and apply approved visuals as background/chrome layers around existing real CAD/CAM/SIM/NC callbacks and multi-axis renderers. Missing dedicated raster art (notably 6AX) uses procedural RGB Glass while retaining live geometry. AIG-II exact-binds the final Studio SHA.

**Tech Stack:** Kotlin/JVM, Android Views, desktop Kotlin/Swing/AWT, existing CAD/CAM/SIM/NC runtime, Gradle/AGP, GitHub Actions, Python CI verifiers.

**Spec:** `docs/superpowers/specs/2026-10-06-professional-rgb-runtime-design.md`

## Global Constraints
- Studio version floor 372.0.0; AIG-II version floor 429.0.0.
- Version only increases; no rollback/downgrade.
- Morning Approved RGB 2026-10-05 is visual authority.
- `uiux/assets` is the canonical reusable full-page visual library.
- Raster is skin only; live state/callbacks/models remain Runtime-owned.
- 6AX may not be faked with a 5AX raster.
- Android and Windows must both launch through formal startup to formal HOME offline.
- Engineering Shell is never the default product surface.
- Final deliverables are 4 binaries: Studio APK/EXE and AIG-II APK/EXE, each with SHA256 and launch evidence.

## Review Focus
- Asset mapping must never map 6AX to 5AX imagery.
- Applying a page skin must not replace or intercept existing callbacks.
- Portrait artwork must not be stretched into Windows landscape.
- Missing asset must degrade to procedural RGB Glass, not Engineering Shell.
- Build/evidence failure must not be reported as PASS even when compilation succeeds.

---

### Task 1: Professional surface contract and RED gate
**Files:**
- Create: `ci/verify_professional_rgb_runtime.py`
- Create: `uiux/professional-surface-map.json`
- Modify later: `release-version.properties`

**Interfaces:**
- Produces canonical mapping for STARTUP, HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI, LINK.
- Each entry declares `visual`, `model_policy`, `callback_policy`, and platform applicability.

- [ ] Write verifier first requiring target version, canonical asset packaging in Android/Windows, the map file, no 6AX->5AX mapping, Runtime callback policy, and formal startup/HOME markers.
- [ ] Run branch CI and observe expected FAIL before implementation.
- [ ] Add the surface map and version bump only after RED is recorded.
- [ ] Re-run focused verifier until GREEN.

### Task 2: Package canonical visuals on Android and Windows
**Files:**
- Modify: `app/build.gradle.kts`
- Modify: `desktop/build.gradle.kts`
- Modify: core/UI asset contract file for the repo

**Interfaces:**
- Android AssetManager can resolve canonical `startup.png`, `home.png`, `cad.png`, `cam.jpg`, `sim.jpg`, `machine.jpg`, `axis3.jpg`, `axis4.png`, `axis5.jpg`.
- Desktop classpath can resolve the same names from the same source-of-truth directory.

- [ ] Extend RED verifier to require the shared source directory.
- [ ] Package `uiux/assets` without copying binaries into a second source-of-truth tree.
- [ ] Add immutable asset-name constants/registry.
- [ ] Run verifier and compilation.

### Task 3: Android professional skin binding over live Runtime
**Files:**
- Modify/create Android skin installer/registry under the existing app package.
- Modify the current HOME/page selection hook only at the skin boundary.

**Interfaces:**
- `apply(surface, view)` changes background/chrome only.
- CAD/CAM/SIM/NC/axis callbacks continue through the existing listeners/builders.
- 6AX gets procedural cockpit chrome with live model and no 5AX raster.

- [ ] Add failing static assertions proving page mapping and callback-preserving policy.
- [ ] Implement generalized cover/background drawable and page surface registry.
- [ ] Bind HOME/CAD/CAM/SIM/3AX/4AX/5AX/NC to approved visuals where available.
- [ ] Bind 6AX to procedural RGB Glass + live A/B/C renderer.
- [ ] Build APK and capture startup/HOME plus primary-surface screenshots.

### Task 4: Windows professional skin binding over live Runtime
**Files:**
- Modify desktop bootstrap/runtime visual adapter and build script as needed.

**Interfaces:**
- Desktop uses landscape/full-page references without stretching mobile artwork.
- Live Runtime widgets/renderers remain above the skin layer.

- [ ] Add failing verifier checks for desktop canonical asset packaging and Bootstrap entry.
- [ ] Apply professional page backdrop/chrome in the live desktop Runtime.
- [ ] Build PE/MZ EXE, launch it, and capture startup/HOME plus operating-page evidence.

### Task 5: Multi-axis and CNC integrity
**Files:**
- Modify existing axis cockpit skin installer/adapters only where needed.
- Reuse existing CAM/SIM/NC engines and model views.

**Interfaces:**
- 3AX=XYZ; 4AX=XYZ+A; 5AX=XYZ+A/B; 6AX=XYZ+A/B/C.
- SIM evidence remains real material removal.
- NC editor remains editable and inline ALARM remains local to NC.

- [ ] Add assertions for axis controls/model policy and SIM material-removal evidence.
- [ ] Verify 3/4/5/6AX pages open real model views and controls.
- [ ] Verify NC editor/callbacks remain live under the skin.

### Task 6: Dual-project exact binding and final artifacts
**Files:**
- Studio/AIG-II continuity and version evidence files.
- AIG-II integration manifest/exact binding files.
- Branch build workflow(s) only as needed for artifact generation.

**Interfaces:**
- AIG-II binds the exact final Studio 372 SHA.
- Final artifact set contains four downloadable binaries and SHA256 manifests.

- [ ] Finish Studio 372 APK/EXE and record exact verified SHA.
- [ ] Update AIG-II 429 exact binding to that SHA.
- [ ] Build AIG-II 429 APK/EXE.
- [ ] Require Android and Windows launch evidence for both projects.
- [ ] Download artifacts and expose direct user-download files.

## Completion Rule
No source-only PASS. The work is complete only when the four binaries exist, are downloadable, and launch evidence shows formal RGB startup -> formal HOME with working live surfaces.
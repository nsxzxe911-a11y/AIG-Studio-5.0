# Mobile Page Skin Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current narrow/mixed mobile Runtime surfaces with the approved AIG II RGB HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI family, keep one shared top-navigation geometry, remove visible MULTIFUNCTION, and make Nox fill the portrait width without black side bars.

**Architecture:** Keep the existing image-backed Runtime and true CAD/CAM/SIM/axis/NC/AI engines. Add one shared adaptive page transform used by rendering, hit-testing, and dynamic overlays; add one shared ten-button primary navigation contract; register ten reference-only preview skins with exact SHA; legacy MULTIFUNCTION routes redirect to HOME. Existing CAM/SIM truth overlays remain authoritative and are not replaced by static image values.

**Tech Stack:** Kotlin, Android OpenGL ES 3.x renderer, Gradle/JUnit, Nox Android emulator.

**Spec:** `docs/superpowers/specs/2026-10-11-mobile-page-skin-replacement-design.md`

## Global Constraints
- Work in the existing dirty worktrees; do **not** reset, clean, or mass-overwrite unrelated files.
- No push, no workflow trigger, no release APK/EXE packaging during Fast Loop page work.
- Formal mobile master floor remains `1440×3088`; all current `941×1672` / `856×1836` assets stay `REFERENCE_ONLY`.
- Preserve existing CAM image-backed commands and SIM real-material-removal state overlays.
- Preserve One Scene / One Renderer / No Overlay semantics for 3AX–6AX.
- Visible navigation order is exactly `首頁 / CAD / CAM / SIM / 3AX / 4AX / 5AX / 6AX / NC / AI`.
- `MULTIFUNCTION` has no visible page; compatibility routes must land on HOME.

## Review Focus
- Nox `2160×3840` must fill usable width with no left/right black bars while hitboxes remain aligned.
- Different source sizes (`941×1672` HOME/SIM vs `856×1836` other pages) must still share identical screen-space top-nav geometry.
- Static demo numbers must never become Runtime truth; CAM/SIM live state must still cover their dynamic zones.
- Legacy MULTIFUNCTION actions must not create loops or an unavailable page after redirecting to HOME.
- Rapid `HOME→CAD→CAM→SIM→3→4→5→6→NC→AI→HOME` navigation must remain latest-request-wins and not stack scenes.

---

### Task 1: Lock the ten approved preview assets

**Files:**
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/PageSurfaceTexturePlan.kt`
- Assets: `renderer-android/src/main/assets/aig-rgb/page-surfaces/{home,cad,cam,sim,3ax,4ax,5ax,6ax,nc,ai}.png`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/UnifiedSavedSkinRegression.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/PageSurfaceTexturePlanRegression.kt`

**Interfaces:**
- Produces: `PageSurfaceTexturePlan.path(page: PageId): String?` and `imageSize(page: PageId): Pair<Float,Float>?` for exactly ten visible primary pages.

- [ ] Write/adjust RED tests asserting all ten pages are mounted, MULTIFUNCTION is not mounted, exact source sizes are preserved, and each copied file SHA equals the spec.
- [ ] Run focused tests and confirm failure against the current incomplete/mixed map.
- [ ] Copy the approved `E:\AIG-10` files into the page-surfaces asset names above; do not resample them.
- [ ] Update `PageSurfaceTexturePlan` to register the ten assets only; leave quality classification as REFERENCE_ONLY.
- [ ] Run focused tests to GREEN in AIG CNC, mirror asset bytes and tests to AIG-II, then run the AIG-II twin tests.

### Task 2: Add one adaptive full-width transform

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/AdaptivePageTransform.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/ImageBackedPageContract.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/AdaptivePageTransformRegression.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/ImageBackedPageContractRegression.kt`

**Interfaces:**
- Produces: `AdaptivePageTransform.forViewport(referenceWidth: Float, referenceHeight: Float, screenWidth: Float, screenHeight: Float): AdaptivePageTransform`
- Produces mapping methods for source point/rect → screen and screen point → source using the same `scaleX/scaleY`.

- [ ] Write RED tests for `1440×3088`, `1080×2316`, `720×1544`, and Nox `2160×3840`; Nox bounds must be full screen width with no horizontal letterbox.
- [ ] Verify RED against current contain-fit mapper.
- [ ] Implement the transform and route image bounds, pixel hit-testing, and dynamic-slot mapping through it.
- [ ] Keep the old contain-fit helper only where non-primary artwork still requires it; primary page skins must use the adaptive transform.
- [ ] Run mapper, CAD swipe, CAM image, and SIM image focused regressions to GREEN in both projects.

### Task 3: Replace per-page navigation with one primary navigation contract

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/PrimaryPageNavigationLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/HomeImageNavigationLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/UnifiedPrimaryPageSkinRegression.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/UnifiedPrimaryPageRuntimeWiringRegression.kt`

**Interfaces:**
- Produces: `PrimaryPageNavigationLayout.nodes(screenWidth: Float, screenHeight: Float, activePage: PageId): List<RgbGlassButtonNode>`.

- [ ] Write RED tests asserting ten identical screen-space button rectangles on every primary page and only the active-page visual state differs.
- [ ] Implement one normalized navigation geometry based on the approved HOME row and adaptive transform.
- [ ] Make HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI image-backed pages use this contract for hit-testing and press feedback.
- [ ] Remove any second global ribbon when a primary image skin is active.
- [ ] Run navigation and press-feedback regressions to GREEN in both projects.

### Task 4: Remove visible MULTIFUNCTION while keeping compatibility

**Files:**
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/professional/HomeProfessionalDescriptor.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/professional/ProfessionalNavigation.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/skin/SharedVisualPolicy.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AxisRendererStateSource.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt`
- Test: replace stale expectations in `HomeImageNavigationRegression.kt`, `MultifunctionImageInteractionRegression.kt`, and `UnifiedMobileControlShellRegression.kt`.

**Interfaces:**
- Produces: legacy `PageId.MULTIFUNCTION` / `SceneId.MULTIFUNCTION` navigation resolving to HOME without a visible surface.

- [ ] Write RED tests asserting no visible MULTIFUNCTION top-nav/button/page-surface entry exists and legacy navigation lands on HOME.
- [ ] Remove the visible multifunction descriptor/card and page-surface registration; keep enum compatibility.
- [ ] Redirect legacy route resolution to HOME and prevent renderer/tool-shell from drawing a multifunction screen.
- [ ] Run route/navigation regressions to GREEN in both projects.

### Task 5: Wire all ten page surfaces without breaking true Runtime content

**Files:**
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt`
- Modify existing page manifests/layouts for CAD/CAM/SIM as required by the new asset SHA/size.
- Add page-specific image interaction/dynamic-slot plans for 3AX/4AX/5AX/6AX/NC/AI only where real Runtime actions/state already exist.
- Tests: existing CAM/SIM wiring regressions plus axis/NC/AI focused routing tests.

**Interfaces:**
- Consumes: `AdaptivePageTransform` and `PrimaryPageNavigationLayout`.
- Produces: `Skin → whitelisted live Runtime zone → pressed/alarm feedback` composition for each visible page.

- [ ] Start with current focused test baseline and record any pre-existing failures separately.
- [ ] Update HOME and CAD assets/hitboxes, run focused tests GREEN.
- [ ] Update CAM without changing accepted real `CamCommand` bindings; run CAM focused tests GREEN.
- [ ] Update SIM to the approved wide-navigation SIM artwork; preserve live material-removal overlay; run SIM focused tests GREEN.
- [ ] Register 3AX–6AX skins while keeping one active scene and true axis renderer lifecycle; no second scene mount.
- [ ] Register NC/AI skins; only expose image buttons that map to existing real actions.
- [ ] Any baked demo-value region that conflicts with an existing live-state region must be covered before real state is drawn; do not invent values for regions without Runtime state.
- [ ] Run the renderer focused suite in both projects and confirm no new failures beyond the known baseline.

### Task 6: Nox ten-page Fast Loop visual audit

**Files:**
- Evidence output: `E:\AIG_WORK\fast-loop\evidence\20261011-unified-pages\`
- Log output: `E:\AIG_WORK\fast-loop\logs\`

**Interfaces:**
- Produces: one screenshot per page and one navigation log proving the page order.

- [ ] Build/install Android debug once after focused GREEN; do not release-package.
- [ ] Launch HOME and verify full-width display with no old narrow centered strip.
- [ ] Navigate exactly `HOME→CAD→CAM→SIM→3AX→4AX→5AX→6AX→NC→AI→HOME`, capturing every page.
- [ ] Verify top navigation remains at the same screen coordinates on all screenshots and selected highlight follows the page.
- [ ] Verify MULTIFUNCTION never appears and no tap causes multi-page event penetration.
- [ ] Produce a concise audit table: `PASS / visually wrong / missing real wiring / needs new art` for all ten pages; this table drives the next image-generation round.

### Task 7: Dual-project parity and checkpoint

**Files:**
- Mirror all accepted renderer/assets/tests to the AIG-II package paths.
- Update no release version/package yet unless explicitly requested after visual acceptance.

- [ ] Compare the ten asset SHA values across AIG CNC and AIG-II; require exact equality.
- [ ] Run the same focused tests on both worktrees.
- [ ] Run a fresh debug compile for both Android hosts.
- [ ] Record local checkpoint commits only after both projects pass; do not push.

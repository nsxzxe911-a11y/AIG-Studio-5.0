# Professional AIG RGB Runtime UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary screenshot/overlay presentation with a real component-based AIG RGB Runtime UI across Android and Windows while preserving the verified CAD/CAM/SIM/NC/MotionProgram/Axis domain behavior.

**Architecture:** Shared semantic UI descriptors and action bindings live in `runtime-contract`; Android and Windows map the same stable `controlId`/action contracts into platform-specific layouts and renderers. The 2026-10-05 morning artwork remains reference-only. Existing runtime adapters, SceneRouter, 3D scene graph, ProductControlDeck semantics, offline/recovery, and authoritative domain state remain unchanged.

**Tech Stack:** Kotlin, Android GLES3 renderer, existing desktop Kotlin renderer/surface, Gradle 9.7, JUnit, Nox Android emulator, existing Windows Runtime host.

**Spec:** `docs/superpowers/specs/2026-10-10-professional-aig-rgb-runtime-ui-design.md`

**Path mapping used below:** <pkg> means com/aigstudio in AIG CNC and com/aigii in AIG-II. This is a fixed dual-project mapping, not an unresolved placeholder.

## Global Constraints

- Freeze Android 409/488 as historical checkpoints; all evidence versions only increase.
- No Engineering Shell as initial or primary UI.
- No full-page screenshot used as the interactive page.
- No transparent hitbox over a pictured button.
- No black text-cover rectangle/overlay replacement strategy.
- Traditional Chinese is default; English remains available through shared localization.
- Every page remains launchable and locally usable with all CONNECT links OFF.
- Minimum touch target is 48dp.
- 3D pages preserve One Scene / One Renderer / No Overlay.
- UI never creates a second CAD/CAM/SIM/NC/MotionProgram/Axis truth.
- Android and Windows share semantic component IDs/actions/tokens; bounds/rendering may differ by platform.
- Visual-only changes use focused UI/adaptive/launch regression; domain regressions rerun only when domain paths change.

## Review Focus

- Missing icon/decor asset: component must render valid fallback and remain clickable; no HOME/Engineering Shell fallback.
- Portrait/landscape or 1080p/2K/3K/4K pressure: viewport remains first priority and controls never overlap below 48dp.
- Locale switch zh-TW/en-US: labels change without changing control IDs, bindings, route state, or layout ownership.
- CONNECT all OFF / airplane mode: every workstation still opens and local commands still work.
- Rotation/recreation on 3D pages: scene/MotionProgram/camera/revision state persists and no second renderer/overlay appears.

---

### Task 1: Shared Professional UI Contract

**Files:**
- Create CNC: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/ui/AigUiComponent.kt`
- Create CNC: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/ui/AigUiAction.kt`
- Create CNC: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/ui/AigUiPage.kt`
- Create CNC test: `runtime-contract/src/test/kotlin/com/aigstudio/runtime4/contract/ProfessionalUiContractRegression.kt`
- Mirror AIG-II under `com/aigii/runtime4/contract/ui/` and `com/aigii/runtime4/contract/`.

**Interfaces:**
- Produces `AigUiComponent(controlId:String, kind:AigUiKind, labelKey:String?, iconAsset:String?, state:AigUiState, enabled:Boolean, visible:Boolean, action:AigUiAction?)`.
- Produces `AigUiAction` variants for navigation, existing CAD/CAM/NC commands, SIM/AI page commands, Product link commands, and local page actions.
- Produces `AigUiPageDescriptor(page:PageId, components:List<AigUiComponent>)`.

- [ ] Write `ProfessionalUiContractRegression` asserting stable unique IDs, nonblank localization keys for visible labels, no actionless visible `BUTTON/NAV/CARD`, and route bindings for HOME/CAD/CAM/SIM/MULTIFUNCTION/AXIS3/AXIS4/AXIS5/AXIS6/NC/AI.
- [ ] Run `gradle --no-daemon :runtime-contract:test --tests '*ProfessionalUiContractRegression*'` in both projects; expect RED for missing contract types.
- [ ] Implement the minimal immutable contracts above; reuse existing domain command enums rather than inventing duplicate command strings.
- [ ] Add review-focus test: zh-TW/en-US presentation changes labels only, never `controlId` or `action`.
- [ ] Rerun focused contract tests; expect GREEN.
- [ ] Commit both projects: `feat(ui): add professional AIG UI contracts`.

### Task 2: Retire Screenshot/Overlay UI and Build Android Component Adapter

**Files:**
- Remove active production use: `renderer-android/src/main/java/<pkg>/runtime4/renderer/scene/FullSurfaceSkinPlan.kt`
- Remove active production use: `renderer-android/src/main/java/<pkg>/runtime4/renderer/scene/MorningHomeTraditionalChinesePlan.kt`
- Modify: `renderer-android/src/main/java/<pkg>/runtime4/renderer/gpu/AigGlesRenderer.kt`
- Create: `renderer-android/src/main/java/<pkg>/runtime4/renderer/professional/AigComponentNodeAdapter.kt`
- Create: `renderer-android/src/main/java/<pkg>/runtime4/renderer/professional/AigProfessionalTokens.kt`
- Create test: `renderer-android/src/test/java/<pkg>/runtime4/renderer/NoFakeProfessionalUiRegression.kt`
- Move approved reference artwork out of interactive assets to `docs/assets/reference/2026-10-05-morning/`.

**Interfaces:**
- Consumes `AigUiComponent` and maps it to existing `SceneNode/RgbGlassButtonNode/RgbGlassPanelNode` without changing the action.
- Produces `AigComponentNodeAdapter.nodes(descriptor:AigUiPageDescriptor, layout:AigPageLayout):List<SceneNode>`.

- [ ] Write RED source/runtime regression proving renderer has no `FullSurfaceSkinPlan`, no `MorningHomeTraditionalChinesePlan`, no page-sized morning asset draw, and every visible action node comes from a descriptor.
- [ ] Run focused renderer test; expect RED on current screenshot path.
- [ ] Move reference PNGs to reference-only location and remove their runtime draw references.
- [ ] Implement semantic-state mapping Normal/Pressed/Selected/Disabled/Alarm using `AigProfessionalTokens` and existing RGB GPU primitives.
- [ ] Add missing-asset fallback test: absent icon still renders localized label/valid button and preserves callback.
- [ ] Rerun renderer + product-host compile; expect GREEN.
- [ ] Commit: `refactor(ui): retire fake full-page skin path`.

### Task 3: Rebuild HOME as Real Professional Components

**Files:**
- Replace: `renderer-android/src/main/java/<pkg>/runtime4/renderer/scene/HomeSceneLayout.kt`
- Create: `renderer-android/src/main/java/<pkg>/runtime4/renderer/professional/HomeProfessionalDescriptor.kt`
- Modify: `renderer-android/src/main/java/<pkg>/runtime4/renderer/gpu/AigGlesRenderer.kt`
- Test: `renderer-android/src/test/java/<pkg>/runtime4/renderer/ProfessionalHomeRegression.kt`

**Interfaces:**
- Produces HOME descriptor regions: header/status, top nav, machine status, current project, hero/preview, AI status, quick operations, multifunction entries.
- Top nav IDs/actions: `NAV.HOME`, `NAV.CAD`, `NAV.CAM`, `NAV.SIM`, `NAV.MULTIFUNCTION`, `NAV.NC`, `NAV.AI`.

- [ ] Write RED tests asserting all visible HOME controls are real components, top nav labels are `首頁/CAD製圖/CAM加工/3D走刀/多功能/NC程式/AI智慧`, and no fictional telemetry is rendered when runtime data is missing.
- [ ] Add adaptive tests for 1080x1920 portrait and 1920x1080 landscape: >=48dp controls, no overlap, hero/status regions preserve viewport priority.
- [ ] Implement `HomeProfessionalDescriptor` using real localized labels/icons/decor and live runtime status or page-local INFO placeholders.
- [ ] Bind visible HOME controls through existing SceneRouter/controllers; no invisible targets.
- [ ] Run focused renderer/product-host tests; expect GREEN.
- [ ] Bump versions above 409/488, build APKs, capture Nox portrait/landscape HOME screenshots and callback route markers.
- [ ] Commit: `feat(ui): rebuild professional AIG RGB home`.

### Task 4: Add Dedicated Multifunction Page with Real Cards

**Files:**
- Modify: `runtime-contract/src/main/kotlin/<pkg>/runtime4/contract/SceneId.kt` (or current SceneId owner) to add `MULTIFUNCTION`.
- Modify: current `RenderRoutePolicy` and `SceneRouter` mapping files.
- Create: `renderer-android/src/main/java/<pkg>/runtime4/renderer/professional/MultifunctionDescriptor.kt`
- Create: `renderer-android/src/main/java/<pkg>/runtime4/renderer/scene/MultifunctionSceneLayout.kt`
- Test: `renderer-android/src/test/java/<pkg>/runtime4/renderer/MultifunctionPageRegression.kt`

**Interfaces:**
- Produces seven initial real cards: `MULTI.SIM`, `MULTI.3AX`, `MULTI.4AX`, `MULTI.5AX`, `MULTI.6AX`, `MULTI.NC`, `MULTI.AI`.
- Each card owns an icon/thumbnail + localized label + explicit navigate action.

- [ ] Write RED tests for dedicated route, seven unique cards, real actions, and no decorative-only card.
- [ ] Implement `SceneId.MULTIFUNCTION`, dedicated route/layout/descriptor and HOME `多功能` navigation.
- [ ] Add future-card safety test: missing/deferred approved modules are absent or disabled explicitly, never fake clickable images.
- [ ] Run focused route/layout tests and product-host compile; expect GREEN.
- [ ] Capture Nox Multifunction screenshot and click every card to verify destination markers.
- [ ] Commit: `feat(ui): add real multifunction workstation`.

### Task 5: Professional Chrome for CAD, CAM and 3D走刀/SIM

**Files:**
- Modify existing `CadSceneLayout.kt`, `CamSceneLayout.kt`, `SimSceneLayout.kt`.
- Create `professional/CadProfessionalDescriptor.kt`, `CamProfessionalDescriptor.kt`, `SimProfessionalDescriptor.kt`.
- Modify controllers only where descriptor/action adaptation is required; do not alter domain adapters.
- Tests: `ProfessionalCadRegression.kt`, `ProfessionalCamRegression.kt`, `ProfessionalSimRegression.kt`.

**Interfaces:**
- CAD keeps existing CAD commands/snap/edit/file callbacks.
- CAM keeps AUTO/MANUAL, XYZABC/manual edit/avoidance/cutter-compensation callbacks.
- SIM keeps PLAY/STEP/RESET/DISPLAY and true material-removal numeric evidence.

- [ ] Write RED visual/action tests proving each page has its own viewport frame, tool/control deck and complete real callback chain.
- [ ] Add all-links-OFF tests proving CAD drawing, CAM MANUAL edit, and SIM PLAY remain enabled.
- [ ] Implement shared professional chrome around the existing viewports/controllers without touching geometry/toolpath/material math.
- [ ] Add portrait/landscape overlap + >=48dp tests and missing-asset fallback.
- [ ] Run focused UI tests plus existing CAD/CAM/SIM regressions only because their UI controller paths are touched.
- [ ] Capture Nox page screenshots and one real callback/state marker per page.
- [ ] Commit: `feat(ui): professionalize cad cam sim workstations`.

### Task 6: Professional Chrome for 3AX / 4AX / 5AX / 6AX

**Files:**
- Modify `Axis3SceneLayout.kt`, `Axis4SceneLayout.kt`, `Axis5SceneLayout.kt`, `Axis6SceneLayout.kt`, `AxisControlDeck.kt`, `AxisNavigationLayout.kt`.
- Create `professional/AxisProfessionalDescriptor.kt`.
- Modify `gpu/AxisGlesSceneRenderer.kt` only for chrome/HUD adapter calls; do not change machine mesh/kinematics.
- Test: `ProfessionalAxisPagesRegression.kt`.

**Interfaces:**
- Consumes existing `FourthAxisRuntimeAdapter`/MotionProgram snapshots.
- Produces shared axis chrome with page-specific axis labels: 3AX XYZ, 4AX XYZ+A, 5AX XYZ+A/B, 6AX XYZ+A/B/C.

- [ ] Write RED tests proving every axis page uses the same professional semantic chrome but a distinct machine profile and correct HUD axes.
- [ ] Add 3D review-focus tests: no overlay renderer; rotation preserves scene/MotionProgram/camera; CONNECT OFF does not block page.
- [ ] Implement descriptor/layout mapping without touching verified meshes, pivots, interpolation or authoritative values.
- [ ] Run focused renderer tests plus existing axis physical-profile/lifecycle regressions.
- [ ] Nox: portrait/landscape screenshots for 3/4/5/6AX and route-cycle marker; no full-page reference art.
- [ ] Commit: `feat(ui): professionalize axis workstations`.

### Task 7: Professional Chrome for NC and AI

**Files:**
- Modify `NcSceneLayout.kt`, `NcSceneController.kt`, `AiSceneLayout.kt` and AI controller/layout owner.
- Create `professional/NcProfessionalDescriptor.kt`, `AiProfessionalDescriptor.kt`.
- Tests: `ProfessionalNcRegression.kt`, `ProfessionalAiRegression.kt`.

**Interfaces:**
- NC preserves editor, CNC keyboard, block skip/edit commands and page-local warnings/alarms.
- AI preserves Local Vault / Working Copy / Verify / Restore and connected AI capability when available.

- [ ] Write RED tests asserting NC editor/keyboard remain visible with professional chrome and no LINK overlap; AI visible controls all bind real local/connected actions.
- [ ] Add offline tests: NC local edit and AI local VERIFY/RESTORE remain available without network.
- [ ] Implement descriptors/layout adapters; keep errors page-local and keep ProductControlDeck in non-overlapping reserved slots.
- [ ] Run focused NC/AI UI tests plus existing NC/AI runtime regressions.
- [ ] Capture Nox NC/AI screenshots and callback markers.
- [ ] Commit: `feat(ui): professionalize nc and ai workstations`.

### Task 8: Windows Desktop Adapter for the Same Semantic UI

**Files:**
- Modify CNC: `desktop/src/main/kotlin/com/aigstudio/desktop/AigRgbDesktopSkinAdapter.kt`
- Modify CNC: `desktop/src/main/kotlin/com/aigstudio/desktop/HomeRgbDesktop.kt`
- Modify CNC: `desktop/src/main/kotlin/com/aigstudio/desktop/RuntimeSurfaceDesktopInstaller.kt`
- Create CNC: `desktop/src/main/kotlin/com/aigstudio/desktop/ProfessionalDesktopLayout.kt`
- Add/extend desktop tests under `desktop/src/test/kotlin/com/aigstudio/desktop/`.
- AIG-II legacy desktop layout: modify `desktop/aigii/AigRgbDesktopSkinAdapter.kt`, `desktop/aigii/HomeRgbDesktop.kt`, `desktop/aigii/RuntimeSurfaceDesktopInstaller.kt`, create `desktop/aigii/ProfessionalDesktopLayout.kt`, and create test `tests/aigii/ProfessionalDesktopUiRegression.kt` (the module maps `../tests/aigii` as its test source set).

**Interfaces:**
- Consumes the same `AigUiPageDescriptor`/`AigUiComponent`/`AigUiAction` IDs used by Android.
- Produces Windows-specific bounds/toolbars/side panels only; callbacks and localization keys are unchanged.

- [ ] Write RED tests proving Android/Windows expose identical control IDs/actions for the same page while bounds may differ.
- [ ] Implement desktop adapter and professional HOME/Multifunction/page chrome using existing desktop surface/bootstrap.
- [ ] Add zh-TW/en-US parity and missing-asset fallback tests.
- [ ] Run `:desktop:test` and desktop build/installDist path; expect GREEN.
- [ ] Launch normal Windows Runtime and capture HOME + representative CAD/SIM/6AX/NC screenshots; no Engineering Shell.
- [ ] Commit: `feat(ui): adapt professional AIG RGB UI to windows`.

### Task 9: Final Dual-Project Professional UI Acceptance and Exact Evidence

**Files:**
- Create/update dedicated verifier under `tools/verify_professional_aig_rgb_runtime.ps1`.
- Create new immutable evidence directories only for the final professional versions; never modify 409/488 or prior evidence.

**Interfaces:**
- Verifier consumes exact source SHA, APK/EXE SHA/bytes, screenshots, route/callback logs, offline/rotation logs and source anti-fake checks.

- [ ] Bump both projects to new final Android/Windows professional milestone versions; never reuse an installed/evidenced version.
- [ ] Run full dual-project `test` + Android APK build and Windows build/install distribution from committed source.
- [ ] Android Nox acceptance: HOME, Multifunction, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI in portrait/landscape as applicable; all CONNECT OFF; airplane-mode cold launch; no fake page image.
- [ ] Windows acceptance: launch normal Runtime directly into professional HOME; visit all major pages; validate real callbacks and no Engineering Shell.
- [ ] Run 3D rotation/lifecycle and 3→4→5→6→3 stress checks without changing domain truth.
- [ ] Run exact verifier asserting: no `FullSurfaceSkinPlan`/`MorningHomeTraditionalChinesePlan` production path; reference full-page images not drawn interactively; every visible action has real component/action; exact SHA/version/source ancestry; no HOME fallback for missing page data.
- [ ] Commit verifier first, then immutable evidence directories; rerun verifier from committed HEAD.
- [ ] Final result is PASS only when both AIG CNC and AIG-II produce professional Android + Windows evidence from exact committed source.

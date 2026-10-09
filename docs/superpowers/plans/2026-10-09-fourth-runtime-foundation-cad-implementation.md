# Fourth Runtime Foundation + CAD Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fourth-architecture Android foundation in both AIG CNC and AIG-II so Nox launches a real GLES3 CAD scene whose RGB controls dispatch into the existing headless CAD core and redraw authoritative geometry without legacy UI parents.

**Architecture:** Add a pure JVM `runtime-contract`, an Android `renderer-android` with one `GLSurfaceView` and GPU scene graph, and a separate `product-host-android` application module. Existing `production-runtime` CAD logic is wrapped behind `CadRuntimePort`; legacy `app-production`, Swing/Desktop binders, NOUI hosts, full-page RGB images and Android `Button/ImageView` UI are not dependencies of the new host.

**Tech Stack:** Kotlin 2.4.20, Gradle 9.6, Android Gradle Plugin 9.4.0, Android API 36, OpenGL ES 3.0, Nox 7 + `nox_adb.exe`, existing AIG CAD core and AIG RGB theme/assets.

**Spec:** `docs/superpowers/specs/2026-10-09-aig-fourth-runtime-architecture-design.md`

## Global Constraints

- Work in fresh isolated worktrees created at execution time; do not absorb the two pre-existing dirty AIG CNC binder edits.
- Run all Gradle commands from the target repo root with `C:\Users\I9-9900K\.gradle\wrapper\dists\gradle-9.6.0-bin\42k10rwplmzkhuboz9kdazi7s\gradle-9.6.0\bin\gradle.bat`.
- AIG CNC baseline commit: `f50e6aad8b0c0669f77eefdc652e11d59adf7922`; AIG-II baseline commit: `98376aa307061cf6e1bb057c592e64f2085ab56c`.
- Android renderer is truthful OpenGL ES 3.x; the host is one GPU surface, not an Android widget shell.
- CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI may not use full-page screenshots as functional UI.
- AIG RGB controls are scene nodes with hit-box, visual state, command binding and state binding.
- 0.001 mm remains core machining precision and is not altered by renderer quality.
- Errors are local messages only: no global red lock, no whole-page failure state, no unrelated-module stop.
- This plan covers Android fourth-runtime foundation + CAD vertical slice in both repositories. Windows D3D11 and later standalone modules receive separate plans after this milestone passes.
- Forward-only candidate versions for this milestone: AIG CNC `395-fourth-cad` / versionCode `395001`; AIG-II `474-fourth-cad` / versionCode `474001`.

## Review Focus

- GLES context/surface is recreated during normal Android lifecycle: the new renderer must re-read the same `CadRuntimePort` state so CAD geometry/revision remain intact.
- A malformed/too-small CAD gesture (<0.001 mm): only that command is rejected; the next valid command still works.
- Rapid repeated touch/S Pen events: one pointer gesture produces one command and one revision, not duplicate geometry.
- Orientation/viewport resize: hit-boxes and CAD world-to-screen transform recompute without losing state.
- Missing RGB icon texture: the node remains functional with label/vector fallback; it must not fall back to a full-page screenshot or legacy widget.

---

### Task 1: Introduce the backend-neutral fourth-runtime CAD contract

**Files:**
- Modify in both repos: `settings.gradle.kts` to include `:runtime-contract`
- Create in both repos: `runtime-contract/build.gradle.kts`
- Create CNC: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/CadContract.kt`
- Create AIG-II: `runtime-contract/src/main/kotlin/com/aigii/runtime4/contract/CadContract.kt`
- Test CNC: `runtime-contract/src/test/kotlin/com/aigstudio/runtime4/contract/CadContractRegression.kt`
- Test AIG-II: `runtime-contract/src/test/kotlin/com/aigii/runtime4/contract/CadContractRegression.kt`

**Interfaces:**
- Produces `enum class SceneId { HOME, CAD, CAM, SIM, AXIS3, AXIS4, AXIS5, AXIS6, NC, AI }`.
- Produces `enum class CadTool { LINE, RECT, CIRCLE, HOLE, SELECT }`, `enum class CadSnapMode { OFF, ENDPOINT, MIDPOINT, CENTER, INTERSECTION, TANGENT, HORIZONTAL, VERTICAL }`, and `enum class MessageSeverity { INFO, WARNING, ALARM }`.
- Produces `data class CadPoint(val x:Double,val y:Double)` and sealed `CadPrimitiveSnapshot` variants `Segment(ax,ay,bx,by,selected)`, `Rect(x1,y1,x2,y2,selected)`, `Circle(cx,cy,radius,selected)`, `Hole(cx,cy,radius,selected)`, `Arc(cx,cy,radius,startDeg,sweepDeg,selected)`.
- Produces `data class RuntimeMessage(val severity:MessageSeverity,val text:String)` and `data class CadState(val revision:Long,val activeTool:CadTool,val snapMode:CadSnapMode,val primitives:List<CadPrimitiveSnapshot>,val selectedCount:Int,val topologyCount:Int,val originX:Double=0.0,val originY:Double=0.0,val message:RuntimeMessage?=null)` with `companion object fun initial():CadState` returning revision `0`, tool `LINE`, snap `OFF`, origin `0.0/0.0`, empty primitives/counts, no message.
- Produces sealed `CadCommand`: `SelectTool(tool:CadTool)`, `CycleSnap`, `PointerDown(point:CadPoint)`, `PointerUp(point:CadPoint)`, `Undo`, `Redo`, `Trim`, `Extend`, `Offset(distanceMm:Double)`, `Array(count:Int,dxMm:Double,dyMm:Double)`, `Chamfer(distanceMm:Double)`, `Fillet(radiusMm:Double)`, `ToggleTopology`, `ClearMessage`.
- Produces `data class CadDispatchResult(val accepted:Boolean,val state:CadState)` and `interface CadRuntimePort { fun snapshot(): CadState; fun dispatch(command: CadCommand): CadDispatchResult }`.

- [ ] **Step 1: Write failing contract regressions** asserting default CAD state is `LINE`, `OFF`, revision `0`, has no lock/fail field, and all command types can be instantiated.
- [ ] **Step 2: Run** `gradle.bat :runtime-contract:test` in each repo; expected FAIL because the module/types do not exist.
- [ ] **Step 3: Add `:runtime-contract` and implement only the interfaces above**, with no Android/AWT/Swing imports.
- [ ] **Step 4: Re-run** `gradle.bat :runtime-contract:test`; expected PASS in both repos.
- [ ] **Step 5: Commit** `feat(runtime4): add CAD runtime contract` in each repo.

### Task 2: Wrap the proven CAD core behind `CadRuntimePort`

**Files:**
- Modify both: `production-runtime/build.gradle.kts`
- Create CNC: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthCadRuntimeAdapter.kt`
- Create AIG-II: `production-runtime/src/main/kotlin/com/aigii/production/runtime/FourthCadRuntimeAdapter.kt`
- Test CNC: `production-runtime/src/test/kotlin/FourthCadRuntimeAdapterRegression.kt`
- Test AIG-II: `production-runtime/src/test/kotlin/FourthCadRuntimeAdapterRegression.kt`

**Interfaces:**
- Consumes `CadRuntimePort`, `CadCommand`, `CadState` from Task 1 and existing `CleanCadSession` only as a transitional headless-core adapter.
- Produces `class FourthCadRuntimeAdapter : CadRuntimePort`.
- Mutating successful geometry/edit commands increment `revision` exactly once; rejected commands keep the prior revision.
- `PointerDown/PointerUp` owns one transient gesture start and applies current tool/snap mode through the existing core; renderer code never calls `CleanCadSession` directly.

- [ ] **Step 1: Write failing adapter regressions** for LINE/RECT/CIRCLE/HOLE creation; single and two-entity SELECT; Undo/Redo; SNAP cycle; Trim, Extend, Offset, Array, Chamfer, Fillet and geometry-topology `ToggleTopology`; local rejection of a sub-0.001 mm line; and a valid command succeeding immediately after that rejection. Assert every accepted mutation increments revision exactly once and every rejected edit keeps the previous revision.
- [ ] **Step 2: Run** `gradle.bat :production-runtime:test`; expected FAIL because `FourthCadRuntimeAdapter` is absent.
- [ ] **Step 3: Add the `runtime-contract` dependency and implement the adapter**, mapping existing `CleanCadPrimitive` values into contract snapshots.
- [ ] **Step 4: Run** `gradle.bat :production-runtime:test`; expected PASS in both repos, including existing Clean CAD regressions.
- [ ] **Step 5: Commit** `feat(runtime4): adapt CAD core to command state contract`.

### Task 3: Add the RGB scene graph and deterministic CAD hit-testing

**Files:**
- Modify both roots: add `com.android.library` plugin `9.4.0` and include `:renderer-android`.
- Create both: `renderer-android/build.gradle.kts`, `renderer-android/src/main/AndroidManifest.xml`.
- Create CNC: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/SceneNode.kt`, `RgbGlassButtonNode.kt`, `SceneRouter.kt`, `HomeSceneLayout.kt`, `CadSceneLayout.kt`, `CadSceneController.kt`; plus `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/skin/RgbSkinTokens.kt` and `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/input/PointerGestureRouter.kt`.
- Create AIG-II: `renderer-android/src/main/java/com/aigii/runtime4/renderer/scene/SceneNode.kt`, `RgbGlassButtonNode.kt`, `SceneRouter.kt`, `HomeSceneLayout.kt`, `CadSceneLayout.kt`, `CadSceneController.kt`; plus `renderer-android/src/main/java/com/aigii/runtime4/renderer/skin/RgbSkinTokens.kt` and `renderer-android/src/main/java/com/aigii/runtime4/renderer/input/PointerGestureRouter.kt`.
- Test CNC: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/CadSceneHitTestRegression.kt`, `SceneRouterRegression.kt`, `CadSceneErrorIsolationRegression.kt`, `PointerGestureRouterRegression.kt`.
- Test AIG-II: `renderer-android/src/test/java/com/aigii/runtime4/renderer/CadSceneHitTestRegression.kt`, `SceneRouterRegression.kt`, `CadSceneErrorIsolationRegression.kt`, `PointerGestureRouterRegression.kt`.

**Interfaces:**
- Consumes `CadRuntimePort` from Task 1.
- Produces `SceneNode(id,bounds,z,visualState,enabled,visible)`, `RgbGlassButtonNode(commandBinding, textureRef?)`, `SceneRouter(initial=SceneId.HOME)`, and `CadSceneController(runtime:CadRuntimePort)`.
- Required navigation node ids for this milestone: `NAV.HOME` and `NAV.CAD`; HOME is a minimal fourth-runtime scene, not a legacy page image.
- Required CAD node ids: `CAD.LINE`, `CAD.RECT`, `CAD.CIRCLE`, `CAD.HOLE`, `CAD.SELECT`, `CAD.UNDO`, `CAD.REDO`, `CAD.TRIM`, `CAD.EXTEND`, `CAD.OFFSET`, `CAD.ARRAY`, `CAD.CHAMFER`, `CAD.FILLET`, `CAD.SNAP`, `CAD.TOPOLOGY`, `CAD.VIEWPORT`.
- Minimum phone touch target is 48 dp. No node accepts a full-page `cad.png` as its functional texture.

- [ ] **Step 1: Write failing scene tests** for unique node ids, 48 dp hit targets, deterministic topmost hit, HOME→CAD→HOME routing, resize relayout, missing-icon fallback, local error message not disabling nodes, and `PointerGestureRouter` ignoring duplicate DOWN/UP so one gesture yields one dispatch.
- [ ] **Step 2: Run** `gradle.bat :renderer-android:testDebugUnitTest`; expected FAIL because renderer module/classes are absent.
- [ ] **Step 3: Implement the pure scene graph, layout and controller** using theme values from `AIG_UI_THEME_REPOSITORY/themes/aig_mobile_rgb_v1/theme.json` (CNC) and `aigii_rgb_neon_v2/theme.json` (AIG-II); keep warning/alarm as node/message presentation state only.
- [ ] **Step 4: Re-run** `gradle.bat :renderer-android:testDebugUnitTest`; expected PASS in both repos.
- [ ] **Step 5: Commit** `feat(runtime4): add RGB CAD scene graph`.

### Task 4: Render the CAD scene through one real GLES3 surface

**Files:**
- Create CNC: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt`, `AigGlesRenderer.kt`, `GlesProgram.kt`, `GlesGeometryBuffer.kt`, `RgbTextureCatalog.kt`, and `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/CadViewportNode.kt`.
- Create AIG-II: `renderer-android/src/main/java/com/aigii/runtime4/renderer/gpu/AigGlesView.kt`, `AigGlesRenderer.kt`, `GlesProgram.kt`, `GlesGeometryBuffer.kt`, `RgbTextureCatalog.kt`, and `renderer-android/src/main/java/com/aigii/runtime4/renderer/scene/CadViewportNode.kt`.
- Create both: `renderer-android/src/main/assets/aig-rgb/icons/line.png`, `rect.png`, `circle.png`, `hole.png`, `select.png`, each copied only from the same-named file under `engineering-assets/images/`; also copy `engineering-assets/images/rgb_wallpaper.png` to `renderer-android/src/main/assets/aig-rgb/home/rgb_wallpaper.png`; record source path + SHA-256 for every copied asset in `renderer-android/src/main/assets/aig-rgb/provenance.json`.
- Test CNC: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/RendererStateIsolationRegression.kt`.
- Test AIG-II: `renderer-android/src/test/java/com/aigii/runtime4/renderer/RendererStateIsolationRegression.kt`.
- Create static gate per repo: `tools/verify_fourth_gles_cad.ps1`.

**Interfaces:**
- Produces `AigGlesView(context, cadRuntime)` configured with EGL client version 3 and one renderer.
- `AigGlesRenderer` draws scene chrome/nodes and `CadState.primitives`; geometry buffers are presentation copies only.
- `RgbTextureCatalog` loads individual node/icon textures; absence uses shader/text fallback, never legacy widgets or full-page screenshots.

- [ ] **Step 1: Write the failing static gate and `RendererStateIsolationRegression`** requiring `setEGLContextClientVersion(3)`, GLES renderer ownership, no `Button`, no `ImageView`, no `Clean*Panel`, no `cad.png` full-page mount, per-tool texture provenance, and a renderer recreation reading the same `CadRuntimePort` revision/primitives rather than resetting CAD state.
- [ ] **Step 2: Run** `powershell -File tools/verify_fourth_gles_cad.ps1` and `gradle.bat :renderer-android:testDebugUnitTest`; expected FAIL before GPU files exist.
- [ ] **Step 3: Implement the minimal GLES3 renderer and viewport** with HOME wallpaper + real navigation nodes, CAD world grid, X/Y origin axes, CAD primitives, selected geometry, RGB glass controls and hit feedback. Emit `AIG4_GLES|FIRST_FRAME|PASS` after the first successful GLES frame.
- [ ] **Step 4: Run** the static gate, renderer unit tests and `gradle.bat :renderer-android:assembleDebug`; expected PASS/BUILD SUCCESSFUL.
- [ ] **Step 5: Commit** `feat(runtime4): render CAD on GLES3 scene`.

### Task 5: Add a separate fourth-architecture Android product host

**Files:**
- Modify both: `settings.gradle.kts` to include `:product-host-android`.
- Create both: `product-host-android/build.gradle.kts`, `src/main/AndroidManifest.xml`, `src/main/res/values/styles.xml`.
- Create CNC: `product-host-android/src/main/java/com/aigstudio/runtime4/host/FourthMainActivity.kt`.
- Create AIG-II: `product-host-android/src/main/java/com/aigii/runtime4/host/FourthMainActivity.kt`.
- Create per repo: `tools/verify_fourth_host_boundary.ps1`.

**Interfaces:**
- Consumes `FourthCadRuntimeAdapter` and `AigGlesView`.
- Produces a launcher Activity that constructs exactly one GPU view and mounts no platform toolbars/buttons/panels over it.
- Manifest keeps state through rotation/resize with `android:configChanges="orientation|screenSize|keyboardHidden"`; app labels are `AIG CNC` and `AIG-II`, not `Clean`/engineering names.
- Candidate application ids: `com.aigstudio.production.fourth395` and `com.aigii.production.fourth474`.
- Navigation emits `AIG4_SCENE|HOME_TO_CAD|PASS` and `AIG4_SCENE|CAD_TO_HOME|PASS`; accepted/rejected CAD dispatches emit `AIG4_CAD|COMMAND|<name>|ACCEPTED|REV=<n>` or `AIG4_CAD|COMMAND|<name>|REJECTED|LOCAL_MESSAGE`.

- [ ] **Step 1: Write failing host-boundary gates** proving the launcher manifest does not name `CleanMainActivity`, source has no Swing/AWT/Android widget UI imports, and the app depends only on fourth renderer + headless runtime path.
- [ ] **Step 2: Run** both boundary gates; expected FAIL because the new host does not exist.
- [ ] **Step 3: Implement the launcher modules** with versionCode/versionName from Global Constraints and offline-first immediate first frame.
- [ ] **Step 4: Run** boundary gates plus `gradle.bat :product-host-android:assembleDebug`; expected PASS/BUILD SUCCESSFUL in both repos.
- [ ] **Step 5: Commit** `feat(runtime4): add Android fourth product host`.

### Task 6: Prove the CAD vertical slice end-to-end in Nox without red locking

**Files:**
- Create evidence directories per repo: `evidence/android-fourth-cad-395/` and `evidence/android-fourth-cad-474/`.
- Create per repo: `tools/verify_fourth_cad_vertical_slice.ps1`.
- Update per repo: `docs/superpowers/progress/2026-10-09-fourth-runtime-cad-progress.md`.

**Interfaces:**
- Consumes the APKs from Task 5.
- Produces runtime evidence for `HitBox -> CadCommand -> FourthCadRuntimeAdapter -> revision/state -> GLES redraw`.

- [ ] **Step 1: Write the failing vertical-slice verifier** requiring fresh log markers for GLES3 first frame, CAD LINE accepted with revision increase, one rejected tiny-line command followed by a successful valid command, HOME/CAD scene transition without legacy host markers, and screenshot files.
- [ ] **Step 2: Run it before evidence exists**; expected FAIL.
- [ ] **Step 3: Install and launch each exact APK in Nox**. CNC: `E:\Program Files\Nox\bin\nox_adb.exe install -r product-host-android\build\outputs\apk\debug\product-host-android-debug.apk` then `...\nox_adb.exe shell am start -n com.aigstudio.production.fourth395/com.aigstudio.runtime4.host.FourthMainActivity`. AIG-II: install the same relative APK path from its repo, then start `com.aigii.production.fourth474/com.aigii.runtime4.host.FourthMainActivity`. Exercise LINE, SELECT, UNDO, REDO, SNAP and one edit command through real Nox input; capture `logcat` and screenshots.
- [ ] **Step 4: Exercise fault/recovery review cases**: tiny geometry error remains local/non-locking; rotate/resize preserves CAD state; a subsequent valid command still increments revision; disable network with `nox_adb.exe shell svc wifi disable` and `nox_adb.exe shell svc data disable`, relaunch and prove `AIG4_GLES|FIRST_FRAME|PASS`, then re-enable both services.
- [ ] **Step 5: Run** `verify_fourth_cad_vertical_slice.ps1`, `:runtime-contract:test`, `:production-runtime:test`, `:renderer-android:testDebugUnitTest`, `:product-host-android:assembleDebug`; expected all PASS with no legacy launcher reference and offline first-frame evidence present.
- [ ] **Step 6: Write progress checkpoint** with branch/HEAD, APK path, Nox evidence paths, completed scope and remaining CAD standalone scope; commit `test(runtime4): verify fourth CAD vertical slice`.

## Plan boundary / next plans

This milestone intentionally does not start cross-module CONNECT/DISCONNECT, CAM, SIM, 3AX-6AX, NC, AI, or Windows D3D11. After this plan passes, write and execute in order: CAD standalone completion (remaining stable inventory/persistence), CAM standalone, SIM standalone, 3AX, 4AX, 5AX, 6AX, NC/G-code, AI/update, Windows D3D11 host parity, then Shared Link Graph CONNECT/DISCONNECT.

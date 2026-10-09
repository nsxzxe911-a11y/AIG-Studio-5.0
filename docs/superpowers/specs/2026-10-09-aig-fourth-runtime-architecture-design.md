# AIG-II / AIG CNC Fourth Runtime Architecture Design

Date: 2026-10-09
Status: Approved design for written-spec review
Scope: AIG-II + AIG CNC, Android APK + Windows EXE

## 1. Purpose

Replace the first three UI/runtime host approaches with a fourth architecture in which AIG RGB is part of the real renderer scene graph rather than a full-page background image with platform controls layered on top. Preserve proven machining/runtime logic while rebuilding the product host and presentation path.

Success means the official runtime launches directly into the new product host, each major module works independently, AIG RGB controls are real interactive renderer nodes, and legacy engineering/NOUI/Clean/Swing hosts cannot become the official fallback.

## 2. Architectural choice

Use Native GPU Host + Headless Runtime Core.

Android official renderer: OpenGL ES 3.x.
Windows official renderer: D3D11.
Shared behavior: scene definitions, commands, state, results, module contracts, precision policy, project data and runtime semantics.
Platform-specific behavior: native window/surface creation, GPU backend, input adapter and presentation plumbing.

No Web/PWA runtime is an official product host.

## 3. Legacy quarantine boundary

Keep and adapt proven non-UI logic from `core`, `production-runtime`, and shared contracts/state. Existing CAD geometry/history/snap/edit engines, CAM logic, material-removal simulation, Fanuc NC semantics/timeline/alarm handling, AI working-copy verification, project persistence and settings are migration sources rather than rewrite targets.

The fourth architecture must not depend on old official-UI candidates such as Java/Swing `DesktopApp`, `JFrame/JTabbedPane`, old Android `CleanMainActivity`/`Clean*Panel`, NOUI hosts, engineering shells, RGB binders, or full-page `ImageView` mounting. They are `LEGACY_QUARANTINE`: readable for behavior migration and evidence, but forbidden as official runtime parents or fallbacks.

## 4. Runtime layers

`runtime-core`: machining/domain logic with no renderer ownership.
`runtime-contract`: Command, State, Result, Event, SceneId and module handoff contracts.
`renderer-android`: GLES3 renderer backend.
`renderer-windows`: D3D11 renderer backend.
`product-host-android`: APK entry, native GPU surface, input bridge and SceneRouter.
`product-host-windows`: EXE entry, native window, D3D11 surface, input bridge and SceneRouter.

Dependency direction is one-way: Product Host -> Renderer/Scene -> Runtime Contract -> Headless Runtime/Core. Renderer code may read state and emit commands but must not own authoritative machining data.

## 5. AIG RGB Scene Graph

Functional pages are built from renderer nodes, not screenshots. The scene graph contains layers such as Backdrop, Chrome, Tool, Content, HUD and Modal.

Required reusable nodes include `RgbGlassButtonNode`, `RgbPanelNode`, `TextNode`, `IconNode`, `CadViewportNode`, `MachineSceneNode` and `HudNode`. Each interactive node owns a NodeId, bounds, z-order, visual state, hit-box, texture/style reference, command binding, state binding, visibility and enabled state.

AIG RGB skin assets are modular texture/material resources: glass normal/pressed/selected/disabled/alarm, panel/frame/HUD, CAD/CAM/SIM icons and machine skins. HOME may use a true wallpaper, but HOME controls remain real nodes. CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI must not use a full-page screenshot as functional UI.

## 6. Command and state model

Input flow is `Touch/S Pen/Mouse -> Scene Node -> CommandBus -> Runtime Controller -> Headless Runtime -> Shared Runtime State -> Event/Result -> Renderer redraw`.

The renderer never mutates machining data directly. A single authoritative `AigRuntimeState` owns active scene and module state. CAD state includes geometry, selection, snap mode, active tool, origin and revision. CAM, SIM, axis, NC, AI and Settings own equivalent independent states.

Existing `Clean*Session` classes may initially be wrapped as legacy-core adapters while contracts are introduced, but UI classes are not migrated. Adapter names are transitional and may later be removed without changing public runtime contracts.

## 7. Standalone-first modules

Before CONNECT/DISCONNECT is implemented, each module must independently open, operate, save/restore, report its own messages, render its own content and survive faults in other modules.

Delivery order: CAD -> CAM -> 3D SIM -> 3AX -> 4AX -> 5AX -> 6AX -> NC/G-code -> AI.

CAD must independently support drawing, selection, Undo/Redo, SNAP, Trim, Extend, Offset, Array, Chamfer, Fillet and geometry-topology connect/disconnect editing behavior. This CAD topology operation is distinct from the later cross-module CONNECT/DISCONNECT data-link feature.
CAM must support MANUAL without CAD, retain manual-first policy, Safe-Z, editable cut/rapid points, avoidance, side/direction and future XYZABC point state without losing A/B/C.
SIM must support independent test/manual path sources and true material-removal evidence.
3AX/4AX/5AX/6AX use One Scene / One Renderer / No Overlay and keep their own XYZ/A/B/C scene state.
NC must open directly for professional G-code editing and Fanuc validation without requiring CAD or CAM.
AI must independently support Immutable Main -> Working Copy -> Verify -> Promote plus update/repair state.

## 8. CONNECT / DISCONNECT comes last

Module linking is a second-stage data-handoff feature, not a permission gate. A disconnected module remains fully usable. CONNECT only enables controlled snapshot/revision handoff between already-standalone modules. A standalone PASS for every module is a hard prerequisite before Shared Link Graph work begins.

## 9. Error and warning policy: no red lock

Red is presentation-only for local warning/alarm emphasis. It must never become a global locked state, whole-page failure state, whole-product FAIL state, or reason to stop unrelated modules.

CAD errors stay in CAD messages, CAM errors in CAM, SIM errors in SIM, axis faults in the relevant axis page, NC/Fanuc alarms in the NC/G-code area, and AI/update issues in AI. A bad command fails that command; the runtime continues. Expected user/domain errors are surfaced as messages instead of crashes.

Renderer/device loss may rebuild GPU textures, buffers and scene nodes, but must not destroy authoritative CAD/CAM/NC/project state. Android GLES context recreation and Windows D3D11 device recovery follow this rule.

## 10. Fourth-architecture gates

Official Android host must not reference legacy `CleanMainActivity`/`Clean*Panel`; official Windows host must not reference Swing/AWT runtime parents. Functional pages must not be full-page screenshot/ImageView skins. GPU activation must be truthful: GLES3 on Android and D3D11 on Windows, with first-frame evidence.

Every enabled control must prove `HitBox -> Command -> Runtime Result -> State change`. CAD's first vertical slice must prove LINE creates real geometry, increments state/revision and redraws through the GPU scene; the complete CAD standalone gate then covers selection, Undo/Redo, Snap and edit operations.

0.001 mm machining precision belongs to the runtime core and is never reduced by renderer quality settings. Offline launch must still reach the official UI; network/update/Drive/AI work cannot block first frame. Nox/real-device screenshots and logs are required runtime evidence; compile-only PASS is insufficient.

## 11. Checkpoint and continuation policy

Work proceeds in short checkpoints to survive browser/network interruption. Each checkpoint records project, branch/HEAD, completed scope, remaining scope and evidence paths. Versions move forward only; legacy evidence remains readable but does not regain authority over the fourth runtime.

The first implementation milestone is Fourth Runtime Foundation + standalone CAD vertical slice. After CAD passes, continue the standalone delivery order above. CONNECT/DISCONNECT is intentionally deferred until all standalone modules pass.

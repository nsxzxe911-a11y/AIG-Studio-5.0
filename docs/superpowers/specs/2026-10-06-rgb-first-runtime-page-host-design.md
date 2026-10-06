# RGB-first Runtime Page Host Design

Date: 2026-10-06
Scope: AIG Studio 5.0 / AIG CNC + AIG-II aligned Runtime UI architecture
Status: Design for review before implementation plan

## Intent

Repair the long-running Runtime UI mounting problem without reworking or discarding working CAD/CAM/SIM/NC logic. The approved AIG RGB visual asset is mounted first for every formal page, then skin, functional view/module, callbacks, and finally READY state. Engineering shell is never a formal startup or page host.

The user-visible result must be a real Android/Windows Runtime where HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI all follow one mounting lifecycle and no page can be considered ready if its RGB visual or callbacks are missing.

## Fixed mount lifecycle

Every formal Runtime page uses exactly this order:

1. RGB ASSET
2. SKIN
3. PAGE MODULE
4. CALLBACK BRIDGE
5. READY

No stage may be skipped. The page host owns the lifecycle; MainActivity/DesktopApp do not manually assemble page contents.

## Runtime host

MainActivity and DesktopApp are reduced to startup/lifecycle/navigation containers. Page content moves behind a RuntimePageHost.

RuntimePageHost responsibilities:
- Resolve the selected RuntimeSurface.
- Verify the canonical RGB asset exists and is decodable.
- Mount RGB visual before functional controls.
- Attach the surface skin.
- Attach exactly one page module.
- Attach callback bridge to existing CAD/CAM/SIM/NC engines.
- Publish READY only after all required stages succeed.
- Keep page switching local/offline and non-blocking.

Existing functional views are first connected through adapters instead of being rewritten all at once. This preserves proven CNC/CAD/CAM behavior while the old giant Activity/Desktop UI is progressively dismantled.

## Migration order

Wave 1: HOME -> CAD -> CAM
Wave 2: SIM -> 3AX -> 4AX -> 5AX -> 6AX
Wave 3: NC -> AI

A page is migrated only after the previous page passes compile + mount + runtime visual evidence.

## Android same-editor left/right interaction

The Android formal UI uses one editor/frame, not duplicate stacked panels.

A left-side and right-side control can select alternate help/description content inside the same editor frame. The lower description area is one exclusive container. Pressing left or right changes state; it does not create a second overlapping text view.

Required state model:
- selectedSide = LEFT | RIGHT
- bottomText = content derived from selectedSide and current page/tool
- exactly one bottom text container is visible
- old content is replaced atomically when selectedSide changes
- no duplicate TextView insertion for the same role
- no absolute-position text stacking

The interaction follows Android UI-state/UDF guidance: user events update state, the UI renders from the current state, and page logic does not mutate multiple competing text widgets.

## No-overlap rules

For phone portrait, phone landscape, tablet, and desktop:
- Bottom description uses one layout slot with wrap/reflow.
- Text may wrap or scroll if required; it must not overlap the editor, navigation, or another description.
- Width/height adapt from current window metrics rather than hard-coded phone pixels.
- Left/right controls stay outside the bottom text slot.
- Only the active description is accessibility-visible.
- A layout/evidence gate rejects overlapping or duplicate bottom-description nodes.

## RGB asset priority

AIG RGB imagery is a first-class page dependency, not a decorative optional overlay.

For each page, the host must know:
- canonical asset id/path
- integrity/hash result where a manifest exists
- decode result
- mount result
- skin result
- functional module result
- callback result

If a page asset is missing or invalid, the page does not silently claim READY. The Runtime may show a local status/error message while keeping the app alive, but it cannot substitute an engineering shell as the formal page.

## Modular code boundaries

Target Android structure:
- ui/host/RuntimePageHost.kt
- ui/host/RuntimePageMountCoordinator.kt
- ui/state/RuntimePageUiState.kt
- ui/pages/home/HomePageModule.kt
- ui/pages/cad/CadPageModule.kt
- ui/pages/cam/CamPageModule.kt
- later page modules for SIM/3AX/4AX/5AX/6AX/NC/AI
- ui/bridge/*CallbackBridge.kt adapters to existing engines

Windows mirrors the same concepts with Swing/Desktop-specific adapters, not shared Android View classes.

Shared/common code contains only platform-neutral surface/state/contracts.

## Giant-file reduction rule

Do not add new page UI logic to MainActivity.kt or DesktopApp.kt unless it is lifecycle/host wiring. Existing large blocks are extracted page by page only when their page is being migrated. No mass rewrite.

## CAD latency protection

The CAD migration keeps interaction latency separate from full geometry recomputation:
- pointer MOVE renders lightweight draft feedback
- snap candidates use cache/index where possible
- expensive intersections are not recomputed globally on every MOVE
- commit/release performs authoritative geometry update
- RGB decoding/preload does not run synchronously in the pointer hot path

## Verification gates

Each migrated page must pass:
1. contract test
2. Android Kotlin compile
3. Windows Kotlin compile
4. RGB asset/package verification
5. actual page mount evidence
6. navigation/callback smoke test
7. adaptive portrait/landscape check
8. no-overlap bottom-description check
9. no-engineering-shell-default check

PASS means actual Runtime evidence, not source-code presence alone.

## Android official design basis

This design follows Android's UI-layer guidance: UI renders state; user input is emitted as events; state holders own the state transition; adaptive layouts respond to window size instead of being locked to one portrait layout.

References:
- https://developer.android.com/topic/architecture/ui-layer
- https://developer.android.com/design/ui/mobile/guides/layout-and-content/adapt-layout

## Acceptance criteria for first implementation wave

HOME/CAD/CAM on Android and Windows must each:
- show canonical AIG RGB visual through RuntimePageHost
- preserve existing real callbacks/functions through adapters
- use the fixed ASSET -> SKIN -> PAGE MODULE -> CALLBACK -> READY order
- navigate without engineering shell
- compile on both target platforms

Android editor interaction additionally must demonstrate:
- one editor frame
- left/right selection changes the lower explanatory text
- only one lower text region exists at a time
- no text overlap in portrait or landscape

Only after this wave has runtime evidence should SIM and multi-axis pages migrate.
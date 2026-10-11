# AIG RGB Professional Runtime UI Design

Date: 2026-10-10
Projects: AIG CNC + AIG-II
Status: Approved design awaiting implementation plan

## 1. Purpose

Replace the temporary full-screen-image UI approach with a maintainable, production-grade AIG RGB Runtime UI. The 2026-10-05 morning RGB artwork remains the visual reference, not the executable interface.

Success means the launched product looks recognizably like the approved AIG RGB design while every visible control is a real Runtime component with a real callback, state, accessibility/touch bounds, and platform-adaptive layout.

## 2. Non-negotiable rules

- No Engineering Shell as initial or primary UI.
- No full-page screenshot used as the interactive page.
- No transparent hitbox laid over a pictured button and called a real button.
- No black rectangle used to hide baked text and replace it with another label.
- No duplicated navigation: one visible control equals one Runtime control.
- Traditional Chinese is the default presentation language; English remains available through shared localization.
- Every page remains independently launchable when CONNECT links are OFF.
- 3D pages preserve One Scene / One Renderer / No Overlay.
- Existing authoritative CAD/CAM/SIM/NC/MotionProgram/Axis Runtime state is retained; the UI does not create a second domain truth.
- Android and Windows share semantic component contracts and visual tokens, but may use platform-specific renderer/layout adapters.

## 3. What is retained

Keep and reuse verified Runtime layers:

- SceneRouter and dedicated HOME/CAD/CAM/SIM/AXIS3/AXIS4/AXIS5/AXIS6/NC/AI routes.
- CAD, CAM, SIM, NC, AI and Axis runtime adapters.
- MotionProgram and XYZABC authoritative state.
- Real 3AX/4AX/5AX/6AX scene graph and machine kinematics.
- ProductControlDeck connection state semantics.
- RgbSkinTokens and semantic states Normal / Pressed / Selected / Disabled / Alarm.
- RgbTextureCatalog, label texture generation and GPU drawing infrastructure.
- Existing offline/recovery and independent-page behavior.

## 4. What is retired

The following presentation strategy must be removed from the active product path:

- FullSurfaceSkinPlan as a page-sized interactive skin.
- MorningHomeTraditionalChinesePlan text-cover overlay.
- Full morning HOME screenshot as the actual Runtime page.
- Any page implementation whose visible controls exist only inside a bitmap.
- Any invisible navigation or command target that has no matching real visible Runtime component.

The 2026-10-05 artwork files may remain in the repository under a clearly named visual-reference asset area for comparison and extraction of non-interactive decorative material.

## 5. Professional component architecture

Introduce a shared semantic UI layer made of small components with stable IDs and explicit bindings.

Core component types:

- `AigRgbTopNav`: product navigation and selected-page state.
- `AigRgbButton`: icon + localized label + semantic visual state + real command binding.
- `AigRgbPanel`: RGB Glass container with optional title/status.
- `AigStatusCard`: machine/project/runtime status with live values.
- `AigViewportFrame`: boundary for CAD/CAM/SIM/3D viewport content.
- `AigHud`: numeric XYZABC, motion, block, precision and page-local state.
- `AigControlDeck`: page-specific commands and CONNECT/DISCONNECT controls.
- `AigMultifunctionGrid`: real entry cards for 3D走刀 / 3軸 / 4軸 / 5軸 / 6軸 / NC程式 / AI智慧 plus later approved modules.
- `AigIcon`: reusable icon asset independent from labels and callbacks.
- `AigLabel`: localized text rendered by Runtime, never baked into a button image.

Each component must expose a stable `controlId`, bounds, visual state, enabled/visible state, localized label key, optional icon asset, and callback/command binding.

## 6. Visual system

The 2026-10-05 morning artwork defines the visual language:

- black base background;
- RGB edge glow and restrained glass fill;
- metallic/technical iconography;
- clear cyan/green/yellow/magenta state accents;
- compact CNC information density;
- strong viewport priority;
- no oversized decorative RGB animation inside the working viewport.

The artwork is decomposed into reusable design tokens and assets instead of being stretched as a whole-page texture.

Interactive button appearance is generated from component state. Decorative imagery such as approved machine photos, background textures, logos and non-interactive illustrations may be reused as assets if licensing and ownership are clear.

## 7. HOME page

HOME becomes a real component layout matching the approved morning composition, not a screenshot.

Required regions:

- Header/logo and product status.
- Top navigation: 首頁 / CAD製圖 / CAM加工 / 3D走刀 / 多功能 / NC程式 / AI智慧.
- Machine status card.
- Current project card.
- Main hero/preview region.
- AI assistant/status card.
- Quick operation region.
- Multifunction entry region.

Live machine/project data must replace fictional values in the reference artwork whenever a real Runtime value exists. Static reference numbers must never be presented as live telemetry.

## 8. Multifunction page

`多功能` is a dedicated real page/grid, not a picture gallery and not a duplicate implementation of existing modules.

Initial real entries:

- 3D走刀 -> SIM
- 3軸 -> AXIS3
- 4軸 -> AXIS4
- 5軸 -> AXIS5
- 6軸 -> AXIS6
- NC程式 -> NC
- AI智慧 -> AI

Additional approved images/modules remain available as future cards. Each card owns a real icon/thumbnail asset and a real route or command. No card may exist only as a decorative image.

## 9. Independent page composition

Every major page is a standalone workstation while sharing the same visual system.

- CAD: true drawing viewport + CAD tool groups + snaps + edit/file controls.
- CAM: toolpath viewport + AUTO/MANUAL + point/XYZABC editing + avoidance + cutter compensation controls.
- 3D走刀/SIM: true material-removal viewport + play/step/reset/display + numeric evidence.
- 3AX: XYZ machine scene + axis/page controls + HUD.
- 4AX: XYZ+A real rotary machine profile + HUD.
- 5AX: XYZ+A/B real trunnion/rotary profile + HUD.
- 6AX: XYZ+A/B/C real machine profile + HUD.
- NC: true NC editor + mobile CNC keyboard + page-local warnings/status.
- AI: local Vault / Working Copy / Verify / Restore plus connected AI capabilities when available.

CONNECT controls govern data exchange only. They never disable page launch or local editing.

## 10. Data and callback flow

Every interactive control follows the same path:

`Visible AIG component -> controlId -> controller callback -> Shared Runtime contract -> authoritative state -> renderer/status result`

No control is accepted if the chain ends at visual state only.

Navigation follows:

`AigRgbButton(NAV.*) -> SceneRouter -> dedicated SceneId -> dedicated layout/renderer`

Domain commands continue through existing runtime adapters. Presentation code never writes MotionProgram/CAD/CAM/NC state directly.

## 11. Adaptive layout

Layouts are descriptor-driven, not hard-coded screenshot coordinates.

- Portrait and landscape have independent compositions.
- Minimum touch target remains 48dp.
- 1080p / 2K / 3K / 4K scale through density-aware anchors, grids and constraints.
- 3D/CAD/CAM/SIM viewport receives first priority when space is constrained.
- Mobile may group secondary controls behind expandable tool groups.
- Windows may expose wider toolbars/side panels using the same control IDs and callbacks.
- Rotation preserves scene, project state, MotionProgram, revision/digest and camera state.

## 12. Asset policy

Assets are split by role:

- `reference/2026-10-05-morning/`: approved visual references only; never drawn as an interactive full page.
- `icons/`: reusable transparent icons.
- `decor/`: logos, machine/AI illustrations, non-interactive imagery.
- `materials/`: RGB/glass/background textures where needed.
- `page/<page>/`: page-specific non-interactive imagery only.

Interactive labels and button faces are generated by Runtime components, not precomposed page screenshots.

## 13. Error and status behavior

- CAD errors remain in CAD.
- CAM errors remain in CAM.
- SIM state remains in SIM.
- NC/G-code warnings and alarms remain in NC unless a real machine-safety condition requires broader action.
- AI/network failure never blocks local CAD/CAM/SIM/NC/Axis pages.
- Missing decorative asset falls back to a valid component state, never Engineering Shell or HOME fallback.
- Missing Runtime data shows a page-local INFO/WARNING state rather than fake values.

## 14. Migration sequence

1. Freeze 409/488 as historical evidence; do not overwrite them.
2. Introduce professional component contracts and tests while current Runtime remains buildable.
3. Remove active use of full-page HOME screenshot/overlay path.
4. Rebuild HOME from real components using the morning artwork only as comparison reference.
5. Build Multifunction as real routed cards.
6. Apply shared professional chrome to CAD/CAM/SIM.
7. Apply it to 3AX/4AX/5AX/6AX without changing verified kinematics.
8. Apply it to NC/AI without changing verified domain behavior.
9. Add Android portrait/landscape Nox evidence.
10. Adapt the same component contracts to Windows desktop layout and capture Windows Runtime evidence.

At each milestone, visual-only work uses focused UI/launch/adaptive tests; domain behavior is not needlessly re-regressed unless its code path changes.

## 15. Acceptance gates

A page is visually accepted only if:

- it is recognizably AIG RGB without displaying the reference screenshot as the page;
- every visible button is a real Runtime component;
- no duplicate/baked button remains underneath a live control;
- Traditional Chinese text is aligned and generated by Runtime;
- Pressed/Selected/Disabled/Alarm states visibly work;
- callbacks produce real state changes or routes;
- layout passes portrait and landscape without overlap;
- page remains usable with all CONNECT links OFF;
- no Engineering Shell appears.

A 3D page additionally requires a real scene, real XYZABC MotionProgram state, no overlay renderer, and preserved lifecycle/rotation behavior.

## 16. Verification evidence

Each completed page milestone must include:

- source commit;
- version greater than the previous released/evidence version;
- fresh compile/test result;
- APK/EXE exact SHA when built;
- real Runtime screenshot(s), not reference artwork;
- route/callback marker for important controls;
- portrait/landscape evidence where applicable;
- no-fake-UI source regression ensuring reference full-page images cannot become interactive pages again.

## 17. Non-goals

This redesign does not rewrite CAD geometry, CAM algorithms, material-removal math, NC semantics, MotionProgram, axis kinematics, sync architecture, or machine-safety logic unless a separate verified defect is found.

It also does not copy a third-party CNC brand UI or machine shell. AIG keeps its own visual identity while using real machine kinematics and approved owned/reference assets.

## 18. Definition of done

The professional UI migration is complete when AIG CNC and AIG-II launch directly into a real component-based AIG RGB HOME, all major pages use the same professional visual system, Multifunction exposes real routed modules, Android and Windows layouts are operational, and no active production path depends on a full-page screenshot, text-cover overlay or invisible fake button.
# Real-Machine Axis Scenes + Independent Pages Design

## Intent
AIG CNC / AIG-II must stop inventing generic block machines for 4AX/5AX/6AX. Each axis page will be rebuilt from a verified physical-machine kinematic reference, while preserving AIG's own visual identity and avoiding copying vendor industrial design details. Every top-level page must be independently usable and must not require another page to be connected first.

## Physical machine references

### 4AX — single rotary table on a VMC
Reference: Haas HRT210.
Official reference: https://www.haascnc.com/machines/rotaries-indexers/rotary-tables/models/hrt210.html
Facts used: single rotary axis, 210 mm platter, vertical or horizontal mounting, chuck/fixture mounting, official 3D model and layout drawing available.
AIG implementation: generic VMC body + one physical A-axis rotary housing/platter/chuck. No fake twin-column trunnion. Optional tailstock may be represented as a fixture, not as a mandatory machine axis.

### 5AX — dual-axis tilting rotary / trunnion
Reference: Haas TRT210 / TR210 family.
Official reference: https://www.haascnc.com/machines/rotaries-indexers/5-axis-rotaries/models/trt210.html
Facts used: physical A tilt axis, second rotary axis, compact two-axis workholding, A tilt +/-120 degrees, rotary 360 degrees, official 3D model and layout drawing available.
AIG implementation: independent 5AX scene with two real rotary joints, supports, tilt body, platter, workpiece and spindle. AIG convention remains XYZ+A+B in shared runtime; vendor axis letters are reference-only.

### 6AX — three linear + three rotary axes
Reference: NAGASE INTEGREX NIC-74.
Official reference: https://nagase-i.jp/eng/product/product_13.html
Facts used: simultaneous six-axis machining using X/Y/Z linear axes plus A/B/C tool rotation/swivel axes; swivel tool spindle; tool edge arranged on rotary center line; real milling machine, not a robot placeholder.
AIG implementation: independent vertical 6AX machine scene with XYZ linear structure and three real rotary joints A/B/C. The geometry is AIG-generic, but the kinematic chain must remain physically plausible and match XYZ+A+B+C semantics.

## Independent-page rule
Every top-level page is a complete workstation. It may exchange data with other pages when CONNECT is enabled, but it must still launch, edit, preview, save/recover and report local status when disconnected.

- HOME: product cockpit, project/recovery/status/settings entry. Never Engineering Shell.
- CAD: draw/edit/select/snap/dimensions/layers/origin/autosave/recovery. No CAM dependency.
- CAM: AUTO or MANUAL. MANUAL can create/edit XYZ/ABC toolpath without CAD. Safe-Z/lead-in/out/inside-outside/direction/avoidance remain local controls.
- SIM: accepts current MotionProgram, CAM path or NC-derived motion. Provides true material-removal evidence and playback without requiring CAD/CAM connection.
- 3AX: own machine profile, camera, HUD, playback, display controls and XYZ scene.
- 4AX: own physical 4AX machine profile, A-axis controls/readout/playback and workholding scene.
- 5AX: own physical 5AX machine profile, A/B controls/readout/playback and two-rotary-joint scene.
- 6AX: own physical 6AX machine profile, A/B/C controls/readout/playback and three-rotary-joint scene.
- NC: complete editor/parser/checkpoint/candidate preview/single-block/dry-run/block-skip/custom M-code flow. Does not require CAM.
- AI: local assistant/status/repair/update surface. Other pages do not fail if AI is disconnected.

## Shared architecture
One authoritative data path remains:
`Project -> Shared Contracts -> Shared State -> MotionProgram/NC/CAM/SIM -> Page Adapter -> Renderer`.
There is no second mutable CNC truth inside any 3D renderer.

Axis scenes share infrastructure only where it is safe: shader/programs, material system, camera utilities, mesh primitives, AIG RGB tokens, HUD typography, asset cache and lifecycle host. They do NOT share fake machine geometry. Each axis page owns a distinct `MachineProfile` and kinematic hierarchy.

Target hierarchy:
- `MachineProfile3Ax`
- `MachineProfile4AxHrtStyle`
- `MachineProfile5AxTrunnionStyle`
- `MachineProfile6AxNicStyle`

Each profile declares physical joints, pivot centers, travel/rotation limits, parent-child transforms, workpiece anchor, spindle/tool anchor and collision envelope hints.

## One Scene / One Renderer / No Overlay
Only one active machine scene exists per axis page. Axis switching uses latest-request-wins. Old scene resources detach/dispose before the new scene mounts. No second GLSurfaceView/WebView/Canvas may be placed over the active machine to imitate missing axes.

## AIG RGB control deck
AIG RGB is a skin and control system, not a screenshot pasted over the runtime.
- Skin tokens: background, panel, glass border, selected, pressed, disabled, alarm, HUD.
- Control descriptors: `controlId`, semantic action, enabled rule, selected rule, layout group, icon/label.
- Same callback contract across Android/Windows/Web host.
- Layout and skin can change without rewriting CAD/CAM/NC logic.

Each page has its own contextual control deck so it can stand alone. Axis pages include at minimum VIEW, AXIS, PLAY, DISPLAY plus page-specific rotary controls and exact XYZ/ABC HUD.

## Kinematics and precision
Authoritative numeric state remains double/fixed-domain data at 0.001 mm presentation precision. Rendering matrices may use GPU floats, but renderer interpolation never writes back into MotionProgram. Axis projection rules remain:
- 3AX: XYZ, force A/B/C=0 for presentation.
- 4AX: XYZ+A, force B/C=0.
- 5AX: XYZ+A+B, force C=0.
- 6AX: XYZ+A+B+C.

## External websites / models
Official manufacturer 3D models, layout drawings, manuals, videos and photos may be used to understand geometry, pivot placement and proportions. AIG must not ship vendor trademarks, copyrighted textures, copied housings or vendor CAD files unless licensing explicitly permits it. Final production geometry is rebuilt as an AIG-generic machine asset and stored locally in the repository so APK/EXE/Web can run offline.

## Error behavior
A missing motion program, unsupported axis data or unavailable asset produces a local page message. It must not fall back to HOME, crash the app or show Engineering Shell. Machine/safety alarms remain scoped to the relevant page/runtime.

## Validation
For every axis page, acceptance requires:
1. physical machine profile visually distinct from the others;
2. true 3D volume and depth-tested rendering;
3. authoritative XYZ/ABC HUD;
4. real rotary pivot behavior matching the selected physical reference;
5. portrait + landscape adaptive layout;
6. offline cold launch;
7. rotation continuity;
8. 3->4->5->6->3 scene-cycle stress with no overlay/stale scene;
9. exact APK/EXE evidence when a milestone is frozen;
10. page remains usable when neighboring modules are DISCONNECTED.

## Non-goals
- No fourth UI architecture.
- No fake engineering shell with AIG images.
- No vendor-brand 1:1 exterior copy.
- No flat Canvas imitation of 5AX/6AX.
- No requirement that CAD -> CAM -> SIM -> NC be connected for basic page use.

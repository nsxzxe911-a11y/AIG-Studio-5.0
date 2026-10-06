# Professional RGB Runtime Restoration Design

## Purpose
Restore AIG Studio and AIG-II as one visually coherent, professional CNC product family using the user-approved 2026-10-05 morning RGB references as the visual authority, while preserving real Runtime behavior, real CAD/CAM/SIM/NC callbacks, and real 3AX/4AX/5AX/6AX model motion. The deliverable is not a picture mock-up. It must produce installable Android APK and Windows EXE artifacts with runtime screenshots proving the formal startup page and each primary surface.

## Version and Branch Floors
- AIG Studio target floor: 372.0.0, branch `professional-rgb-runtime-372`, based on recovery SHA `9db417d567a1d114341f52960bc0d9648db1a6cd`.
- AIG-II target floor: 429.0.0, branch `professional-rgb-runtime-429`, based on recovery SHA `bab61f54c1d58ff9e235e21c7f752859e8400ed5`.
- Versions only increase. No rollback, downgrade, or replacement of newer work by older baselines.
- AIG-II final gate must exact-bind the final verified AIG Studio SHA.

## Visual Authority
1. Primary authority is the 2026-10-05 Morning Approved RGB set indexed by `docs/assets/2026-10-05-morning-approved-rgb-index.json`.
2. Android HOME authority: `aig_ii_cnc_智慧製造儀表板.png` / prepared `home_mobile.jpg`, portrait composition.
3. Windows HOME authority: `aig_ii_cnc_智慧加工控制台.png` / prepared `home_desktop.jpg`, landscape composition.
4. Android NC authority: `aig_ii_cnc_智慧加工介面.png`.
5. LINK authority: `霓虹科幻_cnc_智慧控制中心.png`.
6. Shared repository visual references already identical across both repos are authoritative supporting surfaces: `startup.png`, `home.png`, `cad.png`, `cam.jpg`, `sim.jpg`, `machine.jpg`, `axis3.jpg`, `axis4.png`, `axis5.jpg`.
7. No generated replacement image may silently substitute for an approved reference. Missing approved raster content must fall back to procedural RGB Glass and real Runtime widgets, never to a fabricated screenshot.

## Product Skin Contract
- Background: `#020407`.
- Panel: `#07111B`.
- Text: `#F4FBFF`.
- Accent/selected: `#27E9FF`.
- Cutting: `#33F39B`.
- Rapid: `#FF4DA6`.
- Warning: `#FFB326`.
- Alarm: `#FF465F`.
- Disabled: `#54606A`.
- All controls support Normal, Pressed, Selected, Disabled, Warning, Alarm states.
- RGB Glass is chrome and skin only; state, values, geometry, toolpath, alarms, coordinates, and model motion come from Runtime data.
- Engineering Shell is not a startup or product surface.

## Surface Architecture
Formal surfaces are HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI, SETTINGS, VIEW, PHOTO, CORNER, EDIT, FILE, TOOL, WORK, ALARM, MONITOR, SYNC, LINK.

### HOME
Use the approved morning mobile/desktop composition for placement, proportions, visual hierarchy, logo, navigation grouping, and RGB treatment. Navigation buttons remain real Runtime controls.

### CAD
Use `cad.png` as visual/layout reference while keeping the central canvas real. Required real callbacks include Line, Rect, Circle, Arc, Hole, Chamfer, Fillet, SNAP, Dimension, Trim, Extend, Offset, Array, Undo, Redo, Select, Pan, Fit, CONNECT, DISCONNECT, origin display and 0.001 mm coordinate formatting.

### CAM
Use `cam.jpg` as visual reference. Required real controls include AUTO/MANUAL source, inner/outer path, direction, G41/G42, diameter, depth, feed, spindle, Safe-Z, lead-in/out, tool-change point, path visibility, recalc, editable XYZ nodes, G0/G1 mode, avoidance lift-to-Safe-Z path insertion, and editable start/end points. Manual path remains first-priority when selected and must not require CAD geometry.

### SIM
Use `sim.jpg` / `machine.jpg` only as visual/model composition references. Real SIM must drive tool position, progressive path, material removal, absolute G90 coordinates, playback, Fit, and collision/stability status. Static images may not fake material removal.

### 3AX / 4AX / 5AX / 6AX
- 3AX uses `axis3.jpg` visual authority and real XYZ motion.
- 4AX uses `axis4.png` authority and real A-axis motion; A-/A+/zero/play/Fit are real controls.
- 5AX uses `axis5.jpg` authority and real A/B motion with tool-axis orientation and workpiece movement.
- 6AX has no dedicated Morning raster authority; therefore it inherits the same cockpit family and uses the existing real 6AX geometry. A/B/C controls and model motion remain external to the skin. No fake raster substitute is allowed.
- Tool, fixture, workpiece, machine support geometry and material animation must remain Runtime geometry, not painted pixels.

### NC
Use the Morning NC reference for Android composition. The G-code editor is real and supports G/M, X/Y/Z, F/S/T, Insert, Delete, Block Skip, cursor-line help, inline ALARM and focus-line behavior. Machine-specific M-code remains configurable. Errors are surfaced in the NC editor and must not crash the application.

### AI / Settings / Secondary Surfaces
Use the shared RGB Glass contract. AI, SETTINGS, VIEW, PHOTO, CORNER, EDIT, FILE, TOOL, WORK, ALARM, MONITOR, SYNC and LINK keep their real callbacks and data sources. LINK follows the approved morning control-center reference where raster guidance exists.

## Platform Requirements
### Android
- Primary target: Samsung S23/S23 Ultra class phone and emulator verification.
- Portrait and landscape supported.
- Default 60Hz; selectable 120/90/60/30/Auto where existing settings expose it.
- Startup: formal RGB startup visual -> formal HOME. No engineering shell.
- Offline startup must work with local assets and project data.

### Windows
- Formal startup visual -> formal Runtime HOME.
- Desktop layout uses landscape morning authority; do not stretch phone artwork.
- Existing keyboard shortcuts remain functional.
- Produce Windows PE/MZ EXE and, when the packaging chain supports it, installer plus portable runtime.

## Runtime Integrity
- Existing callbacks are authoritative; skin work must not replace them with click-only placeholders.
- Existing CAD/CAM/SIM/NC geometry and data models are retained unless a failing acceptance test proves a required correction.
- 0.001 mm end-to-end display/coordinate precision is preserved.
- Offline-first behavior is preserved. Network checks occur only after UI readiness and may not block startup.
- Red visual state is reserved for real Alarm/critical status, not generic build/version warnings.

## Page-Complete Rule
A page is complete only when the same change set contains:
1. approved/reference skin mapping;
2. real interactive controls;
3. callback binding;
4. required model or canvas integration;
5. Android and/or Windows responsive placement;
6. automated source/runtime verification;
7. screenshot evidence from the built executable where applicable.
Image-only or callback-only partial pages are not complete.

## Build and Evidence Gate
A final candidate must provide:
- AIG Studio 372 Android APK.
- AIG Studio 372 Windows EXE.
- AIG-II 429 Android APK.
- AIG-II 429 Windows EXE.
- SHA256 for every downloadable binary.
- Android startup screenshot and formal HOME screenshot for each project.
- Windows startup screenshot and formal HOME screenshot for each project.
- Surface evidence for CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX and NC.
- Evidence that controls are clickable and tied to real callbacks rather than static hotspots.
- Evidence that SIM/5AX/6AX model frames are Runtime-rendered and not raster-only.
- AIG-II exact SHA binding to the verified Studio 372 candidate.

## Acceptance Criteria
PASS requires both projects to launch directly through the formal startup flow and reach the approved RGB Runtime without Engineering Shell as default; all primary surfaces must open; visual hierarchy must match the approved morning references where a reference exists; core controls must invoke real callbacks; multi-axis pages must use real models; and installable APK/EXE artifacts must exist and be downloadable. Any missing binary, static fake model, wrong reference image, broken callback, wrong platform composition, or default Engineering Shell keeps the candidate at FAIL.
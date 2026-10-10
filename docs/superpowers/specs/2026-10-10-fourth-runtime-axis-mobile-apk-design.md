# Fourth Runtime Axis Visual Foundation + Mobile APK Design

**Status:** Approved architecture direction for shared dual-project use. Platform renderer implementation remains milestone-gated and evidence-driven.

**Date:** 2026-10-10
**Projects:** AIG CNC + AIG-II
**Baseline checkpoints:** AIG CNC `6ab2b99c82fb3f7d68b31f9f1fc8a0d5a72a53d1`; AIG-II `0ab1be7b507e02c5000969f8476a16f891308ecb`.
**NC baseline:** Task 7 exact-SHA standalone evidence is closed and immutable. Future axis/visual work must not rewrite NC 397/476 evidence.
**Dual-project rule:** Shared architecture/policy is specified and reported once for both projects. Split AIG CNC vs AIG-II reporting only when code, version, evidence, capability, or result actually differs.

## 1. Goal

Convert the current Fourth Runtime into the authoritative mobile product runtime for HOME / CAD / CAM / SIM / 3AX / 4AX / 5AX / 6AX / NC / AI, then package that same runtime as the Android phone APK. Add the missing real 3AX–6AX GPU scenes, shared RGB Glass visual foundation, shared MotionProgram animation, adaptive layouts and Shared Settings integration without reintroducing Engineering Shell or duplicating domain truth.

The phone APK is the next primary delivery target. Android targets a Vulkan-primary / GLES-compatibility renderer strategy; Windows targets D3D12-primary / D3D11-compatibility. The platforms share scene, motion, material semantics and settings contracts, but never pretend to use the same GPU backend.

## 2. Current facts and gap

- `SceneId` already contains `HOME, CAD, CAM, SIM, AXIS3, AXIS4, AXIS5, AXIS6, NC, AI`.
- Current Fourth Runtime routes HOME/CAD/CAM/NC. In `AigGlesView.currentNodes()` unimplemented scenes fall back to HOME.
- Current `AigGlesRenderer.onDrawFrame()` draws HOME/CAD/CAM/NC and sends every other SceneId to HOME.
- Therefore AXIS3/4/5/6 are contract names without formal Fourth Runtime scene/render routes today.
- Current renderer assets contain the approved HOME wallpaper and RGB icons but not a complete axis-scene asset pack.
- Older product/runtime areas already contain axis capability, axis cockpit policy, 3AX/4AX/5AX/6AX reference assets and machine-state logic. Only reusable capability/data/reference assets may migrate; legacy activity/panel/engineering UI must not migrate into Fourth Runtime.
- Existing `MotionProgram` from NC preserves XYZABC. Existing CAM Fourth Runtime preserves XYZABC and manual avoidance. This data is the single source for future motion animation.
- Existing environment/settings code already owns FPS, power, quality, RGB, HUD, precision and visual-performance policy. New Axis scenes must consume it rather than create a second settings truth.

## 3. Approaches considered

### Approach A — Shared contracts + platform renderer adapters (selected)

Keep domain state and motion in `runtime-contract` / `production-runtime`; implement Android with Vulkan as the target primary path and GLES 3.x as compatibility/fallback, and Windows with D3D12 as the target primary path and D3D11 as compatibility/fallback. Share scene semantics, node IDs, settings and motion snapshots, but keep platform-specific GPU resource code separate.

**Why selected:** preserves real platform capabilities, keeps callbacks/data authoritative, avoids duplicated business logic, and supports Android-first delivery without blocking Windows.

### Approach B — Separate Android and Windows scene stacks with shared project data only

This is faster for one screen but duplicates scene state, control semantics, settings behavior and motion interpretation. It will drift and require repeated fixes. Rejected as the long-term architecture.

### Approach C — One fake renderer abstraction hiding Vulkan/GLES/D3D12/D3D11 differences

A single synthetic GPU backend would make settings misleading and make device/driver capability impossible to report truthfully. Rejected. Shared contracts are allowed; fake backend identity is not.

## 4. Layer ownership

### `runtime-contract`

Own immutable cross-platform DTO/contracts only:

- existing `SceneId`
- `AxisMode { AXIS3, AXIS4, AXIS5, AXIS6 }`
- `AxisPoseSnapshot(x,y,z,a,b,c)`
- `AxisMachineProfileSnapshot`
- `AxisSceneState`
- `AxisSceneCommand`
- `AxisRuntimePort`
- `MotionPlaybackState`
- skin/layout/settings identifiers needed by renderers, not GPU objects

No Android `Context`, GLES object, D3D object, bitmap or platform driver type may enter this module.

### `production-runtime`

Own authoritative state adapters and behavior:

- bridge existing axis state/capability into `AxisRuntimePort`
- consume existing CAM/NC `MotionProgram`
- own playback cursor/time/paused state
- expose machine/workpiece/tool/toolpath transforms as immutable snapshots
- never own a second copy of CAD geometry, CAM path or NC program text
- ordinary bad machine/profile data returns local `RuntimeMessage`; it must not crash or globally red-lock Runtime

### `renderer-android`

Own Android GPU presentation only (Vulkan-primary target, GLES compatibility):

- `AxisSceneHost`
- AXIS3/4/5/6 scene controllers/layouts
- mesh/material/texture/shader cache
- camera and gestures
- RGB Glass nodes
- adaptive layout
- backend-specific Vulkan/GLES draw/update/dispose lifecycle

### `product-host-android`

Own Android lifecycle, recovery binding, settings persistence wiring and APK packaging. It does not own scene/domain truth.

### Windows later

Windows consumes the same runtime contracts and scene semantics through D3D12-primary / D3D11-fallback resources. It must not reuse Android GPU objects or advertise D3D12/D3D11 features that are not actually active.

## 4A. AAA-style platform rendering split

The rendering direction follows modern large-scale 3D game architecture: one scene/motion truth, separate platform render paths and quality budgets.

### Android / phone GPU path

- target backend order: `AUTO -> VULKAN -> GLES3`
- optimize for tile-based/mobile GPUs, bandwidth and thermal limits
- dynamic resolution and resolution scale may change visual pixels only
- LOD/HLOD, frustum/occlusion culling and texture/mesh streaming are first-class
- shader/pipeline cache must reduce runtime hitching
- frame pacing and thermal governor are part of renderer policy
- 60 FPS remains the default product target; 90/120 are capability/thermal-dependent
- mobile lighting uses efficient PBR/IBL and bounded dynamic shadows rather than desktop-cost effects everywhere

### Windows / desktop GPU path

- target backend order: `AUTO -> D3D12 -> D3D11`
- D3D12 is the high-end path; D3D11 is compatibility fallback
- higher mesh/material/shadow budgets are allowed according to detected VRAM/GPU capability
- architecture may expose optional capability ports for VRS, mesh/meshlet paths, async compute, advanced shadows/GI and hardware ray tracing; none may be reported active without real support/evidence
- introduce an `UpscalerPort` so DLSS/FSR/native scaling can be selected by capability without entering CAD/CAM/NC domain logic
- NVIDIA policy A remains: read capability and optimize AIG itself, never silently mutate system/global driver policy

### Shared invariant

Dynamic resolution, LOD, upscaling, ray tracing, shader quality, backend choice and FPS are presentation controls only. They must never change `MotionProgram`, XYZABC, CAD/CAM geometry, Safe-Z, NC output, SIM material-removal math or the 0.001 mm machining precision contract.
## 5. Shared Visual Foundation

Introduce a visual contract layer with these concepts:

- `SkinPackContract`
- `SkinPackId`
- `RgbGlassTokens`
- `RgbGlassState { NORMAL, PRESSED, SELECTED, DISABLED, ALARM }`
- `AdaptiveLayoutPolicy`
- `VisualAssetCatalog`

A control node owns semantic ID + callback target. Skin changes only tokens/material/texture references. Changing skin must never change callback wiring or runtime command mapping.

Initial migration targets are the approved RGB visual families already used in the project history (`official_rgb_original`, `aig_mobile_rgb_v1`, `aigii_rgb_neon_v2`) after provenance/location is verified. If a named pack is not present in the current Fourth Runtime module, it is imported from the approved asset source as a visual resource only; no legacy screen/controller code is imported with it.

RGB Glass baseline:

- black product background
- translucent glass panel/button surfaces
- RGB edge/glow tokens
- 3D depth/shadow where supported
- explicit Normal / Pressed / Selected / Disabled / Alarm states
- Alarm applies to the local affected control/line; never a full-product red page

Shared atlas/cache should be used for common icons/borders. Scene-specific machine textures and meshes lazy-load only when that scene becomes active.

## 6. One Scene / One Renderer / No Overlay

Fourth Runtime keeps exactly one authoritative GPU presentation surface/host and one active scene at a time. The Android implementation may use Vulkan or GLES, but never mounts parallel renderers for the same active scene.

`AxisSceneHost` responsibilities:

1. accept latest requested SceneId
2. detach/dispose previous scene-owned resources before activating the next scene
3. keep shared shader/icon/label caches where safe
4. mount exactly one AXIS scene root
5. reject stale asynchronous load completion using latest-request-wins tokens
6. expose deterministic lifecycle markers for tests/evidence

No Android `Button`, `TextView`, WebView, legacy `Clean*Panel`, or second competing GPU surface may be overlaid to fake an axis page.

Required switch stress test: `3AX -> 4AX -> 5AX -> 6AX -> 3AX` for at least 100 cycles with no parallel mount, stale scene reappearance, resource leak growth, or callback cross-routing.

## 7. Axis scene graph

Each AXIS scene is built from independent nodes so visibility/material can change without replacing the whole page:

- `MACHINE_ROOT`
- `MACHINE_BASE`
- `LINEAR_X/Y/Z`
- rotary nodes as applicable
- `WORKPIECE`
- `TOOL`
- `TOOLPATH`
- `FIXTURE` / avoidance volumes when available
- `COORDINATE_HUD`
- `CONTROL_DECK`

Reference PNGs may be used as design/provenance references or textures where appropriate. They must never be rendered as a flat full-page substitute for true 3D machine/workpiece/tool motion.

### 3AX

- XYZ only
- rotary values visually neutral/zero
- real tool/workpiece transform driven by motion state

### 4AX

- XYZ + A
- A workholding/trunnion rotation visible and state-driven
- clamp/unclamp display reflects machine profile when configured; unconfigured codes remain local warnings

### 5AX

- XYZ + A/B
- kinematic template is selected by machine profile (for example trunnion vs head/table arrangement), never by drawing a different fake screenshot
- tool scale and tool translucency are visual settings
- supported rotary presentation may cover full 360-degree visual rotation while machine travel validation remains profile-authoritative

### 6AX

- XYZ + A/B/C preserved end-to-end
- initial approved product baseline is the vertical 6AX scene; do not resurrect a removed horizontal product scene without a later explicit requirement
- direct handwritten non-zero C is allowed to animate/preserve in SIM/Axis presentation
- CAM -> NC generation with non-zero C remains locally blocked until a verified 6AX post exists; visual support must not silently certify unsafe post capability

## 8. Shared Motion Runtime

Do not create a second animation data model. `MotionRuntime` consumes the existing authoritative `MotionProgram`.

The same block data drives:

- tool XYZ position
- A/B/C rotary pose
- workpiece/table pose when machine kinematics place rotation there
- visible toolpath
- HUD current coordinates
- SIM playback timing

Minimum motion semantics:

- G0: rapid segment
- G1: feed linear segment
- G2/G3: arc interpolation using existing arc I/J/K data
- cycles: represented from existing motion/cycle code without inventing unsupported machine semantics
- Safe-Z and manual avoidance: use existing CAM points/flags
- fixture/keep-out visualization: use existing configured zones; absence of a zone never means the software knows a real clamp is absent

Interpolation is a renderer/playback concern and cannot mutate `MotionProgram`, Working Copy, CAM Active or 0.001 mm source values.

True material-removal rendering remains sourced from the existing SIM engine/evidence path. If the real removal state is not available to an Axis scene, show toolpath/motion only; never fake removed material with a decorative mesh.

## 9. Controls: one-button multifunction groups

Phone UI limits persistent controls. Primary RGB Glass nodes expand contextual child actions instead of placing every action permanently on screen.

Examples:

- `VIEW` -> FRONT / TOP / ISO / FIT / HIDE TOOL / TRANSPARENT
- `AXIS` -> ZERO / JOG / LOCK / UNLOCK (only actions supported by current profile/runtime)
- `PLAY` -> START / PAUSE / STEP / RESET
- `DISPLAY` -> HUD / TOOLPATH / FIXTURE / MACHINE

The expanded group is still part of the same active GPU scene, not a platform dialog overlay. Dangerous actions stay visually separated and require explicit intent. Control minimum touch target remains 48dp.

## 10. Adaptive layout

`AdaptiveLayoutPolicy` derives layout from actual viewport width/height/density rather than device-name branches.

Rules:

- viewport gets first priority for area
- portrait: viewport above compact/function deck
- landscape: viewport plus side/bottom contextual deck according to available width
- 1080p / 2K / 3K / 4K use the same policy
- controls flow single-row, multi-row, grouped or popup based on width budget
- no fixed S23-only coordinates
- rotation must preserve scene, Motion playback position, selected group, working revision/digest and camera intent where valid

## 11. Shared Settings integration

Do not create a new settings page or duplicate setting store. Bind Axis/Visual runtime to the existing shared setting authority.

Required live consumers:

- Language: zh-TW / en-US
- Renderer backend status
- GPU 3D policy
- FPS: 30 / 60 / 90 / 120 / Auto; default 60
- Quality
- Power
- RGB brightness/glow/glass
- HUD
- coordinate precision display/input; engine stays 0.001 mm
- Skin
- tool scale
- tool translucency
- machine translucency if enabled
- axis scene quality

Android truth:

- current verified Fourth Runtime baseline = OpenGL ES 3.x; it remains the compatibility path during migration
- target backend preference = AUTO -> VULKAN -> GLES3; Vulkan becomes selectable only after a real renderer, capability probe and first-frame evidence exist
- Settings must never claim Vulkan active before that evidence exists
- emulator policy may cap FPS independently from physical-device capability
- 3D GPU rendering remains enabled; 2D acceleration may be user-policy controlled without changing geometry truth

Windows/NVIDIA policy **A** is fixed:

- AIG manages only its own `AUTO -> D3D12 -> D3D11` backend selection, FPS, Quality, Power and scene settings
- AIG may read/display NVIDIA adapter + driver status
- AIG may provide an explicit shortcut to NVIDIA/Windows graphics settings
- AIG does **not** automatically modify global NVIDIA Control Panel settings, Windows global graphics policy, driver profiles or driver installation
- lack of admin rights/driver API access must never break product startup

## 12. Android phone APK conversion

The Fourth Runtime is the APK content; APK is not a wrapper around a separate Engineering UI.

Preserve current project minimum SDKs unless a separately approved compatibility change is required. Target SDK remains the current supported project level (currently 36 in the Fourth Runtime host).

Production phone rules:

- startup -> approved RGB product flow -> HOME Runtime; no Engineering Shell
- offline-first: no network dependency for first usable UI
- portrait and landscape both supported
- settings/recovery bind before domain commands become authoritative, without blocking first visual longer than necessary
- package/version only move forward
- final phone evidence must include a physical 64-bit Android device path (S23/S23 Ultra class) in addition to emulator evidence

ABI rule: the current Kotlin/GPU APK core is bytecode and is not made “32-bit” merely because an emulator is x86. If native libraries are introduced for mesh/geometry/rendering, production native artifacts must include `arm64-v8a`; x86/x86_64 may be kept only for emulator/dev variants and must not be the only production ABI.

Release sequence:

1. Fourth Runtime debug APK for deterministic evidence
2. device install/run evidence
3. signed release APK/AAB after the same runtime gates pass
4. Windows D3D12-primary / D3D11-fallback parity after Android scene/runtime architecture is stable

## 13. Resource and performance lifecycle

- lazy-load scene-specific mesh/texture/material/shader resources
- shared RGB icons/labels/borders use cache/atlas where practical
- scene detach disposes scene-owned buffers/textures
- shared cache is reference-counted or lifetime-bound to the one active GPU host/surface
- no asset copied into every page folder solely for convenience
- render-quality/FPS/power policies may reduce visual density only; they cannot alter CAD/CAM/NC precision or MotionProgram values
- idle scenes do not keep animating off-screen

## 14. Navigation changes required

Implementation must remove the current fallback behavior for implemented Axis routes.

Required nodes/routes:

- `NAV.3AX -> SceneId.AXIS3`
- `NAV.4AX -> SceneId.AXIS4`
- `NAV.5AX -> SceneId.AXIS5`
- `NAV.6AX -> SceneId.AXIS6`

After each route exists, `currentNodes()` and `onDrawFrame()` must have explicit AXIS handling. A missing Axis runtime must yield a local unavailable message/disabled navigation state, never silently display HOME while claiming AXIS is active.

SIM is a separate route and must be implemented as a real SIM scene/consumer rather than another HOME fallback before final product completion.

## 15. Verification strategy

### Visual/layout-only changes

Run focused gates only:

- scene mount/unmount
- navigation/callback correctness
- touch target/adaptive layout
- skin token state mapping
- screenshot/image-diff evidence
- active GPU backend first frame
- no overlay / no Engineering Shell markers

Do not rerun deep geometry/motion regressions when only skin/layout tokens changed.

### Motion/axis/geometry/settings changes

Run deep regressions:

- MotionProgram XYZABC preservation
- G0/G1/G2/G3 interpolation contract
- CAM avoidance/Safe-Z
- SIM material-removal truth where applicable
- NC working/candidate/recovery invariants
- 0.001 mm precision isolation
- axis machine-profile limits
- settings renderer truth
- Android host recovery

### Required device evidence per Axis milestone

For 3AX then 4AX then 5AX then 6AX:

- exact APK SHA-256 manifest
- HOME -> AXIS route marker
- first-frame marker
- screenshot in landscape
- screenshot in portrait
- real motion state screenshot(s)
- route back/forward without stale scene
- offline launch/recovery
- rotation continuity

Final Axis integration additionally runs 100-cycle `3->4->5->6->3` switch stress and resource/lifecycle checks.

## 16. Migration order

1. Freeze NC Task 7 checkpoint/evidence.
2. Add Shared Visual Foundation contracts/tokens/layout policy with no behavior change to CAD/CAM/NC.
3. Add explicit navigation and `AxisSceneHost` lifecycle with test-only placeholder geometry, then replace placeholder with real machine node geometry before acceptance.
4. AXIS3 real scene + exact-SHA APK evidence.
5. AXIS4 real scene + A motion + evidence.
6. AXIS5 real scene + A/B motion + evidence.
7. AXIS6 vertical real scene + A/B/C motion + evidence.
8. Bind shared MotionRuntime/toolpath playback across Axis/SIM.
9. Bind Skin Pack switching and adaptive multifunction controls.
10. Bind Shared Settings live consumers and Android Vulkan/GLES capability truth.
11. Produce/install physical-phone APK evidence; then signed release packaging.
12. Implement Windows D3D12-primary / D3D11-fallback renderer parity under NVIDIA policy A.

Every implementation milestone must raise version metadata above the previous released milestone; no downgrade or overwrite of newer evidence.

## 17. Acceptance criteria

The architecture is accepted only when:

- AXIS3/4/5/6 no longer fall through to HOME in Fourth Runtime
- each Axis page is a true GPU scene with independent machine/workpiece/tool/toolpath/HUD nodes
- MotionProgram is the single XYZABC animation source
- skin changes do not change callbacks or domain state
- phone portrait/landscape are adaptive without device-specific layout copies
- no legacy Engineering Shell/panel is the product surface
- local warnings do not globally stop/red-lock Runtime
- offline first UI and recovery work
- Android reports truthful active Vulkan/GLES backend; Windows later reports truthful active D3D12/D3D11 backend
- NVIDIA global settings are not mutated
- APK evidence is exact-SHA bound and reproducible
- physical-phone run is proven before calling the mobile conversion production-ready

## 18. Explicit non-goals for this phase

- no automatic NVIDIA/Windows global driver tuning
- no fake Vulkan option
- no flat full-page PNG pretending to be machine 3D
- no importing legacy Engineering UI/activity/panel code into Fourth Runtime
- no certifying non-zero-C CAM post before its dedicated 6AX post verification
- no weakening NC/CAD/CAM exact-SHA historical evidence to make a newer build appear compatible
- no Windows D3D12/D3D11 implementation before Android Axis architecture is stable

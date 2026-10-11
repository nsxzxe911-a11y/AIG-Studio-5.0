# Fourth Runtime 3AX Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Fourth Runtime navigate to and render a real GPU-backed 3AX machine scene on Android, driven by the existing MotionProgram truth, with shared visual contracts and deterministic evidence.

**Architecture:** Add immutable Axis contracts in runtime-contract, adapt existing NC MotionProgram in production-runtime, add a latest-request-wins AxisSceneHost and shared visual policy in renderer-android, then render AXIS3 with a dedicated GLES3 3D program/mesh path. The current verified GLES3 backend remains truthful while Vulkan is a later backend milestone; no fake Vulkan claim is allowed.

**Tech Stack:** Kotlin/JVM 17, Android GLES 3.x, JUnit 4, Gradle 9.7, existing Fourth Runtime contracts/runtime adapters.

**Spec:** `docs/superpowers/specs/2026-10-10-fourth-runtime-axis-mobile-apk-design.md`

## Global Constraints

- Dual-project architecture/policy is specified once; AIG CNC and AIG-II mirror the same relative design and only report real differences.
- Do not alter frozen NC 397/476 exact-SHA evidence.
- One Scene / One Renderer / No Overlay; AXIS3 must never silently fall through to HOME.
- MotionProgram remains the single XYZABC motion source; renderer interpolation never mutates it.
- Rendering quality, LOD or backend choice cannot change 0.001 mm CAD/CAM/NC/SIM truth.
- Current verified Android backend is GLES3; Vulkan must not be reported active before a real Vulkan renderer and first-frame evidence exist.
- No Engineering Shell, WebView, legacy Clean panel, second GLSurfaceView, or flat full-page PNG pretending to be 3D.
- Default frame target remains 60 FPS; higher rates are capability/thermal policy, not this milestone.
- Version numbers only rise after the 3AX milestone passes.

## Review Focus

- Empty or null MotionProgram: AXIS3 still mounts a real machine scene at X/Y/Z = 0 with a local no-motion state, not HOME fallback.
- Motion blocks with omitted coordinates: pose resolution carries forward the previous axis value instead of resetting an axis.
- Rapid scene switching: stale AXIS3 activation cannot reappear after a newer HOME/CAD request.
- Portrait/landscape: viewport/control deck remain inside bounds and navigation touch targets stay >= 48dp.
- GL lifecycle recreation: 3D program/mesh resources can be recreated and released without retaining stale scene-owned objects.

---

### Task 1: Axis contracts

**Files:**
- Create: `runtime-contract/src/main/kotlin/com/aigstudio/runtime4/contract/AxisContract.kt`
- Test: `runtime-contract/src/test/kotlin/com/aigstudio/runtime4/contract/AxisContractRegression.kt`
- AIG-II mirror: same relative paths under package `com.aigii.runtime4.contract`.

**Interfaces:**
- Consumes: existing `SceneId`, `MotionProgram`, `RuntimeMessage`.
- Produces: `AxisMode`, `AxisPoseSnapshot`, `AxisSceneState`, `AxisRuntimePort`.

- [ ] Step 1: Write failing tests proving 3AX zeroes A/B/C, finite pose validation, and initial state uses AXIS3 at XYZABC zero.
- [ ] Step 2: Run `:runtime-contract:test` and verify RED because Axis contracts do not exist.
- [ ] Step 3: Implement minimal immutable contracts; no Android/GPU types.
- [ ] Step 4: Run `:runtime-contract:test`; expected PASS.
- [ ] Step 5: Commit `feat(runtime4): add shared axis contracts`.

### Task 2: MotionProgram axis adapter

**Files:**
- Create: `production-runtime/src/main/kotlin/com/aigstudio/production/runtime/FourthAxisRuntimeAdapter.kt`
- Test: `production-runtime/src/test/kotlin/FourthAxisRuntimeAdapterRegression.kt`
- AIG-II mirror: package prefix `com.aigii.production.runtime`.

**Interfaces:**
- Consumes: `NcRuntimePort.snapshot().motionProgram`, `AxisMode`, `AxisSceneState`.
- Produces: `FourthAxisRuntimeAdapter(ncRuntime: NcRuntimePort) : AxisRuntimePort` and `snapshot(mode: AxisMode, blockIndex: Int = last)` semantics.

- [ ] Step 1: Write failing tests for empty MotionProgram, carry-forward XYZ, and 3AX suppression of A/B/C even if source blocks contain rotary values.
- [ ] Step 2: Run `:production-runtime:test`; expected RED because adapter is missing.
- [ ] Step 3: Implement minimal snapshot resolution over authoritative MotionProgram without mutating NC state.
- [ ] Step 4: Run `:production-runtime:test`; expected PASS.
- [ ] Step 5: Commit `feat(runtime4): adapt motion program for axis scenes`.

### Task 3: Shared visual foundation and AxisSceneHost

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/skin/SharedVisualPolicy.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/AxisSceneHost.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/Axis3SceneLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/scene/HomeSceneLayout.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/AxisSceneHostRegression.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/Axis3SceneLayoutRegression.kt`
- AIG-II mirror: same relative files under `com.aigii.runtime4.renderer`.

**Interfaces:**
- Consumes: `SceneId.AXIS3`, `AxisMode.AXIS3`, existing SceneRouter and SceneNode/RgbGlassButtonNode.
- Produces: explicit `NAV.3AX -> AXIS3`, latest-request-wins host generation token, `AXIS3.VIEWPORT`, navigation/control nodes.

- [ ] Step 1: Write failing tests for latest-request-wins activation, explicit AXIS3 node tree, 48dp minimum controls, and portrait/landscape bounds.
- [ ] Step 2: Run `:renderer-android:testDebugUnitTest`; expected RED because host/layout do not exist.
- [ ] Step 3: Implement host/layout and wire `NAV.3AX`; no legacy overlay and no HOME fallback for AXIS3.
- [ ] Step 4: Run renderer unit suite; expected PASS.
- [ ] Step 5: Commit `feat(runtime4): route fourth runtime to axis3 scene`.

### Task 4: True GLES3 3D scene

**Files:**
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/Gles3dProgram.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/Axis3Mesh.kt`
- Create: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AxisRendererStateSource.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt`
- Modify: `renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt`
- Modify host wiring where `AigGlesView` is constructed to provide `AxisRuntimePort`.
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/Axis3MeshRegression.kt`
- Test: `renderer-android/src/test/java/com/aigstudio/runtime4/renderer/Axis3RendererContractRegression.kt`

**Interfaces:**
- Consumes: `AxisRuntimePort.snapshot(AXIS3)`, `AXIS3.VIEWPORT` bounds.
- Produces: real 3D vertex/normal/index data for machine base, column, table, workpiece and tool; perspective/view/model transforms in GLES3; explicit AXIS3 render path.

- [ ] Step 1: Write failing tests proving mesh has non-coplanar Z coordinates, independent machine/workpiece/tool node ranges, finite bounds, and AXIS3 renderer path cannot call HOME fallback.
- [ ] Step 2: Run renderer unit suite; expected RED.
- [ ] Step 3: Implement GLES3 depth-tested 3D shader/mesh draw path and bind pose XYZ to tool/workpiece transform; UI/HUD stays on existing 2D pass.
- [ ] Step 4: Run `:runtime-contract:test :production-runtime:test :renderer-android:testDebugUnitTest`; expected PASS.
- [ ] Step 5: Commit `feat(runtime4): render real gles3 axis3 machine scene`.

### Task 5: Version, APK and Nox evidence

**Files:**
- Modify only current Fourth Runtime Android version metadata for an upward milestone bump.
- Create new evidence directory for this 3AX milestone; do not overwrite NC evidence.

**Interfaces:**
- Consumes: the exact committed runtime from Tasks 1-4.
- Produces: debug APK SHA-256, HOME->3AX marker, GLES first-frame marker, landscape screenshot, portrait screenshot, rotation-back continuity and offline launch evidence.

- [ ] Step 1: Bump AIG CNC above 397 and AIG-II above 476 without changing package identity unexpectedly.
- [ ] Step 2: Run fresh focused suites plus current CAD/CAM/NC regression tasks; expected all PASS.
- [ ] Step 3: Assemble debug APKs and record exact SHA-256.
- [ ] Step 4: Install on Nox, launch Fourth Runtime, navigate HOME->3AX, capture logcat and landscape/portrait screenshots; verify real 3D geometry is visible and no Engineering Shell appears.
- [ ] Step 5: Verify offline launch and rotation continuity, record evidence manifest, commit evidence and verifier without modifying older manifests.
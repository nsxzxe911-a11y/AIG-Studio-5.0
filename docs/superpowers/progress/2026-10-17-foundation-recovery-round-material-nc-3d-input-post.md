# AIG Foundation Recovery Audit — Material / NC-first / 3D / Input / Post

Status: **PENDING_EXECUTION**
Date: 2026-10-17
Studio branch: `architecture/page-autonomy-ai-orchestrator-after-588`
Parent master backlog: `docs/superpowers/progress/2026-10-17-dual-project-foundation-recovery-backlog.md`

## Rules

- Inventory only; do not merge to `main` from this audit.
- Do not bump version from inventory work alone.
- Forward-only: keep newer current implementations and recover mature missing foundations around them.
- No runtime PASS claim without fresh Android/Windows/Web + dual-project Gate evidence.

## Material removal evidence chain

| Foundation | Status | Evidence | Integration target | Do-not-regress |
|---|---|---|---|---|
| Numerical material removal field | ALREADY_IN_RUNTIME | Current `Machining3D.kt`: `MaterialRemoval3D.simulate()` carves `RemovalField3D` from actual toolpath motion | Keep core | No video/fake removal substitute |
| Numerical removal evidence | ALREADY_IN_RUNTIME | Current `SimPageRuntime.kt`: `removedCells`, `removedVolumeMm3`, mesh vertex/triangle evidence and progressive single-block recalculation | Keep PageRuntime evidence | Numeric evidence remains derived from removal field |
| Progressive visible removal | ALREADY_IN_RUNTIME / ANDROID | Current `Machining3DView.kt`: progressive frames, fresh-removal frontier, material depth occlusion and tool/contact visualization | Keep Android renderer | Visuals never replace numeric machining truth |
| Formal cross-platform SIM evidence surface | FOUND_PENDING_INTEGRATION | Numeric evidence is in `SimPageRuntime`; formal Android/Windows/Web PageRuntime entry is still covered by Task 9 master backlog | SIM HUD/result panels on all platforms | Same removed-volume evidence across platforms |

## NC-first

| Foundation | Status | Evidence | Integration target | Do-not-regress |
|---|---|---|---|---|
| 3AX/4AX/5AX/6AX NC-first subpage IDs | CORE_PRESENT_RUNTIME_PENDING | Current `AxisPageRuntime.kt` + per-axis manifests expose `.NC_FIRST.OPEN/.PARSE/.PREVIEW` | Formal second work page on each axis department | Keep formal RGB UI; never engineering shell |
| Axis applicability precheck | ALREADY_IN_RUNTIME | `AxisPageRuntime.parseNc()` rejects unsupported A/B/C words for each axis mode | Keep as fast local precheck | This precheck is not a substitute for Fanuc parser/safety |
| Full NC-first pipeline | CORE_PRESENT_RUNTIME_PENDING | Current axis preview stops at `previewLevel=AXIS_WORD_TRACE`; mature `NcPageRuntime` and `Machining3D/SimPageRuntime` exist separately | Adapter: NC text -> Fanuc parse -> 3D path -> material removal -> SIM safety -> NC verify/output | NC-first must work without CAD/CAM and still obey safety gates |
| NC verify/output interlock | ALREADY_IN_RUNTIME | Current `NcPageRuntime.kt`: PARSE -> PREVIEW -> VERIFY -> PREPARE; machine send additionally requires `machineConnected` | Reuse from NC-first | Never bypass VERIFY/PREPARE for speed |

## 3D machine visuals / GLB / PBR

| Foundation | Status | Evidence | Integration target | Do-not-regress |
|---|---|---|---|---|
| Procedural true 3D machine mesh | ALREADY_IN_RUNTIME / ANDROID | Current `MachineModel3DBuilder` builds BASE/COLUMN/TABLE/TRUNNION/A/B/C/FIXTURE/SPINDLE/HOLDER/TOOL meshes; `Machining3DView` renders them with live A/B/C kinematics | Keep as fallback/core visual | Do not regress to blocky/fake static shell |
| Live material/tool/machine compositing | ALREADY_IN_RUNTIME / ANDROID | Current `Machining3DView`: material mesh, toolpath occlusion, progressive cutting, tool stack, axis cue | Keep | Machining coordinates remain core truth |
| GLB/glTF model loader | SPEC_GAP | No verified `.glb`, glTF loader or mature loader implementation found in current Studio recovery branch or current AIG-II default audit | New 3D asset loader only after core safety/runtime closure | Do not claim procedural mesh == GLB authority model |
| PBR material pipeline | SPEC_GAP | No verified PBR material/texture pipeline found in current Studio recovery branch or current AIG-II default audit | New renderer/material layer | PBR must not change kinematics or collision truth |
| 3AX–6AX Authority machine images | AUTHORITY_SOURCE | Existing approved/reference axis visual assets remain visual targets only | GLB/PBR/procedural visual validation | Authority images are not runtime implementation evidence |

## Input devices / S Pen

| Foundation | Status | Evidence | Integration target | Do-not-regress |
|---|---|---|---|---|
| Generic multi-touch machining-view pan/zoom | ALREADY_IN_RUNTIME / ANDROID | `Machining3DView`: `ScaleGestureDetector`, two-pointer centroid pan, one-pointer orbit | Keep | Gesture errors must not reset machining state |
| S Pen pressure | SPEC_GAP | No verified `TOOL_TYPE_STYLUS`/pressure handling found in current Studio or current AIG-II audit | Android CAD/input adapter | Pressure must never alter geometry precision implicitly |
| S Pen hover / side button | SPEC_GAP | No verified dedicated stylus hover/button implementation found | Android CAD/input adapter | Map only to explicit UI tools/actions |
| Palm rejection / stylus-touch arbitration | SPEC_GAP | No verified dedicated implementation found | Android input policy | Preserve two-finger gestures when stylus is not active |

## CAD Import/Export and Fanuc Post

| Foundation | Status | Evidence | Integration target | Do-not-regress |
|---|---|---|---|---|
| DXF ASCII codec | FOUND_PENDING_INTEGRATION | Current Studio `CadAdvancedTools.kt` contains `CadDxfCodec.exportAscii/importAscii` for LINE/CIRCLE/ARC | `CAD.FILE.IMPORT/EXPORT` | Do not rewrite codec; preserve 0.001 mm semantics |
| Current CAD file PageRuntime | CORE_PRESENT_RUNTIME_PENDING | `CadPageRuntime` has true OPEN/SAVE/IMPORT/EXPORT callbacks, but currently all use private `CadPageCodec`, not DXF | File-type-aware adapter around Project/DXF codecs | Internal project serialization and DXF must remain distinct |
| CAM post-preview button | CORE_PRESENT_RUNTIME_PENDING | Current `CAM.POST_PREVIEW.GENERATE` generates/validates toolpaths and returns path evidence, not Fanuc G-code | Connect mature post generator as explicit post preview/output | Do not label toolpath preview as NC Post |
| Mature Fanuc Post generator | FOUND_PENDING_INTEGRATION | Current AIG-II `shared/aigii/Core.kt` has `FanucPost.generate(state)`; it blocks stale CAM and invokes machining safety; runtime surface references it | Port/adapt into current Studio NC/Post contract | Preserve G90/G54/G43, compensation, subprogram/cycle semantics and safety validation |
| Studio NC output safety | ALREADY_IN_RUNTIME | Current `NcPageRuntime`: verified/prepared state required before NC_MACHINE export/send | Reuse after Post generation | Post generation must not weaken NC verification |

## Execution additions

1. Keep existing highest priority: fix SIM formal ACCEPT so unmodeled fixture coverage cannot pass formal acceptance.
2. Complete formal PageRuntime entry wiring so existing SIM numeric evidence reaches Android/Windows/Web UI consistently.
3. Extend each 3AX–6AX NC-first subpage from axis-word trace into the existing `NcPageRuntime` + `Machining3D/SimPageRuntime` chain.
4. Wire current `CadDxfCodec` into explicit DXF IMPORT/EXPORT without replacing internal project serialization.
5. Adapt mature AIG-II `FanucPost` into Studio POST PREVIEW/output, preserving Studio NC safety interlocks.
6. Keep current procedural true-3D renderer as working baseline; implement GLB/PBR as a new visual layer only after runtime/core safety closure.
7. Add S Pen-specific pressure/hover/button/palm-rejection support as new Android input work; no mature recovery implementation was verified.

## Boundary

This audit is recovery evidence only. It does not prove builds, runtime screenshots, APK/EXE, GLB/PBR assets, S Pen behavior, or completed cross-platform entry wiring. Those remain pending until fresh executable verification is produced.

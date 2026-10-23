# AIG Real3D Stage1｜真正 4K 渲染引擎與鏡頭自適應施工斷點（2026-10-23）

User directive: 「改 4K畫質的渲染引擎 鏡頭自適應」. Current PR #44 is still Draft on `verify/real3d-unified-appearance-3-5-20261023`; this is SOURCE work, not formal Render deployment/APK/EXE.

## 4K contract
- OUTPUT: **exact 3840×2160** landscape (8,294,400 actual GPU pixels), **2160×3840** portrait, directly rasterized by **existing, sole PhotoViewer WebGLRenderer** into a temporary WebGLRenderTarget. Real PNG byte header (IHDR width/height) must exactly match the rendered target, and SHA-256 is calculated from PNG bytes. No upscaling existing 320×560 phone screenshot; no second WebGL context, no source image billboard or fake reference display.
- PRESERVE: canonical source **mm with 0.001 mm integer tick precision**, renderer adapter 1mm=0.001 existing Three.js world units, shared Real3D logical work scheduler **19,200 reserved slots** (not hardware GPU/CPU cores), individual male briefs/female one-piece anatomy, original GLB/room/workflow, RGB workspace, Source Vault, and all prior failed Stage1 snapshots.
- Before allocating a true 4K render target, check ACTUAL WebGL `MAX_TEXTURE_SIZE`, `MAX_RENDERBUFFER_SIZE`, lost context and memory hint. If unsupported, clearly BLOCK and do not return enlarged 2K or a fake PASS.
- **Adaptive preview** `off/adaptive/quality/economy` uses actual canvas CSS width/height, DPR, device memory hint and real GPU texture limits with conservative pixel budget (<=8.29 MP desktop and <=4.15 MP phone), then automatically updates real render buffer without changing the CSS aspect or changing any model measurements. GPU policy and recording/movie quality cannot silently conflict.
- **Adaptive camera** `fitHumanToView` always sees complete real 3D body XYZ AABB. Perspective camera is computed independently for each 4K target aspect, front/profile/rear/45°, and refitted if phone rotation or viewport resizing changes the live aspect. Screen snapshots no longer crop/stretch limbs just because user changes window size.
- Capture output runs one GPU frame and readPixels for each snapshot, restores previously active render target and viewport/scissor state, disposes GPU target, then encodes real RGBA PNG; source scene/camera remain untouched. Multiple requested 4K angles are sequential, never 4 parallel 4K GPU buffers.
- UI buttons: preview adaptive profile; PNG orientation landscape/portrait; export current real GPU 4K view, or full 4-camera 4K views, each with download link and SHA; error stays visible. Old snapshot remains viewable; a new model invalidates old snapshot *evidence*.
- **Source visual Gate remains FAIL/BLOCK.** 4K resolution cannot fix anatomy, uncanny face, cloth penetration, bone deformation or actual portrait likeness. Full 4K on phone is output option only if its GPU supports it, not a guaranteed realtime 4K 60 FPS claim.

## Actual code touched
1. `aig-stage1-4k-adaptive-render.mjs`: resolution budget/capability/aspect planner + exact PNG raster requirements (pure module).
2. `aig-stage1-true4k-capture.mjs`: actual Three.js offscreen 4K render, camera reframe and PNG readback.
3. `viewer.mjs`: 4K-adaptive preview modes on the EXISTING renderer; existing GPU governor and movie policy respected.
4. `aig-stage1-dual-adult-runtime.mjs`: stage UI controls, adaptive renderer preview, four 4K output buttons, downloads, SHA/PNG metadata, sequential GPU capture, full-body camera refit on window rotation and prior quality restoration upon Stage1 close.
5. `scene-runtime-studio.html`: native UI controls.
6. `tests/aig-stage1-4k-adaptive-render.test.mjs`: exact 4K/non-upscale GPU limits, viewport budget and correct PNG metadata tests.
7. `tests/aig-stage1-dual-adult.real-browser.mjs`: real phone/desktop Stage1 previews, **one actual 3840×2160 GPU PNG on desktop male**, verify decoded image size and downloaded PNG IHDR. Four per-body ordinary webGL views remain separate with SHA; the new true4K image is extra.
8. `.github/workflows/aig-real3d-3-5-unified-appearance-gate.yml`: Stage1 job enforces new source/unit/browser tests and requires the real 4K screenshot artifact.

## Status
Source edits committed to Draft PR #44. Latest CI checks at checkpoint are **queued**; NO actual 4K render/Gate PASS or user visual approval claim until exact successful run and captured screenshot is opened/inspected. Official Render site, APK, EXE **NOT** updated. AIG-II/CNC unaffected.

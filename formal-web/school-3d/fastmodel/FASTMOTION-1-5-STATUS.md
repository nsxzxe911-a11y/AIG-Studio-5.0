# FastModel 1.5 — Responsive preview and model-integrity performance

Incremental from FastModel 1.4 on GitHub Draft PR #12, without a merge/deployment to AIG formal Render site or changing Android APK / Windows EXE / CNC.

## Implemented
- 1080p 1920×1080 remains the UI default; QHD 2560×1440 and UHD 3840×2160 remain selectable. No RTX/DXR/path tracing; WebGL2 raster-only policy unchanged. Clean surface and wire OFF remain defaults.
- Three display-only quality modes, default auto, full, eco. Optional LOD is **opt-in in the GLB metadata**: material.extras.aigOptionalRenderDetail === true AND material.extras.aigOptionalGroup in fine-hair / foliage / water-foam AND not the editable core. Names or skin index are NOT sufficient. Unknown mesh/face/neck/scalp is structural and not culled.
- Hysteresis uses actual browser rAF p95: 18 slow frames or explicit memory pressure hides only marked optional batches. 180 cool frames can restore them; user switching to full restores immediately. The vertex and index GPU buffers and source GLB are not deleted by automatic LOD. An all-optional scene is never hidden entirely.
- Manual button to release hair GPU cache is restricted to **explicitly tagged fine-hair only**; auto memory pressure no longer deletes skin===1 meshes. Face/neck/unknown hair cannot be destructively removed because of skin numbering. Optional manual release is not instantly restorable; reimport original GLB to recreate optional visual buffers, and no editable batches are eligible.
- Static pose cache: when wind/animation off (or no rotation tracks), recompute and upload bone matrices only on pose transition; animated scene still updates per frame.
- Browser tab visibility stops rAF rendering in hidden tab and resumes only when not user-paused.
- Added on-page session-only Browser rAF FPS and p95 baseline/compare after >=60 frame samples, explicitly NOT a GPU timestamp or proof of device 60FPS. Active draw-call count and marked/hidden batch telemetry are exported.

## Not implemented / release BLOCK
- Automatic semantic AI classification, real camera/LiDAR/photo light-field scan, 3D landscape/foliage/water/sky generation, skeleton-bound physical supports, collision/IK.
- Real DX12/Vulkan engine, real device Windows/S23 FPS/thermal or 4K measurements, approved cinema-grade heroine. No approval of 1080p60 or GPU frame time.
- CI's GLB is SYNTHETIC; test success means source/packaging correctness only.
- True optimized hair-card material metadata depends on future tagged authoring. If GLB has no opt-in tags, no hidden optional geometry is claimed.

## Verification
- Node tests: adaptive-detail and existing renderer regression, original full JS suite; GitHub source Gate includes synthetic standalone test, original C++ CTests and raster-only tests. Only completed/success on the exact latest SHA is a valid checkpoint.
- PR remains Draft; no automatic merge or production deployment.

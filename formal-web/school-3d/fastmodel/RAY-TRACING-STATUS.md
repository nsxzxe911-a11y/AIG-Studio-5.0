# AIG FastModel Cinema 1.2 — raster-only policy, no DXR

Existing branch already had `web/graphics-policy.mjs` and its fail-closed tests. Rather than create an overlapping second controller, **this update reuses the existing canonical `GRAPHICS_POLICY` and `assertRasterOnly`** in the live WebGL2 renderer, UI and offline bundle. The duplicate experimental `render-policy.mjs` is removed from GitHub.

- Ray tracing, DXR, Vulkan RT, ray-query, path-tracing, and RTX GPU requirements remain OFF.
- Default remains WebGL2 raster, 1080p target with optional 720p/QHD/4K settings. No native DX12/Vulkan renderer yet.
- The female hero's new high-fidelity still is **reference only** (`references/hero-3d-still-REFERENCE-ONLY.json`), not a real 3D GLB, animation or movie.
- GPU FPS, cinematic identity and real S23/Windows device benchmarking remain unverified.
- PR #12 remains Draft and is not deployed to the original AIG CNC Runtime, APK or EXE.
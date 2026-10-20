# AIG FastModel Cinema 1.2 — No-Ray-Tracing Policy

Current runtime path is WebGL2/GLSL rasterization. No native DX12 or Android Vulkan renderer has been implemented yet; **no DXR, RTX, hardware ray-tracing or path-tracing feature is active or required**. Existing shader uses texture + base color, **not a finished physically accurate PBR or movie-grade lighting system**.

To enforce the user's decision:
- `web/render-policy.mjs` fixes all ray/path/DXR features to OFF and rejects requests to turn them on.
- `web/renderer.mjs` enforces this at construction before acquiring the real WebGL2 raster context.
- `web/index.html` clearly shows “光線追蹤：關閉（OFF）”. It is truthful status, not a fake button.
- Offline bundled HTML includes the exact enforced module.
- `tests/no-raytrace.test.mjs` and CI test implementation; no requirement for a named GPU generation.
- The newly generated character still is only a 2D image conveying a 3D-rendered look; recorded SHA in `references/hero-3d-still-REFERENCE-ONLY.json`. It does not replace the Phase17 3D GLB until real mesh visual Gate passes.

This does not assert GPU 60fps/2K/4K has passed. Original CNC, Android APK and Windows EXE remain untouched; PR stays draft.
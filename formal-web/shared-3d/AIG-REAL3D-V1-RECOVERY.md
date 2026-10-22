# AIG Three-Project Real 3D Drawing Engine V1 — recovery checkpoint

Date: 2026-10-22, Asia/Taipei. User instruction: "卡到閃退 最後斷線點接回".

## Architecture and trustworthy source

Canonical forward-only source under `formal-web/shared-3d/`:
- `aig-real3d-core.mjs`: explicit SceneGraph, MM/METERS/RELATIVE units, indexed XYZ meshes, bounding boxes, hierarchy transforms, read-only G0/G1 overlay contract.
- `aig-real3d-webgl.mjs`: real browser WebGL1/2 indexed triangle draw, normals and bounded diffuse/specular light, depth testing, perspective/orthographic camera; explicitly not full ray tracing/PBR or material removal.
- `aig-real3d-adapters.mjs`: CNC 3AX/5AX demo + consumer-specific read-only AIG-II / AIG Studio 5.0 snapshot contract, FastModel relative environment. No CNC commands, stock removal or collision completion.
- `aig-real3d-lab.html` + `aig-real3d-lab.mjs`: separate approved RGB workshop, 3AX/5AX/FastModel profile selector, real mesh motion, view orbit/pan/projection, per-render evidence JSON.
- FastModel's offline `build.mjs` copies this exact source folder into `dist/shared-3d/`. The old 7.0–7.12 FastModel workspaces and AIG-II axis runtime have not been replaced.

### Verified bug evidence and repairs

1. GitHub run `39783555691` failed numerical test 7 because invalid XYZ and unsupported path types both returned `ONLY_EXPLICIT_LINEAR_SEGMENTS_SUPPORTED`; repaired with separate `AIG3D_VECTOR_INVALID` versus `AIG3D_ONLY_EXPLICIT_LINEAR_SEGMENTS_SUPPORTED` gates.
2. GitHub run `39783984279` passed 7/7 numerical tests + offline packaging but real phone Chromium failed: `Failed to execute 'uniformMatrix4fv' ... callable @@iterator property`. Root cause was passing the `identity` function to the GL uniform instead of `identity()` returning a Float32Array. Fixed in `aig-real3d-webgl.mjs`, no artificial image substituted.
3. High-resolution crash guard: raster canvas capped to approximately **1,050,000 GPU pixels** for each frame, nonuniform normals corrected, a 200,000 triangle render budget, no endless RAF render loop, and shader/WebGL setup failure is caught by the independent RGB lab without destroying upstream source data.
4. Existing FastModel core-lock previously failed from a modified `index.html`; byte-level comparison proved that stripping additive responsive CSS and the workbench navigation row returns an **exact byte-identical** earlier locked file. The lock manifest was updated only for `index.html`, retaining the original locked SHA as audit evidence and leaving all animation/CNC core files unchanged. The core-lock job subsequently observed as success in the latest preflight.

### Gate

- Independent numerical: `tests/aig-real3d-shared-v1.test.mjs`, 7 unit tests.
- Actual Chromium: `tests/aig-real3d-shared-v1.real-browser.mjs`: phone 360x780, desktop 1440x900, true compiled WebGL, pixels changed after camera projection and real object transform, 3-project source isolation, 1.05 MP framebuffer budget, screenshots.
- CI: `.github/workflows/aig-shared-real3d-v1.yml`. The source-check and numerical/build stages are PASS in run 39784637642; final browser status must be checked **before promoting**.
- NO VERIFIED: actual full-machine 3AX–6AX mechanical kinematics, any original 10/5 authority machine GLB, Fanuc NC execution, stock material removal, micron-class rendering, native APK/EXE 60fps, authentic user heroine geometry, React/Android device crash resolution.
- Do not deploy an unverified WebGL feature into the original AIG Render site. Mirror only after independent browser proof; if Browser GPU Gate RED, fix and repeat.

## Next safe step

Inspect GitHub run `39784761528` and/or latest `AIG Three-Project Shared Real3D True WebGL V1 Gate`; recheck both device screenshots. If PASS, mirror exact source to `web/aig-dual-formal-runtime-20261016/formal-web/shared-3d/` without replacing existing CNC runtime, then verify Render deployed SHA and production HTTP or call unavailable honestly. Preserve user-approved layout and no engineering-shell fallback.

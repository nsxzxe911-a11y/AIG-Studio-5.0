# FastModel 2.7 website integration

Published at `/fastmodel/` on the existing AIG static site. This directory is the **static website frontend**, distinct from the Python Meshy pipeline on the development branch / Draft PR #12.

- Photo → local 2.5D brightness relief → quaternion sway animation → self-contained textured GLB.
- Photo stays in the browser; no provider calls, API keys or inference charges.
- Existing self-contained GLBs can be loaded with their original PBR materials and TRS/morph/skeletal clips. External asset URLs are rejected.
- Brightness relief is not neural depth, complete 3D reconstruction, segmentation, automatic rigging, walking or photorealism. Hidden surfaces are not reconstructed. Video export, heroine repair and device 60 FPS remain unverified.
- The Render service is a static site. Full generation needs a private authenticated backend, protected credentials and persistent per-user jobs. None is falsely represented as deployed here.

## Rebuild

From this directory: `npm ci`, `npm test`, `npm run build` (Node >=20). Build output is committed to `formal-web/fastmodel/` because the existing Render build only publishes `formal-web/` without running npm. Three.js 0.180.0 MIT and esbuild 0.25.12 are pinned in the lockfile; dependencies are bundled locally with no CDN.

Tests check grid bounds/aspect/UVs, GLTFExporter → GLTFLoader round trip and animation playback/pause, and TRS/morph channels. No real photo quality or device FPS acceptance is implied.

Deployment base: official website branch `web/aig-dual-formal-runtime-20261016` at `9539335d74cdbb7b6023e0492a9839d330160ac8`; only an additive home entry and this new tool are changed. Existing native download links, original GLBs, materials and other pages are preserved.

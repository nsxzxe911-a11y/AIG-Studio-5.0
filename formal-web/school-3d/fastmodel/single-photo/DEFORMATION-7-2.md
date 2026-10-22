# FastModel 7.2 — 3D deformation and collision stage

2026-10-22. Forward-only from trusted 7.1 SDF. **Do not equate this experiment with a recovered human face, real portrait scan, calibrated skin material, or native APK/EXE.**

## What was wrong with previous ghost-like characters?

Verified historical source `aig-native-appearance-5-7.mjs` is an explicitly procedural technical draft: code-authored face features, hair strands, garments, body and fixed colors. Those visuals were not recovered from the supplied reference photo. FastModel 7.1 builds real 3D implicit geometry but estimates unobserved Z thickness. The missing step is source-conditioned anatomical reconstruction and independent appearance QA; changing the scan label, wireframe or frame rate alone does not fix that.

## 7.2 source delivered

- `aig-volumetric-deform-7-2.mjs`: signed tetrahedral lattice (explicit XYZ points), positional edge constraints, signed tetrahedral volume constraints, kinematic top-plane control, gravity, 3D spherical obstacle projection, positive-volume inversion audit, inverse-mapped deforming SDF sample, ray-surface intersections and normals.
- `volume-lab.html` + `volume-lab.mjs`: original AIG RGB-style standalone phone/desktop UI with local PNG/JPEG/WebP, alpha/background segmentation, explicitly estimated thickness, X/Z control, step, play/pause, reset, contact, viewport rotation, measured JSON. No network upload or third-party generative avatar.
- `tests/aig-volumetric-deform-7-2.test.mjs`: real numerical 3D tetra constraints, displacement, pinned XYZ controls, collision pushback, changed deformed SDF and ray rendered pixels, invalid inputs.
- `tests/aig-volumetric-deform-7-2.real-browser.mjs`: synthetic source PNG, phone/desktop actual browser controls, changed pixel output, non-inverted tetras and collision evidence. Browser synthetic test is **not** an authentic human scan.
- Existing 6.9.5, 7.0 and 7.1 pages remain separately available. The 7.2 files are also mirrored into the original AIG website `formal-web/fastmodel/` branch. Read GitHub and Render deployed SHA separately.

## Gate

- `NUMERICAL_3D_PBD_PASS`: finite nonzero XYZ displacement, positive signed tetra volume ratios, source intact, independent collided-node measurements.
- `TRUE_CHARACTER_3D_PASS`: **BLOCKED** until original reference fidelity, actual joint bones/weighting, all visible and inferred body structures, articulated animation, self-contact and hair/neck/no-ghost QA in real rendered frames.
- `REAL_MATERIAL_FEM_PASS`: **BLOCKED**; 7.2 is experimental PBD constraints, not calibrated cloth/skin constitutive law.
- `NATIVE_60_FPS_PASS`: **NOT VERIFIED**. CPU scene deliberately downsampled, not a native phone/Windows benchmark.
- `WEBSITE_LIVE_PASS`: **NOT VERIFIED** until Render commit and actual served files match the new source.

## Engineering follow-up

1. Real photo segmentation QA: maintain image evidence and semantic region constraints; avoid deriving missing limbs directly from silhouette widths.
2. Joint skeleton and volumetric rigged skin with true per-frame influence and deformation evidence; maintain natural reference appearance instead of fabricated technical primitives.
3. 3D self-contact/collision and sampled motion playback; reject inverted tetra volume and double-skin/z-fighting geometry.
4. Continuous device performance, safe memory budget and real source-output artifact SHA; no automatic CNC or private-photo upload.

# AIG FastModel 7.8 — genuine XYZ spatial head-neck articulation

Checkpoint: 2026-10-22. Forward-only from 7.7 PASS `df0be21c9cfab1d1d5eb45761677b63f1900f8d1`.

## What is genuinely 3-dimensional now

- In 7.7, the photo-anchored hair and neck were separate estimated *world-Z* layers, with actual 3D SDF/ray hits. 7.8 adds **head-object rotation in three independent spatial axes**: local yaw (turn), pitch (look up/down) and roll (tilt), without using camera movement to fake head motion.
- `aig-spatial-rig-7-8.mjs` derives the neck hinge from the user's reviewed 2D source-neck mask; this is still **not a measured true 3D anatomical joint**.
- `createAIG78SpatialPose()` enforces bounded spatial angles; `warpAIG78Spatial()` rotates world XYZ around a neck pivot with a smoothly varying neck weight, keeping the lower neck anchored. Optional bounded hair-layer sway moves actual estimated XYZ geometry.
- `invertAIG78Spatial()` maps the moving world-space 3D object back to reference 7.7 XYZ; subsequent 7.7/7.6/7.5 inverse deformation returns original photo material UV. A rotation changes actual ray geometry, not just frame/texture pixels.
- `auditAIG78Spatial()` checks 7.7 and prior 7.5/7.6 gates, 3D Jacobian signed determinant, inverse residual, neck seam discontinuity and sampled user-marked hair-to-neck distance. Missing hair/neck collision samples fail closed. Conservative hair-to-neck *envelope* check, not per-strand physics.
- `renderAIG78SpatialAvatar()` raymarches real spatially transformed SDF and source material; original unseen rear remains neutral instead of a mirrored face. CPU capped preview deliberately does not claim 60 FPS.
- `spatial-studio.html` + `spatial-studio.mjs`: independent formal dark/RGB character editor, original photo input, review ten source XY facial landmarks, paint and review hair/neck masks, adjust source Z, edit three head rotation axes, head-neutral and local demo, orbit camera, quality evidence JSON.
- `tests/aig-spatial-rig-7-8.test.mjs` and `tests/aig-spatial-rig-7-8.real-browser.mjs`: prove signed XYZ changes, lower-neck anchor, inverse roundtrip, hair/neck collision sampling, photo-source front and no ghost back, phone and desktop synthetic fixture. The tests use synthetic photo masks and are **not** a real user heroine visual review.
- No changes to CNC/machine G-code, CAD/CAM/SIM/NC core, or the previously approved 7.0–7.7 geometry. The prior character projects remain isolated.

## Acceptance and remaining gaps

- SPATIAL_XYZ_ARTICULATION: measured numerically after this source/test Gate.
- CONTINUOUS_NECK_LOCAL_JACOBIAN, HAIR_NECK_BOUNDED_ENVELOPE: numerical sampling, not a production collision solver.
- REFERENCE_SOURCE_TRUE_HEAD_BACK_DEPTH: UNKNOWN. One photo cannot uniquely determine invisible skull/scalp/neck volumes.
- TRUE_HAIR_STRAND_DYNAMICS, SKIN_TISSUE/FEM/ANATOMICAL MUSCLE, AUTHENTIC_USER_HEROINE_VISUAL FIDELITY: BLOCKED until original character references and animated multiangle video approve them.
- NATIVE_ANDROID_WINDOWS_FPS_GPU, REAL_WORLD_MMORPG_MULTIPLAYER: NOT VERIFIED/NOT IMPLEMENTED.
- ORIGINAL_RENDER_LIVE: source is mirrored to `formal-web/fastmodel/spatial-studio.html`, but only exact Render deploy SHA and served page/module retrieval count as actual website release.

Next 7.9: adaptive 3D signed distance volume and multi-region deformable volumetric shell, actual head+neck articulation skin influence maps, proper contact queries for hair/neck, camera-distance quality LOD, reference-image fidelity and real Android/Windows performance.

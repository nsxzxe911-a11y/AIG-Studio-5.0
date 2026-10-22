# AIG FastModel 7.1 — independent true-3D implicit geometry (source-checkpoint)

Date: 2026-10-22. Forward-only from FastModel 7.0 numerical 2D. No deletion, replacement or reset of existing 6.9.5 animation UI, CAD/CAM/NC or RGB authority.

## Original engine and actual deliverables

- `aig-implicit-volume-7-1.mjs`: typed-array 2D Euclidean distance transform (EDT) from 7.0 observed foreground mask, negative-inside signed field, explicit real X/Y/Z extruded volume, 3D surface normal from signed gradient, bounded ray/surface intersections, orthographic rotating CPU ray rendering and true geometric sphere penetration measurements. A controllable 3D inverse warp changes actual surface queries, not an image animation.
- `implicit-lab.html`, `implicit-lab.mjs`: photo loading, optional user-selected background point, explicit Z thickness, drag-to-rotate, measured bend and contact probe, responsive Android-sized/desktop browser view, real source SHA if WebCrypto available. No external inference, paid service or network call.
- `tests/aig-implicit-volume-7-1.test.mjs`: 7 numerical Node cases, including 3D front versus side geometry, normals, signed interior in Z, synthetic EDT distances, collisions and bad-data failures.
- `tests/aig-implicit-volume-7-1.real-browser.mjs`: actual Chromium phone/desktop harness to load synthetic PNG, confirm Z surface rays, rotate view with different pixels, and measure collision. Screenshots/evidence go into CI artifacts, NOT production-release outputs.
- Offline `build.mjs` should include the 7.1 standalone lab files alongside existing 7.0 and original viewer.
- Original AIG Render site source `formal-web/fastmodel/` has a mirrored standalone engine/page and links. Source updates require actual Render live SHA readback before claiming online release.

## Honest physical/geometric boundaries

- **Geometrically true 3D:** field and normals depend on X, Y and Z; front/side rays sample different 3D surfaces, and overlap/penetration are computed in 3D.
- **NOT photogrammetrically recovered 3D:** unobserved depth is manual `halfDepth` rather than inferred true anatomy; texture, hair, face and back of body are not recovered; material is a single synthetic extrusion of XY silhouette.
- **NOT material physics:** the inverse bend is a coordinate-space deformation; the sphere probe is geometric, not FEM. No real muscle/skin stretching law or verified anatomical motion.
- **NOT native release:** no Android APK, Windows EXE, true-device FPS, skeletal rig or playable truthful 3D human/animal character produced by this increment.
- Known limits: complicated background/occlusion requires reviewed segmentation, low-resolution signed fields have finite detail, a deformation is not an elastic solver, and CPU ray marching resolution is deliberately bounded for mobile.

## Acceptance and progression

Run `npm test` and `npm run build` under `formal-web/school-3d/fastmodel/single-photo`, then the actual browser test in CI. Report exact workflow run, SHA, pass/fail for 7.1 separately from 7.0 and from true-character validation.

Next increment: actual 3D volume deformation with shape-preserving constitutive constraints, true independent collision iterations, and source-image-conditioned body-part priors. Then produce GLB from the volumetric field with provenance and perform real pose/multi-view evidence, preventing technical avatars from being called the approved character.

Gate: 7.1 SOURCE SDF / 7.1 BROWSER 3D SURFACE != TRUE PHOTO-TO-HUMAN-3D / NATIVE INSTALL / PERCEPTUAL REALISM.

# AIG School 3D — Phase15: actual 3D hair cards follow fine reverse-image rig

Date: 2026-10-20. Continue Phase14 **bbf8c4c4**; official website unchanged.

## Actual engineering

- Input: Phase13 **original self-developed** 2.5D closed-envelope GLB and Phase14 88 source-image hair guides. No third-party character meshes or VRoid data were imported.
- The original GLB's **18 mesh primitives and binary buffer bytes remain untouched**; add 88 true non-coplanar 3D hair-card ribbons (front, back, side caps) on top.
- New 176 local hair joints (root and swing per guide) are parented to the existing Head joint; the combined hair skin holds 183 joints (7 original plus 176), with recalculated joint binding matrices for the new geometry; the original 7-joint skin is not changed.
- 88 skinned ribbon meshes, 9 length stations per ribbon, 5 shades of original chestnut-hair palette with AIG-coded PBR materials. Baked skeletal hair wave has **176 quaternion rotation channels** across 25 keyframes over two seconds; wave is generated from source guides/phase offset, not manually moved still images.
- Output GLB SHA-256 **e432a463192a3ba565937aeaf3bca2ead7cecaccac79e0fbced83beb65d65409**, file size **3,588,932 bytes**; 106 meshes total, 3,168 new ribbon vertices, 5,984 added triangles, 2 glTF skin objects, 4 animations total.
- Local 12 unit tests PASS. Includes source-image SHA, byte-preserving old geometry, nonzero 3D thickness, true glTF bone rotation/sway, weights sum = 1, deterministic rebuild, unsupported source rejection, and release-blocked metadata. Independent trimesh can load 106 geometries.
- Preview JPG reads **true GLB vertices and animation quaternions** for a front and 38-degree diagnostic 3D view; the MP4 renders 24 frames from these same animated vertices, 23 frames differ from the first. These are **geometry QA** images, NOT full cinematic render frames.
- CI runner uses only a self-made **synthetic** PNG and a SHA-adjusted fixture; it must not claim to have the original reference bytes. Users must not infer `Source Gate PASS` means `Visual Authority PASS`.

## Visual limitations and Release Gate

- **Full character visual gate FAIL**. Hair ribbons still look like striped curtains; they do not imitate original individually textured hairs, natural occlusion or collision. Reference front is source-projected 2.5D, back/side remain artist hypotheses. No true rebuilt face or neural face inference model.
- Original heroine is a cropped illustration; unobserved true head depth, full body, complete geometry, realistic hair contact/wind, and facial morphology still missing. 3D hair rotations are **keyframed rig movement**, not a real physical hair dynamics solver.
- No S23 or Windows 4K runtime verification, no completed movie, no home release. Existing AIG-II RGB/CNC Android APK / Windows EXE/Render formal site left untouched.
- PR #12 remains **DRAFT**, `PREVIEW_ONLY_NOT_PRODUCTION` and current visual FAIL stay in place.

## Next step

Turn the uniform-color hair ribbons into AIG-developed textured and tapered multi-layer hair surfaces with scalp coverage and per-card alpha masking; use original reference pixels carefully, reject sky contamination, improve face geometry, then test genuine 3D lighting/contact and 3/4 identity. **Never alter the source-image silhouette to accommodate a legacy large skeleton.**
# AIG FastModel 7.3 — source-photo makeup on moving 3D implicit surface

**Date:** 2026-10-22. Additive follow-up to numerical 7.2. This is a user-controlled cosmetic/shader subsystem **not** a reconstructed photorealistic 3D person's face.

## Previously observed ghost-like model root cause

- Prior `aig-native-appearance-5-7.mjs` composes procedural face/hair/clothing geometry, which is not the reference image's actual face. The source itself labels the asset an unapproved technical draft.
- 7.1/7.2 provide numerical XYZ geometry, but unseen source depth, head shape and skin/rig remain estimated.
- Changing the skin tint or producing a lipstick UI must not be called a fix for the original reference-likeness problem.

## What 7.3 actually adds

- `aig-face-material-7-3.mjs`: vertically register the original RGBA pixels with the 7.1 3D signed-distance volume, render front-facing source colors at **true XYZ ray intersection points**, compute surface normals and diffuse lighting, and condition cosmetics on an explicitly **user-reviewed** face rectangle.
- `aig-portrait-audio-6-7.mjs` existing optional native `FaceDetector` is used only for a bounding-box suggestion, never for eye/nose/mouth proof or identity recognition.
- Four cosmetic layers (foundation, blush, eye shadow, lip tint) are user adjustable. Their feature locations are approximate layout presets relative to a reviewed ROI and can be manually adjusted. They are not measured landmarks.
- Side/back and fully transparent source pixels render with obvious neutral material. **Never mirror an image to the back and do not paint a second false face.**
- When 7.2 deformation is enabled, the true deformed XYZ ray intersection is inverse-mapped to original surface coordinates before source photo UV lookup, so makeup follows the numerical moving surface, rather than replacing the object with a moving 2D photograph.
- `face-material-lab.html` / `face-material-lab.mjs` form a stand-alone RGB-style local browser page; original photo remains in memory and is never uploaded by 7.3. Face box edits revoke prior confirmation.
- Offline `build.mjs` retains 6.9.5, 7.0, 7.1 and 7.2 and copies all 7.3 pages and dependencies. Source files are mirrored to the original AIG site branch; this is not a live-deployment assertion.

## Evidence gates / blocked claims

- SOURCE_PHOTO_RGB: measured input pixel colors and original image SHA-256 if browser WebCrypto is available.
- REVIEWED_FACE_ROI: requires user confirmation after geometry change; optional detector alone must not mark review complete.
- FRONT_3D_UV: ray-marched real SDF intersection with separate front-face photo and neutral unobserved side/back; verify pixel counts and output changes under cosmetic adjustments.
- VOLUMETRIC_FOLLOW: when selected, numerical XYZ deformed surface is used for each ray and reference-space source UV.
- TRUE_SOURCE_3D_FACE: **NOT VERIFIED**. Geometry derives from XY silhouette and estimated Z; real human face depth/landmarks/identity/expressions are absent.
- AUTHENTIC_HUMAN_ANIMATION, REAL_SKIN_PHYSICS, HAIR_NECK_QUALITY, NATIVE_ANDROID_WINDOWS: **BLOCKED OR NOT VERIFIED**; do not present source test PASS as character certification.
- RENDER_LIVE: independent deploy SHA and served page & JS readback required.

## Synthetic test plan

`tests/aig-face-material-7-3.test.mjs`: no source mutation, reviewed ROI fail-closed, front pixel cosmetics change, unseen back neutral, 3D ray camera, real 7.2 deformation, input budgets. `tests/aig-face-material-7-3.real-browser.mjs`: actual phone/desktop Chromium open, synthetic RGBA input, confirm ROI, change colors, front/back camera, 7.2 warp and JSON/screenshot evidence. The fixture deliberately is NOT a human face.

Next: source-aligned 2D face landmarks with actual measured data where available (never guessed), optional true depth/surface fitting with uncertainty, then real facial joint morph/rig and multilayer tissue constraints, mobile/Windows native tests and per-frame reference-image fidelity gating.

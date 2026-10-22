# FastModel 7.6 — estimated facial Z depth from reviewed photo landmarks

Date 2026-10-22, forward-only from trustworthy 7.5.

## Scope
The new `aig-face-depth-7-6.mjs` is a **real 3D geometry** extension of 7.5 user-reviewed XY face-landmark SDF. It is **NOT a learned human-face reconstructor**, depth camera/photogrammetry, high-quality real girl likeness, verified hair/neck joining, medically meaningful anatomy, physics-calibrated skin or an actual online MMO.

### Source and geometry
- Observe only original photo RGBA foreground and ten user-reviewed XY feature locations.
- Source photo pixels remain immutable and continue to sample through the inverse mapped 3D surface (7.3).
- Unobserved Z remains an explicitly estimated depth prior. Surface settings adjust *world Z geometry*: nose, bridge, eye-socket recess, upper/lower lips, chin, and a global strength.
- `createAIG76DepthProfile` converts these parameters to smooth feature-anchored Gaussian basis fields, with no fabricated texture face.
- `deformAIG76Depth` composes the estimated Z coordinate with the existing 7.5 real XYZ morph. `undoAIG76Depth` iterates to recover reference coordinates; true 3D raymarch computes normals on deformed source surface. Rear surface receives zero photo-projected texture, remains neutral.
- Independent pre-render Gates: `auditAIG75Rig` enforces 7.5 signed XYZ Jacobian; `auditAIG76Depth` verifies Z derivative, inverse-depth round trip, positive derivative, and sample counts. Both must pass.
- Rendering uses a capped CPU ray preview. A successful browser preview is NOT a native Android or Windows performance benchmark.

### Delivered code and tests
- `aig-face-depth-7-6.mjs`: bounded depth controls, reviewed 7.5 rig requirement, source uncertainty flags, Z profile, inverse sample, raycast, analytical tests and head-depth renderer.
- `depth-studio.html` + `depth-studio.mjs`: stand-alone RGB local photo 10-point review; editable Z sliders; facial expression clips; camera orbit; true numerical evidence JSON.
- `tests/aig-face-depth-7-6.test.mjs`: distance sampled in genuine 3D, nose vs lip depth displacement, unmodified backside, inverse-depth tolerance, Jacobian anti-fold, actual ray/silhouette differences and invalid settings.
- `tests/aig-face-depth-7-6.real-browser.mjs`: synthetic PNG on Chromium 360x780 phone and 1440x900 desktop; manually mark all 10 XY photo points and review, orbit camera, change actual nose depth, verify changed render pixels, rotate to neutral unseen rear. Synthetic test does **not** certify authentic character photo likeness.
- CI independent 7.6 job alongside existing independent 7.5 and original FastModel full regression. Existing legacy mobile advanced tab interception may still keep full regression red; do not silence or skip it.
- Source files mirrored verbatim into original AIG site branch `formal-web/fastmodel/`. **No Render LIVE deployment claim without deployed exact commit and fetched source evidence.**
- No CAD/CAM/SIM/NC or machine control code changed.

## Gates and follow-on research
1. NUMERIC_3D_DEPTH_PASS: positive Z derivative, finite samples and accurate inverse projection, view-dependent depth.
2. SOURCE_2D_LANDMARK_PASS: all 10 manually positioned reviewed locations, no auto-detection claim.
3. BROWSER_PHONE_DESKTOP_PASS: independent real phone/desktop Chromium, image fixture explicitly synthetic.
4. REAL_ANATOMICAL_FACE: **BLOCKED** until actual depth or trustworthy learned model and photo-vs-render identity similarity evidence. A single image cannot uniquely reveal back or hidden volume.
5. HAIR_NECK_COLLISION_AND_SKIN: **BLOCKED** until semantic hair/head/neck masks and true contact/occlusion test, articulated skin influence and real animation evidence.
6. NATIVE_60_FPS_APK_EXE / RENDER_SITE_DEPLOYED / MMO_ONLINE: **NOT VERIFIED**.

Next engineering: 7.7 build reviewed source hair/neck masks with physical overlap/contact checks and cross-view occlusion, trainable depth priors only with actual provenance and uncertainty, and dynamic skinning performance profiling. Never promote technical shape into an approved heroine.

# AIG FastModel 7.5 — game-character source-landmark facial quality engine

Checkpoint: 2026-10-22. Additive continuation from 7.4; 6.9.5–7.4 and CNC engine untouched.

## Concrete source code
- `aig-landmark-rig-7-5.mjs`: manually reviewed 2D photographic landmarks (both eyes/brows, nose, upper/lower lip, mouth corners, chin). Unverified guide points are never marked as detected landmarks.
- `createAIG75ReviewedLandmarks()` requires all ten positions and the review flag; rejects invalid ordering, out-of-box points, incorrect source digest, and partial/invalid data.
- `createAIG75Rig()`: translates source photo XY into actual XYZ SDF handles; appearance is source photo front, hidden Z remains user-unobserved and explicitly estimated.
- `warpAIG75World()`, `inverseAIG75World()`, `raycastAIG75()`: bounded jaw/eyelid/brow/mouth effects alter true XYZ surface samples and normals; inverse mapping keeps front photo material anchored to source pixels. No fake 2D frame swap.
- `auditAIG75Rig()`: samples deformation Jacobian determinant, rejects inverted/folded geometry before renderer claims PASS; records displacement, sample count and source-review evidence. The Jacobian quality gate is a numeric local test, not certified full-body skin physics.
- `landmark-studio.html` and `landmark-studio.mjs`: phone/desktop RGB standalone photo marker UI. Explicit touch/click ten real source positions, confirm review, adjust facial expression sliders, play deterministic 7.4 clips, rotate view, download local JSON evidence. The source image stays local; only its SHA may be shared in public checkpoint metadata.
- `tests/aig-landmark-rig-7-5.test.mjs`: reject unreviewed/hallucinated source landmarks, numerical XYZ displacement, signed Jacobian, material UV and neutral rear face; negative budget/invalid face tests.
- `tests/aig-landmark-rig-7-5.real-browser.mjs`: synthetic PNG phone/desktop Chromium workflow with ten genuine simulated user clicks, review, XYZ morph, facial anti-fold gate, rear material, screenshots and JSON proof. Synthetic fixtures are NOT proof of likeness to the user's heroine.
- Offline viewer build copies 7.5 sources; existing 7.0–7.4 files remain independently reachable. The 7.5 standalone page and JS are exactly mirrored to the original AIG Render site's GitHub source branch.

## Quality gates and limitations
- OBSERVED_SOURCE_2D: confirmed after **the user reviews and marks actual photo pixel positions**, not merely from AI suggested points.
- TRUE_XYZ_NUMERIC_MORPH: 3D SDF intersection and changing world-space surface; Jacobian local samples must remain positive.
- REFERENCE_FACE_LIKENESS: BLOCKED. There is NO reconstructed nasal bridge/eye orbit/jaw volumetric depth; no production facial topology or measured true 3D human skin.
- ARTICULATED_3D_CHARACTER: BLOCKED. No natural body/neck/hair/eyelash skeletal binding proven. Real photo feature and face measurements still incomplete.
- MMORPG_NETWORKED_GAME: NOT IMPLEMENTED. This is a game-development style offline editor, not an actual massively multiplayer game server.
- NATIVE_ANDROID_WINDOWS_RELEASE: NOT VERIFIED. Chromium phone viewport is not a signed APK or real device benchmark.
- LIVE_RENDER: NOT VERIFIED without exact service commit, URL readback and imported scripts.

## Next phase 7.6
Introduce actual multi-region human head geometry and face-surface depth fitting with explicit uncertainty, apply perceptual photo-versus-render similarity regression to approved source imagery, and implement hair/neck occlusion, skin layers and bone-influenced full-character poses. Keep procedural technical avatars hidden until quality is established. Only then begin true multiplayer world systems and optimized production delivery.

Never classify a frame as approved character just because the rig's numeric Jacobian passes.

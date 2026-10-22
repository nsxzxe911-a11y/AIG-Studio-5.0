# FastModel 7.7 — user-reviewed hair and neck semantics on genuine 3D surfaces

2026-10-22. Forward-only from trusted FastModel 7.6 (7.6 full Gate PASS). This is one technical stage in an MMORPG-style offline character-authoring suite — NOT a finished live MMO, true hair simulation, complete character resemblance or native binary.

## Implementation

- `aig-hair-neck-7-7.mjs`: source photo binary semantic foreground/hair/neck masks, **explicit user review required**, no unsupported automatic semantic detector. Input validates bounds, non-overlap, source foreground membership, hair-above-neck ordering, and connected source hair/head/neck component. Disconnected neck is **BLOCKED** before any visual claim.
- `createAIG77Layers`: models hair as bounded forward Z layer and neck as backward Z setback, anchored to user-drawn PHOTO XY masks. Real XYZ SDF geometry and ray intersection change. Data remains an **estimated depth layer**, not recovered physical hair fibers/scalp/skin anatomy.
- `undoAIG77Layers` + `sampleAIG76Face`: inverse layered XYZ world space back to actual original photo source UV. Front surface samples original RGB. Rear remains neutral and no duplicate face.
- `auditAIG77Layers`: requires existing 7.5 facial Jacobian PASS, existing 7.6 depth-prior Jacobian PASS, new Z-layer monotonicity and inverse roundtrip PASS, and source connected-neck evidence. Fails closed on tears/disconnected painted pieces and inverted Z coordinate.
- `occlusion-studio.html` + `occlusion-studio.mjs`: local RGB user authoring UI with reviewed ten photo landmarks, manually painted hair/neck semantic masks, brush erase, forward hair/backward neck Z sliders, facial expressions and true 3D orbit view. Original uploaded photo pixels never sent to a third-party site from these modules.
- `tests/aig-hair-neck-7-7.test.mjs`: explicit connectivity, overlap, source original immutability, 3D hair-forward/neck-behind geometry, inverse Z, source/photo color preservation, rear-view no duplicate face, and strict negative gates.
- `tests/aig-hair-neck-7-7.real-browser.mjs`: real phone/desktop Chromium synthetic PNG user-drawn masks, approved gate, visual depth differences, rotated rear, screenshots and JSON. Synthetic fixture is not approved heroine proof.
- Existing 7.0–7.6 source, UI, prior verified tests, CNC core and apps remain intact. Original AIG Render site's GitHub branch mirrors this source at `formal-web/fastmodel/`, **not** proof of LIVE deployment.

## Honest acceptance

- PHOTO_XY_SOURCE_MASK_REVIEW: required, not automatically recognized.
- HAIR_NECK_SOURCE_CONNECTIVITY: exact foreground connected component and neck-head boundary required.
- REAL_XYZ_ESTIMATED_LAYER_OCCLUSION: source-aligned hair Z greater than underlying 7.6 face surface; neck Z set behind front plane; true world SDF and ray samples, no static fake face replacement.
- FRONT_SOURCE_RGB / NO_REAR_FACE_CLONE: original photo pixels never altered; back remains neutral.
- REAL_HAIR_STRAND_STRANDS_AND_HAIR_DYNAMICS: **NOT VERIFIED**.
- REAL_NECK_SKINNING_AND_CONTACT: **NOT VERIFIED**. Source image connection is not enough to prove deformed animated anatomical continuity; true hair/neck self-contact and GPU/native render must be separately validated.
- ANATOMICAL_HUMAN_LIKENESS / NATIVE_APK_EXE / RENDER_LIVE / MMO_SERVER: **NOT VERIFIED OR NOT IMPLEMENTED**.

7.8 follow-on: source-conditioned multilayer skin/rigging, animated occlusion change, head-turn topology quality, authentic reference portrait similarity Gate and native Android/Windows GPU/CPU profiling. Refuse to declare an original portrait visually reconstructed without its actual render evidence.

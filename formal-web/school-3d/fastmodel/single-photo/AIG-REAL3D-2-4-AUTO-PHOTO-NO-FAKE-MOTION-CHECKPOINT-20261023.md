# AIG FastModel Real3D 2.4 — fully automatic image pre-inspection and no-fake motion Gate

## Continuity
- Continue **forward** from draft Real3D 2.3 PR #41 and head `75251b91287b9610936097b8be7d8e741dac2c8e`, itself descendant of 2.2 PR #39.
- Work in `verify/real3d-auto-image-detect-2-4-20261023`, isolated until full Gate. AIG-II/Fanuc CAD/CAM/SIM/NC core untouched.
- Do not declare Render/APK/EXE installed, completed 1:1 female heroine or production-ready motion based on this source change.

## User acceptance: moving whole photo is NOT 3D animation

Must have:
1. **Actual pixels**: uploader instantly fingerprints original PNG/JPG/WebP, extracts bounded sampled source RGB/alpha, actual luminance and background/connected-region bounding boxes. No manual landmark clicks are necessary merely to inspect a photograph.
2. **Semantic evidence**: current 2.4 local color/shape heuristic CANNOT identify true person, dog, tree, house, hair, clothing or facial landmarks. It can only yield a technical single-elongated-object **candidate** or UNKNOWN; never silently upgrade this to AI semantic classification. Full auto real-photo subject parsing needs a REAL local offline segmentation/keypoint model with documented confidence and tests on varied scenes.
3. **True volume**: a flat plane remains a plane after moving a camera or rotating the scene. `aig-motion-integrity-2-4.mjs` measures sampled non-planar body thickness, actual SkinnedMesh/joint weights and relative distances between body vertices over source 3D animation timestamps.
4. **Independent motion**: for actual animation, bone-controlled human parts MUST change vertex-pair distances internally. Rigid model/whole photo translation, rotation or camera-only movement preserve these distances and are BLOCKED as an articulation substitute. A still portrait may give a technical 6.4 body with actual joint tracks, but there is no fabricated walking/running/jumping clip.
5. **Skin and garments**: source-derived technical body from 6.4 has 17 bones, 9 SkinnedMeshes and five source clips; 2.3 already validates 5.0 skeleton, 6.3 outfit/hair and 5.8 discrete contact. 2.4 adds an independent internal-deformation numerical Gate. True 7.15 editable front surface remains separate and NOT automatically fully reskinned.
6. **No silent failure**: source images and previously mounted GPU models cannot be discarded on uncertain classification or failed generated model. All estimates are marked relative/unknown, not measured millimetres or 1:1 likeness.

## Next actual engineering milestones — NOT CLAIMED IMPLEMENTED

- On-device semantic segmentation/body keypoints (head, face, neck, shoulder, torso, hip, arm, leg, garment, hair) trained/tested for varied camera angles, animals, buildings and surroundings. Confidence-gated subject type determines humanoid/animal/environment rig or fail-closed.
- Non-planar 3D geometry from image priors or properly calibrated multi-view; single photo hidden back and physical size remain estimated. Maintain separate measured-vs-inferred depth channels, do not require 4 photos.
- Transfer source-textured source appearance from 7.15 to CLOSED volume geometry with independent skinning weights for scalp/neck/fabric; topology, skin normalization, deformation continuity and self collision regression.
- Actual procedural walk/run/jump/crouch/stand motion states, root movement, two-foot IK, foot lock, dynamic body and cloth/hair, not generic pose bob.
- Multi-frame source-bound image/video evidence at front/side/back (estimated region labeled), fixed camera against rig articulation plus native phone/Windows FPS/collision gate.

## Current 2.4 diff and tests
- `aig-auto-image-detect-2-4.mjs`: 96x96 bounded color/alpha connected foreground measure and shape candidate (no ML semantics). Auto-fired when file is selected in EXISTING Real3D world page. Build blocked if candidate uncertain.
- `aig-motion-integrity-2-4.mjs`: 3D nonplanarity plus relative Euclidean distance-change Gate in local skinned mesh coordinates, excludes whole-photo rigid transforms.
- `aig-photo-rig-world-2-3.mjs`: calls the new 2.4 genuine deformation gate BEFORE returning a model for world activation.
- `tests/aig-auto-image-detect-2-4.test.mjs`, `tests/aig-motion-integrity-2-4.test.mjs`, the 2.3 rig actor test and existing Chromium phone/desktop scenario, CI command coverage.
- NOTE: unit/syntax/source checks or queued CI do NOT imply complete WebGL or production release PASS. Record exact current PR, HEAD SHA, run conclusion after each cycle.

Next-chat reconnection: start at this PR's newest actual GitHub SHA and identify exact failed checks. Preserve all prior AIG CNC and third-project functions.

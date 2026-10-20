# AIG School Hero Phase 9 · Mesh-first rig adaptation (TECHNICAL ONLY)

## Source baseline
- Phase 8 GitHub commit: `d13a52f727e6464c24174197b907de82dbdd9acd` on PR #12.
- Reverse source image SHA-256: `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`.
- The 3D input **does not come from reconstruction of that picture**. For reproducibility, this test makes a second target mesh by uniformly scaling the already rejected Phase6 technical mesh to **0.78**. That number is an arbitrary engineering test value, NOT a discovered body-size ratio.
- Full 3D camera calibration and the high-fidelity character sculpt are still missing; never use 2D bbox pixels as 3D bone coordinates.

## What was actually built and tested
- `fit_mesh_first_rig.py`: accepts separate **target GLB** and SHA-locked **3D joint anchors**, and follows the target mesh instead of moving the target mesh to the old bone positions. Current adapter requires the same named 33-joint glTF node hierarchy in target; support for a completely unrigged sculpt is **not yet implemented**.
- Rebuilds local rest bone transforms, all 33 inverse bind matrices, vertex joint indices and normalized four-channel weights, retargets root animation translations and blocks nonuniform IK changes.
- `prepare_qa_mesh.py`: creates scaled technical target + anchors as a deliberately unapproved reproducibility fixture.
- `verify_mesh_first.py`: byte-for-byte vertex POSITION attribute checks on 195 primitives; verifies all 48,015 vertex weight sums and glTF inverse bind rest transform cancelation (max absolute matrix error below 6e-8).
- `verify_fit_foot_contact.py`: separately measures the **encoded skeleton ankle contact**, with foot clearance thresholds normalized to target joint-size scale; does NOT claim grounded shoe soles or visually natural walking.
- `test_mesh_first.py`: 12 unit tests, covering unchanged mesh, weights, SHA mismatch, pixel-as-depth rejection, rest inverse binds, IK stance, unacceptable nonuniform retarget, missing bone, false approval, reverse-source SHA drift and deterministic binary.
- `character-rig-MESH-FIRST-TECHNICAL-ONLY.glb`: actual exported GLB. Explicit `NOT APPROVED` metadata and materials. Its appearance still inherits the old rejected Phase6 mesh and must never be substituted for the approved heroine.

## Gate status
- Local GLB structural + rebind + model-space ankle stance: **PASS**.
- High-quality head sculpt, smooth hair, cloth silhouette vs original, physically natural walk and real mobile/4K WebGL evidence: **FAIL / NOT VERIFIED**.
- Production Render homepage, APK, EXE, CAD/CAM/SIM/NC: **NOT MODIFIED**.

## Next useful engineering step
Import a **genuinely reconstructed 3D head/body/clothes mesh** with accurate face and hair first. Fit 3D bone anchors to that asset and recompute weights; for nonuniform proportions solve a fresh IK clip rather than replay Phase6 rotations. Perform S23/4K visual side-by-side acceptance and keep the entire hero module blocked until it passes.
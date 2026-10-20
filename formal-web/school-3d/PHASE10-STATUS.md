# AIG School Hero Phase10: true unrigged GLB import & mesh-first rebind

Technical Source Gate: **PASS**. Character visual Authority: **FAIL / BLOCKED**. Formal Render homepage, CNC runtime, APK, EXE: **UNCHANGED**.

## Delivered
- `tools/make_unrigged_qa_fixture.py`: turns rejected Phase6 rigged doll geometry into a **genuinely unrigged** independent GLB; removes all skins, skeleton nodes, animation and skin attributes; shuffles mesh-node indices.
- `tools/bind_unrigged_mesh.py`: accepts real glTF2 triangle meshes with ZERO existing skins, verifies mesh SHA-256 and Reverse Authority SHA, accepts 33 explicitly supplied 3D joint anchors, then builds 33-joint hierarchy, recalculates JOINTS_0, WEIGHTS_0 and inverseBindMatrices, without changing target vertices, materials or textures.
- Safe skeletal animation retarget: Idle/Walk clips only when body ratios are uniform; nonuniform skeleton proportions automatically block Walk/IK; face morph clips still require explicit remapping.
- `tools/test_unrigged_mesh_binding.py`: 16 end-to-end tests including SHA attacks, forbidden 2D pixel landmarks, rejected fake APPROVED, 3D anatomy validation, IK nonuniform block, zero alterations to mesh POSITION and nine embedded PBR textures, deterministic rebuild.

## Evidence
GitHub Actions Run #39382847888: **completed/success**. CI Artifact `AIG-School3D-Phase10-Unrigged-Adapter-NOT-APPROVED` (ID 12246321573). 
Input unrigged GLB 6,237,068 bytes SHA-256 `fadffd5f7be01ee749e2d7a05f57ba7fad202bab5ab20cf600ce208b67776bbe`.
Output rigged GLB 7,475,324 bytes SHA-256 `412daf3744f28b4665ea2d91ef876f777d3d2048b93e2b666a2dd04e48015637`.
195 mesh primitives, 48,015 vertices and 33 fitted bones; original vertices preserved. Foot-joint contact test passes; **shoe-bottom collision and cinematic quality have not been verified**.

## Critical limitation
The QA mesh is still the old *visually rejected* mannequin geometry, only stripped and rebound. It is NOT a new beautiful protagonist. The importer needs flattened identity mesh nodes and **real independent 3D bone anchors**; a single perspective drawing does not supply 3D depth. It does not yet infer anchors from an arbitrary unknown mesh. Official Authority still `PREVIEW_ONLY_NOT_PRODUCTION`; draft PR #12 not merged.

Next: import a genuinely high-grade face/hair/costume unrigged GLB that matches the approved image; verify 3D anatomical landmarks, face morph animation, 3/4 front/side/back views and actual S23/4K WebGL rendering before homepage approval.

# FastModel 1.7 — fictional 3D cast anti-clone scan (Draft)

This new offline feature supplements FastScan with a character role-aware comparison for the lead character and classmates. No changes to APK, Windows EXE, formal AIG Render site, or authoritative protagonist.

## Implemented
- Manual **character ID** and **role** (lead/classmate/supporting), session-local roster and button-driven **掃描臉型並加入角色對照** / **清空本次對照**.
- `character-face.mjs` only reads GLB nodes explicitly marked `extras.aigAnatomyPart='face'`. Positions are sampled via existing bounded binary POSITION accessor; computes translation/uniform-scale-normalized 3D occupancy, centroids, spread and shape ratio descriptor. Returns closest cast members and **heuristic** collision warnings. Only the loaded GLB is read; no original mesh, material, identity or character ID is rewritten.
- Identical face geometry is reported as duplicate regardless of a new classmate ID, if both have face labels. Original lead entry cannot be overwritten by reusing its ID.
- No marked facial mesh, insufficient points, invalid ID etc fail closed with a descriptive result. Roster stored in memory only, never transmitted or persisted.
- Preserves raster/RT off, 1080p default, 1.5 reversible optional details and 1.6 animation/neck safety.

## Explicit limits
- **Not true human face detection or biometric recognition**; does not detect faces in photos, videos, arbitrary meshes without tags, or identify a real person.
- Shape similarity is a custom baseline with an uncalibrated alert threshold; makeup, hair, textures, facial expression, GLB node transforms and true facial identity are not fully addressed. It cannot guarantee different-looking classmates or that a heroine is recognizable as a specific human.
- No AI-generated face variation, no face reconstruction or automatic edits. User must review front and side views; any future automatic face separation requires independent correctness/safety gates.
- No approved female heroine model, validated head/neck seam or GPU/thermal FPS measurements. Synthetic CI tests and standalone packaging are **source verification** only.

The feature stays inside GitHub Draft PR #12 until explicit acceptance.

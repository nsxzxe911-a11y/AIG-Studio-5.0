# FastModel 1.6 — animation matrix update efficiency and guarded anatomy

Incremental from verified 1.5 `f9605755` on **Draft PR #12**, no merge, no deployment, no replacement of formal AIG RGB Authority assets, APK or EXE.

## Implemented

- `pose-evaluator.mjs` creates a GLB skeleton parent graph and evaluation order **once on load** with validation against cycles, invalid child indices, duplicate parenting, invalid animation node references, invalid keyframe sequences and non-finite quaternion data. All these checks happen before discarding the previous live scene.
- Animation sampling uses cursor plus binary keyframe lookup instead of scanning every track from its first key each frame. Uses reusable typed-array local/world transform buffers rather than rebuilding parent maps and allocating node matrices each frame. Uses normalized shortest-arc LINEAR quaternion interpolation. Behavior beyond available glTF rotation tracks remains unsupported and is **not advertised** as retargeting or IK.
- Bone matrix skinning upload scratch arrays are retained per skin; stopped/static animation pose is reused without redundant GPU texture uploads.
- `anatomy-guard.mjs` only accepts explicit `nodes[*].extras.aigAnatomyPart` values head/neck/face/scalp. If tagged, shared materials are protected from optional LOD. All unknown/untagged batches remain nonoptional unless independently and explicitly tagged, and never deleted simply because `skin===1`.
- Motion panel's new real **檢查頭頸標記與可選材質** callback reports either `HEAD_NECK_METADATA_FOUND_CONTINUITY_NOT_PROVEN` or `UNVERIFIED_MISSING_HEAD_OR_NECK_METADATA`. No false claims of a watertight neck, guaranteed seam continuity, auto-generated missing geometry, or collision verification.
- 1.3 clean surface / wire default OFF, 1.4 fast binary GLB scan, 1.5 reversible optional LOD, 1080p default, QHD/4K selectable, RT permanently OFF remain.

## Release Gate

- `tests/pose-evaluator.test.mjs` tests numerical world transforms, keyframe seek/loop, static/animated transitions and invalid DAG/track input. `tests/anatomy-guard.test.mjs` tests explicit tags and protect-versus-false pass.
- Source Gate runs both new tests and **synthetic** standalone HTML bundling in addition to existing FastModel 1.3/1.4/1.5 tests and native C++ CTests.
- **Not verified**: real heroine head/neck watertight mesh, real motion graphics GPU/thermal on S23/Windows, native Vulkan or DX12, real 1080p60/4K, camera/LiDAR input, semantic body parsing, collision/IK, missing geometry reconstruction, official production release.
- PR remains Draft. Only exact head with both completed SUCCESS Actions can be considered source-verification checkpoint.

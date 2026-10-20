# FastModel 1.8 — Restore the three missed Phase 1.7 acceptance priorities

This is a source-only quality/integrity increment on Draft PR #12. It does **not** claim physical mesh repair, approved heroine visual continuity, 60 FPS, an executable test on Windows/Android or production deployment.

## 1. Head/neck contact (P0)
- Real on-demand "檢查真 GLB 頭頸開放邊距離" callback scans explicit GLB head/neck `extras.aigAnatomyPart` triangle meshes, enumerates nonshared primitive edges and samples the closest head-v-neck *untransformed local coordinate* edge-vertex distance.
- Reports measured distance and sample count. It does **not** imply watertight welded geometry, shared vertices, UV/normal continuity, good rig weights or pose stability. A close distance is *not* an actual weld. Missing explicit tags, no open edge, nontriangle faces, transforms, invalid data or exhausted budgets fail closed as UNVERIFIED.
- Future **real mesh repair** requires the approved heroine/actor GLB, skinning mesh correspondence, geometry modification with undo/Working Copy, front/side/back/animated screenshots and round-trip artifact checks.

## 2. Hair blocking neck (P0)
- Real "檢查髮束與脖子投影遮擋" callback scans explicit hair/neck mesh vertices and reports front and side *bounding-box overlap* as **risk proxy only**.
- AABB overlap cannot know which object is in front, real depth occlusion, transparency, animated deformation or self-intersection. Never claims occlusion PASS. No hair tag => UNVERIFIED.
- Real visual evidence needed: front, left, right, rear, downward/upward camera views; neutral + moving bone pose; ensure scalp/head/neck never disappears and hair does not clip through shoulder/skin.

## 3. Windows + Android animation performance (P0)
- Native evidence gate requires each platform, `source='REAL_DEVICE_CAPTURE'`, explicit native process provenance, >=120 measured frames, native FPS, p95 milliseconds, actual render width/height and measured thermal Celsius.
- Browser requestAnimationFrame + GitHub Linux CI tests do **not** satisfy this gate. Unknown GPU timing remains unknown. 1080p60 target requires observed FPS >=60, p95 <=16.667ms and actual width>=1920/height>=1080; any below-target result stays **BELOW_TARGET** and must not be labeled PASS.
- Need Windows EXE/actual Windows runtime + S23/Android APK/browser-specific provenance; distinguish browser vs native. Do not invent device samples or GPU/thermal readings.

## Gate, compatibility and restrictions
- Synthetic source tests exercise truthful distances, no false weld/occlusion, missing tags and native evidence rejection. Standalone local HTML includes all controls, diagnostic functions and no external inference API.
- Existing female cast duplicate detector 1.7 is retained without overriding priorities; official female visual Authority is not replaced. Raster-only RT OFF, clean surface/no-grid, 1080p default, optional QHD/4K and reversible hair LOD retained.
- **Required release acceptance remains BLOCKED** until actual source/model repair, real animated render comparisons and verifiable Windows/Android device evidence are provided. Do not merge/deploy this Draft to the official Render website on source tests alone.

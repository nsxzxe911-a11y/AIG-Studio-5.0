# Real3D 3.5 | 單次來源、共用外型引擎 — source checkpoint 2026-10-23

## User's explicit priority
**先做外型、顏色、比例可調整；外觀通過之後才把肢體關節活化。**
No more motion demos to distract from a wrong heroine silhouette, face, clothing, or head/neck. Retain all existing Real3D 2.6→3.4 features and AIG-II / AIG Studio CNC numerical core. No external paid model or character-creation service.

## ACTUAL recovered visual sources
The project file Library contains real reference image binaries, hash-verified on 2026-10-23:
1. \`櫻花校園的青春時光.png\`: 1672×941, actual SHA-256 \`83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910\`. This is a cinematic **2D visible source**, not a photo-backed 1:1 3D scan.
2. \`02_校園制服3D展示板_最新版.png\`: 1448×1086, SHA-256 \`1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1\`. Multi-view 2D reference with front/side/back/face/uniform/hair/backpack details; it is **not** an already-approved textured/skinned GLB.
Assets exist in the ChatGPT user's private Library, NOT yet stored in the GitHub project branch or public website. Do not state the website auto-loads them or force the user to reproduce image requirements from scratch.

## Code committed on stacked development branch
- From verified 3.4 branch PR #43 head \`3991bfe7e86c01d932d75e540c067ef7f6863895\`.
- Branch: \`verify/real3d-unified-appearance-3-5-20261023\`.
- Draft stacked PR: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/44
- \`aig-unified-appearance-3-5.mjs\`: one hash-locked RGBA+class mask entry point -> existing 2.9 photo sections -> 3.0 one-manifold SDF -> projected visible-XY source outline comparison -> try bounded shape fitting -> select lower measured 2D reprojection error; preserve full original, source class colors and GLBs; non-destructive proportion adjustments and source display-only RGB gain.
- Existing \`aig-continuous-surface-scan-2-9-ui.mjs\` uses this actual engine in the same WebGL renderer, keeping old \`3.0 網格連通／封閉驗收 PASS\` message for old browser tests.
- Existing formal RGB \`scene-runtime-studio.html\` now exposes width, height, inferred depth and source colour controls and one-scan 3.5 button (previous \`scan29-build\` stable ID), no standalone engineering-shell homepage.
- Actual Node source/manifold/safety test \`tests/aig-unified-appearance-3-5.test.mjs\` and phone+desktop Chromium integrated test \`tests/aig-unified-appearance-3-5.real-browser.mjs\` plus new dedicated GitHub Actions workflow.

## STRICT truth boundaries
- Source 2D mask must first exist: old 2.6 load + 2.7 human-seeded segmentation are still prerequisites. One-click **full automation starting from any raw photo alone is NOT complete**; 3.5 unifies reconstruction *after verified mask*, not the neural segmentation engine.
- Current tested candidate modes are fused 3.0 SDF and bounded source-XY correction. NOT every possible reconstruction algorithm is implemented/benchmarked. Selection is photo-visible 2D edge loss, NOT global 100% 3D identity proof, not real rear depth, not real uniform wrinkles/nails/hair strands.
- 3.1/3.2 real joints and 3.3/3.4 hand/foot SDF are preserved but remain separate later controls until physical appearance is approved. Their animations are not evidence of face/hair correctness.
- A device screenshot of a synthetic full-body source does NOT pass an actual approved-heroine visual gate.
- Earlier 2.5 movie encoder / NC / multi-project release gates remain independent. No automatic Render merge, APK or EXE release.

## Gate tracking
- The pre-PR initial \`3.5\` Node tests and bundle passed; first real phone browser run failed on **test-only** Playwright height select value \`0.9\` vs HTML \`.9\`, not yet a 3D geometry failure. Fixed source in \`f11a3a045e5f6468cc6006b270e6eea9c664f3f8\`.
- Dedicated exact-head workflow rerun: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39933451344 (check finish and real phone+desktop screenshots before claiming pass).
- Physical and human likeness gate remains BLOCKED until calibrated multi-view source matching, real rendered face/hair/garment source comparison, acceptable zero-ghost/neck geometry and human visual approval. No fake "100%" certification.

## Next after technical gate
Build source-image multi-view crop bindings (approved front/side/back/face/hair/clothes regions) with proven source SHA, per-region silhouette and colour reprojection residuals, independent adjustment of head/shoulder/torso/waist/legs and hair-to-neck envelope. Only once one visual Authority passes front/side/back and occlusion review, activate existing 16-joint/20-digit animation with no geometry source replacement.

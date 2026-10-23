# Real3D 3.15 — Geometry-First Render Rework / user says right image remains the ugly old mannequin
Date: 2026-10-23 Taiwan, Draft PR #44. Only source branch changes; no release or deployment.

## Why change rendering logic?
- Actual user reference: `02_校園制服3D展示板_最新版.png` (1448×1086), SHA-256 `1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1`.
- Previously shown right-side screenshot in `real3d_heroine_authority_vs_technical_baseline.png` is the old 3.6 synthetic mannequin, with no real face/hair/cloth likeness; no amount of 4K/PBR/19,200 logical work slots transforms incorrect geometry into the approved person.
- The original private image is not published as a model texture in GitHub, and no user identity/canonical face scan can be inferred from a single image.

## Actual 3.15 code created/connected
- `aig-heroine-render-review-3-15.mjs`: source-to-geometry staged priorities (actual head, face geometry, source-guided removable hair, tailored wardrobe, rig/collision, front/profile/rear silhouette inspection, then PBR). Geometry quality audit computes **real XYZ head source point dimensions**, true separate hair triangles and depth, outfit meshes, front/profile/rear silhouette width versus model height. Explicit blockers for **missing user-fitted eyes/nose/mouth face topology, plaid UV textile, 3 camera captures, likeness acceptance**. None is allowed to return release=PASS based on PBR or work slots.
- `aig-continuous-surface-scan-2-9-ui.mjs`: adds explicit on-demand single-click heroine style technical preview using the source-backview-guided detachable 3D long hair, real independent school uniform meshes and approved sampled source colours, all using existing single renderer. Front/profile/rear buttons position same WebGL perspective camera using real 3D bounds, no photo-plane tricks or second WebGL renderer. The proof explicitly reports it is *not* the approved heroine, and retains original body, other GLBs, rig and source images.
- `scene-runtime-studio.html`: new clear non-engineering UI section for geometry-first tech draft and three actual perspective views.
- `tests/aig-heroine-render-review-3-15.test.mjs`: baseline source head/face/clothing contract, reproducible three real camera poses, fail-closed face/PBR/identity gate.
- Existing phone & desktop real Chromium E2E now requires the actual UI creation of hair and uniform, recorded three genuine renderer views and no false facial likeness PASS. It also fixes a previous flaky mobile Playwright click by dispatching actual DOM event into the existing benchmark handler rather than waiting for continuous-animation scroll stability.
- Dedicated CI: `.github/workflows/aig-real3d-3-5-unified-appearance-gate.yml`.

## Honest evidence / blockers
- Old 3.14 run 39951757050 completed/failure in phone screenshot flow at `#scan313-bench` waiting for click stability, even though source shape passed. No 3.14 full PASS claim.
- First 3.15 run 39953311664 failed at a new test fixture alias (`positions` rather than expected `bodyPositions`); changed fixture, then restarted CI.
- Latest actual source HEAD before this checkpoint: `ac0bfdb08a51ce8ce34c3e81419fe843f6bce370`. 3.15 dedicated run https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39953436740 last observed in_progress. Check final result; don't assume PASS.
- User-approved 3D facial topology not reconstructed. Side/back depth and natural hair groom incomplete, costume 4K plaid and face/skin materials pending. New 3.15 view screenshots, if successful, are only a **technical draft visible change**, not production-certified likeness.
- No change to AIG-II CNC; Render official website/APK/EXE have NOT been deployed or upgraded.

## Next narrow phase
1. Look at actual 3.15 frontal/profile/rear WebGL screenshot and quantify differences against the USER-approved board, not the synthetic-only source.
2. Build source-constrained facial feature 3D geometry with explicit face/eye/nose/mouth landmarks and real continuous hair shapes without fake flat JPG projection.
3. Build UV-accurate plaid skirt, bow and real clothes thickness, remove silhouette artefacts, then validate hair/clothes/body triangle intersections across motion.
4. Only after user verifies real appearance and native performance, merge/deploy.

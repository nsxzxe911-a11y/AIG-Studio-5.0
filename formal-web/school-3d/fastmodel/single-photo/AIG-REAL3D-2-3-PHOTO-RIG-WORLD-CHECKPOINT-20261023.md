# AIG FastModel | Real3D 2.3 actual source checkpoint (2026-10-23)

## Trusted continuation and evidence boundary

- Parent: Real3D 2.2 PR #39 head `f4d04da9f8a48374b192394cff1aff465ea9bbbd`.
- 2.2 original Gate run `39860581728` was **FAIL**: `aig-map-actor-2-1.real-browser.mjs` expected 2 scene objects, saw 1 after rapid user actions.
- This stage continues on branch `verify/real3d-photo-autorigger-2-3-20261023`, PR #41. It has not been merged or deployed to the formal Render site, APK or EXE.
- No modifications to AIG-II CNC numerical, Fanuc, CAM, safety, precision or Android/Windows production code.

## Actual code changes

1. **Fix critical async race:** `scene-runtime-studio.mjs` now synchronously locks and disables both "new world" and "add model" buttons around asynchronous source-map validation and document mutation; serial UI operation avoids stale `worldDoc` overwrite.
2. **Real3D 2.3 source module:** `aig-photo-rig-world-2-3.mjs` directly runs the existing 6.4 actual pixel portrait to 17-bone/9-skinned-mesh/5-source-clip GLB creator. It re-parses the resulting binary through the real GLTFLoader; 5.0 audits skin skeleton, actual weights and animation, 6.3 audits independently skinned garment/hair meshes, and 5.8 audits sampled posed garment/hair triangle contacts. Original image SHA and generated GLB SHA are distinct; contact risk is visible, not silently ignored.
3. **Same Real3D workspace:** `scene-runtime-studio.html/mjs` includes a direct image input on the existing work page. It separately archives untouched input image and derived GLB under source-locked 7.16 IndexedDB, then adds generated GLB into the existing single Three.js world and makes actual 6.4 clip names accessible to 2.2 Chinese-story source-clip matching. A build/GPU fault should leave previous working model and source intact.
4. **Tests and Gate:** new `tests/aig-photo-rig-world-2-3.test.mjs` and expanded `tests/aig-map-actor-2-1.real-browser.mjs` for phone/desktop single photo → same world actor → 2.2 Chinese `轉頭`; retained baseline two-source/map checks. Existing Real3D+NC, 7.13–7.16 and 6.4 source tests remain in workflow.

## Non-claims (MUST remain blocked)

- 6.4 output is a physically **unmeasured technical humanoid**, not a one-to-one facial reconstruction of the heroine.
- 7.15 distinct partial-photo hair/face/neck/clothing candidate is **not itself automatically fully skinned**. 2.3 mounts the independently generated 6.4 rigged GLB and does not substitute guessed hidden surfaces for measurements.
- True generated walk/run/jump/squat motion for a one-photo subject is not yet in these five 6.4 original clips. 2.2 must BLOCK such lines until an actual source animation track exists.
- Source-controlled skirt and hair weights are real; sampled cloth/hair/body contacts and continuous collision freedom, realistic cloth/hair simulation, original-identity appearance, physical 1:1 scale, native S23/Windows FPS, and official release are NOT certified.
- Green unit Gate alone is not phone/desktop visual PASS; browser evidence and whole workflow success are required. Until they pass, 2.3 is **DRAFT/NOT RELEASED**.

## Reconnection rule

When starting a new chat, inspect PR #41 latest head SHA, latest GitHub Actions for that SHA, and exact failing step logs before any code edits. Continue only forward; no silent reset, source deletion, wallpaper-only mock, false animation or reimport of unreviewed Authority images.

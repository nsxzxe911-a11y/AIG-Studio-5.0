# Real3D 2.7 — REAL source-pixel edge-aware segmentation checkpoint
Date 2026-10-23 · Traditional Chinese user interface · additive only

## Immutable source / latest formal project constraints
- Same Real3D working branch: `verify/real3d-true-world-movie-2-5-20261023`, draft PR #43:
  https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/43
- This is **actual new code** integrated into existing Real3D 2.6 photo UI, using the already SHA-verified source; it does NOT replace current 2.5 true GLB/17-bone/9-SkinnedMesh/source-story/movie, CAD/CAM/SIM, CNC/Fanuc or already approved GUI.
- The old bogus FastModel 6.9.5 photo sway public entry must never be republished. Do not merge a draft PR or claim a Render website deploy, APK or Windows EXE without an independent finished Release Gate.

## Technical implementation actually committed
1. `aig-seeded-segmentation-2-7.mjs`: bounded offline source RGBA region segmentation, multiclass **user supplied seeds** for background / hair / neck / garment / face / animal / road etc. The algorithm performs shortest-path geodesic propagation with actual measured color differences and edge barriers, rejects conflicting seeds and semantically invalid class IDs, and conservatively leaves ambiguous boundary pixels unassigned. Outputs real full source-size per-pixel mask and lossless RLE, with visible class pixel counts and original SHA.
2. `aig-seeded-segmentation-2-7-ui.mjs`: real user click/touch seed labeling on shared image from 2.6, original RGB with separate label-color preview, 256/320/384 max-work-side modes, explicit no-overwrite actions and SHA-bound original mask archive with independent 7.16 vault Blob SHA check. No fake button, no second GLB engine.
3. `scene-runtime-studio.html` adds visible Real3D 2.7 photo/hair/neck/garment/background selection, pixel preview, source SHA status, execute/clear/save. `scene-runtime-studio.mjs` installs 2.7 after existing 2.6, using the exact same original source photo state.
4. 2.7 tests: `tests/aig-seeded-segmentation-2-7.test.mjs` tests real colour region masks, hair/neck/garment pixel separation, lossless RLE roundtrip, original nonmutation, bounds and strict anti-fake semantics. `tests/aig-seeded-segmentation-2-7.real-browser.mjs` tests real phone and desktop Chromium photo RGBA data, selected class seed clicks, pixel segmentation, vault SHA return and screenshot evidence.
5. Separate CI `.github/workflows/aig-real3d-2-7-pixel-segmentation-gate.yml` and additive mandatory regression in `aig-shared-real3d-v1-3.yml`. No existing source/NC/movie gate disabled.

## Confirmed 2.7 true source Gate
- GitHub Actions run **39900549778**, commit `28b53aedbf89c773a89083f2d8dd1a890495656e`: **COMPLETE / SUCCESS**.
- Link: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39900549778
- All actual module numerical tests and full app build: PASS.
- **Phone AND desktop Chromium** real photo load → background/hair/neck/garment clicks → geodesic mask → full RLE report → 7.16 IndexedDB SHA-return: PASS.
- Evidence artifact ID **12478123279**, name `AIG-Real3D-2-7-Only-Genuine-Hair-Neck-Garment-Phone-Desktop`, 2,176,469 bytes.
- The 2.6 separate Gate also passed: run 39876818224, 39900333516, et al.
- Combined Real3D 2.5/2.7/CNC Gate must be separately read on the latest HEAD; 2.7 standalone PASS is NOT overall Release PASS.

## Strict truth / no-fake boundaries
- **This is not an AI neural model.** Human picks a class for actual example pixels; algorithm classifies remaining pixels by measured RGBA/geodesic barriers. No locally trained weights, semantic class probability, person recognition, facial identity or absent backside recovery are claimed.
- True 2D segmented pixels and user-labeled classes are preserved as UNVERIFIED evidence, model SHA null. Users may inspect actual masks and choose whether to reuse them. Do not mislabel these as automatic trained recognition or semantic ground truth.
- Hair obscuring neck is an **occlusion/unknown geometry**; pixels beneath hair are NOT measured. Region mask cannot prove hidden shape, topology, true skin identity or physically correct skeleton.
- 2.6 1:1 mm calibration remains **measured source plane only**. No single photo uncalibrated body 1:1 claim, no 0.001mm metrology accuracy claim. Source calibration and actual color are independent of visualization overlays.
- 2.6 sRGB-neutral reference correction is actual linear-light, but not spectral ICC certification. GlTF renderer keeps PBR, ACES and sRGB output, no ray-tracing requirement.
- No S23 60 FPS or real Windows native FPS claim based only on Chromium CI.

## Next engineering gate (not done yet)
- Build actual first-party on-device **trained semantic inference** using local auditable model weights + hash, or equivalent scientifically tested model. If no legitimate local weights exist, retain the 2.7 manual seed approach, never advertise auto AI class recognition.
- Test difficult long hair occlusion, neck-body joins, hair/garment self-overlap and multiple figures against human-reviewed masks and quantitative IoU/false-positive reporting. 2.7 pixel-color cues cannot inherently solve semantically ambiguous same-color materials.
- Add multi-view depth and measured fiducial reconstruction before claiming full 3D 1:1.
- Continue independent Real3D 2.5 desktop MediaRecorder blank-frame repair. Do not bypass `NO_NONEMPTY_ACTUAL_3D_VIDEO_FRAMES`, browser decoder or immutable source gate.

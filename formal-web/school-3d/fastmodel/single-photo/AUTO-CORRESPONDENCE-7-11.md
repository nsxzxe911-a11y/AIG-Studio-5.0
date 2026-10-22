# FastModel 7.11 — genuine automatic source-pixel feature candidates → reviewed stereo XYZ

Date: 2026-10-22. Forward-only after verified FastModel 7.10 core SHA `60a06ace2b7a4fcaa8df3a8ca426c49995ad931b`.

## Delivered, technically grounded

- `aig-auto-correspondence-7-11.mjs` reads actual decoded RGBA video source pixels and computes Shi–Tomasi minimum eigenvalue image corners (not learned semantic face recognition or a fake grid). A local normalized patch descriptor provides brightness-tolerant texture matching without paid APIs.
- Matching is constrained to explicit **rectified parallel stereo**: epipolar Y tolerance, positive bounded left-minus-right horizontal disparity, contrast/blur quality rejection, patch error and nearest-versus-second-best uniqueness test. A→B and B→A must mutually agree; duplicates and unstable candidates fail.
- An automatic candidate contains original image coordinates, disparity, epipolar error, contrast/match confidence, and `reviewed:false`. It is not by itself a calibrated physical 3D point, camera-pose solution, anatomical model, or true hair/skin evidence.
- `tracking-studio.html` + `tracking-studio.mjs`: local source video decoding, original frame A/B capture and click/manual fallback from 7.10, automatic proposal button, highlighted source-image matches, per-candidate selection and explicit review checkbox. Source/camera calibration remains mandatory.
- `commitAIG711ReviewedCandidates` accepts ONLY explicitly user-selected candidate IDs, then passes each one through the unchanged 7.10 `addAIG710StereoMatch` source timestamp / signed disparity / reprojection / depth-range and bounded XYZ track-quality gates. Proposed unmatched point labels and metadata never bypass calibration.
- Bounded: 4..160 source feature max; 3..9 patch radius; 24 candidate approvals per UI batch; 7.10 bounded max physical world points and observations. All pixels stay in local browser session.
- `tests/aig-auto-correspondence-7-11.test.mjs` uses a real deterministic 320×240 original RGBA textured pattern with known 18-pixel stereo shift to verify dozens of matches, ~800 mm calibrated 3D reconstruction, reverse/stationary no-parallax rejection, corrupted dimensions, duplicate review, deterministic budgets.
- `tests/aig-auto-correspondence-7-11.real-browser.mjs`: genuine WebM frame encoding and decoding using Chromium media APIs, actual two-frame pixel candidates, user review, then calibrated 7.10 XYZ, SHA-bound local JSON checkpoint, phone 360×780 and desktop 1440×900; screenshot and provenance evidence. Synthetic source, **NOT** the heroine's real face.

## Acceptance and anti-hallucination rules

- TRUE_PIXEL_MATCHING: source image-derived Harris/Shi–Tomasi corner responses and normalized patches; unlike manually seeded points, match positions computed from source pixel arrays.
- EPI_MATCHING: verified horizontal epipolar/disparity only under a **user-asserted** calibrated parallel stereo setup. No automatic camera intrinsics, extrinsics, subject-motion separation or fundamental/essential matrix estimation.
- MATCH_CONFIDENCE: a heuristic for patch consistency, not a calibrated physical probability. Repeated textures, motion blur, lighting differences, rolling shutter and independently moving subjects still can produce incorrect correspondences.
- TRUE_3D_XYZ: only after human approval and existing physically verified 7.10 stereo inputs (baseline in mm, focal in source pixels, actual rectification). Manual confirmation is not the same as independent physical calibration evidence.
- 3D_VOLUME_SDF_FROM_VIDEO: NOT IMPLEMENTED. Real sparse XYZ points are not a dense solid, body skeleton, believable face, face-model weight system or a 360° digital scan.
- REAL_PERSON_IDENTIFICATION, APPROVED_HEROINE_LIKENESS, SCALP_HAIR_PHYSICS, FULL_BODY_RIG, NATIVE_GPU_60FPS, APK_EXE and ORIGINAL_RENDER_LIVE: separate gates remain NOT VERIFIED.
- CNC CAD/CAM/SIM/NC protected core remains unchanged. All previous FastModel 7.0–7.10 resources preserved. Original Render static site branch source mirrored separately; web LIVE deployment requires exact deployed SHA.

## 7.12 next engineering

1. Calibrated automatic camera intrinsics / relative extrinsics with robust RANSAC fundamental/essential estimation, feature-inlier reprojection and minimum parallax, but never invent an absolute physical scale from monocular video alone.
2. Connect proven sparse per-frame 3D landmarks to 7.8 implicit 3D field as **soft evidence** with uncertainty; do not falsely mark dense surface completed.
3. Extend continuous 7.9 observer with stable source keypoint tracks across time and incremental checkpoint metadata; cap Android memory and verify real device FPS.
4. Use actual reference heroine video and full-body source to test face/neck/hair geometry; synthetic video CI is insufficient for visual acceptance.

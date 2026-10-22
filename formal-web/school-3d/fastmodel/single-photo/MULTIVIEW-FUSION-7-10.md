# FastModel 7.10 — calibrated video stereo correspondence → measured sparse XYZ

Date: 2026-10-22. Forward-only from verified FastModel 7.9 source `9df98d0471ebfdb3c25f3ca5948e48e60eb77e57`.

## 7.10 source and use

1. Browser decodes the user's original local video, obtains full SHA-256 if the file is 64 MB or less, and selects two paused moments **A** and **B** from the same source. Both images are displayed unmodified; users identify the *same source feature point* on both.
2. 7.10 implements actual **rectified, parallel stereo geometry**. Camera A is the origin facing +Z; camera B translates by a user-measured baseline along image X, with unchanged calibrated lens intrinsics and parallel optical axes. The user enters focal length in the scaled image's pixel units, measured baseline in millimetres and explicitly reviews both calibration and rectification. Without these checks **no XYZ computation is permitted**.
3. Formula: disparity d = xA - xB; Z(mm)=f(px)×baseline(mm)/d(px); X=(xA-cx)×Z/f; Y=(cy-(yA+yB)/2)×Z/f. This is actual projective triangulation conditional on correct camera metadata, not a guessed heightmap or a fake picture.
4. Each match is checked for source-frame identity, nonzero parallax, left/right disparity sign, common epipolar Y, positive finite range, reprojection residual and bounded uncertainty (one-pixel depth sensitivity). Negative/near-zero parallax and inconsistent 3D tracks are blocked.
5. `addAIG710StereoMatch` incrementally averages consistent world XYZ points from *different observed frame pairs*, tracks each source point label and every contributing frame's timestamps, bounds observations and features, and refuses changing calibration in an active workspace.
6. `importAIG710Fusion` requires exact same video source SHA and recomputes all XYZ from stored 2D correspondences rather than trusting JSON-supplied coordinates. Source video pixels are not exported.
7. `multiview-studio.html` and `multiview-studio.mjs`: locally decoded WebM/MP4 frame capture, A/B click-to-match labels, calibration review, XY reprojection quality, simple interactive 3D point-cloud preview, JSON export/restore.
8. `tests/aig-multiview-fusion-7-10.test.mjs` and `tests/aig-multiview-fusion-7-10.real-browser.mjs`: test exact millimetre coordinates, parallax/epipolar reject, sparse incremental track consistency, tampering protection, 360×780 mobile and 1440×900 desktop actual browser video decode, pixel mark and 3D point cloud.

## Important scientific and product boundaries

- **A handheld monocular face-turning video does not generally satisfy the rectified stereo assumptions.** Unknown camera motion, optical-axis rotation, focal change, subject movement, rolling shutter and lens distortion make uncalibrated triangulation invalid. A reviewed checkbox is a claim by a user, not an independently measured camera pose.
- Proven sparse X/Y/Z points are not a **dense mesh, SDF volume, rig, skinning or human likeness**. 7.10 does not yet change the 7.8 SDF or create completed realistic persons/animals. Output says `fusedWithFastModel78SDF:false`.
- Depth expressed in **mm** is only physically reliable if measured baseline, camera intrinsics, rectification and correspondences are actually correct; larger disparities improve depth stability, and uncertainty remains uncalibrated.
- Camera calibration, feature correspondence and rectification are **human reviewed**, not automatically solved from arbitrary videos. FastModel 7.9 adaptive frame selection remains independently available.
- All measured point cloud tests use synthetic generated video/known numeric calibration, **not original heroine photographs or validated real phone camera poses**.
- AIG-II/CNC CAD/CAM/NC, NC machine safety and previous FastModel 7.0–7.9 cores are left intact. Original Render site source is mirrored, LIVE deploy separately verifiable.

## 7.11 proposed

Implement optical flow and geometric cross-check for automatic candidate correspondences, real camera calibration/intrinsics/extrinsics with reprojection/bundle adjustment evidence, and multi-angle incremental real 3D SDF constraints. Reject frames with unstable camera/subject motion. Only after geometry confidence and source likeness evidence promote beyond sparse points. Native APK/EXE performance and real heroine hair/skin quality remain unverified.

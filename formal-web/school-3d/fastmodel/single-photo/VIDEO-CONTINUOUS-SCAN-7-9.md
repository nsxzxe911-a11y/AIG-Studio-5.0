# FastModel 7.9 — real video + live camera continuous scan and bounded keyframe memory

Date: 2026-10-22. Forward-only from the verified FastModel 7.8 checkpoint. This feature adds actual local video/camera frame observation; it does NOT claim a trained/fused human 3D reconstruction.

## Source modes

- **Video file:** Browser `<video>` decodes a user-selected local video file (MP4, WebM, other browser-supported formats). Video stays local, with no API call or automatic upload. Up to 300 MB file accepted. For files up to 64 MB, browser crypto SHA-256 identifies the exact source for safe checkpoint restore; larger files remain in-session observation, with unverified source identity.
- **Continuous live camera:** Calls real `navigator.mediaDevices.getUserMedia` after a user click, subject to browser permission and secure context. Camera frames are decoded locally, with pause, resume and stop controls; tracks are stopped on Stop or tab hidden/page exit.
- **Actual cadence:** `requestVideoFrameCallback` (or `requestAnimationFrame` fallback) receives decoder frames, with configurable 200/400/750 ms source sampling intervals. Processing resolution is capped at 64/96/128 px to reduce CPU/memory load. Accept/reject uses content quality and novelty, not fake per-frame model generation.
- **Incremental memory:** `aig-continuous-scan-7-9.mjs` maintains 12/24/48 optional keyframe descriptor cache (max 64 protected). Dark/overexposed/low-contrast/low-detail/duplicate frames are rejected. If cache is full, a new observation replaces only a less informative redundant observation. Stop, pause/resume and JSON checkpoint readback retain only numeric descriptors, quality scores, manually reviewed pose labels, and source digest.
- **3D honesty:** Frame-to-frame pixel difference is NOT camera orientation or real depth. Pose metadata is accepted only when the user explicitly reviews yaw/pitch. Video from front and side may improve observed geometry coverage, but unknown camera intrinsics/extrinsics, correspondence, scale, parallax, motion blur and occlusion still block a genuine multi-view reconstruction and character likeness.
- **No involuntary storage:** Source video bytes and raw original frames do not enter exported JSON. Local thumbnails are present only in the current browser session. Import requires the same verified source SHA-256, budget/schema validation, and no raw image fields.

## Code files

- `aig-continuous-scan-7-9.mjs`: pure bounded deterministic incremental descriptor+quality decision engine, source-provenance memory and fail-closed state transitions.
- `continuous-studio.html` + `continuous-studio.mjs`: RGB, phone/desktop local video/camera viewer, keyframe gallery, progress/quality evidence, pause, resume, stop, checkpoint export and same-source restore.
- `tests/aig-continuous-scan-7-9.test.mjs`: actual keyframe novelty/quality rejection, progress, resume, capacity, source mismatch and negative input tests.
- `tests/aig-continuous-scan-7-9.real-browser.mjs`: generates real decodable WebM with Chromium MediaRecorder, scans video frames through the browser, validates file SHA and JSON roundtrip; also calls real getUserMedia with Chromium's synthetic fake camera and tests Stop releases tracks. Runs mobile 360x780 and desktop 1440x900; screenshot and JSON artifacts are synthetic-fixture evidence, **not real heroine footage**.
- Existing native CAD/CAM/SIM/NC and previous 7.0–7.8 core untouched except additive navigation and offline build list. Web source mirrored to the original AIG Render repository branch; needs exact LIVE SHA and actual HTTP readback to claim publication.

## Quality gates

- LOCAL_VIDEO_DECODE_AND_CAMERA_API: PASS only after real phone and desktop Chromium processing evidence.
- INCREMENTAL_MEMORY: bounded descriptors, exact source provenance and no photographs embedded in exported JSON.
- UNKNOWN_CAMERA_POSE: unverified unless explicitly user-reviewed (manual yaw/pitch is not calibrated camera tracking).
- CONTINUOUS_3D_MODEL_FUSION / MULTIVIEW_POSE / AUTHENTIC_FULL_BODY_RIG: NOT IMPLEMENTED. These remain independent gates for subsequent 7.10 engineering.
- ORIGINAL_HEROINE_MULTI_ANGLE_LIKENESS, GPU_NATIVE_APK_EXE, 60_FPS, REAL_HAIR_SKIN_CONTACT, ACTUAL_MMO: NOT VERIFIED.

## 7.10 follow-up

Use verified multi-angle video/camera keyframes to compute **calibrated camera pose** and matched features (with confidence/uncertainty), then fuse only trustworthy multi-view evidence into an actual update of 7.8 XYZ SDF. Introduce incremental local model revision and reproducible source-to-model provenance; reject viewpoints without validated camera pose. Benchmark latency and memory on Android/Windows and real scenes before release.

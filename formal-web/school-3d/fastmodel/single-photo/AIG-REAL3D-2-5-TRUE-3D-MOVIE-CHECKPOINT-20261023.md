# AIG FastModel | Real3D 2.5 TRUE 3D movie — source and acceptance checkpoint

## Authority continuation: No deletion, no demotion

- Base 2.4: PR #42, SHA `7384c4498cb1821590c3fa75ebdb7e9eccaeae95`.
- 2.3: PR #41, SHA `75251b91287b9610936097b8be7d8e741dac2c8e`.
- 2.2: PR #39, SHA `f4d04da9f8a48374b192394cff1aff465ea9bbbd`.
- This isolated 2.5 branch: `verify/real3d-true-world-movie-2-5-20261023`.
- AIG-II / AIG Studio CNC/Fanuc/CAD/CAM/NC core, main RGB UI and existing assets are intentionally untouched. Only FastModel source workspace/test/CI touched.
- **Never claim formal Render, APK, EXE, actual encoded native output, or release Gate PASS unless real new evidence exists.**

## Completed in new source code (pending CI verification)

1. Reuse current single THREE.WebGLRenderer for exact **1920x1080** movie frames. Use existing `viewer.beginMovie1080p()`, `onFrame` and `onAfterRender` callbacks, restore viewport on stop/failure. Do NOT use AIG 6.5 2D/2.5D photo parallax as a 3D film.
2. `aig-true-world-movie-2-5.mjs` verifies exact 2.2 plan against 2.0 original-GLB scene SHA/revision and source actor clips. For each scripted actor, reuse 2.4 `auditAIG24ArticulatedAnimation` to require non-planar 3D body, 6+ weighted joints, and actual changes in pairwise 3D skinned-body vertex distances for the selected GLB clip. Rigid photo/camera movement and triangle test actors BLOCK movie certification.
3. MediaRecorder + captureStream compositing records the actual WebGL canvas. Source-specified Chinese subtitles are burnt into actual video canvas pixels; codec type and extension are matched (do not rename or invent MP4).
4. Existing `scene-runtime-studio.html/mjs` supplies "錄製真 3D 電影" / cancel / actual download buttons, provenance panel. On success preserve result as Blob URL and best-effort import into source SHA content-addressed 7.16 separate local IndexedDB; if >64MiB or storage denied, download remains possible. Failure does not replace earlier completed movie or source assets.
5. New bounded source integrity / compositor / cancellation tests, upgraded existing true mobile/desktop Chromium scenario using source technical 6.4 17-joint humanoid and Chinese `轉頭` with subtitles. CI now includes source syntax, numerical tests, actual mobile/desktop playable encoded movie artifact.

## Unfinished / honesty gates

- **No** trained local person/animal semantic AI detector, 1:1 identity, 7.15 full portrait-fidelity skinning, occlusion-free hidden rear data, or new procedural run/jump/crouch yet. Existing 6.4 rig is estimated technical substitute, not user's approved heroine.
- **No** automatic audio synthesis, lip sync, SFX or soundtrack is claimed in 2.5: first movie pass is **silent with burned subtitles**. Existing separate sound/audio modules may be integrated later with actual user source and mux validation.
- Browser MediaRecorder real-time 1080p `30 FPS` is **target only**, frame pacing may vary; actual 30 FPS or S23 60 FPS not verified.
- Discrete/skinned-geometry gate is not continuous collision-free cloth/hair proof. True film work includes future camera editing, voice/music, collision gating, model fidelity and native encoder support.
- Full GitHub Gate MUST PASS before this Draft PR is merged/deployed. Missing actual movie artifact or failed phone/desktop step remains BLOCKED.

## Next-chat exact continuation
Open newest 2.5 PR and branch SHA, inspect GitHub Actions job logs and actual recorded movie evidence. Fix red step without deleting any older features or changing CNC geometry/NC. Only then proceed forward to 2.6 (genuine film audio, procedural body motion, authored camera cuts and real multi-character cinematic timing).

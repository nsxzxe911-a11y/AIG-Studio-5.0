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


## Real3D 2.5 follow-up repairs — 2026-10-23

- Root cause of PR #43 missing PR-triggered gate: the **base** workflow `.github/workflows/aig-shared-real3d-v1-3.yml` only has `push` on `repair/core-first-fastmodel-20261021`; it has no `pull_request` trigger. The proposed new `pull_request` entry does not exist on the base until merged, so creating a draft PR did not provide a current PR-triggered test result.
- On the isolated 2.5 branch, the same complete workflow now enables **push** on `verify/real3d-true-world-movie-2-5-20261023` and extends its `paths` to include all `single-photo/**` source/test files. This must trigger the full existing CNC + FastModel source Gate on subsequent branch pushes. GitHub connector's `fetch_commit_workflow_runs` lists **only PR-event runs**, so `[]` cannot by itself determine the outcome of any push-event run. **Do not claim a green workflow or completed film artifact without an actual run/job and bytes.**
- `aig-true-world-movie-2-5.mjs` now checks magic bytes on final encoded movie: WebM `1a 45 df a3` EBML and MP4 `ftyp` brand at offsets 4-7. Nonempty MediaRecorder chunks alone are not a true successful film. Invalid container fails closed, keeping previous download/model untouched.
- The source tests include negative false-video header and positive matching container cases. In isolated JavaScript runtime, real image foreground/rigid-vs-deform maths and browser recorder state/media-signature logic were exercised, including invalid WebM header FAIL. Such isolated tests **do not** replace Chromium GPU real encoded movie and native device gates.
- New continuation should inspect PR #43 latest actual SHA and push-event Actions run. The verified gate must keep 2.2 storyboard and 2.4 nonrigid-body source checks, validate proper video signature and that file plays. If fail, repair exact failing line, do not regenerate whole application, downgrade or delete AIG-II CNC cores.


## Follow-up: actual frame playback certification (2026-10-23)

- Starting from movie source `2a0ecf92`, new source changes include `verifyAIG25DecodedFrame()`. It constructs a real HTMLVideoElement from the encoded movie Blob, waits for actual decoded `loadeddata` and requires exactly **1920×1080** before offering the new download as validated. Native browser codec support alone or just a nonempty/magic-matching Blob is insufficient.
- All temporary decoder object URLs are revoked on success/failure. A failure preserves the previous valid movie Blob URL and the immutable GLB/scene vault. `movie25-proof` records `browserDecodedFrameVerified=true` and actual decoded dimensions only after that step; `movieWritten` remains only a recorder-level claim until confirmed.
- Extended `tests/aig-true-world-movie-2-5.test.mjs`: actual WebM/MP4 file signature checks, valid 1080p decoder callback, mismatched 720p and failed decoder callback. Isolated model-side JS evaluation passed the sample cases, and updated source/UI/tests syntactically parsed. THIS IS NOT a full Chromium source movie Gate.
- The isolated branch workflow push trigger now includes the isolated 2.5 branch plus changes anywhere under `single-photo/**`. The GitHub connector `fetch_commit_workflow_runs` only enumerates *pull_request*-event runs; empty means no PR-event run was returned, NOT proof a push run passed or failed.
- Current known outstanding: no confirmed new Actions real-browser encoded movie artifact, no deploy, no APK/EXE or source-faithful 1:1 photo film. Never advertise 30 FPS (target) as measured. No new human motions or voice were synthesized.

## 2026-10-23 formal site fake FastModel retirement and Real3D 2.5 async source repair

- **Separate official Render website source branch** `web/aig-dual-formal-runtime-20261016` was updated in actual GitHub commits to delete public fake `formal-web/fastmodel/index.html` (6.9.5 still-photo motion) and obsolete 1MB `formal-web/fastmodel/app.js`. Main site and `aig-new-home.html` no longer advertise this route; two-column layout restored. Original independent geometry and CAD/NC engine source and historical evidence remain.
- Website permanent no-fake Gate `.github/workflows/aig-no-fake-fastmodel-public-entry-gate.yml` run `39870194358` **PASS** for removing the fake 6.9.5 public entry and preserving retirement evidence.
- Older homepage browser Gate originally RED because it explicitly required the removed fake entry and a third card. It was revised to require **two** authentic CNC/download cards, public fake index 404, and preserve phone/landscape/desktop layout. The actual fresh Gate conclusion must be checked at its newest run before claiming PASS.
- **Render LIVE is not yet updated/verified**: last confirmed deployment from Render list was prior commit `f24cb08a` (2026-10-22). Never claim website fake is gone from the live URL until Render points at a cleanup SHA. Source code cleanup != live deployment.
- Real3D 2.5 PR #43 original full source Gate run `39869162356` had all source and CNC unit tests PASS but real browser FAIL at `aig-map-actor-2-1.real-browser.mjs`: phone expected 2 world GLBs and got 1, due to asynchronous old source/map operations.
- Fix: `scene-runtime-studio.mjs` now queues world-new/add operations transactionally and snapshots exact asset ID, SHA metadata, map selection, coordinate mode, scale, XYZ and reviewed status at click time. No silent `if(worldBuildMutation)return` drop; queued source additions commit in order. Preview now awaits queued mutation completion before 3D GPU loading. Original GLBs are not modified.
- Browser regression now waits for first actual source-world and actor commit (1 character) before adding the building, then verifies (2) before material/GPU/world-actor checks. Relevant commits include `77b718aa`, `8ebb0b0e`, `07bb5a07`, `1f966fc4`.
- **Do not claim Gate GREEN** until latest actual GitHub Actions *push* run on `verify/real3d-true-world-movie-2-5-20261023` completes and provides saved Chromium phone+desktop true 1080p decoded movie evidence. `fetch_commit_workflow_runs` only lists PR runs; use GitHub GET `/actions/runs?branch=verify%2Freal3d-true-world-movie-2-5-20261023` for branch push runs.

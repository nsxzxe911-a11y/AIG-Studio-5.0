# Real3D 3.6 — one kernel with 120 LOGICAL slots (source gate checkpoint)
Date: 2026-10-23. Development branch `verify/real3d-unified-appearance-3-5-20261023`; stacked Draft PR #44.

## What is actually connected
- Real3D 3.5 source-bound reconstruction (2.7 labelled photo → 2.9 sections → 3.0 fused SDF → bounded photo XY silhouette fit and appearance controls) preserved. A segmentation mask is still required: this is **not** arbitrary single-photo hands-free 3D.
- `aig-unified-120-core-3-6.mjs`: one source RGB sampling algorithm, 120 identically dispatched **logical** vertex-colour shards. Bounded cooperative scheduling and event-loop yields; one existing WebGL renderer. `actual parallel WebWorkers=0`, `hardware parallel 120=NOT PROVEN`. 120 cannot be treated as the device's CPU/GPU core count.
- Real camera fit from the actual 3D mesh bounding box, with manual reframe button and live WebGL draw evidence.
- Direct source-pixel reference canvas; source image/label arrays never overwritten by preview.
- Real PBR quality presets and optional WebGL shadow maps (not hardware ray tracing). Ray-trace request shows explicit PBR fallback. Neither WebGPU nor native RT backend is included.
- Safe per-page cleanup, preserved existing GLB/world actor and CNC code. Real3D 3.1–3.4 articulation remains separate and must NOT become an appearance approval.
- `AIG36_CAPABILITY_STATUS` is a machine-readable ledger of implemented / pending features to prevent phantom completion.

## Verified technical evidence
- Dedicated GitHub Actions run **39935383910** on **8a5e972bbb615680e3ef34e5083ee7dc2ddb1c1a**, **SUCCESS**, includes Node tests, esbuild production bundle, real Chromium phone+desktop screenshot/proof and PBR ray-request fallback.
- Artifact **12494090527** (synthetic test model), uploaded from that run.
- Desktop: 1 reusable renderer, 120 / 120 logical shards actually executed, 14,056 real 3D vertices colour-sampled, 28,120 submitted triangles, actual camera auto-frame; screenshots prove a visible technical SDF mesh.
- **Not a resemblance acceptance**: current test model still has an unattractive blob torso, faceless head, artificial arms/legs and no correct uniform/hair. Source photo 2D edge error is NOT a 3D likeness score.

## Unfinished and blocked
- Approved heroine reference photos exist in personal project/library, but are not yet photo-bound into this branch's 3.6 browser test or the live website. The current test uses a synthetic humanoid fixture.
- Real visual similarity, natural face/hair/fabric, occluded side/back reconstruction, automatic segmentation without manually seeded labels, feature-aware anthropometry, robust physics/rig and true 1:1 measurement remain to be developed.
- Hardware path-traced lighting, real parallel WebWorker/CPU pool, 120 physical processing cores, dynamic mesh LOD, native 60 FPS and APK/EXE native gates are NOT completed.
- PR is Draft and not merged; production Render site, native APK and EXE NOT updated, releaseBlocked = true.

## Release gates
1. Approved reference asset SHA and RGB/multiview consistency must be actually read in the reconstructed model.
2. Capture actual front, side, rear, face, hair, clothes screenshots and independently compare to source.
3. Hardware and frame-time evidence must be reported separately for Web, Android, Windows.
4. Full functional regression and prior 3.0–3.5 module preservation; no reset or change to CNC/CAD sources.
5. Merge/deploy only on real gate evidence; do not downgrade or claim 100% likeness.

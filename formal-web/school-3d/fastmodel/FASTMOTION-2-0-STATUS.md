# FastModel 2.0 — pose-space head/neck + hair risk checking

Incremental from exact validated 1.9 `eded48bcd0b27732d8be3f2caac0ead05a515dd4`, on Draft PR #12. This is NOT a completed 3D heroine repair or native Windows/Android benchmark.

## New actually implemented feature

- `web/animated-integrity.mjs`: `inspectAnimatedIntegrity` reads actual skinned GLB POSITION / JOINTS_0 / WEIGHTS_0, inverse bind matrices and LINEAR rotation animation channels; uses 1.6 `createPoseEvaluator` to evaluate 25 distinct poses (bounded 3–61). For each sample pose it applies weighted CPU skinning and computes closest head-neck / hair-neck sampled vertex distances plus hair/neck projected AABB overlap. Returns exact frame indices, clip times, sample counts and JSON-compatible telemetry.
- To avoid fabricating a pose from mutually exclusive animation clips, multi-clip GLBs now **BLOCK** until an explicit clip selector is implemented; duplicate rotation channels on the same node also BLOCK. There is no fake success on an animation that never existed.\n- Source integrity: GLB mesh node role tagging `extras.aigAnatomyPart=head|neck|hair` is REQUIRED. Missing role/skin/rotation clip, non-rotation animation channels, unsupported node transforms or morphs, corrupt skin indices/weights, excess source vertex budgets and invalid interpolations BLOCK rather than producing apparent PASS. This inspection does not edit or overwrite any mesh, bone, material or character ID.
- Motion pane `animated-check` is a real callback, reports sampled frames and risk locations; benchmark JSON includes `animatedPoseAudit`. The offline standalone packer embeds the CPU skin evaluator; node tests exercise real test fixture skin data, moving hair, fail-closed input and wiring.
- Retained: 1.9 bridge **candidate** working-copy download, safe preview `skin===1` fix, 1.8 seam and hair static diagnostics, 1.7 fictional classmate anti-clone, 1080p default/QHD/4K selectable, raster-only RT OFF and clean/no-grid default.

## NEVER claim these have passed from source CI
- Nearest *sampled vertices* ≠ actual welded seam, triangle collision or accurate depth occlusion. AABB projected overlaps are risk flags only. Frame sampling can miss events between sample times. A static mesh can appear separated visually due to materials, normals or missing faces despite numerical proximity.
- This app lacks a formally approved heroine GLB; the actual girl's head/neck and hair have not been physically modified or accepted. No screenshots of an approved moving heroine have passed.
- No real Windows / Android runtime measurements: GPU FPS, true native p95, 1080p dimensions, GPU memory and temperature remain unknown; do not reinterpret JavaScript browser FPS or GitHub Linux synthetic tests as real S23 / Windows 60 FPS.
- Real release still BLOCKED until actual heroine working-copy model, neutral + different animation poses and front/left/right/back visual + collision review, plus dual-platform hardware evidence.
- No merge, no Render production deploy and no new APK/EXE as a result of this 2.0 Draft.

## Acceptance next
- Obtain the approved character GLB with tagged head/neck/hair and supported skinning animation, run the on-device real sample scan, inspect flagged keyframes visually and repair geometry/weights in a reversible Working Copy.
- Record real Windows + Android 1080p animation FPS and p95 on confirmed hardware, plus thermal data and explicit capture provenance. Promote only if the source and device gates both PASS.

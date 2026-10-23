# AIG Real3D 2.8-A — FIRST-PARTY LEARNED PIXEL INFERENCE

Date: 2026-10-23 · Traditional Chinese · Exact continuation branch `verify/real3d-true-world-movie-2-5-20261023` · Draft PR #43 https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/43

## True source and version contract
- Resume 2.7 genuine RGBA pixel segmentation PASS (CI #39900549778), 2.6 plane-mm/linear RGB PASS and original 2.5 GLB/17-bone/single-renderer/1080p movie work.
- **Do not republish old fake FastModel 6.9.5, remove CNC or drop AIG-II / AIG Studio CAD/CAM/SIM/NC/Fanuc validation.** 2.8 is incremental additive work on PR #43, NOT merged or a live Render deployment; no APK/EXE release claims.
- The user wants no fake 3D, one-photo-to-body and realistic colors. 2.8-A specifically builds actual first-party supervised *ML pixel classification*. It is **not** an identity-recognising pretrained semantic model and **not** 1:1 hidden 3D reconstruction.

## Actually implemented
- `aig-local-learner-2-8.mjs`:
  - Real deterministic multiclass softmax-gradient trained weights, feature mapping of **actual source RGBA pixels**, per-class balanced source-image reviewed labels, fixed learning rate and epochs.
  - Human review and source SHA required; unreviewed 2.7 seeds cannot silently become ground truth. Real trained weights are fingerprinted via SHA-256; exact codec/model JSON is not replaced by an engineering shell.
  - New-photo automatic pixel inference using learned weights with class ID, confidence probability, conservative uncertain value **255**, unknown pixel fraction and per-class counts.
  - Independent photo validation is a **different photo SHA and independent reviewed mask**; computes each class IoU and mean IoU. Training-photo evaluation blocked.
  - Explicit no false certification: no general source-free recognition, no cross-photo natural-world IoU benchmark, no full-body depth, no identity, releaseAllowed false.
- `aig-local-learner-2-8-ui.mjs` integrated into `scene-runtime-studio.html` and `scene-runtime-studio.mjs`:
  - train on **explicitly reviewed** 2.7 RGBA class mask from exact same 2.6 original source image, with checked classes and zero ambiguous boundary pixels;
  - infer on the current photo using the same learned source-bound weights after changing to another 2.6 photo; show colour-coded inferred labels and grey "UNKNOWN" abstentions, do not overwrite original photograph/GLB/2.5 movie;
  - run source-disjoint review-mask classwise IoU; save real JSON weights + SHA to the existing 7.16 IndexedDB vault, verify archive SHA on readback; list and restore saved model weights from local vault, optional import model JSON with exact weight SHA.
- Numerical tests `tests/aig-local-learner-2-8.test.mjs`: loss decrease, learned weight numbers, deterministic SHA, real different-photo synthetic-source IoU, per-class metrics, unknown abstention and all false-ground-truth rejection.
- Real phone-shaped and desktop Chromium `tests/aig-local-learner-2-8.real-browser.mjs`: real pixel source photos, 2.7 click segmentation + explicit human review, 2.8 trained model, saved/returned vault weights, second *different source SHA* automatic inference, independently reviewed second-photo IoU, screenshots and evidence.
- Dedicated `.github/workflows/aig-real3d-2-8-supervised-inference-gate.yml`; integrated 2.8 numerical+browser tests in existing `.github/workflows/aig-shared-real3d-v1-3.yml` before NC/movie regression. No previous Gate disabled.

## Verified evidence (not final release)
- Independent dedicated 2.8 GitHub Actions **#39901750238**: COMPLETE / SUCCESS after real source color classifier tuning.
  https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39901750238
- Dedicated 2.8 **#39901843947**: COMPLETE / SUCCESS (browser phone+desktop cross-source ML, genuine code, standard build).
  https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39901843947
- First actual 2.8 test on training-source colour categories was RED at IoU=0.25 (only background correct). Do NOT relax the evaluation to pass. We raised the true gradient optimization rate, confirmed on a separate synthetic image that all background/hair/neck/garment passed; browser Gate now requires EACH class IoU >0.60, not just average.
- Later 2.8 model **restore after refresh** tests and latest combined Gate may still be in progress. Check latest source SHA+run status before claiming current HEAD PASS.
- Above independent fixture is artificial colour blocks; **the IoU number is not real-world segmentation accuracy** or natural-image semantic understanding, and Chromium phone viewport does not establish actual S23/Windows native FPS.
- Existing Real3D 2.5 desktop WebM encoder failure and entire 3-project CNC safety Gate remain independently unresolved. Do not merge 2.8 solely on the dedicated PASS.

## Next actual technology / 2.8-B
1. Acquire/build *legally usable* audited model weights or collect many real annotated local images to train first-party semantic classifier. Current 2.8 RGB model is genuine learning but lacks multi-scene semantic generalisation and face/head depth.
2. Hold out entire natural photos and sources; compare classwise IoU, abstention calibration, hair-neck collision/occlusion, nighttime lighting and backgrounds. A model may be used only after real evidence beats source-only 2.7 and false positives are bounded.
3. Generalise to locally calibrated 3D depth/multiview with source metric references. Neither RGB colour classifier nor 2.6 planar mapping proves physically correct invisible rear geometry.
4. Keep improving true color PBR and render performance without ray-tracing requirement, preserving all prior cores.

# AIG Real3D 2.8-B — actual multiple-photo reviewed learning + visible hair/neck occlusion
Date: 2026-10-23. Language: Traditional Chinese. **Do not overwrite / downgrade** AIG-II / AIG Studio 5.0 CAD/CAM/SIM/3-6AX NC or Real3D 2.5-2.8-A.

## Exact continuation reference
- Repo: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0
- Branch: `verify/real3d-true-world-movie-2-5-20261023`
- Draft PR: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/43
- Latest finished *previous* dedicated Real3D 2.8-A phone & desktop Gate was SUCCESS run 39901914665. Real3D 2.8-B has a separate required Gate; **confirm HEAD Gate before claiming PASS**.
- Combined 2.5/CNC Gate continues BLOCKED if desktop Chromium movie encodes zero bytes. Existing source hard stop `NO_NONEMPTY_ACTUAL_3D_VIDEO_FRAMES` must never be bypassed; source photo and GLB retained. Older world scene regression had duplicate same-title stored world snapshots; test fixed to reload exactly matching immutable scene UUID, not arbitrary same name.
- The official public Render website does NOT automatically deploy this unmerged branch; APK/EXE native release not built from it.

## Actually coded: 2.8-B
1. `aig-multisource-occlusion-2-8b.mjs`
   - **At least two** reviewed SHA-distinct source photos with actual RGBA pixels + 2.7-derived human-confirmed masks. Up to 8 images, bounded total 3 million pixels and typed-array snapshots to prevent switching current photo from silently changing previous training records.
   - Class inventory must match the user-annotated source regions for this phase; reject duplicates, malformed or unsupported pixel labels, unlabeled unknown (255) as training truth and inaccurate same-title source replacement.
   - True multiclass gradient model trained by **the existing original 2.8-A learner**, with all training source SHAs and sample counts in fingerprinted weights; no mock neural network.
   - Independent **third photo** source SHA is excluded from training and used to evaluate each class IoU, missing-class failures and unknown fraction. High mean IoU cannot mask a totally missed neck.
   - Hair-vs-neck pixel adjacency from actually visible source labels only. Reports contact/unknown; explicitly declares hidden geometry not reconstructed and no skin/cloth collision proof.
2. `aig-multisource-occlusion-2-8b-ui.mjs`, integrated into the existing `scene-runtime-studio.html/.mjs` and original `aig-local-learner-2-8-ui.mjs`
   - Buttons: A = add reviewed source photo, B = run real 2+ photo learning, C = visible hair-neck boundary, D = independent third photo IoU; clear volatile review queue only (never deletes original photo, saved weights or GLBs).
   - 2.8-A's existing **automatic new-photo inference, vault model save/restore, model SHA verification** are reused through a genuine shared reviewed-model bridge; no fake separate GUI action.
   - The user must reselect each separate photo through 2.6 verified photo SHA, run 2.7 segmentation, review the actual masks and explicitly check the human-reviewed box. Source photo changing does not erase saved reviewed training snapshots.
3. `tests/aig-multisource-occlusion-2-8b.test.mjs` and `tests/aig-multisource-occlusion-2-8b.real-browser.mjs`:
   - Numeric sources A/B reviewed → true multi-photo gradient training → photo C held out, SHA disjoint per-class IoU, stored arrays unmodified, boundary only visible.
   - Actual phone-shaped and desktop Chromium 2.6 → 2.7 → 2.8-B → original 2.8-A SHA vault export/restore → photo C inference and heldout classwise IoU screenshots.
   - All source images used by current automated test are simple **synthetic color fixtures**. Even IoU=1 on these is NOT measured natural-photo recognition quality. No real trained universal semantic CNN or face recognition implied.
4. CI added: dedicated `.github/workflows/aig-real3d-2-8b-multi-photo-occlusion-gate.yml`, and the existing full three-project `.github/workflows/aig-shared-real3d-v1-3.yml` now requires 2.8-B numerical tests and browser Gate *before* original 2.5 WebM and NC Gate. No Gate disabled.

## Evidence status (must not overstate)
- In-process pure-JavaScript source smoke on **2 distinct reviewed synthetic photos A/B and independent C** produced 4 class-wise IoUs at 1.0, body-hair-neck visible contact 26 pixels; these are extremely simple artificial pixels, not field benchmark.
- First dedicated GitHub Actions run 39903421349 FAILED on one test's error ordering while the safeguard actually rejected invalid class manifests. Source was fixed so the immutable class manifest is checked before pixel type content, commit `cc95e82f`. CI #39903523394 was started, check whether successful before presenting 2.8-B as GREEN.
- Other separate previous 2.6, 2.7, 2.8-A Gates remain present and historically GREEN; check latest SHA/revisions. Full CNC/Android/Windows native Gate may remain RED.

## Next technical work
- Verify latest real phone/desktop 2.8-B test run and make exact targeted corrections, never lower per-class IoU or mark an incomplete rendering as pass.
- Natural-photo dataset: obtain actually approved multi-scene images with a human-verified truth mask, cross-domain holdout splits by source/SHA, white-balance/day/night/occlusion cases. Do **not** invent image files or metrics. Measure per-class IoU and abstention on real images before any automatic semantic generalisation claim.
- Real full-body physical 1:1 still requires measured scale + depth/multi-view, original 2.6 plane reference is only a plane. No single unmeasured portrait's hidden rear anatomy is 'known'.
- Continue 2.5 desktop WebM zero encoded frames root cause, under a separate fail-closed release Gate.

## 2026-10-23 combined Runtime regression follow-up
- Earlier full combined Gate run **39903523428** (commit `cc95e82f`) did run through Real3D 2.6/2.7/2.8, source characters, GLB GPU, calibrated stereo source and then failed with a genuine **Android-shaped narrow viewport input interception** on `#heroine-joint-save`: nearby `#heroine-candidate-build` and field labels intercepted the pointer. This is not a reason to remove tests or force Playwright clicks.
- Applied a source CSS layout fix to existing `metric-stereo-studio.html`, commit `faad7417a84722b71d5dd83281bc0d848a605bb0`: CSS isolation, actual stacking for the neck/rig edit button and stacked full-width controls on mobile. Must verify follow-up combined Chromium Gate before declaring mobile editing success.
- Dedicated 2.8-B run **39903523394** was still in Chromium installation as of this write. Prior numeric test failure `UNDECLARED_CLASS_IN_REVIEWED_MASK` vs expected class manifest fixed via `cc95e82f`, without relaxing mask rejection.
- The 2.8-B source files are additive and **not on the public website**. Do not report model weights or a native/Render build as delivered while the PR is draft and the combined Release Gate is not green.

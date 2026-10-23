# AIG Real3D 3.2 | TEN hand fingers + TEN foot toes | 56 independently controlled phalangeal segments

Date: 2026-10-23, Asia/Taipei. This is a technical **source-aware articulated 3D preview**, NOT a certified scanned 1:1 hand/foot.

## Actual continuation point
- GitHub repo: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0
- Branch: `verify/real3d-true-world-movie-2-5-20261023`
- Draft PR #43: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/43
- User directive: "共20根 手指和腳趾都要加上引擎 下一項" (all ten individual hand fingers and all ten foot toes, next engine stage).
- Preserve 3.0 one-piece SDF body, 3.1 sixteen real joints and +/-180 camera, 2.6–2.8B pixel colour and segmentation, 2.5 true source-GLB movie, original AIG-II and AIG Studio CNC runtime. No resetting assets, replacing CNC engine or rolling back.

## New Real3D 3.2 code
1. `aig-20-digit-articulation-3-2.mjs`: immutable manifest of **exactly 20** digit IDs (`left/right Hand thumb/index/middle/ring/little` + `left/right Foot thumb/index/middle/ring/little`). 56 actual linked phalanges: 2 each on 2 thumbs + 2 big toes, 3 each on other 16 digits. Source-bound roots use actual verified 3.0 class-labelled palm/sole vertices if available (labels 8/9/12/13) or, when absent, actual observed arm/leg endpoints (6/7/10/11) with **explicit anatomical-prior provenance**. No arm/leg source => that five-digit group BLOCKED. Portrait-only with no hands/feet is NEVER claimed to contain scanned fingers.
2. Each digit really produces indexed xyz positions, continuous tapered cross-sections, true per-joint centerline geometry, angles and distributed caps. 20 individually poseable curl controls, independently adjustable per-phalanx angle arrays (each 0–85 degrees) and +/-25 degree spread. The 20 surface objects are not the same as full unified skinned hands and feet; collision, realistic nails, precise knuckle/skin, and watertight hand-to-body union remain NOT verified.
3. `aig-20-digit-articulation-3-2-ui.mjs`: actual THREE BufferGeometry/MeshStandardMaterial geometry rendered as **new additive overlay in the original single Real3D WebGL scene**. Full 20 real controls on mobile/desktop, advanced selected-digit 2/3-phalanx sliders and spread, reset, remove only digit preview. 3.1 joint pose passes latest actual deformed source vertex positions into 3.2 root rebuilding, so fingers follow arms and toes follow legs; 3.0 original immutable rest points never overwritten.
4. `aig-articulated-view-3-1-ui.mjs`: optional `onPoseApplied` callback after real head/body GPU pose, allows linked actual wrist/ankle root update. `scene-runtime-studio.mjs/.html`: install/visible controls in formal Real3D page, stable IDs. No second renderer.
5. `tests/aig-20-digit-articulation-3-2.test.mjs`: source 3D contour -> 3.0 single closed SDF -> 20 individual digit meshes, 56 separate phalanges, 9,600 actual indexed triangles (test resolution), tip changes per finger and toe, other 19 unmoved, source and indices immutable, missing source limbs fail closed, parent arm motion updates finger tips.
6. `tests/aig-20-digit-articulation-3-2.real-browser.mjs`: actual phone-shaped and desktop Chromium photo SHA -> segment -> 3.0 fused body -> 3.1 head/body articulation -> 3.2 twenty digits; bend one left index and one right big toe independently, adjust the middle phalanx of right ring finger, move a real 3.1 shoulder and verify left-hand tip moved, reset and only remove extra digit overlay; real WebGL viewport captures and JSON.
7. Dedicated `.github/workflows/aig-real3d-3-2-twenty-digits-gate.yml`; full 3-project `.github/workflows/aig-shared-real3d-v1-3.yml` now also requires 3.2 numerical and actual phone/desktop browser tests before CNC/movie release Gate. Unrelated modules untouched.

## Honest technical evidence / limits
- First source-engine smoke using original 3.0 SDF source: **20 actual 3D digit meshes, 56 phalange links, 9,600 indexed triangles**; independent index finger 20/30/15 degree pose and independent little toe pose produced distinct physical tip xyz.
- Dedicated GitHub Actions `39915453467` ran numeric PASS and bundled WebGL PASS but FAILED early in mobile 3.2 advanced dropdown because the test did not first open its intentionally collapsed `details` section. Test fixed to actually click summary, no forced hidden UI click.
- Dedicated run `39915700522` passed numerical/build and got further through actual mobile controls, then FAILED with a source test bug: `JSON.parse(await locator.textContent)` rather than calling `locator.textContent()`. Corrected in commit `07f56be1`.
- Latest dedicated run `39915925882`, source commit `07f56be1` was in progress at last checked, must inspect its final run and artifacts **before saying new 3.2 phone/desktop final PASS**.
- Source preview is **not** a measured human hand print, physiologically certified finger ranges, full tendon/ligament/skin simulation, 1:1 physical output or photorealism. All individual digits are inferred geometry until independent visible individual digit landmarks and/or stereo/depth evidence have been reviewed; source has actual arm/leg anchor but **not actual per-digit scan**.
- Real3D 3.1 previously had verified phone/desktop Gate `39913754216` SUCCESS. Combined three-project NC/Movie Gate remains separately blocked on older Real3D 2.5 desktop `NO_NONEMPTY_ACTUAL_3D_VIDEO_FRAMES`; never bypass or falsely claim public Render/APK/EXE deployment.

## Next genuine visual-model work
- Capture or infer hand palm geometry + all finger webbing, true spread and per-finger lengths from manually reviewed labelled photo, stereo/LiDAR or scan; fit nail, knuckles, skin colour and self-contact; integrate digit skin smoothly with 3.0 hand surface and 3.1 body rig.
- Capture plantar toe/sole/heel real shape and toe-ground contact; calibrate mm and source scale. Not just more triangle count; visual quality and actual 1:1 measurement require independent Gates.
- Keep full body/neck joints, original source SHA, rest mesh and mobile 60 FPS criteria in every later release.

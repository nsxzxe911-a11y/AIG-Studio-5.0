# Real3D 3.13 — 女主角與同學多人場景／同畫面負荷實查斷點

Date: 2026-10-23, Taipei. Draft PR #44 (unmerged) on branch `verify/real3d-unified-appearance-3-5-20261023`. Real3D 3.12 prior dedicated GitHub Gate: **completed/success**, run 39945515066. Do not treat 3.13 as PASS without its dedicated run.

## User goal
One established main heroine + independent classmates, each with own imported source GLB/photo provenance, named character ID, costumes, hair and compatible animation source. Measure how many visible in ONE existing 3D camera instead of mistaking 19,200 logical vertex work partitions for characters or physical hardware cores.

## Implemented in source
- `aig-classmate-crowd-3-13.mjs`: source-bound independent persona registry; ID and GLB SHA validation; pending assets cannot pass rig/appearance by assertion. Crowd workload policy with near/middle/far suggested LOD and per-device active pose tick caps, not implemented LOD geometry yet. Statistical p95 real-frame interval evaluation and target evidence only if samples exist, and never calls technical duplicate counts genuine fully animated classmates.
- `aig-classmates-crowd-3-13-ui.mjs`: connects to existing validated fused technical real XYZ humanoid geometry in the SAME PhotoViewer WebGL context, generates one InstancedMesh of 1/2/4/8/12/16/24/32/48/64 identical **technical stress duplicates only**, preserves the original heroine model/scene. Uses actual animation frame hook measurements (timestamps, CPU render submission, draw calls). No synthetic claimed GPU timer when unavailable. Includes progressive sweep 1/4/8/12/16/24/32 stopping after two P95 failures (30fps) to protect smaller devices. Clearing removes only test mesh/material, not the underlying shared source geometry.
- `scene-runtime-studio.html`: editable classmate source roster status, single-camera visible-count selector, real FPS test, full sweep, removable stress model, evidence.
- `scene-runtime-studio.mjs`: reads actual imported character GLB metadata from local library and current loaded World2.0 character nodes; no automatic creation of unapproved classmates. Existing 3D world remains source-verified and has a 12-object program cap **including buildings**. That is not a measured simultaneous character limit.
- `tests/aig-classmate-crowd-3-13.test.mjs`: validates independent roster, 19,200 logical shared budget, p95 statistics and refusal to invent missing source models/physical cores.
- `tests/aig-unified-appearance-3-5.real-browser.mjs`: Chromium phone and desktop true WebGL screenshot of four and sixteen technical bodies, actual four-body FPS sample, scene cleanup and original heroine preservation.
- Dedicated GitHub Actions workflow updates: `.github/workflows/aig-real3d-3-5-unified-appearance-gate.yml`.
- The 3.10–3.12 clothes, pose, hair physics and contact pipeline remain unchanged. No modifications to AIG-II CNC CAD/CAM/SIM/NC. One shared WebGL renderer.

## Capacity interpretation
- Existing formal multi-source scene code: 12 total object limit, not measured per-person FPS. Actual separate classmates with hair, outfit, skeleton and physics are not yet measured even if the same geometry instance count is 64.
- Visible shared static geometry test range: 1–64 (up to 32 in automatic sweep). Distinct actor model requirement means these are NOT actual unique classmates; instance-specific bone movement is not demonstrated.
- Example *geometric* triangle workload if one technical mannequin ≈28,120 triangles: 4=112,480; 8=224,960; 12=337,440; 16=449,920; 24=674,880; 32=899,840; 64=1,799,680 (ignores materials, shadows, rig, memory and GPU). Treat as planning math, not FPS.
- Browser frame data may come from software WebGL, and must not be described as hardware Android/Windows certification.
- Independently sourced classmates require individually reviewed appearance, separate GLBs and source animation clips. None is created merely by instancing the main actor. 60 FPS, native GPU VRAM and real multi-character collision are NOT certified.

## Next gate and release
Dedicated run: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39947267926 — queued when last checked, inspect status and logs later. 3.13 remains Draft PR #44, unmerged; official Render/Android APK/Windows EXE not deployed. Do not claim a tested person-count maximum before real target device measurements with verified source GLBs and motion.

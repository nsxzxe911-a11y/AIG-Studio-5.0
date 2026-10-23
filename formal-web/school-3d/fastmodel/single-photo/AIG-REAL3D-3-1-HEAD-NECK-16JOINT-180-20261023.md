# Real3D 3.1 — genuine head/neck separate articulation, 16-body joint deformation & ±180 camera

2026-10-23, Traditional Chinese, continuing live **draft PR #43**:
https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/43
Branch: `verify/real3d-true-world-movie-2-5-20261023`.

## Problem raised by user
- Real3D 3.0 one-piece SDF surface technically watertight but still produces an ugly faceless egg-head and indistinct neck. They want a true **head rendering/work layer**, to look fully **180° from left and right**, and have many **independent body joints**.
- Biological neck rotation by a full 180 degrees is unsafe/impossible as a normal humanoid motion. Correct implementation is **full camera ±180° orbit around the skull, with head and neck limited independently**. Never turn the entire body or spin cervical bones 180° to fake this.
- User does not accept colour cubes, primitive tubes, or generic test mannequins as completed face/body realism. 3.1 is an *actual motion + camera engineering gate*, NOT an accepted lifelike finished person.

## Actual files and original-source preservation
1. `aig-articulated-view-3-1.mjs`
   - Existing Real3D **one-piece source SDF** 3.0 geometry is still the only display geometry; derive pivot geometry from actual source 2D labels (head ID 2, neck 4, cloth/torso, left/right arm and leg). 16 named joints: cervical yaw/pitch; independent skull yaw/pitch/roll; spine; left/right shoulders, elbows, hips, knees, ankles.
   - Apply real bounded smooth vertex deformations to a NEW copy of rest XYZ positions, preserving original fused SDF source positions, original shared index list and original source/GLB SHA. Head/neck move independently, shoulder and lower limbs move only when source label exists, no hidden limb fabricated from portrait.
   - Portrait-only partial visibility still allows head + neck when labels actually visible. Missing legs/arms are disabled and attempts are BLOCKED.
   - Limits: neck yaw ±30°, neck pitch ±20°, head yaw ±40°, head pitch ±25°, roll ±20°, shoulders ±75°, elbows 0..120°, hips -45..+60°, knees 0..125°, ankles ±25°. These are **preview engineering envelopes**, NOT clinically measured personal ranges of motion. Collision and self-intersection are NOT certified at extreme poses.
   - `cameraAIG31Orbit` supports target orbit azimuth [-180°,180°], elevation [-89°,89°] with valid radius; source GLB/neck/geometry is NOT physically rotated by orbital camera.
2. `aig-articulated-view-3-1-ui.mjs`
   - Uses ONE existing THREE renderer/PhotoViewer from `aig-continuous-surface-scan-2-9-ui.mjs`, modifies only the newly allocated mutable preview BufferGeometry position and recomputes surface normals/bounds. Keeps PBR colours, original GLBs, movies, CNC and Rest Pose untouched.
   - Real source-checked buttons: activate, reset, all 16 angle controls, ±180 orbit, focus head vs full-body, side/back/front/head-top/underside. Handled events go to real geometry and real camera object, not fake UI.
   - `scene-runtime-studio.html` places six camera buttons *next to the actual large WebGL canvas*, plus head and neck quick-pose sliders for mobile. Detailed 16 joint sliders are in a separate expandable source-bound panel; both controls target the same runtime values.
   - All posed surface geometry is only a preview, topology indices are preserved but physical collision, true facial landmarks, hidden backside depth, real measured physical 1:1, high visual likeness and 3D printability remain **BLOCKED**.
3. Runtime main `scene-runtime-studio.mjs` shares 3.0 verified mesh and its real viewer with 3.1 controllers; no second renderer or GPU shell. Existing source HA / GLB clips / NC unaffected.
4. Tests:
   - `tests/aig-articulated-view-3-1.test.mjs`: true 3.0 SDF rest mesh, real independent skull vs neck vertex motion, arm, elbow, hip, knee, 16 bounded joints, portrait lacking legs, original SDF rest source not mutated, full camera ±180 and top/sole.
   - `tests/aig-articulated-view-3-1.real-browser.mjs`: actual phone/desktop Chromium source photo → 2.6 SHA → 2.7 pixel classes → 3.0 REAL WebGL mesh → 3.1 real head/neck/arm/knee pose → front/180-back/top/underside viewport screenshots → reset. Real 3D is not a flat cartoon swipe.
   - Dedicated `.github/workflows/aig-real3d-3-1-head-neck-full-joints-gate.yml` and added mandatory test in `aig-shared-real3d-v1-3.yml` **without bypassing film/CNC Gate**.

## Confirmed evidence
- Pre-mobile shortcut source **run #39913133906** completed SUCCESS, real phone & desktop Chromium actual head/neck and body pose, exact source photo SHA, ±180 head/back view and top/foot underside, GPU captures, 16 controls and reset:
  https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39913133906
- Artifact **12484515200**: `AIG-Real3D-3-1-Actual-HeadNeck-FullJoints-180-TopSole-Phone-Desktop`, 553,684 bytes, contains 16 PNG phone/desktop WebGL evidence and JSON proof.
- Actual runtime proof from desktop test: 3,597 true vertices moved, including skull 1,490 and neck 587; yaw head 25°, yaw neck 15°, left elbow 40°, right knee 55°, 16 total joints. Camera underside target y 0.974, camera y -1.556; back image captured at 180° without twisting the neck.
- I visually inspected `desktop-true-articulated-head-front.png`, `desktop-head-180-back-camera.png`, `desktop-actual-headtop-view.png`, `desktop-actual-sole-bottom-up-view.png`. **These images show an ugly featureless egg-shaped head, irregular neck junction and crude legs. Visual aesthetic realism FAIL persists** despite genuine camera and joint mechanics. Do not call this a photorealistic 3D body, laser scanner, or print-ready geometry.
- After initial successful browser Gate, user-UX source commits also added **quick head/neck sliders next to canvas** (source commits `0ab995d0`, `35b17a4a`, `ba3b8552`) and the browser test now explicitly verifies their shared callbacks and reset. Verify the *latest* dedicated Gate SHA before claiming quick-slider latest PASS; it may be queued/in-progress.
- Earlier 3.0 standalone Gate `#39913142162` SUCCESS after fixing old text-only test expectation. The combined CNC/Real3D Release Gate may still be RED due to existing desktop 2.5 MediaRecorder empty frames; never waive `NO_NONEMPTY_ACTUAL_3D_VIDEO_FRAMES` or misleadingly claim APK/EXE/Render deployed.

## Next real geometry and appearance tasks, not completed
- Facial depth and topological landmarks: eyes/eyelids, nose bridge, lips/jaw, ears, scalp/hair, chin/neck/collar bone and natural shoulder geometry; no generic ellipsoid accepted as real person.
- Source-only 2D labels are insufficient to *measure* side and back skull/face. Add audited multiview photogrammetry and/or first-party validated face-depth prior and source landmark review before claiming likeness/1:1.
- Actual source skinned 5.6 GLB 17-bone pipeline exists but does not automatically skin every newly fused 3.0 body. 3.1 smooth vertex deformation is a working interim rig with true vertices; build robust bone hierarchy/surface skinning, pose-consistent normals, self-collision and hair/cloth to body separate contact testing.
- Test native S23 Android/Web Windows actual FPS independently; Chromium viewport PASS is NOT native 60 FPS proof.

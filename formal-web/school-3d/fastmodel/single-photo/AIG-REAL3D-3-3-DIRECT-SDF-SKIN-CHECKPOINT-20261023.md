# Real3D 3.3 — direct implicit SDF ray-marched finger/toe skins, not triangle-skin modeling

2026-10-23, Asia/Taipei. User: "都用三角面? 看起來好假 ...下一項". This is an explicit rejection of the technically-valid-but-ugly 3.2 tube meshes, not a request to boost triangle count.

## Exact source point
- Repo: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0
- Branch: `verify/real3d-true-world-movie-2-5-20261023`
- Draft PR #43: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/pull/43
- Not merged into Render formal website and not native APK or EXE. Preserve original AIG-II/CNC/Studio safety, CAD/CAM/NC, 3.0 SDF body geometry, 3.1 actual 16 joints, 3.2 source-bound 20 fingers/toes, 2.5 movie and prior photo SHA.

## Real 3.3 engine, implemented rather than roadmap
1. `aig-implicit-digit-field-3-3.mjs`: real analytical capsule SDFs for **all 56 phalanx links and 20 source-anchored finger/toe IDs**, grouped four ways (left/right palm and left/right sole). Soft minimum union with source-root palm/sole ellipsoids; finite SDF scale/bounds; mobile 28, balanced 42, high 64 GPU ray steps. Every individual finger/toe morphology remains a **relative anatomical prior**, not a per-finger physical scan.
2. `aig-implicit-digit-raymarch-3-3.mjs`: true **GLSL ES 3.00 fragment ray marching** of four implicit soft skins, direct signed-distance gradient normals, two lamps, linear→sRGB, and **actual fragment-depth outputs** for in-scene occlusion. Each group has just an invisible 12-triangle raster proxy box to bound its screen pixels, NEVER used as the displayed skin. The original main body **still** uses the 3.0 triangle extraction; complete body SDF direct rendering is not implemented yet.
3. `aig-20-digit-articulation-3-2-ui.mjs`: original controls unchanged. New **IMPLICIT_SDF** selected by default and explicit **MESH_COMPAT** selectable for unsupported WebGL2. Real 3.1 wrist/ankle pose updates actual world-space SDF geometry. Same THREE scene, one renderer, original source SHA/GLB/NC untouched. Hand/foot close-up offers intentional visual isolation from currently oversized faceless 3.0 torso; restoring BODY or deleting preview restores the source body, no destructive edits.
4. `scene-runtime-studio.html`: explicit renderer and ray-step control; full 20 original callbacks preserved, source provenance and no-fake appearance markers.
5. `tests/aig-implicit-digit-field-3-3.test.mjs`: finite SDF, correct smooth union, 56 links/20 digits/4 source groups, true GLSL3 shader, fragment-depth and strict data rejection.
6. `tests/aig-implicit-digit-raymarch-3-3.real-browser.mjs`: actual phone and desktop Chromium source pixels → 3.0 source body → 3.1 joint pose → 3.2 20 digit phalanx movements → 3.3 analytical fragment skins. **Important added visual hard Gate** decodes actual Playwright PNG screenshot pixels and rejects black/blank hand and toe views with `AIG33_NO_VISIBLE_IMPLICIT_HAND_SKIN_PIXELS`, also collects GPU shader compilation errors. No fake screenshot success accepted. Legacy compatibility explicitly switch-tested.
7. Dedicated GitHub Action `.github/workflows/aig-real3d-3-3-implicit-sdf-skin-gate.yml` and added mandatory 3.3 tests to original `.github/workflows/aig-shared-real3d-v1-3.yml`. All original CNC/Movie native release blockers preserved.

## Actual observed results and failures (do not erase)
- Standalone workflow **39919256389** was nominally GREEN with mathematical tests, but reviewer opened the output screenshot and found hand/foot close-ups dominated by original body or black. This invalidates any aesthetic PASS claim. DO NOT count as full 3.3 visible surface acceptance.
- Added source-bound isolation of actual hand/foot for close-ups (body always restored). Workflow **39919962053** nominally GREEN but downloaded screenshots were **all black** in isolated detail, confirming its old acceptance missed actual rendered pixels.
- Added actual PNG pixel threshold and GPU-console compilation evidence in commit `af0a5861`. Workflow **39920437776** correctly **FAILED**, log gives an EXACT fault: GLSL3 fragment shader `projectionMatrix` undeclared (the renderer injects that matrix in vertex stage, not fragment). Root fixed in `bc6802dd`: explicit `uProjection` updated from the actual scene camera each draw, keeping correct `gl_FragDepth`, never bypassing the depth pipeline.
- Workflow **39920669138** then passed *phone* visible SDF PNG: real lighted implicit blobs instead of black, but reviewer found hand too zoomed/cropped and toe visually huge/unclear. Its desktop test timed out at screenshot stability under CPU SwiftShader. This is not an aesthetic acceptance or performance PASS.
- Source patch `d79bf76a` moved macro camera farther, to show complete five digits. Patch `58058410` uses actual 28-step MOBILE SDF in CPU-backed CI and a bounded per-screenshot timeout; does NOT fake geometry. Latest dedicated run **39921453740** was in progress when this checkpoint was written. CHECK LATEST REAL SOURCE/CI BEFORE CLAIMING VISIBLE PHONE/DESKTOP PASS.

## Non-negotiable release blockers
- The underlying source photo does not physically measure the hidden backs of fingers/toes. The 20 anchors and 56 joints are actual coded geometry but the organic skin proportions and individual nail/crease details are **inferred**.
- No native S23 60/90/120FPS benchmark. Soft GPU SDF can be **slower** than raster triangles and needs profiling/LOD. Current CI uses SwiftShader fallback, not actual Adreno hardware.
- Skin still looks like conceptual soft organic blobs, not lifelike hands/feet. No true individual knuckles, palm webbing, skin pores, finger/toenails, collision constraints or print-worthy hand/sole topology. **Visual natural realism Gate: BLOCKED.**
- All of the 3.0 torso/head main model remains extracted triangles; do not misrepresent Real3D as a completely triangle-free application.
- The wider three-project CNC/movie shared Release Gate is still separately blocked by earlier desktop 2.5 WebM `NO_NONEMPTY_ACTUAL_3D_VIDEO_FRAMES` and possibly other regressions. No Render/APK/EXE public release until independently verified.

## Next real engineering
- Once actual visible macro shader pass is stable: mobile GPU profiling, temporal stability when joint sources move, physically-referenced palm/sole scans/landmarks, explicit cutaneous material/white balance and non-intersecting flexion, then consider real **whole-body implicit ray marching** with separate clipping and scalable SDF acceleration.
- Keep separate technical rendering Gate, honest visual likeness Gate, physical 1:1 measurement Gate and actual CNC printability Gate.

## Latest actual visual and improved SDF shape — 2026-10-23
- Dedicated Real3D 3.3 visual Gate **#39921453740** on source `58058410`: `completed/success`, after real Chromium phone and desktop WebGL2 shader compilation AND byte-level **visible non-black PNG pixel verification**. Artifact ID **12487093651**, screenshot+proof, source photos and original GLBs intact. https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39921453740
- I opened real desktop PNG `desktop-five-left-fingers-closeup.png` and `desktop-five-right-toes-closeup.png`. **Now actually visible** non-triangulated SDF hand and foot, not black. However they look like bulky stylized organic blobs, *not authentic five-finger/five-toe skin*. SDF ray marching is a technical renderer, not AI reconstruction, not 1:1 measurement.
- Source commit **`1f38cad3`** intentionally shrinks implicit palm/sole ellipsoid, digit radii and smooth-union width to keep five distinct fingers/toes visible instead of mushroom-like slabs. This is an organic shape **geometry-prior tweak**, not a new scan. Dedicated visual Gate **#39922094090** pending as of checkpoint, must check after actual screenshot and source SHA before claiming revised morphology PASS.
- Whole-body SDF 3.0 still uses extracted indexed triangles to display; true direct implicit surface changes **only the fingers and toes** at this stage. The screenshot's stylized large body is not photorealistic even when finger shader is compiled. Full combined CNC/movie Release Gate is BLOCKED, public website not deployed, APK/EXE not delivered.

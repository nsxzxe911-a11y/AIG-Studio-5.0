# Phase 4 — 真人網格 + Rig / PBR 技術原型（視覺 FAIL）

2026-10-20 | Branch `feature/aig-school-3d-hero-v1-20261020` | PR #12 | Only technical R&D, no Render deployment.

## Completed
- Self-generated geometry-based GLB with real glTF skin data: named 33-joint hierarchy, inverse bind matrices, JOINTS_0, WEIGHTS_0.
- 85,016 triangle triangles across 123 primitives (unoptimized candidate, **not mobile ready**).
- Embedded nine PBR PNG textures generated from the previously completed local material pipeline.
- Two facial morph targets Blink and Smile, idle and walk skeletal animation clips (motion curves, **not validated foot contact**).
- `trimesh` loads the GLB as a genuine 3D scene with 123 physical meshes.
- Dedicated `verify_prototype.py` validates accessor shapes, weight normalization, indices, animation timelines / morph animation scalar accessor, embedded textures and textures.

## Hard FAIL, reviewed by renderer
The candidate visual preview has a rough doll-like face, primitive hair, unnatural proportions, disconnected waist/poor tailoring, unsuitable walk. **REJECT** against the approved cinematic 3D heroine reference `櫻花校園的青春時光.png`. This must NEVER be used as AIG homepage heroine, approval poster, screenshot claiming success, or 20-minute film.

## Gating interpretation
- Source + technical GLB structural test: PASS.
- AIG exact-look Authority / face likeness / natural rig motion / visual PBR: FAIL.
- S23 real-time WebGL2, 4K Windows UI, visual and mobile budget: NOT TESTED.
- Production Render site and APK/EXE: UNCHANGED.

## Next actually necessary
Real photogrammetric/sculpted identity-consistent facial mesh with human face topology, premium hair cards, tailored uniform, surface fitted PBR, anatomical weights and physical foot-contact animation. A procedural shape generator alone CANNOT reproduce the cinematic authority image. Consider genuine sculpting/character-creation software; do not rebrand prototype as authority.

## Safety
Keep `authority.v1.json` `PREVIEW_ONLY_NOT_PRODUCTION` with all models PENDING. Assets are candidate artifacts with finite retention only, separate from the official visual library. No CDN dependencies. No webpage changes or network upload of user references.
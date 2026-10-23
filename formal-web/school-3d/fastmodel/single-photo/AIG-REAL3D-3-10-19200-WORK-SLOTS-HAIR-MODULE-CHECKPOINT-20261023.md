# Real3D 3.10: 19,200 logical shards and detachable actual 3D hair

Date: 2026-10-23. Draft PR #44 branch verify/real3d-unified-appearance-3-5-20261023, stacked on 2.5 source; not merged, not released.

## Change inventory
- ONE source-bound Real3D renderer/kernel preserved; 19,200 configured **logical** work shards selected by default. 12,000 compatibility mode remains. The number of actual vertex chunks executed is `min(19200, realVertexCount)`. This is not 19,200 CPU cores, browser Workers, GPU execution units or independent render contexts, and higher shard numbers do not prove speed or stability.
- Real3D 3.10 `aig-modular-hair-3-10.mjs` builds source-head anchored independently replaceable 3D technical preview hair (short, long, ponytail, twin tails). New positions/indices, full 3D geometry, no 2D face/photo planes, original source face/body unchanged.
- The same real 3.1 head/body pose vertex displacement drives independent clothes and hair with the source body vertex IDs; no new synthetic animation rig, no second WebGL instance.
- Hair swap is gated by stable single-owner runtime session, with failed style construction leaving the prior 3D scene/model intact.
- Real3D 3.8 indexed hair assets remain **pending**: proof-of-geometry built here is only technical style preview and must not be presented as finished approved heroine GLB hair.
- PBR fallback and natural cloth physics/collision status unchanged; hardware ray tracing and human likeness still unverified.

## Source and test gates
- Legacy 120 and 12000-slot tests remain explicit, 19200 new tests validate execution on 20032 genuine array vertices, cancellation, mobile/desktop lane limits, 1 WebGL renderer and no source mutation.
- `tests/aig-modular-hair-3-10.test.mjs` verifies actual independent hairstyle mesh triangles and source-anchored head movement.
- Real phone + desktop Chromium Gate now checks 19200 configured (actual executed only min vertexCount), actual hair ponytail meshes, head/torso joint motion, zero displacement after rig reset, short-hair switch and no-hair switch.
- Strict workflow `.github/workflows/aig-real3d-3-5-unified-appearance-gate.yml`.
- First requested run: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39941750592; status must be looked up before any PASS assertion.

## Not certified / blocking formal release
- Approved heroine image face/hair/clothes visual likeness and multiview source constraints.
- Natural groom, hair strands, scalp occlusion, rigged cloth collision, cloth gravity, facial animation and 60 FPS performance on real Android/Windows hardware.
- Real 19,200 concurrent physical CPU/GPU cores; frame time improvement versus 12,000 logical splits.
- Formal Render deployment, APK/EXE and current live app acceptance.
- Cannot merge or release on synthetic model QA alone.

Current checkpoint is source-only, fail-closed until Gate evidence.

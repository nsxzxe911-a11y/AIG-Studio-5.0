# FastModel 1.4 — 快速幾何掃描／光柵光線／虛線參考支架

Scope: Draft source preview only, incremental on FastModel 1.3 commit 2a2148e0. No merge or deployment; does not touch AIG-II / CNC APK/EXE or Render formal homepage.

## Real operations
- New 掃描 tab on the same mobile/desktop RGB workspace.
- scanGeometry reads the loaded GLB's actual POSITION accessors once on user request. Sampling budget is bounded (12,000 points target), reporting source vertex/triangle/primitive counts, invalid sampled points, sample bounding size, materials and animation counts; no model mutation. CPU-only GLB parsing/scanning still works when WebGL2 is unavailable.
- Seven USER-DECLARED categories: person, animal, plant, tree, water, sky, environment. Selecting one sets a preview background preference. NO automatic AI semantic classifier or scene reconstruction.
- Five true WebGL2 raster exposure/background modes: soft, daylight, dusk, water, sky. Ray tracing remains permanently OFF. Water/sky selection does not generate actual water, trees, terrain, sky volumes or reflections.
- Opt-in dashed reference scaffold as a 2D projected overlay aligned to model bounds and camera yaw/zoom. User yaw/pitch clamped to numeric limit ±0–90 degrees. No additional GL line mesh, model/bone changes, structural strength computation or rig IK.
- Existing grid-free surface modes, advanced wire OFF default, graphics protection, QHD/UHD and standalone HTML packaging retained.

## Source Gate and limits
- scene-tools.test.mjs tests actual sampling, safety and UI binding.
- school-3d-source-gate.yml tests new controls and synthetic standalone inclusion. Only GitHub success on the exact revision qualifies as source Gate.
- NOT VERIFIED: photo/camera/light/LiDAR scanning, animal/plant identification, true terrain/foliage/water/sky geometry, physically attached deforming supports, collision/IK, Android S23 Vulkan or Windows native DX12, 1080p60 or QHD/4K real GPU FPS/thermal testing.
- PR #12 stays Draft, never merged or deployed by this change.

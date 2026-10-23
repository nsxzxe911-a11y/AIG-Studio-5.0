# AIG Real3D 3.8 — 12,000 logical slots & wardrobe index checkpoint

Date: 2026-10-23. Current source line: Draft PR #44, branch `verify/real3d-unified-appearance-3-5-20261023`. Do not merge or deploy merely from source file existence.

## User-approved design
- One permanent heroine body and compatible shared skeleton.
- Clothes, hairstyles, accessories must be independent assets, not baked into body vertices. Reuse original body identity/geometry during wardrobe changes.
- Many wardrobe/accessory entries require metadata-only indexing with pagination, on-demand mesh loading and active GPU budget, not simultaneous 3D asset loading.
- Default single-kernel profile: **12,000 logical work shards**, not 12,000 physical CPU or GPU execution cores. Actual device parallelism/fps must be proven separately.
- Action clips and face/hair/outfit accessories share the same body rig when compatible; hair/cloth physics, retargeting, collisions and realistic tailored outfits need their own evidence.

## Actual changes
- `aig-unified-120-core-3-6.mjs`: AIG38_FIXED_WORK_PROFILE=12000, 12k preset, cooperative bounded executor, effectiveSlotsUsed limited to actual vertex count, and explicit physical concurrency=false.
- `aig-character-asset-index-3-8.mjs`: actual metadata catalog, incremental asset versions, 8-item paged browser, clothes/hair/accessory slots, conflict handling, planned vs installed truth, dry-run GPU budget, realMeshReady requirement before active index commit.
- `aig-continuous-surface-scan-2-9-ui.mjs`: asset catalog wired to original shared WebGL session and live outfit change, with neutral mannequin path and source identity evidence.
- `scene-runtime-studio.html`: 12000 selected and collapsed wardrobe browser UI.
- `tests/aig-large-wardrobe-3-8.test.mjs`: exercises 12000 real logical vertex shards and 12000 metadata records without making 12000 WebGL meshes.
- `tests/aig-unified-appearance-3-5.real-browser.mjs`: real phone and desktop browser asserts actual WebGL model and lazy wardrobe switching.
- Strict workflow `aig-real3d-3-5-unified-appearance-gate.yml` updated to enforce current 3.8 schema, program, node tests and browser regression.

## Known limitations and release blockers
- Procedural uniform/casual/sport are technical geometry derived from synthetic silhouette, NOT validated heroine outfits.
- Hair registry has five `pending` hairstyle records, not five real wearable GLB hairstyles. Do not display them as installed.
- Accessory data is registry-ready but has no verified real model assets.
- Original single-photo segmentation and label seeds are still required; real face/hair and body resemblance not accepted.
- Native hardware path tracing, true 12k physical hardware cores, GPU rendering 60 FPS, stable soft-body cloth/hair dynamics, clothes/body collision and APK/EXE delivery not proven.
- Dedicated CI URL: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39938916476 — status must be independently checked, not assumed PASS.
- **Do not deploy** until real approved-heroine visual inspection, multi-angle skin/hair/cloth comparison and full gates on the actual target platforms.

## Next functionality priorities
1. Maintain 12k logical work profile and measure actual frame-time; cap active asset GPU budgets, restore scene on failure.
2. Rig-compatible hair GLB attachment and verified removable/replaceable shape geometry.
3. Source-referenced fitted clothes with collision/hidden-under-clothes mask based on preserved body (not source image repaint).
4. Share animation clips across outfits/hair through bone mapping, physics pre-pass and multi-angle browser screenshots.
5. Always show the user's actual approved photo side-by-side with generated 3D. Synthetic fixtures never pass visual acceptance.

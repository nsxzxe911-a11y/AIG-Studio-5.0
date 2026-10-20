# FastModel 2.3 — bounded source-triangle depth sampled scan

Successor to exact validated FastModel 2.2 commit `e5d42b84c3834c5bae4a018b9238dbb4a0628748`. Draft PR #12 remains unmerged and production website/APK/EXE unchanged.

## Implemented
- New `scan-depth.mjs` uses a small CPU 2D depth grid to rasterize **actual currently posed source GLB triangle positions**. Perspective is intentionally not invented: it projects with the same orthographic rotation and clamped Z convention as the current shader. The closest sampled source face can classify a candidate outer edge as **behind a sampled surface**, **not behind a sampled surface** or **unknown**.
- Source segments behind sampled surfaces are drawn with short, low-opacity dash `[2,5]` instead of normal muted `[5,6]` dash. RGB regional GLB joint skeleton remains SOLID. Actual original GLB materials, character textures, colors and geometry are unchanged.
- Modest density budgets: mobile/eco up to 44×28 grid, 360 triangles, 13k cell tests; balanced 72×44, 1k triangles, 35k tests; desktop/detail 96×56, 2.1k triangles, 68k tests. In a small 650 CSS pixel viewport depth always falls back to eco; scan callback updates at most roughly once per 90ms vs 50ms on large screens (renderer also runs every third frame). Depth sampling can be manually OFF and is suspended automatically while measured main-render CPU frame cost >25ms.
- Real controls `scan-depth`, `scan-depth-status` and benchmark telemetry `depthMode`, `sampledDepthTriangles`, `sampledDepthCellTests`, `occludedSegments`, `sampledDepthIncomplete` enable honest visual feedback and reproducible source checks.
- Keeps 2.2 RGB/inspection/low-glare colors, scan OFF main viewport default, 2.1 solid source joints and faint dashed bounded outline, earlier head/neck/hair diagnostics, bridge candidate and fictional anti-clone, 1080p default 2K/4K options, WebGL2 raster only with ray tracing OFF.

## Explicit limits and blocking acceptance
- **This is NOT complete GPU Z-buffer occlusion**: source triangle budget may be incomplete; unsupported/no-skin/morph/transformed material batches may be omitted; translucent GLB textures and image alpha are not sampled; coarse rasterization may misclassify thin hair or silhouette edges. All output reports `actualGpuDepthTest:false`, `realGpuDepthVerified:false`, and `actualAnimatedCollisionProved:false`.
- A depth discrepancy is not proof of hair-body intersection or a welded head/neck. Red safety alarms still require independent verified evidence; amber remains review-only opt-in.
- Approved heroine GLB and Windows/Android actual FPS/thermal still unavailable. No claim of 60FPS/4K device pass; source-only synthetic GitHub Actions cannot certify native GPU performance.
- PR #12 remains Draft, unmerged/not deployed. AIG RGB formal Runtime/APK/EXE unchanged.

## Source Gate
`scan-depth.test.mjs` covers deterministic front/back source triangle occlusion, identity-depth equality, depth sign under orthographic rotation, source preservation, CPU cell/triangle budgets, RGB solid vs short dashed hidden lines, phone throttling and offline HTML packer. Workflow adds exact bundled JS `node --check` test. Only promote as source checkpoint after both push and PR Actions succeed on exactly the final commit.

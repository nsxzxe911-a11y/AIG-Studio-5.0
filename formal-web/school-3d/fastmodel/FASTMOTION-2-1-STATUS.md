# FastModel 2.1 — Fast Scan: SOLID real joints / faint DASHED source outline

Incremental source-only Draft PR #12 from verified 2.0 head `92557a719b7688a8118098dd4b4ab863016ab6e4`. Never claim the production Render website, APK/EXE, actual approved heroine or hardware FPS has been updated.

## Delivered
- `web/scan-overlay.mjs`: a dedicated, transparent 2D canvas scan layer, distinct from 3D mesh, source textures and reference scaffold.
- **Solid skeleton**: connects only original GLB `skins[].joints` where both child and direct parent are actual joint nodes in glTF. Each line follows `FastModelView.poseEvaluator`'s current cached animated world transform; no name- or color-derived skeleton, no invented bones, no replacement geometry.
- **Dotted/dashed outer surface**: source skinned GLB indexed triangle OPEN-BOUNDARY edges and view-dependent projected silhouette candidate edges (front/back triangle orientation switch). Drawn low-alpha with `setLineDash([5,6])`, never an entire triangle grid. This is **not true GPU depth-tested hidden-line removal**: especially where hair covers the neck, the line is a visual diagnostic only.
- **Four inspection choices + OFF** in Scan panel: real skeleton alone; skeleton+subtle dashed contour; only head/neck explicitly tagged bones or mesh; hair explicitly tagged region; and OFF. Missing role tags are not guessed. Default OFF protects clean RGB main viewport.
- **Eco/balanced/detail** geometry and overlay segment caps. Build expensive topology only on loading/controls changes, cache the source boundaries; render a dedicated canvas approximately every 3rd animation frame, at least 50ms apart (actual rate depends on device); no new WebGL wire geometry and no RT. Scan mode temporarily disables legacy heavy full-wire pass, and restores user's selected old wire settings on exit.
- Button wiring: the existing **快速抽樣掃描 GLB** runs real geometric sampling; when scan mode was OFF, it activates the new bones+outline overlay. Line style choices are real controls. The canvas pose callback reports actual drawn bone and dashed line counts and exports non-authoritative telemetry.
- Keeps existing 1.7 fictional classmate face comparison, 1.8 static neck/hair diagnostics, 1.9 experimental GLB bridge Working Copy, 2.0 bounded animated skin risk QA, source-preservation, 1080p raster-only/no-raytrace default and optional 2K/4K resolution.

## Verification and strict limitations
- `tests/scan-overlay.test.mjs`: real hierarchy links draw as solid segments and respond to pose changes; boundary candidate contours are dashed and bounded; explicit head/neck/hair filtering never guesses other bones; off/no-skin/invalid inputs fail closed; checks callback/HTML/standalone integration.
- Workflow `school-3d-source-gate.yml` checks standalone embedded JavaScript syntax (not just HTML tokens), as well as all older source tests and synthetic GLB assets.
- **BLOCKED P0 for formal release**: approved female GLB geometry/actual welded neck; real animated hair occlusion and triangle collision; Windows & Android native-device GPU FPS/thermal measurements; real application UI approval. CI synthetic PASS cannot satisfy these.
- No offscreen fake image compositing or merged official source; PR remains Draft, unmerged, not deployed.

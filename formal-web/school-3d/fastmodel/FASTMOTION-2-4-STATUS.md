# FastModel 2.4 — Extreme Scan (極速掃描), source-only

Incremental from exact validated 2.3 `b8816728347d3d9f65eba9fb56f70ff0214c685f`, Draft PR #12. No merge, production Render deployment, APK or EXE replacement.

## User-visible delivery

- Renames primary quick scan action to `啟動極速掃描 GLB`. A live `scan-speed` control selects `turbo` (default), `balanced` or `precise`, with real UI callback and stage/status telemetry.
- **Turbo stage 1 — genuine bones FIRST:** `buildScanOverlay(...,{geometry:'bones'})` reads original `skins[].joints` and parent relationships, returns SOLID AIG RGB animated skeleton strokes but **does not read dense GLB triangles**. Original WebGL2 surface, skin, head/neck and all full-color textures remain visible and unchanged.
- **Stage 2 — source contour:** only after an actual first scan-pose callback paints the bones, a deferred, revision-guarded `buildScanOverlay(...,{geometry:'all'})` builds capped source open-boundary and projected-silhouette edges. Once ready, muted dashed contours are shown.
- **Stage 3 — CPU sampled depth:** only once inexpensive phases have finished and the controller observes sufficient frames within budget, optional existing 2.3 2D depth sampling is enabled. On small viewports Turbo defaults to eco and leaves sampled depth OFF, favoring battery/latency.
- `scan-turbo.mjs` is a deterministic, reversible load controller using actual `view.lastCPU` and measured overlay JavaScript cost; two slow samples downshift to bones-only scan, followed by a hysteretic cool period before restoring outlines. It does **not** use model-independent dummy bones or GPU FPS inventions.
- For phone-sized viewports, target overlay update interval is >=120ms in Turbo and >=150ms under load. This does NOT impose a frame cap on the regular GLB WebGL2 rendering, only the separate optional scan overlay.
- Existing explicit head/neck/hair QA and fictional character face anti-clone remain available independently. Palette styles (RGB, high-contrast, muted) unchanged, raster-only RT OFF, original clean-surface scan OFF default, 1080p baseline/2K/4K options.
- Three strategies are alternatives, not claims that source mesh resolution, 0.001 mm CNC accuracy or animated collision are solved. A profile can reduce the *amount of inspection data shown* but never modify/delete model geometry.
- JSON measurement now includes `scanDisplay.speed` and `overlay.turboScan` phase, update interval, measured overlay JS time and `actualDeviceFpsVerified:false`.

## Verification and release blockers

- Unit regressions test real bones-only source extraction without reading mesh POSITION arrays, stage progression, mobile eco/depth OFF, hysteretic overload/recovery, invalid option rejection, and real UI/standalone bundle hooks.
- CI runs latest scan-turbo tests plus existing 1.7–2.3 source/native tests and parses actual offline embedded JavaScript with `node --check`.
- No approved heroine GLB in branch; actual seamless neck, hair transparency/collision, exact GPU occlusion and Windows/Android native 1080p60 GPU/thermal evidence **remain BLOCKED**. GitHub synthetic tests cannot establish any device-specific FPS increase.
- PR remains Draft and not deployed to official AIG website.

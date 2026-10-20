# FastModel 2.5 — exact HIT/MISS and bounded derived scan cache (Draft only)

Continues from verified FastModel 2.4 `fc3f21325ee4323623713343eb51640292130699` on Draft PR #12.

## Implemented source behavior

- New `web/scan-cache.mjs` separates three rebuildable overlay layers: **skeleton topology**, **source-contour topology**, and **CPU sampled depth**. Each has real hit/miss counters; overall measured lookup hit rate is `hits/(hits+misses)`.
- **Skeleton and contour:** keyed by current decoded GLB **object identity**, geometry choice `bones/all` and requested sampling density `eco/balanced/detail`. Alternate RGB colors/scan focus reuse topology without rescanning source vertices. A newly loaded GLB calls `useSource` and invalidates all old derived cache entries. In-place edits must explicitly invalidate.
- **Depth:** a cached sampled CPU raster grid is reused only if all of GLB identity, the exact topology object, scan density, viewport width/height, camera angle/zoom/zoomFactor/center **and every current skeleton world matrix element** are identical. A matrix snapshot is copied before caching because the renderer reuses and mutates the same Float32Array objects while animating. Model animation/camera change => MISS. Static or paused repeated views => HIT. No false 'cache hit' based merely on object references.
- **Budget:** mobile 8 MiB and desktop 32 MiB **estimated derived cache bytes**, with bounded eviction. The source GLB, unsaved edits, original model geometry, textures, head/neck/scalp and actual GPU buffers are **never placed in this releasable scan cache**. Under governor-reported heap/memory pressure or explicit manual clear, all optional depth and contour entries are discarded first; true source skeleton topology remains and contours may rebuild later.
- **Live real UI**: `scan-cache-status` displays layer-specific HIT/MISS, total hit rate, invalidation count, number of released cache entries, approximate bytes, *last build time* and *last lookup time*. `scan-cache-clear` is a real callback preserving source and skeleton. Benchmark JSON now carries `scanCache` plus per-overlay depth hit/miss metadata.
- **Timing honesty:** last build time is just that previous operation's measured JS execution time. It is **not** measured time saved by hits, native GPU time or proof of performance improvement. There is no invented Windows / S23 FPS result.
- **Compatibility:** retains 2.4 Turbo bones-first display and staged RGB outline/depth with reversible overload downgrading; 2.3 triangle depth sampled lines; 2.2 RGB palettes; 2.1 real joint lines; 2.0 animated hair/head-neck safety; 1.9 visual bridge candidate and 1.7 fictional character anti-clone. No dense full-grid reintroduction or ray tracing. Default main viewport remains full-color GLB at 1080p; QHD/4K selectable, scan overlay OFF until requested.
- **Offline packing** includes `scan-cache.mjs`, with imports removed. New CI test asserts exact cache keys and safe pressure cleanup, and the full bundled script must pass `node --check`. Prior scanner package contract tests updated to include the new module.

## Do not overstate

- `estimatedBytes` counts only selected derived JavaScript references, not actual browser heap or GPU/OS RAM usage.
- Source GLB object reference is considered immutable for cache lookup; a future mutable Working Copy editor MUST call `scanCache.invalidate('SOURCE_WORKING_COPY_EDIT')` when geometry changes. Full content hashing is not implemented and must not be falsely implied.
- Reuse of sampled depth does **not** prove accurate transparency, full depth buffer, hair collision or seamless repaired neck.
- Source/synthetic CI PASS cannot establish actual native Windows/Android 60 FPS, thermal conditions, approved heroine mesh visual continuity, physical head-neck weld or movie release.
- Keep PR #12 Draft, no merge, no Render production deploy, no APK/EXE release without separate acceptance.

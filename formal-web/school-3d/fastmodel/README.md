# AIG FastModel Cinema 1.1 — Adaptive Stability / CPU·GPU·RAM·Cache·Disk

**Self-developed source, still an independent non-production prototype**. This is incremental work upon FastModel Cinema 1.0 (`12022fef`) and Phase17 source-image-registered 2.5D GLB. No licensed third-party character assets. Windows DX12/Vulkan native renderers are NOT written here; the C++20 policy/geometry code is cross-platform and can be compiled in those apps later. No real S23/Windows GPU validation has yet been performed.

## Correct resource strategy

CPU/GPU % percentages cannot be forced to identical values to ensure stability: workload, clock, power and utilization denominators differ. **Target a consistent 16.67ms frame and independent, measured time budgets**: 3ms JavaScript/CPU submission, 10ms GPU target if measured with supported timers, remaining room for OS/compositing. GPU utilization percent is **not** available through WebGL2; UI shows UNKNOWN and GPU memory only as allocation accounting **estimates**.

## Implemented

- `core/resource_policy.hpp/.cpp`: portable C++20 `BalancedScheduler` (3/10ms budgets, 18 slow frames → 25% scale reduction; 180 stable frames → recovery), overflow-proof GPU memory/upload preflight, disk write reserve, `DerivedCache` LRU which rejects dirty, source and authoritative working-copy entries and never fabricates a successful release.
- `core/fastmodel_c_api.h/.cpp`: exposes `aig_scheduler_create/record/allow_upload/allow_disk_write/destroy` for future JNI/DX12/Vulkan host integration, with fail-closed invalid timings. The native ABI tests exercise the same policy; **no native renderer is claimed**.
- `core/cache_io_probe.hpp/.cpp`: **off-render-thread only**, <=1MiB owned temporary I/O probe under an **app-owned cache directory** (free capacity, write/read throughput), removes *only* its probe; no user files, no CAD, no G-code, no cache wipes. Call only when needed, with appropriate scoped-storage path and permissions.
- `web/resource-governor.mjs`: deterministic budgets adjusted to browser's (imprecise) `deviceMemory`; 78% measured JS heap soft / 90% hard threshold (where available); two soft-pressure samples before reclaim; derived cache LRU; no deletion of original GLB or edits; cooldown and recovery on frame pressure; disk quota/writer guard with minimum free reserve.
- `web/renderer.mjs`: independent JS/CPU host submit time; no fabricated GPU timing. WebGL2 large vertex uploads are chunked <=16MiB; the renderer retains CPU shadow arrays **only for the editable batch** instead of all 551 primitives; optional hair GPU buffers are actually `deleteBuffer`/`deleteVertexArray` under sustained memory pressure or by user opt-in, keeping authoritative GLB and main skin/edits intact. Physical GPU VRAM reclaim time depends on browser/driver and cannot be claimed. Frame-pressure uses up to 25% scale drops to keep the UI responsive; no autonomous canvas reset on exceptions or WebGL context loss.
- `web/main.mjs`, `web/index.html`: Traditional Chinese resource status, frame-time budgets, memory/disk warnings and safe manual optional-hair release, with optional browser `navigator.storage.estimate()` diagnostics (origin quota != whole physical disk), exported JSON telemetry.
- `tools/build_standalone.py`: packages *the modified governor and renderer* into one offline HTML with the unapproved user's original Phase17 GLB for browser access on Android/Windows. Not an APK or EXE.
- Tests: 22 JS test assertions including 7 old real-GLB tests and 15 new policy/optional-GPU-release checks; 2 CTest executables for native geometry and resource constraints.

## Real measured / blocked

- Linux host C++20 compiled & 2 CTest executables passed. Browser HTML is syntactically valid and Chromium parsed/loaded it with **zero JS exceptions**.
- **No usable WebGL2 hardware** in hosted Chromium; GPU rendering/FPS unavailable here. AMD/NVIDIA/Adreno utilization unknown; Android Vulkan and Windows DX12 are still NOT built. **1080p60 remains a future device target, not proven**.
- `navigator.storage.estimate()` was unavailable in hosted browser; disk status explicitly `STORAGE_API_UNAVAILABLE` instead of inventing free capacity. Native I/O probe validated in host temp dir only; it is NOT proof of Android UFS / Windows NVMe speed.
- No attempt to delete OS caches, force garbage collection, kill other apps, adjust swap, or erase unsaved work. Memory policies apply to owned AIG allocations and low-priority reconstructible graphics resources only.
- Phase17 heroine is NOT a movie-grade fully reconstructed 3D face or hair. The source/model GLB is `NOT_APPROVED`, and AIG website / CNC / APK / EXE / PR merge remain unchanged.

## Reproduce

```bash
cmake -S core -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j2
ctest --test-dir build --output-on-failure
AIG_FASTMODEL_GLB=assets/phase17-visual-NOT-APPROVED.glb node --test tests/web-core.test.mjs tests/resource-governor.test.mjs tests/renderer-resource.test.mjs
python tools/build_standalone.py --glb assets/phase17-visual-NOT-APPROVED.glb --out AIG_FastModel_Stability_Offline_Android_Windows.html
```

**Next native gate:** call the newly exposed `aig_scheduler_*` C ABI from Android NDK JNI and Windows hosts; add real DX12/Vulkan timestamp queries, GPU memory data if available, battery/thermal notifications, app-scoped storage capacity monitoring, dirty Working Copy persistence and 30-minute 1080p target run on actual S23 + Windows GPU. Fail → BLOCK.
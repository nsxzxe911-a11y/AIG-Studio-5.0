# AIG FastModel Cinema Engine 1.0 · First executable engineering increment

## Scope (2026-10-20)

**The shared C++ geometry engine is real, compiled and tested. 1080p/60 FPS and native DirectX12/Vulkan are targets, NOT yet verified.**

Existing AIG School3D Phase17 SHA `893cfdef38b37d36a2d40a03f4bae0cee6f68de6` is the trusted input. No old art was promoted to authority. We did not touch CNC, CAD/CAM/NC, Android APK, Windows EXE, or production Render home. This stays in draft PR #12.

### Deliverables now

1. `core/fastmodel.{hpp,cpp}` — C++20 persistent mesh buffer, atomic sparse vertex modification, coalesced dirty spans, revision ids, vertex digest and bounds validation. No full rebuild on each local edit.
2. `core/fastmodel_c_api.{h,cpp}` — C ABI entrypoints for later native Windows and Android NDK/JNI integrations; the native render backends are **NOT IMPLEMENTED**.
3. GPU editing preview: `web/renderer.mjs::patchLocal()` uses `bufferSubData` on only 256 packed vertices (17,408 bytes), **without regenerating the 551 GLB primitives**; browser slider demonstrates locality if WebGL2 is available. This is **NOT** proof of 60 FPS.
4. `web/fastmodel-data.mjs` — self-developed glTF 2.0 GLB decoder with bounds checks, patch buffer and batching by material/skin.
5. `web/renderer.mjs` — candidate WebGL2 vertex shader skinning; joint matrices streamed via `RGBA32F` bone texture; per-material batch draws, embedded GLB source images, optional 1080p↔720p adaptive buffer, quaternion animation. The script is implemented but **WebGL2 rendering has not been verified on a compatible GPU in this container**. Alpha sorting in the first prototype is approximate.
6. `web/index.html` and `web/main.mjs` — dark AIG isolated GPU benchmark with input, drag rotation, load test GLB, CPU submission and FPS counters. **Not production site skin.**
7. `tools/build_standalone.py` — packs the frontend code and original unapproved Phase17 GLB into one self-contained HTML that Windows and Android browsers can open offline, without third-party character assets or tools.
8. `tests/native_fastmodel_test.cpp` and `tests/web-core.test.mjs` — native C++ safety/benchmark + real GLB decoding/batching tests.

### Source data, not authored anew

The 10.8MB bundled `assets/phase17-visual-NOT-APPROVED.glb` is the unchanged 2.5D character reconstruction from Phase17. It is a test fixture, **NOT** a newly approved 3D character. It is distributed only with the user-provided local ZIP. No binary model is committed to the repo; cloud CI uses the separately generated **synthetic** fixture.

### Linux CI / host test

```sh
cmake -S core -B /tmp/aigfastmodel-build -DCMAKE_BUILD_TYPE=Release
cmake --build /tmp/aigfastmodel-build -j2
ctest --test-dir /tmp/aigfastmodel-build --output-on-failure
AIG_FASTMODEL_GLB=/path/to/phase17-ci-synthetic.glb node --test tests/web-core.test.mjs
```

### Android / Windows local test

- Open `AIG_FastModel_1080p60_Android_Windows_Offline.html` in an up-to-date browser on **each device** (no network required). Press `載入附帶測試 GLB`. Run at 1920×1080, rotate, enable hair wave, and export telemetry JSON.
- On Android: device must support WebGL2 and allow loading locally saved HTML files. Do not confuse WebGL2 preview with native Vulkan. 1080p fullscreen at device resolution does not prove steady 60 FPS. Record 3-minute (minimum) and 15-minute (thermal) samples on physical S23.
- On Windows: WebGL2 preview first; then separately build native DX12 backend. Source code does **not** contain a DX12 renderer yet.
- Android native core: C++20 `core` can be compiled with the Android NDK's CMake toolchain targeting arm64-v8a, but **no APK, JNI bridge or Vulkan render backend has been built in this round**.

### Performance evidence and boundaries

- Linux x86_64 CPU 300,000 vertices / 256 edited vertices / 1,000 samples: original full recalculation versus sparse patch timings and bytes in `PERFORMANCE-EVIDENCE.json`.
- Real original Phase17 glTF has 551 primitives, 35,833 vertices and 63,867 indexed triangles. CPU batching reduces its WebGL2 draw unit count to **9** in full mode, **4** in preview mode (only source-level; actual draw has not been GPU-verified). Batch construction measured in Node; not per-frame FPS.
- Host Chromium was sandbox/administratively blocked from localhost and has **no WebGL2 context** even via inline page. Layout screenshot passed; actual GPU drawing and 1080p/60 FPS still **UNVERIFIED**. No SwiftShader software figures should be presented as a real GPU result.
- The exact source GLB is 2.5D, backside and character geometry are not visually approved; source 2D image face/hair fidelity does not imply multiview 3D. Movie-grade face/hair/cloth and native Windows DX12 + Android Vulkan remain outstanding.

### Follow-up engineering plan, WITHOUT starting 20 fake phases

**Next checkpoint is joint DX12/Vulkan backend with same immutable model data and matching command ids**, beginning with *real device FPS and GPU telemetry* (frame/p95, draw calls, thermal throttling and editing latency). Progress only when screenshots, executable and recorded device metrics exist. Keep 60 FPS target as an acceptance criterion, not a version number.
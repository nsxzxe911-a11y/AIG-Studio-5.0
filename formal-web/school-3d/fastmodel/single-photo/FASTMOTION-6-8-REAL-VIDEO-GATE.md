# FastModel 6.8 — 真瀏覽器影片驗證 Gate（Draft / source upgrade）

Upgrade from **6.7.0** / commit `6c7e9832ea7ca6f4a531725ed07b73eb62269c76` on PR #12, preserving every existing RGB / 2D / 2.5D / 3D / story / GLB / costumes / WAV pipeline.

## Implementation

- `aig-video-evidence-6-8.mjs` monitors **Canvas frame draw timestamps** during an actual user-triggered 1080p capture. Reports average observed draw cadence, median/p95 gaps and >50ms spikes; explicitly does **not** equate these callbacks with encoded video frame count.
- Exports opt-in **inspect actual recorded video** UI. After MediaRecorder completes and yields a real Blob, the button uses the browser's own HTMLVideoElement metadata to verify **encoded 1920x1080** dimensions; when supported it plays the actual encoded file and samples `requestVideoFrameCallback` decoded playback mediaTime/presentedFrames.
- Separates measured Canvas draw cadence from measured decoded playback cadence. A screenshot, empty file, synthetic model, fake FPS counter, requested 1080p Canvas size, or attached MediaStream audio track are **not** sufficient to claim true encoded 1080p30 + verified sound.
- Adds downloadable, current-source-bound QA JSON containing original image SHA, optional WAV SHA, actual real recorded bytes, capture quality and decoded playback sample results. Old outputs are retained as old-source downloads, never mistaken for current source.
- A device operator must still inspect heroine face distortion, hair/neck seam, ghost/double surfaces, scene quality and actual audible WAV sync. Browser metadata/frame callback is not proof of stereo mux, speaking visemes, observed real audio delay, Android/Windows 60FPS or absence of human-visible artifacts.
- Source QA uses synthetic fakes ONLY to test the evidence mechanisms and fail-closed behavior. It cannot replace a real website browser run using an approved photo and WAV. **Never mark production acceptance PASS from CI alone.**

## Release

Only the same-HEAD GitHub Actions source workflow PASS may establish **SOURCE PASS**. Formal Render is **not deployed** by Draft commits, and neither APK nor EXE is built by this change. `formalReleaseAllowed:false` remains authoritative until real browser output, user visual approval, audio playback, FPS and platform Gates.

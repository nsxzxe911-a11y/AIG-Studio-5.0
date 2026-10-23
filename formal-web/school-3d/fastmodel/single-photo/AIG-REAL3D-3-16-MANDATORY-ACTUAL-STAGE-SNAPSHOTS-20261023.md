# Real3D 3.16 — Mandatory genuine 3D snapshot before EVERY appearance stage; no more fake same images

Date: 2026-10-23, Asia/Taipei. User explicit requirement: "每階段都給我快照看好了 不然都是錯誤的模型~下一個".
Working branch verify/real3d-unified-appearance-3-5-20261023; Draft PR #44, NOT merged or deployed. Official Render website and APK/EXE unchanged.

## The factual problem uncovered
Previous Real3D 3.15 phone "front/profile/rear" PNG files, artifact 12501383156 run 39953647111, were byte-identical SHA-256 `3556e87e105f46978e18a0d353d4a3d16de9af3240bd6fe7a87c3c3b6596c52b`. They were whole-page screenshots of the TOP of the Real3D web page, not the WebGL model! Entire prior three-view snapshot evidence invalid. GitHub test also failed on #scan313-show after screenshots.

## True six-stage actual WebGL evidence obtained
Real3D 3.16 run 39958969822 (overall Gate failed at unrelated phone `#scan313-bench`/draw test). Artifact ID **12504001332**:
https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39958969822/artifacts/12504001332

ZIP has 6 actual 348×465 WebGL CANVAS-only phone PNG files plus SHA manifest; file image hashes verified distinct across genuine front/profile/rear:
1. `phone-stage-01-source-anatomical-fixture-ACTUAL-WEBGL-CANVAS.png`
2. `phone-stage-02-approved-palette-on-test-fixture-ACTUAL-WEBGL-CANVAS.png`
3. `phone-stage-03-separate-outfit-and-long-hair-ACTUAL-WEBGL-CANVAS.png`
4. `phone-stage-heroine-front-ACTUAL-WEBGL-CANVAS.png`
5. `phone-stage-heroine-profile-ACTUAL-WEBGL-CANVAS.png`
6. `phone-stage-heroine-rear-ACTUAL-WEBGL-CANVAS.png`

Phone manifest reported **certifiedDistinctRenderedViews: true**, but only for a *SYNTHETIC ANATOMICAL FIXTURE*, not real user heroine.
Assistant actually opened the real WebGL screenshots and diagnosed visible major failures: flat mushroom-like head/face, layered strange solid jacket/skirt and poor body proportions; appearance **FAIL**.
A six-stage annotated comparison montage was created from EXACT actual screenshots at `/mnt/data/AIG_Real3D_3_16_真實六階快照_技術測試_FAIL.png` (conversation ephemeral file; do not assume persists to new sessions).

## Code implemented (new source-only)
- `tests/aig-stage-snapshot-gate-3-16.mjs`: Playwright screenshots **only #viewport true WebGL canvas**, not page screenshot; evidence SHA, active WebGL triangles, byte length, source kind and device; rejects byte-identical front/side/rear images; preserves user-photo distinction; manifest.
- `tests/aig-stage-snapshot-gate-3-16.test.mjs`: fake identical PNG signatures must FAIL; distinct signatures only TECHNICAL pass, not 3D likeness pass.
- `tests/aig-unified-appearance-3-5.real-browser.mjs`: captures 6 named stages, publishes manifest immediately before unrelated multi-person QA, makes artifacts accessible even if crowd test fails; optional environment `AIG_SNAPSHOT_ONLY=1` returns early per device for an independent screenshot Gate.
- `aig-stage-snapshot-3-16-ui.mjs`: **on-device user source** capture using the existing **ONE WebGLRenderer**, a temporary WebGLRenderTarget and `readRenderTargetPixels`; genuinely distinct 3D front/profile/rear views with buffer flip; never uploads user original PNG, never adds 2D model fake; renders an ordered visible 3-thumbnail gallery, keeps old snapshots when new fails.
- `scene-runtime-studio.html`: formal UI visible "每階段真 3D 快照" section with gallery & capture control.
- `aig-continuous-surface-scan-2-9-ui.mjs`: automatically trigger capture on new source-mesh geometry, user reference-colour, heroine style draft, separate hair change and outfit change (not every animated frame).
- `.github/workflows/aig-real3d-3-5-unified-appearance-gate.yml`: enforce that both phone/desktop six-stage SHA manifests exist; upload regardless of job outcome.
- `.github/workflows/aig-real3d-stage-snapshots-3-16.yml`: isolated synthetic **real canvas** 6-stage phone+desktop Gate, not contingent on unrelated crowd QA (workflow may not start until GitHub recognises new branch workflow; check).

## Strict status / gates
**No 3.16 full PASS claim** until run on final HEAD including in-app gallery + desktop screenshot Gate completes. 19,200 logical work slots unchanged and are not physical cores. Source/rig/CNC untouched. No formal Render/Android/Windows deployment.
The actual stage screenshots reveal the right figure is STILL NOT the approved girl, and scene capture alone cannot correct facial geometry. The next narrow engineering priority is source-authorized **real 3D face topology** and proportion/costume shape, not changing lighting, screenshots or logical core count.
Each subsequent phase MUST expose original reference, same actual WebGL 3-angle render, comparison (not fake 2D source planes), source SHA and PASS/FAIL. Do NOT promote solely on hash-uniqueness or triangles existence.

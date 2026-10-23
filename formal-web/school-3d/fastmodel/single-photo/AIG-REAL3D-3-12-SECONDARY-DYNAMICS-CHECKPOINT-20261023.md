# AIG Real3D 3.12 — real 3D secondary motion, source-safe contact, 19,200 logical slots
Date: 2026-10-23. Draft PR #44, development branch verify/real3d-unified-appearance-3-5-20261023.

## Source work completed in development branch
1. Preserve Real3D 3.10 one-renderer, 19,200 **logical** vertex work slots, device-capped lane execution, source-bound face/body and replaceable modular hair/wardrobe. 19,200 physical CPU/GPU cores or hardware speedup are NOT claimed.
2. Preserve Real3D 3.11 confirmed dedicated Gate PASS https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39943960373 ; hair and skirt pass through coarse source-labelled actual 3D shoulder/torso/legs contact proxy with incomplete penetration count exposed.
3. New `aig-secondary-motion-3-12.mjs`: deterministic bounded mass-lite spring/damping of real hair-tail and skirt vertices; top roots pinned to source body; timestep clamp and max departure limit; exact immutable-rest reset; zero claim of full fabric/strand simulation.
4. `aig-continuous-surface-scan-2-9-ui.mjs`: genuine 3.1 body joint pose -> 3.9 garment/hair source-vertex attachment -> 3.12 secondary motion -> 3.11 body contact -> existing shared WebGL mesh attributes. Limit settling to 18 requestAnimationFrame iterations; no extra GL context; halt on photo/source change, hide, wardrobe or hair replacement, or viewer capture.
5. RGB formal page now shows actual simulated frames, moved dynamic vertex counts, coarse penetration corrections, and unresolved collisions. No fake success label when source region is missing.
6. `tests/aig-secondary-motion-3-12.test.mjs` covers capped positions, mobile frame clamp, pinned roots, actual frame-to-frame evolution, cancellation via runtime and full neutral reset, no change to source arrays.
7. `tests/aig-unified-appearance-3-5.real-browser.mjs`: actual Chromium phone + desktop real WebGL dynamic pose and rest screenshots; verifies >=12 actual simulated frames and physically accurate-cloth claim remains false. Gate workflow updated to make above mandatory.

## Verification state / ship blockers
Latest source check at https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39945381926 (status last observed QUEUED; do not call 3.12 PASS until completed/success). PR remains Draft and unmerged.
- This only adds SECONDARY movement and coarse contact; continuous heavy cloth physics, head hair grooming, broad-phase mesh triangle collision and 60 FPS on real Android/Windows have NOT passed.
- Approved heroine reference photos have NOT been built into model QA. Technical synthetic person remains a synthetic fixture; face/hair/uniform/photo match not visually accepted; no 100% source similarity.
- Formal Render official website, APK and EXE are NOT updated. No other AIG-II/CNC source modifications.
- No irreversible reset of existing GLBs/world/CAD/CAM/NC; each scene layer is kept separate.

## Next unresolved priorities
1. Inspect final 3.12 Chromium evidence and fix exact failures before raising versions.
2. Couple actual detailed triangle-level collisions with hair and skirt; document residual contacts and exact source SHA.
3. Add authentic, user-approved face/hair/outfit photo matching in real GLB/multiview rather than a mannequin.
4. Native performance profiler for 19,200 logical work slots on Android and Windows; real quality and delivery Gates.

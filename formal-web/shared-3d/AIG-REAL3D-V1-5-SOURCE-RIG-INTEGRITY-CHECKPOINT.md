# AIG Real3D 1.5 — 3AX verified geometry input Gate / continuity checkpoint
Date: 2026-10-22 Asia/Taipei

## Actual source changes
- `aig-real3d-rig-integrity-1-5.mjs` exports `calculateAIG15RigDigest`, `verifyAIG15RigDigest`, `bindAIG15IntegrityGated3AXReplay`.
- Browser and Node >=22 use native Web Crypto SHA-256. Canonical serialized scene content includes real XYZ mesh vertices/normals/indices, transforms, materials, node identities, source and revision, not only a declared hash string.
- `rigManifest.geometrySha256` must be **independently pinned** before the candidate rig is loaded. A self-generated expected digest at verification time is prohibited as a production approval strategy.
- The adapter invokes 1.4 only after checking canonical SHA match; the 1.4 checks NC byte exactness, source reparse, axis tip agreement, declared source manifest and no fake/procedural sources. It reads the 1.3 **real voxel numerical boundary** and does not transmit CNC commands.
- Unit tests cover exact digest, geometry/material/source/transform tampering without revision bump, incorrect SHA, stale NC, 5AX BLOCK and original 54 mm³ G0/G1 replay unchanged.
- Offline build includes 1.5 module and old 1.0–1.4 modules. Both 1.3 and 1.4 dedicated CI definitions add 1.5 tests. FastModel full regression npm test discovers new `*.test.mjs`.

## Critical separation of image, geometry and native runtime
- AIG RGB visual authority mobile 3AX (source reference `AIGII-MOBILE-3AX-CURRENT-20261016`, 864 x 1536, listed SHA-256 `4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28`) is **an image**, not a verified 3D machine mesh. The current formal image-library page explicitly says the exact physical image is absent on the website.
- Desktop 3AX latest approved visual source requires independent verification; old revoked 438 assets must not be reused.
- Existing `formal-web/mobile-runtime.html` and `formal-web/studio-375.html` are retired legacy Web workspace notices. Do not restore those lower-tier routes as production CNC UI. Do not modify published Render site until separate page/asset Gate.
- 1.5 hashes canonical **scene geometry**, not original GLB bytes. The asset SHA-256 is still a separate external source binding; no native signed asset certification. Authentic user-approved CNC machine visual, axis travel, collision, spindle/holder accuracy, tool tip calibration and Fanuc NC remain unverified.
- Hardware-native APK/EXE, 0.001 mm geometric accuracy, and 4/5/6AX A/B/C kinematics remain BLOCKED.

## Gate status
- Earlier rerun #39798561828 FastModel 7.8 head/neck browser test and original regression completed/success.
- Latest source Gate #39809665288 and FastModel regression #39809665408 were queued when checked. **Do not call Real3D 1.5 PASS** until the precise 1.5 test job concludes success.
- New Real3D 1.5 source only committed to repair branch, no new Render production deploy, APK or EXE.

## Next eligible implementation
1. If 1.5 CI RED, repair by code and re-run; protect previous numerical core.
2. Retrieve independently approved physical 3AX rig's real XYZ mesh or GLB bytes, exact source digest, geometry frame, calibrated tool tip and validated scene source; never infer the 3D machine model from the RGB screenshot alone.
3. Rebuild a fresh **formal** 3AX NC-first secondary page with original Authority 3AX RGB skin and real Button ID → Shared Command → Runtime events, responsive viewport 65–75%. Old retired Web workspace routes remain retired.
4. Attach integrity-gated visual scene and numeric stock to source-owned NC working copy; test phone/desktop GPU context and real machine toolpath state without CNC machine writes.
5. On PASS of the 3AX end-to-end visual and NC tests, separately design calibrated 4AX A, 5AX A/B, 6AX A/B/C kinematics and collision / machine safety evidence.

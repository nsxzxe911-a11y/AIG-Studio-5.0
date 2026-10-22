# AIG Real3D 1.4 — 3AX 只讀 NC→真 XYZ 場景接軌

Date (Asia/Taipei): 2026-10-22. Continue from v1.3 confirmed GPU context restore and single-block numerical stock checkpoint. No rollback of AIG-II/AIG Studio 5.0/FastModel legacy runtime.

## Code committed on repair/core-first-fastmodel-20261021
- \`aig-real3d-axis-bridge-1-4.mjs\`: a source-bound scene adapter for **3AX only**; real voxel occupancy boundary from 1.3 and re-parsed G0/G1 toolpath, not stock mockups.
- Coordinate mapping explicitly \`CNC (X,Y,Z) mm → Real3D (X,Z,-Y) mm\`. Numerical voxel normals and positions transform together; existing approved rig is expected to have already used the visual coordinate frame.
- Runtime X/Y/Z must exactly equal current re-parsed NC tip. Raw NC must byte-match current replay. Modifications BLOCK rather than showing stale working copy.
- Require distinct real \`machine\` and \`tool\` mesh nodes, declared source SHA-256, exact frame, units MM, matching rig revision; block DEMO/PROCEDURAL/PLACEHOLDER sources.
- Never claim the provided SHA was cryptographically validated by this bridge; the manifest and geometry remain external inputs. No full rig certification or authority visual approval is granted.
- \`4AX/5AX/6AX\` are rejected until their **actual** A/B/C kinematics are provided and verified. No dummy rotary axes.
- No production NC writes, no 0.001 mm certification, no machine clearance or collision certification.
- Offline FastModel build now copies the shared 1.4 module without changing prior source files.
- Node test cases: real 54 mm³ 1.3 stock binding, scene axis mapping, numerical mesh output, stale source/axis/rig/digest BLOCK, 4/5/6 axis BLOCK, nonmutation of original rig.

## Gate and evidence
- 2026-10-22 FastModel 7.8 head/neck Chromium gate was rerun; original workflow #39798561828 has its cancelled test now completed/success plus legacy regression success. Tests use synthetic review geometry, not actual authorized heroine/model likeness.
- 1.4 changed files and v1.3 additive tests committed under repair branch; source/test commits: \`3efc5517\`, \`c396a009\`, offline copy \`c9ac5426\`, v1.4 CI \`d616eca\`, legacy 1.3 additive CI \`e14d3018\`.
- Do not claim 1.4 PASS until current GitHub Actions results are completed/success. A queued/in_progress run is pending, not successful.
- Original Render formal site \`aig-dual-formal-runtime\` is confirmed LIVE with v1.3 commit \`c778ad3ddaeafd982ce7a0d305ffbf48ebb85d09\` as of 2026-10-22 23:27 +08:00. **1.4 is not deployed there**. No phone hardware or Windows native executable verification performed.

## Next actual implementation
1. Finish 1.4 Node/CI; fix any RED before attaching it.
2. Resolve last approved 3AX authority asset **actual** mesh data and independently verify raw SHA and rig/tool tip frame; attach real UI callbacks without replacing AIG RGB pages.
3. Connect the adapter to formal 3AX NC-first secondary page with numerical removed mm³ and unchanged NC state; perform phone/desktop browser visual regressions.
4. Only after that, separately define 4AX A, 5AX A/B, 6AX A/B/C actual machine kinematics and tool/fixture collision checks. Any unsupported source must BLOCK, not silently degrade.
5. Native APK/EXE, 0.001 mm material removal, Fanuc output remain gated independently.

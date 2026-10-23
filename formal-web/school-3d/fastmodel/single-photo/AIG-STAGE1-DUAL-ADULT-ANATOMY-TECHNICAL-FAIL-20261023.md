# Real3D Stage 1 adult male and female technical base — 2026-10-23

User-approved execution scope:
- Adult **male** neutral hairless anatomical body with fitted swim briefs.
- Adult **female** neutral hairless anatomical body with close-fitting one-piece swimsuit.
- Common meters, +Y-up, -Z-front, ground midpoint origin, independent left/right arms and legs, 21 connected joint nodes each.
- Four actual WebGL camera views **per adult** (front, right-side, back, 45-degree); PHONE and DESKTOP each capture a separate 8-image set, 16 true frame PNGs.
- NO school uniforms, heroine face, hair, classmates, PBR art focus or increase in 19,200 logical work slots.
- Keep existing GLBs, legacy Real3D, AIG-II/CNC untouched.

Implementation on Draft PR #44:
1. `aig-stage1-dual-adult-anatomy.mjs`: two independently instantiated technical adult base meshes made of actual indexed elliptical loft surfaces (not photo planes), with separate head/neck/torso/arms/legs and measured normalized proportions, separate fitted uniform-color swimsuit surfaces.
2. `aig-stage1-dual-adult-runtime.mjs`: 21 THREE.Bone parent-child pivots per body (rigid piece attachment, NOT production SkinnedMesh / validated smooth vertex weights), one EXISTING WebGLRenderer, isolated Stage1 scene, camera switch and actual RenderTarget four-view snapshots, no destruction of other source models.
3. Official page controls: male/female switch, open/release, 4 true camera angles, four or all-eight screenshot gallery, clear notice Stage1 visual Gate remains FAIL until review.
4. `tests/aig-stage1-dual-adult.test.mjs`: geometry, both limbs, joints, fins, no hair/no skirt, separate garment cases, source immutability.
5. `tests/aig-stage1-dual-adult.real-browser.mjs`: actual phone+desktop 16 canvas screenshots + per-device SHA manifest, view-uniqueness check, visual user approval always false.
6. `.github/workflows/aig-real3d-3-5-unified-appearance-gate.yml`: independent `stage1-dual-adult-true-webgl` job; previous appearance/crowd Job may fail independently and cannot confer Stage1 PASS.
7. Critical real screenshot feedback: first 16 PNGs, run **39964107100**, separate Stage1 job **SUCCESS**, artifact ID **12505384593**. But **human geometry visually FAIL**: head looks like a flat pancake, arms and legs are chunky, and body is absurdly wide. This is NOT valid neutral anatomy. SHA unique is not sufficient.
8. Root cause discovered in prior viewer: `viewer.fitCanvas()` used WHOLE PARENT PANEL height rather than actual CSS canvas height after adding several control panels, creating mismatched WebGL camera aspect and horizontally squashed/stretched characters. Fix: use `canvas.getBoundingClientRect()` to set renderer bitmap and camera aspect, not parent panel. New real Chromium Gate asserts CSS pixel aspect matches actual GPU canvas bitmap to within 0.015, so distortion blocks delivery.
9. Second rendering evidence run **39964873906** last observed IN_PROGRESS, independent Stage1 job installing Chromium. Do NOT claim corrected real geometry until exact new screenshots are opened and assessed.

The user said each stage requires actual snapshots. Stage1 source-test PASS and browser test PASS are insufficient: RELEASE VISUAL **BLOCK** remains until real body proportions, head shape, arms, hips, separated legs and tight swimsuit visibly plausible from four directions and user approves them.

No current production Render deployment / APK / EXE, and no merged PR. Do not label the adult technical bodies as the approved school heroine.

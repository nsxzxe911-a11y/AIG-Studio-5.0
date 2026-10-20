# AIG SCHOOL 3D — Phase 3 material authoring (NOT character approval)

**Scope:** Separate `formal-web/school-3d/material-lab.v1.html` in draft PR #12. No Render deployment, no Android/Windows modification, no CNC user data touched.

## Real deliverables
- **A standalone WebGL2 PBR material laboratory** with three explicitly labeled 3D material probes. Skin / Hair / Fabric shader previews are *real GPU-shaded spheres*, not a 3D female character. The player is user-initiated and entirely isolated from the official AIG CNC runtime.
- Skin surface roughness, microscopic normal relief and approximate skin translucency controls.
- Hair fibre and navy fabric weave material controls, plus camera drag, zoom, reset, screenshot.
- Local Authority comparison input: user can select the approved reference; it remains inside the browser via object URL; no upload or storage.
- A deterministic Python generator `tools/skin_materials.py`, producing 9 **PNG PBR candidate** maps (3 channels per material) and SHA-256 manifest. These files are downloadable as CI artifact, **not approved character or release art**.
- A local VTK offline probe renderer in `tools/render_material_probes.py` for material colors only.
- 3 unit tests for texture dimensions, normal directions, metallic channel, reproducibility, exact digests.

## Current Authority reference
The user's previously generated 3D campus schoolgirl cinematic still is the **visual comparison reference**, not a rigged 3D source. Local original:
`櫻花校園的青春時光.png` · 1672×941 · SHA-256 `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`.
This binary has **not** been published to the Render site or GitHub runtime assets.

## Acceptance
- `node --check material-lab.v1.js` — source syntax.
- `python -m unittest discover -s tools -p 'test_skin_materials.py' -v` — texture QA.
- Chromium DOM/button tests: desktop 1440px and phone 412px have no horizontal overflow, switch and slider/reset events work.
- **Local WebGL2 visual Gate: BLOCKED**, because restricted headless Chromium has no WebGL context. The offline VTK material sample is a *different renderer* and is not evidence WebGL2 works on S23/desktop.
- The 20-minute animated film and real rigged/glam-quality character are **NOT produced by this step**.

## Next source of truth
Obtain/create the actual high-grade 3D *character* with consistent face sculpt/topology, rigged skin and PBR materials. An approved identity/face comparison and smooth walk must pass in BOTH S23/desktop before changing `authority.v1.json` or landing on production.
No coarse mannequin, still-poster panning, or fake PBR spheres may ever be used as the approved human model.

## CI
`.github/workflows/school-3d-source-gate.yml` now checks the GLB anti-fake tests, JavaScript syntax, PBR maps, writes candidate artifact, keeps release disabled.

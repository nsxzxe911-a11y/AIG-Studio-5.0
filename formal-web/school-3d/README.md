# AIG School 3D Hero V1 · Independent preview only

## Project boundary
- Actual original AIG Render site: `https://aig-dual-formal-runtime.onrender.com/`
- Source repository: `nsxzxe911-a11y/AIG-Studio-5.0`, site branch: `web/aig-dual-formal-runtime-20261016`.
- Implementation here is a **separate preview page**, not a CNC workspace, 3D film, or production homepage update.
- NEVER rewrite the already approved AIG home layout or Android/Windows Runtime for this asset.
- Do not publish the old 9-second VTK mannequin, recycled reference illustrations, or low-poly filler as a completed film or model.

## First 5 files / duties
| File | Responsibility |
| --- | --- |
| index.html | semantic standalone layout, true button states |
| school-hero.v1.css | mobile/4K adaptive layout, large 16:9 viewport, RGB skin |
| school-hero.v1.js | explicit authoritative SHA gate, click-to-load, fail closed, dispose |
| authority.v1.json | per-asset approval, SHA, filenames, platform contract |
| README.md | milestones and acceptance conditions |

## Planned authoritative binary assets
No binaries were fabricated in this implementation. `authority.v1.json` explicitly keeps all `PENDING`, therefore the 3D entry button is disabled until real assets and verified SHA are present:
- `assets/approved-poster.png`: last approved cinematic girl design, PNG and exact sha256.
- `assets/character-rigged.glb`: a real skinned, rigged, high-quality 18-year-old character, layered skin PBR, hair and uniform.
- `assets/sakura-campus.glb`: detailed campus geometry, correct cherry blossoms, HDR-like scene lighting.
- `assets/character-motion.glb`: validated idle, walk, blink, breathing animation, no sliding feet.
- `scene-runtime.v1.js`: future actual Three.js/WebGL2 scene controller with locally bundled renderer/GLTFLoader; NOT present in Stage 1.

## Stage-by-stage gates
1. **Source/layout**: page loads offline with neutral Pending status, no CDN or model fetch; mobile S23 and 3840×2160 layout remains usable.
2. **Poster**: binary file and SHA match current approved character Authority exactly; no other substitute.
3. **Character/PBR/Rig**: validate geometry, topology, skin PBR, face, hair, clothing, skeleton, animation clips, identity across shots.
4. **Runtime**: only then add WebGL2 + local loader and animator, lazy load on explicit user interaction. GPU/unsupported systems remain on the approved poster.
5. **Integration**: S23/4K screenshots & events verified; propose narrowly scoped homepage addition to site branch. Do not replace source navigation, CNC data, native downloads, or CNC modules.
6. **Film**: separate process for narrative, dialogue, sound, mixed 20:00 audiovisual MP4. Do not label the hero preview as a finished film.

## Explicitly incomplete
This stage does **not** provide a rigged female character, real PBR texture files, animations, film, or approved Render deployment. Missing work is blocked, not hidden by a fake PASS.

## Privacy/safety and failure policy
Do not read/write CNC localStorage, CAD/CAM/NC data, or update Android APK/Windows EXE.
No downloads of untrusted third-party 3D assets on page load. No 3D engine connection until SHA and approval status are correct.
UI errors are neutral, and any failure affects this module only.

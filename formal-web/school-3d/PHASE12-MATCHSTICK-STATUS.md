# Phase 12 — Slim matchstick skeleton anchored to Reverse Authority (NOT A RIGGED CHARACTER)

## User correction implemented
The prior "large skeleton" was being confused with the bulky prototype avatar. A glTF skeleton consists of joint transforms, and **does not intrinsically have a physical radius**; oversized visible arms/face/clothes are geometry of the rejected doll, **not a configurable bone thickness**. The new stage removes the bulky skeleton proxy from reverse engineering visual fitting: only thin **2-pixel image-overlay rig lines** and original landmarks appear. This guarantees bone debug display cannot enlarge a face, body, hair or uniform.

## Actual sources
- `matchstick-rig.v1.json`: 10 reverse-image nodes, 7 line segments (visible head/neck/shoulder/torso only). Default 2px, max 3px; measured vs interpolated points distinguished and labeled as **2D image pixels, never 3D spatial anchors**.
- `tools/build_matchstick_spec.py`: deterministic generation from the existing `reverse-authority.v1.json`. No new 3D avatar, no copying Phase6 mesh.
- `matchstick-rig.v1.html`, `matchstick-rig.v1.js`: an isolated web preview, using user's *local* approved PNG with SHA-256 verification before showing fine-bone SVG overlays; width slider 1–3px, infer-line toggle and line visibility control. No images are uploaded.
- `tools/test_matchstick_rig.py`: 10 unit tests for digest match, line width, reference landmarks, safe visibility of cropped portions, no 2D-as-3D, and no old geometry or homepage release.
- `index.html` isolated preview now links the tool; formal `formal-web/index.html` is **untouched**.
- The precise preview image is stored in the user's ChatGPT Library `/AIG-II/School3D/Phase12-MatchstickRig/matchstick-overlay-actual-authority.jpg` but is NOT committed as a runtime authority image.

## Correct technical handoff
**Reverse photo & mesh silhouette > 3D sculpt > 3D joints and skinny debug strokes > recalculated skin weights/inverse bind matrices > gait IK.** Old Phase6 joint names and algorithm may be reused after accurate 3D geometry, but old world units, cylinder body geometry, shoe/face meshes, and primitive "doll" look MUST NOT be brought forward.

## Gates
- Native source keypoint overlay: local image SHA verified, same `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`.
- Local Python 10 tests: PASS, Node syntax: PASS.
- Browser navigation visual QA: **NOT VERIFIED** here due to environment restricting Chromium even for local URLs; the static reference overlay was rendered and inspected separately.
- GitHub Actions Source Gate: consult the latest run for head SHA. Does NOT approve visual identity.
- Full 3D rigging to a new approved female sculpt: **NOT DONE**. Lower legs unobservable in approved cropped reference.
- Mobile S23 / Windows 4K GPU visual acceptance: **NOT DONE**.
- Render original home, APK, EXE, CNC tools: **UNCHANGED**; PR stays Draft, no merge.

## No-fake rule
Do NOT conflate a thin skeleton overlay with a true mesh/rigged-animation completion. When a high-fidelity unrigged 3D heroine and actual 3D anchors exist, feed them to the existing Phase10 mesh-first binder, reweight skin and IK according to their dimensions, and only then validate cross-platform visual quality.

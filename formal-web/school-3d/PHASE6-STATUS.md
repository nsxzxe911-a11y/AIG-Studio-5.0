# AIG School 3D Phase 6 — ankle IK contact correction and visual rejection

- Date: 2026-10-20
- Source previous credible head: `c2de891c` / Draft PR #12.
- This is a separate experimental character asset, not a live AIG Render homepage update.

## Produced tangible assets
1. `assets/hero-rig-Phase6-TECHNICAL-ONLY.glb` — glTF 2.0 3D mesh with human rig, 9 PBR textures, Blink/Smile morph targets, idle and forward-walk animation.
2. `tools/build_rig_phase6.py` — deterministic builder, head/eyelid & hair surface improvements, 81-sample, world-space stance foot IK solving both legs.
3. `tools/verify_foot_contact_phase6.py` — reads the actual encoded GLB animation channels, computes full skeleton node transforms and world-space ankle positions, rejects stance drift or missing swing clearance.
4. `tools/test_phase6_ik.py` — four independent build, ankle, in-GLB and deterministic SHA tests.
5. `tools/render_phase6_preview.py`, `tools/render_phase6_motion.py` — offscreen VTK static and CPU skinning moving-geometry tests, no 2D photo panning.
6. `phase6-preview-TECHNICAL-ONLY.png`, `rig-motion-Phase6-TECHNICAL-ONLY.mp4`, `phase5-vs-phase6-visual-audit.jpg` — actual VTK visual tests and side-by-side with approved image reference.

## Verified technical results
- 86,520 triangles, 195 primitives, 33 joints, 9 PBR textures, 2 clips, Blink & Smile.
- Generated GLB SHA-256: `1fdee41fc07c6f4b725269a0c7c7e73979fd9651f6c1cba5dc576f7b209b9619`.
- At 81 2-second keyframes, **GLB-decoded** stance ankle `z` span left ~5.53e-8 metres; right ~7.08e-8 metres; stance `y` span both ~8.64e-8 metres. Swing ankle rise ~0.070m.
- This is **ankle joint grounding**, NOT validated shoe-sole penetration/contact/friction, skin-cloth collision, natural full-body gait or floor simulation.
- CPU-skinned 2-second MP4 rendered. It has correct moving 3D vertices, but gait, facial proportions, hair topology, uniform still visually not acceptable.

## Three Gates (do not conflate)
- Structural glTF and IK stance: PASS (local checks)
- Appearance compared with the approved girl's cinematic still: **FAIL** (doll proportions, unrealistic hair & garments)
- Exact mobile S23 / desktop 4K WebGL2 acceptance and production Render deploy: **NOT DONE**.

**Authority manifest stays blocked / preview only.** No primitive mannequin substitutes or claim this is the real 20min girl. CNC, CAD/CAM/SIM/NC, APK and EXE remain unchanged.
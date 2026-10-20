# AIG School Hero Phase 5 — 3D Skeleton Motion + Sculpt Iteration

**Scope**: independent experimental rig and appearance fix. User-approved cinematic character authority is a reference; Phase5 remains **visual FAIL**.

## Evidence
- Phase4 baseline: rigid 1-joint skinned geometry, detached bulbous coat-front panels, chest-to-skirt gap, sphere/nose and eyes, hair cards hidden behind cap.
- Phase5 generator: integrated facial nose surface deformation rather than nose bead; smaller eyeball geometry; actual forward fringe cards, thin double-sided coat panels, a tapered waist connector, slightly proportionate shoes; 2-bone smooth skin blending at arms/legs; idle/walk clips include foot rotations.
- Phase5 output: **86k–88k actual indexed 3D triangles, 33 bone nodes, 151 primitives, 9 embedded PBR texture maps, Blink/Smile morph targets, Idle & Walk GLTF clips**. All sources and SHA must be verified using the generated files; do not treat counts as quality.
- Skinning validation: **4,126 two-bone weighted vertices**, all JOINTS/WEIGHTS normalized; glTF2 parsing and accessors PASS.
- Real animation proof: `rig-motion-TECHNICAL-REJECTED.mp4` = **2 seconds at 7 FPS, 380×540** driven by glTF joint matrices, not 2D slide animation; nonidentical video frames. It is low-quality rig-motion diagnostic with **no dialogue, no sound, no physical foot-contact proof**. Not cinematic visual authority.
- Rendering screenshot `phase5-preview-TECHNICAL-ONLY.png` visually inspected and marked **FAIL**: mannequin face, disconnected jaw/neck appearance, large boxy upper body, no high-grade hair fibres, stiff A-pose/bone walk and simplistic VTK material appearance.
- Currently no approved high-resolution female character model, detailed facial sculpt, realistic eyelashes, cloth physics, hair sim or verified S23/4K browser rendering.

## Hard GATE
- Source/structure/Morph/skin tests: PASS.
- Real animation deformation: basic CPU sampled glTF proof PASS, **natural gait FAIL**.
- Appearance: FAIL, locked.
- WebGL2 S23/4K: not verified.
- Formal Render homepage and original CNC project code: unchanged / not deployed.

## CI / build
- `python tools/skin_materials.py --out <work>/materials --size 512` (from Phase3)
- `python tools/build_rig_phase5.py --source <work>/materials --output <work>/rig-CANDIDATE-NOT-APPROVED.glb`
- `python tools/verify_prototype.py <work>/rig-CANDIDATE-NOT-APPROVED.glb`
- `AIG_PHASE5_MATERIALS_DIR=<work>/materials python -m unittest tools/test_phase5_rig.py`
- `tools/render_rig_motion_v1.py` requires VTK, SciPy, FFmpeg; **render locally only**; not integrated into official runtime.

## Next genuine requirement
Real female face/skin sculpt + controlled topology, eyelids, proper hair and cloth mesh, and human-verified cinematic identity and 3D gait. Do not ever push tech fixture into approved character asset path. Keep `authority.v1.json` blocked.
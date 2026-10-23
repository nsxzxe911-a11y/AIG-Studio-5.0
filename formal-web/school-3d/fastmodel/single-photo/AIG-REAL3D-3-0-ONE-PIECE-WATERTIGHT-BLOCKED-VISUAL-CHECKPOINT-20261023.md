# Real3D 3.0 — genuine SDF-fused one-piece geometry; visual realism BLOCKED

Date: 2026-10-23 (Asia/Taipei). User said even ordinary 3D prints do not look as ugly as the 2.9 screenshot. This criticism is technically justified: independent rings and featureless anatomy do not meet realistic full-body or print-model appearance.

## Exact handoff
- Repo: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0
- Branch `verify/real3d-true-world-movie-2-5-20261023` · draft PR #43.
- Do NOT fall back to old FastModel 6.9.5, remove AIG-II/CNC/Studio geometry, show still-photo sway, change original asset SHA, or claim official Render/APK/EXE Release. Preserve 2.5 true GLB actors and 2.6/2.7/2.8/2.8-B core.
- Never conflate **structural manifold Gate** with likeness, measured depth, viable thin feature geometry, printable physical scale, 1:1 human or customer-accepted realism.

## Actual new source
- `aig-fused-manifold-surface-3-0.mjs`: samples bounded variable-shape 2.9 source-labelled elliptic sections, signed-distance solid field with bounded smooth union, 6-tetrahedra per lattice cell (shared edge-to-index cache), outward oriented triangles, smooth vertex normals, one connected volume. Exports `buildAIG30FusedSDF`, `auditAIG30ClosedManifold`, `inspectAIG30FusedFiveAxisSurface`. Rejects open-edge/nonmanifold/degenerate/nonfinite/disconnected and inward volumes; actual front and hidden back depth explicitly approximate.
- This is NOT actual ultrasonic/radar `echo`, and virtual A/B normals never send machine movement.
- `aig-continuous-surface-scan-2-9-ui.mjs` now uses fused SDF in the same THREE WebGL renderer instead of displaying many disconnected tubes. Source visible RGB colours are rendered on the new triangle vertices with softened inferred rear colors. Old source GLB and film core intact.
- `scene-runtime-studio.html` defaults to Real3D 3.0 single fused section & exposes bounded quality and union-size options. Fused component is a technical unapproved mesh.
- `tests/aig-fused-manifold-surface-3-0.test.mjs` and existing 2.9 real-browser mobile/desktop tests require exactly 1 actual fused WebGL mesh and true closed-manifold evidence. Both standalone 2.9/3.0 Gate and combined CNC/3D Gate keep the checks.
- The latest code explicitly marks `visualReleaseGate='BLOCKED_SINGLE_VIEW_PRIOR_AND_MISSING_FINE_ANATOMY'`, `production3DPrintApproved=false`; UI shows geometry topology PASS separately from *human appearance not approved*.

## Verified evidence
- Initial standalone JS source executed at voxel grid 96: **1 mesh, 35,592 triangles, 17,798 indexed vertices, zero nonmanifold/boundary edges, zero degenerate tris, 1 connected component, signed outward enclosed volume positive**. This validates indexed triangulation, NOT high quality form.
- After wiring, actual independent phone+desktop Chromium WebGL run **39908951377**: `completed/success` on commit `69538d3b`. Source screenshot proofs of 1 fused manifold, 5-axis normals and original viewer reuse, with actual GPU draw. https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39908951377
- Downloaded previous failed-final-string run #39908758353 artifact #12482145914, visual inspected actual **phone WebGL** image at `phone-actual-3d-curved-surface.png`. It looks like a simplified faceless mannequin, with big blue torso, arms and straight columnar legs, even though it is geometrically unified. **This is visibly STILL UGLY and NOT the desired print-grade result.** Never claim 3.0 solved realistic appearance solely because manifold Gate passed.
- Standalone run **39909227457** on new quality metadata source `5d4119eb`: `completed/success`. One later source revision with an invalid unquoted key caused CI failure; corrected under commit `5b09daf0` and latest run 39909278602 was pending at last check.
- Latest full three-project Gate repeatedly remains RED at **Real3D 2.5 desktop WebM `NO_NONEMPTY_ACTUAL_3D_VIDEO_FRAMES`**. Do not bypass. This source branch stays draft with no official website/Release deployment.

## Required next real model quality advance
- Stop using isolated elliptical rings or even a fused solid as a final human. Acquire **real calibrated multi-view/depth photogrammetry** where possible; maintain exact exposure/camera intrinsics, physical scale marker or CAD-reference dimensions, RGB reflectance, per-view segmentation and confidence/occlusion, TSDF fused depths and geometry error metrics.
- For **only ONE original RGB photo**, use an explicitly prior-trained high-quality detailed human reconstruction model and label all face/back/hidden body as **plausibly inferred**, not physically 1:1 measured. External pretrained weights absent in current first-party implementation. Do not invent model inference or claim 3D print production.
- Explicitly develop closed connected anatomically convincing head/neck/shoulder/pelvis/wrist/knee/ankle shape, face/hands/feet landmarks, scanned/material textures and genuine GPU render; rigging only after shape; evaluate with user-approved real screenshots.
- Gate physical fabrication separately: measured scale, min wall thickness, self intersection, real print format STL/3MF, build direction and material support. A manifold volume alone does not make a print-safe, aesthetically finished human.

## Next decision
Do not call a screenshot of a faceless mannequin a success. Keep the good numerically checked SDF core as a **lab foundation** while directing future work toward realistic actual-source shape/depth, and show user only candidly-labelled results.

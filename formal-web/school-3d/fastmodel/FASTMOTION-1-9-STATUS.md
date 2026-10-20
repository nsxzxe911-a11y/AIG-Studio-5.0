# FastModel 1.9 — Actual GLB bridge candidate and skin-safe Preview

Incremental from the only verified FastModel 1.8 `67e739c1` on Draft PR #12. No official GLB, APK, EXE, Website deployment or production Authority status change.

## Actual implemented work

1. `seam-bridge.mjs` generates a **separate, decodable GLB 2.0** with a new skinned two-ring triangle-strip mesh attached to the scene. It preserves the original downloaded ArrayBuffer, original GLB mesh data and source bytes. The new bridge inherits real `JOINTS_0` (glTF uint16), `WEIGHTS_0`, `TEXCOORD_0`, `COLOR_0` and a real material.
2. The GLB builder requires a unique explicitly tagged head node, unique explicitly tagged neck node, one triangle primitive each, one simple open boundary ring per side, equal ring vertex counts, same valid skin and existing scene, no node transforms/children attachment, no morph targets, valid joint IDs/weights, and a small bounded gap. It **BLOCKS** on incompatible topology, index corruption, unequal skeletons, large separation or invalid data. It cannot automatically stitch arbitrary faces.
3. New Motion-pane button `bridge-candidate` downloads `AIG-FastModel-HEAD-NECK-VISUAL-BRIDGE-CANDIDATE-NOT-APPROVED.glb` only on a passing preflight. Original model is **not overwritten**. All UI buttons are real callbacks; standalone HTML embeds bridge creator.
4. **Important source-safety fix:** `fastmodel-data.mjs` previously discarded *every* primitive with `skin===1` in Preview mode, potentially removing head/neck/scalp. This is no longer allowed. Preview skips only explicitly marked optional fine-hair/foliage/water-foam materials that are not used by an explicitly protected head, neck, face or scalp node. Unknown source geometry is kept. 1.5 automatic details policy and manual-cache deletion restrictions are preserved.
5. Synthetic in-repo tests create a genuinely parseable skinned GLB in memory, build an additional strip mesh, verify new indices and skin types, confirm the input is byte-for-byte unchanged, and test safe refusal of oversized gaps and unsupported conditions. Old Preview regression is replaced by head/neck safety tests. Source Gate also builds the offline HTML and re-runs prior regressions.

## Mandatory limitations — never mislabel as PASS
- A bridge candidate is **extra triangles**, not welded source-vertex topology. It may have a visible normal/material seam, UV discontinuity, wrong visual winding or animation stretching. Geometry could detach in a moving pose. There is no automatic animation-posed verification or collision proof yet.
- There is **no approved heroine GLB tracked in this PR/repository**, so the actual girl's neck, geometry, hair or looks have **not** been repaired. Synthetic GLBs and generated technical fixtures are not the heroine Authority.
- Hair/body penetration, visual front/left/right/back animation coverage, and Windows + Android physical device animation FPS/thermal measurements remain mandatory P0 and **BLOCKED**.
- Checked connected Desktop Commander read-only on 2026-10-20: associated remote Windows device appears Offline, so no real desktop GPU/Nox/Android runtime tests were possible. This status can change; do not generalize to other devices.
- 1080p default and QHD/4K selectable remain; raster-only, RT OFF, no-grid default, optional LOD retained.
- No merge, no Render deploy, no release and no replacement of APK/EXE. Only an exact latest GitHub source Gate success is a source checkpoint.

Next authentic acceptance: use approved heroine 3D mesh source with explicit node/skin tags, generate/import separate working-copy bridge, verify neutral + actual animated poses from all directions, correct failed seams in model authoring, and collect native Windows/Android FPS/p95/resolution/thermals from actual devices.

# AIG FastModel 7.0 — source-derived drawing + bounded numerical silhouette simulation

Date: 2026-10-22. This is an independently testable **source component**, not an approved whole-body 3D animation.

## Integration and entry

- Existing FastModel 6.9.5 `index.html` is preserved; new `reverse-lab.html` is linked from the same header.
- Geometry module: `aig-reverse-geometry-7-0.mjs`; UI: `reverse-lab.mjs`.
- Offline viewer `build.mjs` copies all three source files beside bundled `dist/index.html`; external services, runtime CDN and API keys are not required.
- Original AIG Render site's `formal-web/fastmodel/` has mirrored source geometry, HTML and module, with a link on its existing FastModel page. Source uploaded does not imply Render LIVE.

## Actual algorithms and outputs

1. Load the user-selected local PNG/JPEG/WebP; keep browser-side pixel provenance and SHA-256 if WebCrypto is present. Downsample to a bounded processing canvas to avoid memory spikes.
2. Foreground pixel mask: choose existing alpha channel, or explicitly choose/click a background color and use **boundary-connected RGB flood fill**. Do not silently treat an opaque photograph as an alpha mask; output requires manual segmentation review.
3. Reverse closed pixel boundaries, maintain signed outer/hole contours, remove collinear segments, refuse ambiguous diagonal topology. Source geometry is 2D and measured in **source processing pixels**.
4. Exact 2D vector export with SVG paths, optional original source SHA.
5. Numerical 2D elastic outline simulation: sample closed loop, integrate current/previous positions in fixed time steps, apply local/second-neighbor/longer constraints, fixed top anchor and floor collision; accept touch-dragged nodes. Export actual measured vertex displacement and residual constraint error as JSON.

## Acceptance / prohibited claims

- The pixel vector path is real observed **2D** geometry; source segmentation may be wrong for photo backgrounds. Non-transparent photos must not be assumed cleanly extracted.
- Physics updates live floating-point positions rather than moving a static photo, but **is not** calibrated rubber/skin/tissue, volumetric FEM, true cloth, fluid, or contact-verified 3D anatomy.
- No 3D geometry inferred from unseen body; no true humanoid skeletal animation; no proof of camera-consistent full body, clothing, face, hair or natural facial motion.
- Missing GPU/video evidence or Windows/Android 60 FPS: **NOT_VERIFIED**. Native APK/EXE unchanged.
- No demo or a generated 2D SVG may be declared **TRUE_3D_CHARACTER_PASS**.

## Tests

- `node --test tests/aig-reverse-geometry-7-0.test.mjs`: exact rectangle measurements, alpha vs user-selected background, holes, diagonal contacts rejected, numerical deformation, pinned node, floor, interactive drag and invalid data rejection.
- `npm run build`: package the standalone lab with the existing viewer, maintaining offline source module links.
- `.github/workflows/fastmodel-reverse-7-0.yml`: targeted CI on 7.0 source changes (record actual run ID + conclusion before claiming CI PASS).
- Synthetic test pixels are deliberately synthetic; they are not authentic character model evidence.

## Next increments

- User-reviewed semantic foreground masks for complex photos, multi-region editing and calibrated lens/alignment UI.
- Multi-view priors, 3D SDF actual volume construction with provenance and numeric collision sampling, true tracked rig bone transforms from real observed source.
- GLB/morph/skinning export only when actual geometry and pose changes can be verified, not by relabeling flat frames.
- Android/Windows native performance and output verification plus any necessary true device tests.

## User data safety

All photos remain local to the browser. No automatic upload, model generation service, payments, NC machine communication, or write to pre-existing CAD/NC files is made by this module.

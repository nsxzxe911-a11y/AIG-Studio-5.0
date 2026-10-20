# AIG FastModel 3.7 — Actual heroine photo + GLB chain: source acceptance, NOT visual approval

## Verified source (real user-provided image)

The attached character artwork is present in the ChatGPT conversation as `1000012158.png`, but **its actual bytes are JPEG** (JFIF), with dimensions `1152×1536`, length `384360` bytes and SHA-256 `fbf47f32a844a80e1bb39cb23084527baaf1350427c20d2b49d21fdc453444d6`.

Human visual observation of this source: cherry blossom campus, long brown hair obscuring part of the neck, dark blazer and school uniform, other pupils in the background; the legs are cropped out of the image. No unseen back, legs or neck surfaces can be directly observed. Reconstructed unseen geometry must be labeled inferred.

**The original full-resolution binary reference photo has NOT been uploaded to this GitHub PR or the official Render website.** This PR contains exact-source hash, verified dimensions and an import checker, not a fake placeholder picture. The user already has the photo, and the local web photo picker accepts the original bytes regardless of the misleading .png extension.

## 3.7 additions

- `heroine-authority-3-7.mjs`: hashes real selected image bytes; validates the JPEG magic + *decoded* 1152x1536 image + fixed SHA. Never uses the filename or text labels as proof of image identity.
- `app.mjs` and `index.html`: separate local picture preview with exact-match status; **no automatic paid Meshy request**. Existing explicit Generate button remains authoritative, and local-first GLB import is preserved.
- `evaluateHeroineJob` now checks a genuine pipeline job `sourceSHA256`, `provider=Meshy`, completed model/rig/animation stages, actual generated asset structural audit, and the content SHA-256 of the **downloaded actual GLB bytes**. Only then reports `REAL_GLB_SOURCE_LINKED_VISUAL_REVIEW_REQUIRED`. If any mismatch or manual-imported model, it reports `BLOCKED_NO_VERIFIED_HEROINE_GLB_CHAIN`.
- A downloadable JSON evidence report explicitly includes `confirmedPhotorealHeroine:false`, `headNeckSeamVerified:false`, `skinHairCollisionVerified:false`, `native60fpsVerified:false`, `video1080pPlaybackVerified:false`, and `formalReleaseAllowed:false`.
- New Node tests verify source admission fail-closed, magic bytes + hash, action/source/asset SHA mismatches, no fake visual approval, and real UI callbacks. Existing single-photo pipeline still uses provider AI image-to-3D, rigging, GLB import/export, WAV voice and 1080p recording code, all unchanged except source status and guards.

## Gate separation

1. **SOURCE IMAGE / JPEG / SHA:** complete only when same uploaded image selected in runtime. ChatGPT local file hash and dimensions have independently been inspected.
2. **GENERATED GLB:** requires a paid/authorized real Meshy job and exact SHA-proven asset; no synthetic tetrahedron fixture may pass as the actual heroine.
3. **TRUE VISUAL QA:** requires real GLB four-angle and animated timeline screenshots; human face/hair/outfit reference comparison; mesh neck seam repair; exact hair/neck intersection rather than AABB only; absence of double skin and flicker. Structural SHA is not human visual similarity.
4. **TRUE 1080p MOVIE:** requires real heroine clips (walk, dodge, punch), lip/voice, a playable end-user file with tested AV sync and device-specific real FPS.
5. **RELEASE:** Draft PR remains unmerged; production Render site, APK, EXE untouched. Source CI success is not these acceptance gates.

## Important security / operational behavior

GitHub currently exposes source text/metadata tooling but not a direct local-binary-to-repository upload path; do not rewrite the JPEG or silently send user content to a paid external service. The ChatGPT conversation attachment and optional downloadable handoff ZIP preserve the exact photo bytes and SHA without pretending the official website has received it. Meshy inference uses credits; never submit without an explicit Generate click.

3.7's focus is correct provenance and truthful no-fake acceptance. Actual reconstruction and completed heroine animation remain BLOCKED until real provider inference, GLB asset, pose and device evidence exist.

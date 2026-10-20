# AIG School Hero Phase 11 — Reverse visual identity alignment

**State: SOURCE QA PASS / CINEMATIC VISUAL FAIL / NO PRODUCTION DEPLOYMENT**

Phase 10 can attach the original 33 joint rig to an independent, unrigged GLB without distorting mesh vertices. The next blocker is visual identity. This phase creates a **fail-closed weak-perspective landmark diagnostic**, comparing actual *rejected* Phase10 GLB's 3D manually supplied bones to eight visible keypoints in the approved photo. It does not fabricate new pretty 3D meshes, infer true depth, or treat one photo as an accurate 3D scanner.

## Input identity

- Approved original RGB image `櫻花校園的青春時光.png`: 1672×941, SHA256 `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`.
- Reverse manifest `reverse-authority.v1.json`: contains manually approximately located 2D keypoints from the **full frame**, crop `primary_hero` from user-approved reference.
- Phase10 independently unrigged candidate `imported-unrigged-NOT-APPROVED.glb`: SHA256 `fadffd5f7be01ee749e2d7a05f57ba7fad202bab5ab20cf600ce208b67776bbe`.
- Joint anchors `target-joints-TECHNICAL-ONLY.json`: file with independent target GLB SHA, original image SHA and 33 named **3D** joint points, *not pixel coordinates*.

## Real measured QA: no cheating with source art or swapped models

- 8 approximate semantic correspondences: eyes x2, shoulders x2, neck base, jaw, waist, fringe.
- Robust bounded yaw/pitch/roll weak-perspective fit (only a **diagnostic**, never a physical camera model).
- Mean image-space gap **33.461 px**; max **57.286 px**; ratio mean gap / crown–chin extent **0.12579**. This is a diagnostic point-fitting residual, **NOT facial similarity or film-quality score**.
- Original RGB reference SHA, actual GLB SHA, 3D landmarks SHA and file dimensions rechecked; 10 negative/positive tests PASS.
- `phase11-identity-visual-gap.jpg` displays real approved image landmarks (green circles), projection of the real rejected GLB QA bone points (red squares), and independently rendered actual model on the right. Underlying image is untouched except for the extra annotation drawn for this output.

## Strictly blocked

The Phase10 mannequin still looks very different from the approved cinematic character. Its face sculpt, flowing hair, blouse/blazer/ribbon/skirt, proper natural walking, S23/4K actual WebGL2 view and calibrated camera **are not approved**. The source gate is only a regression tool for *future* approved meshes; it cannot make the doll prettier. There is **no** new high-fidelity female character GLB or 20-minute voiced film in this phase.

Original Render homepage and CNC/Windows/Android artifacts not modified; PR #12 remains Draft; `authority.v1.json` must remain `PREVIEW_ONLY_NOT_PRODUCTION`.

## Next substantive role

The next imported 3D face + hair + tailored garments can have its own verified SHA and annotated 3D joint landmarks; use Phase10 binder (if applicable) to add rig, Phase11 comparator to reject obvious deviations; require separately calibrated front, side and rear visual QA. **Passing this weak-perspective test alone MUST NEVER activate the production 3D button.**

## Running local verification

```bash
python -m unittest discover -s . -p 'test_phase11_projection_gate.py' -v
python phase11_projection_gate.py --reverse reverse-authority.v1.json --reference '櫻花校園的青春時光.png' \
  --joints target-joints-TECHNICAL-ONLY.json --model imported-unrigged-NOT-APPROVED.glb \
  --preview phase10-actual-rebound-glb.png --report phase11-visual-evidence.json \
  --overlay phase11-identity-visual-gap.jpg
```

CI runs **synthetic** input tests and verifies committed report stays **not approved**; it does **not** assert the binary original image was available in GitHub Actions, and cannot claim a live S23/4K visual test.
# AIG School Hero Phase 7 — reverse from user-approved cinematic source

## Why the earlier Phase6 / ghost mannequin line was stopped
Phase6 proves bones/PBR/IK can exist, not that the face matches the user's approved image. Increasing subdivisions won't recover a believable face or unseen back. Freeze Phase6 as motion/rig QA only; **do not promote**.

## Concrete output produced
- Exact original 1672×941 reference SHA-256: `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`.
- Python reusable authoring script `tools/reverse_authority.py`: crop nine original pixel regions (main heroine, face, hair, ribbon, blazer, shirt, skirt, sakura, school), output `reverse-authority.json` with bounding boxes, normalized boxes, 16 approximate visible keypoints, eight source-pixel palette samples, and a visual comparison contact sheet.
- Validation: 4 `unittest` checks for SHA, release block, identity crop coordinates and dark hair sampled from *hair*, not sky. Original image visible only for local generation; the CI is *not* allowed to claim image reconstruction PASS without original bytes.
- Reverse sheet and crops are **2D source references only**. No true mesh or model was produced by this phase. Nothing is published on the main AIG site.

## Reverse engineering / 3D modeling plan (shortest legitimate path)
1. Reuse **approved, hash-locked** real facial region instead of repeatedly guessing skin and identity.
2. Add 3D character neutral view/model when available and render front + side + back. Do not hallucinate unseen rear as source truth. Build true geometry only.
3. Fit facial and silhouette landmarks using reproducible 2D reprojection residual error against first approved angle; add physically coherent face/eyes/hair/cloth mesh and PBR, validate independent non-front views with human approval.
4. Retarget to Phase6's 33-joint animation **after** appearance/identity passes, including bound-mesh and shoe contact testing.
5. S23 and 4K rendered visual authority check; only then can asset approval change, followed by limited integration on the original Render homepage.

## Hard Gate
- Source reverse extraction / preservation: PASS.
- Full 3D character reconstruction matching source: NOT DONE.
- Original image does not show neutral rig pose, true exact depth, back face, full lower legs/feet, clothing back or natural walk; these remain `UNKNOWN`.
- Original AIG Render / CNC / APK / EXE: UNCHANGED.
- This is a separate draft PR and not a deployed site.
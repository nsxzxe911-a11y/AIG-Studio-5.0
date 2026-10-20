# AIG Authority Asset Prune (2026-10-20)

The website is now an information / native release portal, not another CNC runtime.

**User request:** restore AIG-II RGB 10/05 visual authority and later revised authority as the only source, remove irrelevant historic / misleading Web images to prevent wrong-page pasting.

This change DOES NOT invent or substitute any missing approved image. We located **11 PNG original Mobile files** under ChatGPT Library `/AIG II/00_AUTHORITY_CURRENT_APPROVED/MOBILE/` and their SHA-256 in `AIGII_RGB_MASTER_REGISTRY_V3`. These verified Mobile assets were NOT uploaded as identical binary files to GitHub / Render by this change: websiteStatus=MISSING_ASSET. Desktop latest approved SHA/source is not independently verified; 438 20-page batch is REVOKED, fail closed. 10/05 remains an approved visual baseline; no file is promoted as exact 10/05 authority merely from name or look.

Removed 46 Website image binaries: 9 historical image gallery page previews + 32 historical tiny RGB icon files + 3 V84 candidate WebP + 2 old unverified Web HOME JPEG copies, plus 1 V84 manifest. Original Git history is immutable; native repo sources, user Library image originals, native Android/Windows images, and user CAD/CAM/NC drafts were NOT deleted. The two user-supplied CAD / 6AX JPGs remain on the website with role REFERENCE_ONLY; 3 natural theme SVGs remain.

QA: source gate validates 10+10 exact page identity, disallows revoked / fallbacks and missing-file promotion, asserts references exist and image removal; Chromium visual Gate opens the standalone gallery on S23 and 4K sizes, catches broken image links, prevents horizontal scrolling, verifies original dual-project site survives.

Once source and browser Gates pass, merge PR to original formal branch, verify Render LIVE exact commit SHA. Do not trigger a new low-grade Web product version. Until the 10/05 + revised original bytes can be transferred AND checked against SHA, do not report “all images uploaded and applied”.

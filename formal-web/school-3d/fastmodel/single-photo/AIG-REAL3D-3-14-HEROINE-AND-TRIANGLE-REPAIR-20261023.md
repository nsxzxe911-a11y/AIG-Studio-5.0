# Real3D 3.14 — restore missing priorities: heroine appearance + TRUE triangle garment/hair contacts

Date: 2026-10-23 Asia/Taipei. Source work only: Draft PR #44, branch `verify/real3d-unified-appearance-3-5-20261023`.

## User correction and strict order
**The heroine likeness and precise garment/hair collision were NOT completed by Real3D 3.13.** The previously verified 3.6 screenshots are an ugly technical mannequin, not the approved heroine, despite unit and browser tests passing. Do not count increased 19,200 logical job shards or new classmates as substitute deliverables. Stop scope expansion until these two repair gates produce true source-registered evidence.

## Actual approved heroine reference recovered locally (not committed as public binary)
- Reference: user supplied `02_校園制服3D展示板_最新版.png`, 1448×1086, SHA-256 `1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1`.
- Separate scene reference: `櫻花校園的青春時光.png`, 1672×941, SHA-256 `83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910`.
- The approved board includes front/profile/rear/rigging turn-around, multi-angle facial details, long brown hair, dark blazer, white shirt, burgundy plaid bow, pleated navy plaid skirt, dark knee socks, loafers and backpack.
- **Do not treat the board's illustrative written dimensions/poly-count as independent machine measurements of real-world height or existing GLB polygons.**
- The PNG remains LOCAL/private. GitHub contains only SHA provenance, sampled aggregate colours and defined comparison ROIs. Do not publish user original pixels or embed a 2D cutout as a fake 3D person.

## 3.14 developed and connected
1. `aig-heroine-authority-3-14.mjs`: approved sheet SHA, crop regions, source 5×5 numerical palette (skin [243,192,174], hair [73,46,53], blazer [58,52,63], skirt [78,64,84] among others), optional in-memory original PNG and decoded RGBA *cryptographic* check; non-mutating application to real existing semantic 3D vertex colours. This does NOT reconstruct face geometry nor certify visual likeness.
2. Formal Real3D UI now includes an action applying observed reference colours to the actual body, independent uniform and hair meshes. Proof explicitly says facial topology, true braid strands, plaid UV and correct fit are not completed.
3. `aig-triangle-contact-3-14.mjs`: grid broad-phase derived from real POSED source body face triangles and source class labels, nearest finite triangle distance, outward normal and bounded projected skirt/hair vertices after 3.11+3.12 contacts. Original arrays remain unchanged; shortage/overflow isolates module, no scene reset. Does not claim continuous collision or all hair/self collisions clear.
4. `aig-triangle-intersection-audit-3-14.mjs`: reuses EXISTING exact intersection engine from `aig-seam-contact-5-1.mjs` to audit discrete real BODY vs GARMENT / HAIR triangle surface contacts. A clear discrete result cannot certify 3D continuous cloth physics; missing source classes do NOT pass. UI button and proof provide number of exact triangle tests and confirmed collisions.
5. `tests/aig-triangle-contact-3-14.test.mjs`, `tests/aig-heroine-authority-and-triangle-3-14.test.mjs`: true indexed geometry contact, definite crossing, non-intersection, correction budget, unchanged actual source, authentic SHA and false-approval blockers.
6. Chromium phone/desktop real WebGL test updated to require user-source SHA colour proof, actual changed body vertices and exact discrete triangle audit, while still requiring appearance final PASS=false.

## Pending after this code
- **NOT DONE:** source-reconstructed 3D face, eye/nose/mouth topology, actual multi-view constrained hair shape, UV plaid bow/skirt/shirt fabric, naturally weighted outfit fit, approved identity / visual authorisation. Colour-fitting is only a limited **first geometry-visible improvement**.
- **NOT DONE:** continuous collision detection, precise self-collision, force-based hair physics under motion, pose-wide intersection-free test on all real 3D cloth triangles.
- **NOT DONE:** actual user-phone/Windows 60 FPS, formal Render deployment, Android APK, Windows EXE.
- The official multi-view sheet has NO actual GLB binary and source photos do not uniquely recover hidden anatomy. Full likeness cannot be claimed without actual designed/scanned/iteratively fitted 3D geometry.
- 3.12 dedicated Gate run 39945515066 completed/success; 3.13 crowd GitHub tests status should be checked independently. Latest 3.14 source Gate https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39949844263 was queued at checkpoint; no 3.14 PASS claim yet.

## Priority after 3.14
A. Source-registered multiview face/hair/head geometry and matching actual WebGL screenshots front/profile/rear to user board. Mark each likeness gate FAIL until user accepts real rendered output.
B. Repair any confirmed exact hair/skirt interpenetrating triangle pairs across standing, walking, crouch and fighting clips while preserving rig and immutable photo.
C. Measure frame time on real Android / Windows; then and only then merge/deploy to original official Render website, build APK/EXE.

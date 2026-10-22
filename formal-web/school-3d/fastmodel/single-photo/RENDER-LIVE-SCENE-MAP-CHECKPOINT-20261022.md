# FastModel 7.12 AIG original website — live deploy evidence and break-point

## Date and user intent
- 2026-10-22 Asia/Taipei.
- User: "斷線卡了？最後斷線點接回 不是能上傳aig網站 等待排隊？"
- Reconnected to FastModel 7.12 scene-map / GeoJSON, previously committed but not actually published.
- Verified original Render service `srv-db8v565g1s2s738paemg` in workspace `tea-dauad1hsrm7s73bf58kg` on repo `nsxzxe911-a11y/AIG-Studio-5.0`, branch `web/aig-dual-formal-runtime-20261016`. **No Railway or replacement site.**

## Verified action
- Render `autoDeploy:yes` and trigger `commit`, but the deployed SHA stayed stale after multiple newer source commits; all earlier actual deploys had `trigger: api`. Confirmed no newer pending deploy before action.
- Explicitly initiated the existing original Render site's deployment because the automatic trigger demonstrably had not deployed the already-committed branch.
- Render deployment ID: `dep-dbd00iqfngtc73b6tl4g`.
- Exact GitHub site source / deployed commit: `272dceb187151a30845977e86b0fdaeddd8b7a42`.
- Observed Render `build_in_progress` at creation 2026-10-22T12:23:39Z, followed by `status:live`, `finishedAt:2026-10-22T12:23:52.997886Z`.
- Previous live SHA `3f02f20d6b0aa1a671a50c5f9e6d249628db9fac` became deactivated.
- Original website: https://aig-dual-formal-runtime.onrender.com/index.html#dual-projects
- New map page URL expected from published `formal-web` source tree: https://aig-dual-formal-runtime.onrender.com/fastmodel/scene-map-studio.html .
- Verified source matching blob SHAs between repair branch and site branch for: `aig-scene-map-7-12.mjs`, `scene-map-studio.html`, `scene-map-studio.mjs`, `aig-scene-percent-7-12.mjs`.

## Actual test result, distinct from production HTTP readback
- GitHub Actions run: https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/39776235902 .
- Full regression: **Node 357 / 357 PASS; Python 49 / 49 PASS**.
- Real synthetic-fixture Chromium map UI test: `AIG_FASTMODEL_7_12_SOURCE_MAP_GEOJSON_BROWSER_PASS phone 4`, `... desktop 4` (GeoJSON import, map features, percentage, export).
- Dedicated 7.5–7.11 regression jobs succeeded as observed; one independent 7.9 job still in-progress at initial status check; do not claim all jobs green unless independently reconfirmed.
- **External HTTP content readback not verified**: web open said site inaccessible and container DNS unavailable; browser connector not usable without an originating browser context. Render live SHA is authoritative deployment evidence, but direct fetched page and button operation on Render host remain a separate Gate.

## Scope and pending work
- Scene map: source-provenanced GeoJSON import, local relative scenery, buildings/houses/trees/roads/sports facilities/water, user-drawn map, relative percentages; optional source-provided WGS84 coordinates projected approximately to a small local plane. No fabricated real-world map catalog, building height, tree height or exact cadastral/NC coordinates.
- CAD 1:2 / 1:4 / 1:10 drawing view core preserved, but user paused further CAD sizing in favor of scene objects percentages and maps.
- Arbitrary video automatic camera pose and complete faithful 3D human model are **not** completed.
- AutoRig AI controller for run/jump/crouch/stand is in `PENDING-AUTORIG-AI-MOTION.md` and has **not** been implemented.
- Keep original AIG-II/CNC CAD/CAM/SIM/NC core untouched; only forward updates.
- Next step: independently HTTP-load /fastmodel/scene-map-studio.html and the two JS resources with production-site device browsers; retain exact Render SHA and no engineering-shell substitution.

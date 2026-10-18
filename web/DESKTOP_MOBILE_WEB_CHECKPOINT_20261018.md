# AIG-II Formal Web Desktop + Mobile checkpoint — 2026-10-18

## Continuity
- Branch: `web/aig-dual-formal-runtime-20261016`
- Pre-existing branch HEAD before this mobile integration: `d2d3d98f666470a5386bb6e0d2b36b9ef8dfcb7e`
- Current pre-checkpoint HEAD: `23debacaff358e8e87a3ed82fd338b43f2fc4651`
- Forward-only; original approved AIG-II desktop and mobile source files retained.
- V2 generated/rejected imagery was NOT used.

## Implemented on the actual formal site branch
1. `web/index.html`: Auto / Desktop / Mobile control; mobile frame and full-page link.
2. `web/mobile-layout.css`, `web/mobile-layout.js`: narrow CAM-style RGB phone layout; reference images and runtime remain separate.
3. `web/mobile-runtime.html`: ten-page AIG-II Web Runtime snapshot from the prior independently verified work branch. Has HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI. Includes real CAM/NC/canvas callbacks inherited from source; no false pass claim.
4. `web/runtime/page-runtime-router.js`, `ai-page-runtime.js`, `layout-mode.js` plus `web/authority/cam-unified-rgb-v1.css`, `desktop-mobile-layout-v1.css`: dependencies copied at exact blob SHA from the preceding checkpoint.
5. `web/service-worker.js`: distinct cache key `aig-ii-dual-formal-mobile-web-20261018-v4` with all mobile runtime assets, no second SW registration from nested mobile page.
6. `web/tests/dual-view-mobile.test.cjs`: permanent regression source.

## Verified
- JavaScript source parse: all new/existing JS and embedded scripts PASS in syntax checks.
- Simulation of Auto/Desktop/Mobile transitions: PASS; all ten page ids route to `mobile-runtime.html#<page>`.
- 10/10 main-page definitions and `data-glcanvas` present in embedded live runtime.
- Cross-file dependencies: all discovered mobile runtime relative references present in target branch; all cache shell dependencies present.
- Original data image backup review package generated from exactly SHA-matching registered sources: 11 Mobile + 10 Desktop PASS (21/21).
- Mobile image sizes are NOT native 4K. Desktop 438 9/10 native 3840×2160; HOME mismatch. Source-gallery is for review, never Authority auto-promotion.

## Not yet verified / BLOCK
- Live Render deployment and independently captured browser screenshots have NOT been confirmed. Do not claim site LIVE at this commit.
- AIG-II Mobile 4K Authority final Gate remains BLOCK. Web CSS/mobile runtime is not a 4K source image.
- The formal desktop site still uses pre-existing desktop visual source routing; Authority exact SHA per page must be audited before final acceptance.
- Independent Node CI test job/build, Android APK, Windows EXE and CNC safety Gate are not proven by this web edit.

## Next exact steps
1. Verify Render service source branch and its latest deployment after user-chosen workspace authorization, or use existing site deployment's independently verifiable proof.
2. Open `https://aig-dual-formal-runtime.onrender.com/` (host previously used by formal web project) on Desktop/Mobile and verify ten page navigation visually.
3. Test `/mobile-runtime.html#CAM`, `#3AX`, `#6AX`, `#NC`, `#AI` and record screenshots.
4. Link original native-4K Mobile images once approved and with exact SHA; no filename/semantic fallback.

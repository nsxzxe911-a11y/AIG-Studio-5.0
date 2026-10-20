# FastModel 2.2 — RGB color scan display

Incremental from FastModel 2.1 exact verified source commit `3f9f23093732949ab761e29c70f7729d43476c99` on Draft PR #12. This is **only a display-color source change**; do not merge or deploy it to the production AIG site, Android APK or Windows EXE from source CI alone.

## Implemented color system

- **The heroine's actual full-color textured render is preserved**. GLB baseColorTexture/baseColorFactor, vertex colors, hair, skin and garment materials are not recolored or overwritten. The overlay is on a distinct 2D canvas with no source GLB byte mutation.
- Real GLB joint parent edges are drawn as **solid regional colored lines**. The original GLB region metadata determines the role; no inference from skin index, file name, material color or guesswork. Untagged bones remain neutral.
- Source outer open boundary / projected silhouette candidate lines are **faint, dashed**, styled independently from solid bones. These are approximate 2D projections; not actual GPU depth-tested hidden lines or a collision-pass assertion.
- Default `aig-rgb` palette:
  - Head/neck `#FF83C5`, spine `#64E4FF`, arms `#63F4B7`, legs `#B5A0FF`, hair `#FFCE7C`, neutral unknown `#A6BDCF`.
  - General outer contour `rgba(160,202,231,0.37)`; head outline `rgba(255,153,199,0.47)`; hair outline `rgba(255,202,125,0.42)`.
  - Review/amber `#FFB45B`; red `#FF6477` exists solely for *explicitly confirmed* future warnings, never inferred from short distances alone.
- `inspection` palette (higher contrast) and `low-glare` palette (muted cool lines for mobile) are both fully wired, live-recoloring display only.
- UI now has functional `scan-palette` selection, semantic RGB swatches legend, `scan-risk-color` opt-in, and `scan-color-status`. Red is never triggered automatically. Amber is restricted to the *hair role only* when the existing real animation sample inspection returns nonempty potential-overlap frames and the user opted in; head/neck retains its ordinary color unless separately grounded.
- Palette changes re-use the bounded source topology instead of rescanning/reallocating GLB geometry. Overlay continues 2.1 throttled rendering with line caps and wireframe suppression. The actual character surface remains normal/full-color without an additional material tint.
- `scan-colors.mjs`, `scan-overlay.mjs`, `main.mjs` and `build_standalone.py` are connected; dedicated `scan-colors.test.mjs` covers palette output/unknown tags/actual canvas strokeStyle/dash settings/original model unchanged/guarded warnings/real callback and bundle integration. Source workflow checks synthetic standalone HTML and its full embedded JS syntax.

## No fake release claims

- RGB color layer is a technical preview, not an approved heroine GLB or 3D movie frame. Skin tone, hair hue and uniform design depend on the user's approved GLB textures; the source code does not generate them.
- True depth occlusion, head-neck weld, hair collision, hardware Windows/Android GPU/thermal 1080p60 evidence and formal material accuracy remain independently BLOCKED.
- Draft PR #12, no merge, no Render deploy, no APK/EXE release.

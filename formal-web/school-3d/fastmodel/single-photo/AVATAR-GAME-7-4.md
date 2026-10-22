# AIG FastModel 7.4 — local game-style avatar editor, true XYZ facial morph and parameter presets

Date 2026-10-22. Forward-only from FastModel 7.3 verified source. This phase adapts software design to **large online game development workflows**, but is explicitly an **offline authoring prototype**; there is NO multiplayer, matchmaking, authoritative server, persistence database, networking service, avatar trading or game release.

## Layers actually delivered

- **Photo source:** original local RGBA/Alpha remains in the browser; downsample and bounded source mask (7.0), implicit 3D geometry with **estimated** Z (7.1), optional prior 7.2 PBD evidence retained, source-photo material/cosmetics with manually confirmed face ROI (7.3). No "ghost" procedural face substitutes original photo.
- **7.4 Face rig prototype:** `aig-avatar-rig-7-4.mjs` has five animation controls (jawOpen, smile, blinkLeft, blinkRight, browRaise). The controls deform **true XYZ SDF world-space surface**, recalculate ray hits and normals, inverse-map material UV back to original photo. Geometric morph is nonlinear procedural influence anchored to a *user-reviewed* bounding box; this is NOT measured anatomical landmark fitting, production blend shapes, real muscles or human identity reconstruction.
- **Game character presets:** `createAIG74AvatarPreset`, `parseAIG74AvatarPreset` fail closed on unreviewed ROI, source SHA mismatch, invalid channels, colors and JSON size. Presets store only local name, exact image SHA-256, ROI, makeup and expression parameters, with no photo pixels. JSON import/export is manual; no implicit cloud sync or overwrite of original sources.
- **Deterministic preview clips:** `evaluateAIG74Clip('idle'|'blink'|'smile'|'talk',timeSeconds)` returns reproducible expression coefficients; no generated spoken dialogue, inferred phonemes, mocap or battle animation.
- **UI:** `avatar-studio.html` + `avatar-studio.mjs`: responsive game-like RGB editor, photo input and review, appearance makeup, five facial morph sliders, orbit view, clip playback and avatar JSON export/import. Existing 6.9.5/7.0/7.1/7.2/7.3 untouched except additive links and offline bundle copy list.
- **CNC safety:** no CAD/CAM/SIM/NC files, machine controls, G-code or Android/Windows CNC executable altered.

## Acceptance / fail-closed gates

- `SOURCE_FACE_ROI_REVIEW`: browser detector does not count as proof; user confirms source region.
- `GAME_AVATAR_PRESET_DIGEST`: import only with matching original image SHA, verified local JSON schema and strict limits.
- `REAL_3D_EXPRESSION_SURFACE`: morph must change signed 3D surface and ray-traced pixels, with negative cases for no-frame/invalid data, neutral inferred back face (no second ghost face).
- `BROWSER_PHONE_DESKTOP`: use synthetic RGBA fixture; verify manual ROI, true XYZ expression pixel diff, rear neutral, preset round-trip and clip state, screenshot & measured JSON. Synthetic screenshot is NOT approved character likeness.
- `TRUE_ANATOMICAL_HUMAN_FACE`, `REAL_SKIN_MATERIAL`, `SKINNED_FACIAL_BONES`, `MMO_ONLINE_SERVER`, `NATIVE_APK_EXE`, `60_FPS_GPU`: **NOT IMPLEMENTED/NOT VERIFIED**, independently gated. 7.4 browser/source PASS must never imply one of these.
- `RENDER_LIVE`: source copied to original AIG website branch `formal-web/fastmodel/` and linked in source; Render deploy SHA and served HTML/JS must be independently checked.

## Next MMO-style engine stages

1. **7.5 authentic shape / rig:** actual measured source landmarks and calibrated depth priors, verified jaw/eyelid topology, skin deformation and self-contact; compare rendered frames with original source under strict quality gates.
2. Character Asset/Appearance/Animation/Physics modular contracts with versioned, signed local character bundles, adjustable quality tiers and on-device benchmarks; no fragile engineering UI.
3. Only after local character is truthful, introduce authenticated multiuser session/server world, transport sync, asset streaming, server-authoritative actions, anti-cheat, and performance envelope. Never accidentally expose user's private source photo or G-code.

The original user-approved heroine is NOT included in this numeric-synthetic validation; do not label it visually repaired.

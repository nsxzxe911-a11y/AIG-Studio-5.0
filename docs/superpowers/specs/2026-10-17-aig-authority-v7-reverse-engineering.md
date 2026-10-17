# AIG Authority V7 Reverse Engineering Spec

## Product boundary
AIG is the first project and exposes only these production pages: `HOME`, `CAD`, `CAM`, `SIM`, `3AX`, `NC`, `AI`. `4AX`, `5AX`, and `6AX` belong to AIG-II and must not appear in AIG production navigation, AIG page contracts, or AIG Authority manifests.

## Visual authority
Use the approved AIG desktop Authority sources created on 2026-10-17. Main pages and subpages are independent visual assets. Each asset has a stable `Visual ID`, SHA-256, source dimensions, platform, page/subpage role, and approval state. Sources smaller than 3840x2160 are valid visual Authority sources but are `native4K=false`; they must never be upscaled and claimed as native 4K.

## Reverse engineering pipeline
`Authority source -> Region Manifest -> Crop/Nine-Slice Skin -> native control -> Button ID -> Command ID -> Runtime/Core`.

Visual assets are never function primary keys. `Button ID` and `Command ID` are separate stable semantic IDs. Android, Windows, and Web may use different layouts/regions while preserving the same semantic IDs.

## Region rules
Every reversible UI region records: Region ID, Visual ID, source SHA, source dimensions, pixel bounds, normalized bounds, type, optional Nine-Slice, Button ID, Command ID, Message ID, and runtime state policy. Region types are `STATIC`, `BUTTON`, `MESSAGE`, `VALUE`, `ICON`, `VIEWPORT`.

## No-Fake rules
- Message/value text baked into Authority pixels is not Runtime content.
- MESSAGE/VALUE regions use clean frame/skin plus Runtime text/state.
- Buttons are native controls, not transparent hot zones.
- Pressed/Selected/Disabled state must be real Runtime state.
- No engineering shell may replace the production RGB UI.

## Verification stages
1. Authority ingest + SHA/dimension/product-scope gate.
2. Region reverse mapping + pixel crop evidence.
3. Skin/Nine-Slice + no-baked-text gate.
4. Native control + Button ID evidence.
5. Command ID/callback + Runtime state/message evidence.
6. Android/Windows/Web semantic consistency and fresh native render evidence.
7. Full-page Runtime acceptance.

Each completed stage produces a real Runtime/evidence screenshot labeled with platform, page/subpage, commit, stage, and PASS/FAIL. Authority images or mockups alone are not Runtime evidence.

## Version and safety constraints
- No rollback, downgrade, or regression mode.
- Existing proven core behavior is not rewritten solely for skin work.
- Errors/warnings stay module-local and do not reset canvas/project state.
- Native build/render claims require fresh build/runtime evidence.

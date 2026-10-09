# Fourth Runtime CAD Progress — AIG CNC 395-fourth-cad

Date: 2026-10-10
Branch: `feat/aig-cnc-395-fourth-runtime-cad`
Pre-Task-6 HEAD: `d3ea35ebf5d141988cb6761e8145b533bd0c6002`
Verified runtime-code HEAD before evidence refresh: `891b42d9b2a0f2e014c00cf0acda9d6d6c0f578a`
Plan: `docs/superpowers/plans/2026-10-09-fourth-runtime-foundation-cad-implementation.md`
Spec: `docs/superpowers/specs/2026-10-09-aig-fourth-runtime-architecture-design.md`

## Completed

- Added backend-neutral `runtime-contract` and `CadRuntimePort` command/state boundary.
- Wrapped the proven CAD core with `FourthCadRuntimeAdapter`; Renderer does not call legacy UI panels.
- Added RGB Scene Graph with deterministic hit testing, adaptive layout, local messages, and one-key `CAD.TOOL_GROUP` popup.
- AIG RGB textures are direct GPU nodes: LINE, RECT, CIRCLE, HOLE, SELECT, TOOL_GROUP, HOME (`workspace.png`) and CAD (`cad.png`).
- Texture provenance + SHA-256 are verified against `engineering-assets/images`; HOME/CAD navigation no longer uses fallback color blocks.
- Added one real Android GLES3 surface. Functional CAD is not a full-page `cad.png`, Android Button, ImageView, or legacy shell overlay.
- Added a separate fourth-architecture launcher APK with no `CleanMainActivity`, `app-production`, Swing, or AWT parent.
- Nox real runtime verified HOME → CAD → HOME and real CAD commands through touch input.

## Runtime evidence

Nox: Android 12, 320 dpi, physical 1920×1080; runtime reports `OpenGL ES 3.1`.
APK: `product-host-android/build/outputs/apk/debug/product-host-android-debug.apk`
APK size: `1559151` bytes
APK SHA-256: `89f871fad25c362da2ac5f26b3770da7cc2d8988c95699df5dc80e68a68b70cd`
Evidence: `evidence/android-fourth-cad-395`

Fresh evidence for this APK includes `home.png`, `cad.png`, `cad-line.png`, `cad-tool-group.png`, `offline-home.png`, `rotated-cad.png`, `runtime-logcat.txt`, and `rotation-logcat.txt`.

Verified runtime sequence:
`AIG4_GLES|FIRST_FRAME|PASS → HOME_TO_CAD → zero-length LINE REJECTED|LOCAL_MESSAGE → valid LINE REV=1 → SELECT → UNDO REV=2 → REDO REV=3 → SNAP → TOOL_GROUP expanded → OFFSET REV=4 → CAD_TO_HOME`.

Offline-first: Wi-Fi was disabled, the process was relaunched, and `AIG4_GLES|FIRST_FRAME|PASS` still appeared. Nox exposes no cellular phone service, so Wi-Fi is the meaningful external network path on this emulator.

Rotation/state isolation was rerun on this APK: create LINE REV=1 in portrait → switch to landscape with the same process PID → create another LINE REV=2. Renderer resize did not reset authoritative CAD state.

## No-red-lock result

A zero-length LINE generated only `REJECTED|LOCAL_MESSAGE`. The next valid LINE succeeded immediately. The product stayed usable and `CadState` contains no global lock/fail state.

## Remaining after this milestone

This is Fourth Runtime Foundation + CAD vertical slice, not the complete product. CAD standalone still needs remaining stable inventory/persistence and production polish such as ARC UI, layers, autosave/recovery, dimensions, richer Snap presentation, and complete advanced-tool RGB/text presentation. After standalone CAD, continue CAM, 3D SIM, 3AX, 4AX, 5AX, 6AX, NC/G-code, AI/update, Windows D3D11 parity, then Shared Link Graph CONNECT/DISCONNECT.

# Fourth Runtime CAD Progress — AIG CNC 395-fourth-cad

Date: 2026-10-09
Branch: $branch
Pre-Task-6 HEAD: $head
Plan: docs/superpowers/plans/2026-10-09-fourth-runtime-foundation-cad-implementation.md
Spec: docs/superpowers/specs/2026-10-09-aig-fourth-runtime-architecture-design.md

## Completed

- Added backend-neutral
untime-contract and CadRuntimePort command/state boundary.
- Wrapped the existing real CAD core with FourthCadRuntimeAdapter; renderer code does not call legacy UI panels.
- Added RGB Scene Graph with deterministic hit testing, adaptive layout, local messages and one-key CAD.TOOL_GROUP popup.
- Cut approved AIG RGB assets into direct GPU node textures: LINE, RECT, CIRCLE, HOLE, SELECT and TOOL_GROUP; provenance + SHA-256 are verified against source assets.
- Added one real Android GLES3 surface. Functional CAD is not a full-page cad.png, Android Button or ImageView overlay.
- Added separate fourth-architecture launcher APK with no CleanMainActivity, app-production or Swing/AWT parent.
- Nox real runtime verified HOME -> CAD -> HOME and real CAD commands through touch input.

## Runtime evidence

Nox: Android 12, 320 dpi, physical 1920x1080 with portrait/landscape rotation; runtime reported OpenGL ES 3.1.
APK: $apk
APK size: $apkSize bytes
APK SHA-256: $apkHash
Evidence: $evidenceRel

Evidence includes home.png, cad.png, cad-line.png, cad-tool-group.png, offline-home.png,
otated-cad.png,
untime-logcat.txt and
otation-logcat.txt where present.

Verified runtime sequence:
AIG4_GLES|FIRST_FRAME|PASS -> HOME_TO_CAD -> zero-length LINE rejected locally -> valid LINE accepted REV=1 -> SELECT -> UNDO REV=2 -> REDO REV=3 -> SNAP -> TOOL_GROUP expanded -> OFFSET accepted REV=4 -> CAD_TO_HOME.

Offline-first was verified with Nox Wi-Fi disabled and a fresh process still reaching AIG4_GLES|FIRST_FRAME|PASS. Nox exposes no cellular phone service, so Wi-Fi is the meaningful external network path on this emulator.

Rotation/state isolation was verified by locking portrait, creating LINE REV=1, switching to landscape with the same process PID, then creating another LINE REV=2. Renderer/surface resize did not reset authoritative CAD state.

## No-red-lock result

A zero-length LINE generated REJECTED|LOCAL_MESSAGE only. The next valid LINE succeeded immediately and advanced revision. The page/product remained operational; there is no global red lock state in CadState.

## Remaining after this milestone

This is the Foundation + CAD vertical slice, not the full product. Next CAD standalone work still includes the remaining stable inventory/persistence and production polish such as ARC, layer/persistence/autosave/recovery/dimension workflows, richer Snap presentation, complete RGB textures/text for advanced popup tools, and additional CAD interaction refinement. After standalone CAD is complete, proceed with separate plans for CAM, 3D SIM, 3AX, 4AX, 5AX, 6AX, NC/G-code, AI/update, Windows D3D11 parity, and only then cross-module CONNECT/DISCONNECT.

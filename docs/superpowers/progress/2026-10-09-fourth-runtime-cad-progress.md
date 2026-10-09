# Fourth Runtime CAD Progress - AIG CNC 395-fourth-cad

Date: 2026-10-10
Branch: feat/aig-cnc-395-fourth-runtime-cad
Verified runtime-code HEAD: 7940487adc97ae6fa8e9b70d29f1476e140d9749
Task 6 plan: docs/superpowers/plans/2026-10-10-fourth-runtime-cad-standalone-completion.md
Architecture spec: docs/superpowers/specs/2026-10-09-aig-fourth-runtime-architecture-design.md

## Completed fourth-runtime CAD standalone

- Backend-neutral runtime-contract and authoritative CAD runtime adapter are active; Renderer does not own machining geometry or Snap calculations.
- Functional Android product UI is one GLES 3.x surface and GPU Scene Graph. No Android Button/TextView/ImageView composition, CleanMainActivity, Engineering Shell, NOUI host, Swing, or AWT is the official runtime path.
- CAD supports the preserved base inventory plus Task 1-5 completion: ARC, layer visibility, driven dimensions, deterministic autosave/recovery after a real first frame, and authoritative 7-mode Snap preview/HUD.
- Local invalid CAD input remains a local message only; the next valid command is accepted without a global red lock.
- RGB controls are GPU nodes with hit testing/callback/state; CAD geometry and Snap markers are rendered from authoritative runtime state rather than a full-page screenshot substrate.

## Task 6 current-APK Nox acceptance

Package: com.aigstudio.production.fourth395
APK: product-host-android/build/outputs/apk/debug/product-host-android-debug.apk
APK SHA-256: 69b1c44398b19f0b25e46b0c680edf4fe593815d85220728230d4dc456392ee9
Evidence: evidence/android-fourth-cad-395
ADB serial: 127.0.0.1:62026 (rediscovered from the current Nox ADB device list and matched to the evidence manifest)
Nox profile: SM-S9280
Android API: 32
Runtime GLES: OpenGL ES 3.1

Fresh evidence contains HOME/CAD, LINE continuation, three-tap ARC, layer hide/show, driven dimension, Snap preview, recovered CAD, offline HOME, rotated CAD, runtime/offline/rotation logcat, rotation state, and a SHA-bound standalone manifest.

Verified behavior:
- zero-length LINE -> REJECTED|LOCAL_MESSAGE, followed by a valid LINE -> ACCEPTED;
- ARC three-tap sequence advances authoritative CAD revision;
- CENTERLINE hide/show does not delete geometry or advance geometry revision;
- driven dimension value 25 advances revision;
- Snap mode/preview is produced by the existing authoritative Snap engine and does not mutate CAD revision;
- offline relaunch logs real AIG4_GLES|FIRST_FRAME|PASS before AIG4_CAD|RECOVERY|RESTORED;
- rotation keeps the same process and authoritative state: PID 9687 -> 9687, orientation 1 -> 0 -> 1, revision 5 -> 6.

## Final Task 6 gates

PASS: runtime-contract:test, production-runtime:test, legacy CAD regressions (base/advanced/corner/snap/topology), renderer-android:testDebugUnitTest, product-host-android:testDebugUnitTest, verify_fourth_gles_cad.ps1, verify_fourth_host_boundary.ps1, verify_fourth_cad_standalone.ps1, and git diff --check.

## Remaining scope

CAD Standalone for the fourth architecture is complete for this plan. CAM is intentionally not folded into this milestone and must start as a separate next plan. Remaining product migration after CAD is CAM, 3D SIM, 3AX/4AX/5AX/6AX, NC/G-code, AI/update/sync integration, Windows D3D11 parity, and later cross-module CONNECT/DISCONNECT integration. Optional RGB art polish for advanced controls may continue without moving machining logic back into the renderer.
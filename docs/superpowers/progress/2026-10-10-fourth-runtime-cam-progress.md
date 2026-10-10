# Fourth Runtime CAM Standalone Progress — 2026-10-10

Status: COMPLETE / VERIFIED ON CURRENT NOX APK

## Scope

CAM Standalone is complete for the fourth runtime architecture. This milestone does not merge CAD live-link, NC Editor, or SIM into CAM. CAD remains an immutable source snapshot; CAM Strategy, Active Toolpath, Candidate Toolpath, persistence, and GPU presentation are isolated owners.

## Exact Runtime / APK Binding

- Project: AIG CNC
- Branch: `feat/aig-cnc-396-fourth-runtime-cam`
- Runtime source HEAD used to build accepted APK: `7c64359701d1fecf706c2fdf0c8b82a4ffc6ded3`
- APK SHA-256: `e413dec3baf5a42f45255cab9a90d576b4066f57eecc551cb8d4c61a32cd8dd6`
- Package: `com.aigstudio.production.fourth395`
- Version: `396-fourth-cam` (`versionCode=396001`)
- Evidence: `evidence/android-fourth-cam-396`
- ADB serial: `127.0.0.1:62026`
- Model: `SM-S9280`
- Android API: `32`
- GLES: `OpenGL ES 3.1`

The standalone verifier recomputes the current APK SHA and rejects evidence when it does not match the manifest. Product source was not changed after evidence capture.

## Verified Behavior

- HOME -> CAM routes on the single real GLES surface; no Android widget overlay or Engineering Shell is used.
- MANUAL CAM works without CAD.
- Toolpath nodes preserve complete `X/Y/Z/A/B/C`; non-zero A/B/C were edited on both G0 and G1 nodes.
- Safe-Z avoidance inserts lift -> traverse -> landing while preserving A/B/C.
- Fixture / clamp / keep-out state is represented as CAM zone data.
- CAM -> TOOLPATH DISCONNECTED protects the current Active working copy from later strategy regeneration.
- Reconnect / Generate creates Candidate only. Candidate preview, keep, adopt, save-as-new, and freeze behavior are separately evidenced.
- Frozen Active rejects only the local operation; a later valid CAM command continues successfully. There is no whole-page red lock.
- Active and Candidate are rendered as distinct GPU paths; CAM warning/alarm is local CAM HUD presentation only.
- CAM checkpoint persistence round-trips strategy, link state, Active, Candidate, saved candidates, zones, XYZABC, freeze, revisions/digests, and save history.
- Recovery is gated until the real GLES first-frame signal. Online and offline relaunch restore the CAM checkpoint.
- Rotation evidence records orientation `1 -> 0 -> 1`, unchanged authoritative Active revision/digest, and stable process identity for the accepted scenario.
- `rotation-logcat.txt` is required to be non-empty by the verifier; the earlier existence-only gap was closed before final acceptance.
- PHOTO / AI_CAMERA calibrated-source ingestion is truthful XY-only input. It feeds the existing CAM core to generate Candidate and does not mutate Active or inject Z/A/B/C. No fake camera/AI recognition UI was added.

## Final Gates

- `:runtime-contract:test` PASS
- `:production-runtime:test` PASS
- `fourthCamAxisParityRegression` PASS
- `fourthCamRuntimeAdapterRegression` PASS
- `fourthCamManualEditRegression` PASS
- `camCheckpointRegression` PASS
- `camSourceIsolationRegression` PASS
- `cleanCamRegression` PASS
- Complete existing CAD regression suite PASS
- `:renderer-android:testDebugUnitTest` PASS
- `:product-host-android:testDebugUnitTest` PASS
- `FOURTH_GLES_CAD_STATIC_PASS`
- `FOURTH_HOST_BOUNDARY_PASS`
- `FOURTH_CAM_STANDALONE_PASS`
- `git diff --check` PASS
- Final Gradle run: 65 actionable tasks, BUILD SUCCESSFUL
- Final marker: `CNC_TASK7_FINAL_GATE_PASS`

## Next Milestone

CAM Standalone is complete. The next independent implementation plan is **NC / G-code Editor Standalone**, followed by 3D SIM and then 3AX / 4AX / 5AX / 6AX presentation. Cross-module Shared Link Graph CONNECT / DISCONNECT remains last.
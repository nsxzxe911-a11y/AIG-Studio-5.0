# Fourth Runtime NC Standalone Progress — AIG CNC

Date: 2026-10-10
Project: AIG CNC
Branch: feat/aig-cnc-397-fourth-runtime-nc
Runtime evidence commit baseline: b8857d9ab5f13f2201d3f27aa7bd9bdf0997ed6c
APK: product-host-android/build/outputs/apk/debug/product-host-android-debug.apk
APK SHA-256: e81530b898d6dd13a1ee27c7db192eb754a6fd1a090063c0a4339d664e9a46a8
Package: com.aigstudio.production.fourth395
Version: 397-fourth-nc / 397001
Device: Nox 127.0.0.1:62026, SM-S9280, API 32, OpenGL ES 3.1

## Task 7 result

- Exact-SHA standalone verifier: FOURTH_NC_STANDALONE_PASS|AIG_CNC|SHA256=e81530b898d6dd13a1ee27c7db192eb754a6fd1a090063c0a4339d664e9a46a8
- HOME -> NC and GLES first-frame markers are present in exact APK evidence.
- Direct G-code input preserves G90/G54/G43/H/S/F and non-zero X/Y/Z/A/B/C into MotionProgram evidence.
- G999 local diagnostic is corrected through the NC editor without global Runtime failure.
- Candidate preview / Keep / Save / explicit Adopt, Freeze rejection, Block Skip, offline recovery and rotation continuity are evidenced.
- Rotation preserves process, Working Copy revision/digest and Candidate; rotation log is non-empty.
- No Engineering Shell / AIG-CLEAN / NOUI / java.awt / javax.swing marker is allowed in Fourth Runtime Android source.

## Current-source regression

Latest source was verified with JVM, Android unit, CAD, CAM, SIM, Axis and NC regressions. Result: BUILD SUCCESSFUL, 74 actionable tasks. Relevant markers include CLEAN_CAD_* PASS, CLEAN_CAM_RUNTIME_PASS, FOURTH_CAM_* PASS, CLEAN_SIM_RUNTIME_PASS, CLEAN_AXIS_RUNTIME_PASS, CLEAN_NC_RUNTIME_PASS, FOURTH_NC_CONTRACT_PASS, FOURTH_NC_RUNTIME_PASS, FOURTH_NC_CANDIDATE_PASS and FOURTH_NC_CHECKPOINT_PASS.

Static Android boundaries also pass: FOURTH_GLES_CAD_STATIC_PASS and FOURTH_HOST_BOUNDARY_PASS.

Historical CAD/CAM standalone screenshot verifiers intentionally remain bound to their earlier milestone APK SHA values. They reject the newer NC APK by design; their evidence was not rewritten. Current CAD/CAM behavior is instead protected here by the fresh source-level regression markers above.

## Verification policy

NC 397 evidence is immutable for this milestone once committed. Future AXIS3/4/5/6 and visual work must not rewrite this evidence or weaken the exact APK SHA binding.
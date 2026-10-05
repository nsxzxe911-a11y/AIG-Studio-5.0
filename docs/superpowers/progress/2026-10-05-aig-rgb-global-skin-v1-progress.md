# SDD ledger — plan: docs/superpowers/plans/2026-10-05-aig-rgb-global-skin-v1-implementation.md

Execution: Native
Spec: docs/superpowers/specs/2026-10-05-aig-rgb-global-skin-v1-design.md

Pre-flight interfaces:
- Task 1 -> Tasks 2/3: `AigRgbGlobalSkinV1`, surface/role/state enums. No conflict.
- Task 4 -> Task 5: mirror contract under `aigii`. No conflict.
- Tasks 1/4 -> Task 6: 22 surface IDs + palette + hard-lock parity. No conflict.

Ruling: Kotlin enum identifiers cannot begin with digits. Internal enum identifiers are `AX3/AX4/AX5/AX6`; public `id` values remain exactly `3AX/4AX/5AX/6AX`. No UI or contract text changes.
Ruling: the authorized Windows workspace is currently offline. Exact Kotlin source tests are run with local `kotlinc`; Gradle/Android/Windows compile and real launch evidence stay `PENDING_DEVICE` and are never reported as PASS without the device.
Ruling: do not rewrite large `MainActivity`/`DesktopApp` or monolithic shared files through blind full-file replacement while the PC is offline. Create focused skin/adapter files first; perform minimal bridge edits when the workspace is online. This reduces accidental CNC-core damage.
Ruling: Morning Approved RGB Asset Pack has priority. Android uses approved mobile art only; Windows uses approved desktop art only. If the approved binary is not yet present in repo, record `APPROVED_ASSET_PENDING_INGEST` and use procedural RGB Glass fallback; never fake ingestion.

Task 1 Studio shared semantic skin contract:
- RED observed: unresolved `AigRgbGlobalSkinV1` under `kotlinc`.
- GREEN observed: `AIG_RGB_GLOBAL_SKIN_PASS|22_SURFACES|BLACK_020407|PANEL_07111B|RED_STATUS_ONLY`.
- Focused Gradle task `rgbGlobalSkinRegression` is registered.
- Gradle execution: PENDING_DEVICE.

Task 2 Studio Android skin adapter:
- RED observed: static gate required missing `aig_rgb_global_v1` palette / Android adapter.
- `StudioThemePackRuntime` now contains `aig_rgb_global_v1` and defaults to it.
- `AigRgbAndroidSkinAdapter` resolves surface accent/state/art status without click or version-control callbacks.
- Morning asset absence returns `APPROVED_ASSET_PENDING_INGEST|...|PROCEDURAL_RGB_GLASS`.
- Android Gradle compile: PENDING_DEVICE.

Task 3 Studio Windows skin adapter:
- RED observed: static gate required missing Desktop adapter.
- `AigRgbDesktopSkinAdapter` exists with java.awt colors and no Android geometry/callback dependencies.
- Existing Desktop chrome already uses the same black/RGB semantic palette through `RenderColorCompatibility`; explicit large-file semantic bridge remains PENDING_DEVICE surgical edit.
- Windows Gradle compile: PENDING_DEVICE.

Task 6 dual parity / maintenance:
- `AGENTS.md` now points Global Skin issues to shared contract + platform adapters + focused gate.
- AIG-II dual-project verifier confirms 22-surface/palette/alias/hard-lock parity and reports drift as `STATUS_ONLY|NO_ROLLBACK`.
- Button regrouping / one-button-multi-function / project-name changes remain deferred next phase.

Current evidence classes:
- SOURCE/STATIC: GREEN for shared contract, Android adapter, Desktop adapter and dual parity.
- COMPILE: PENDING_DEVICE.
- ACTUAL RUNTIME LAUNCH/SCREENSHOT: PENDING_DEVICE.
- MORNING APPROVED RGB BINARY INGEST: PENDING_DEVICE unless each platform-specific file is actually present and SHA-verified.

Next: when DESKTOP-6KOFHUK reconnects, pull this feature branch, perform minimal DesktopApp bridge, run focused Gradle tasks, ingest platform-specific approved morning assets if present, and launch Android/Windows representative surfaces. Do not touch button regrouping or project naming in this phase.

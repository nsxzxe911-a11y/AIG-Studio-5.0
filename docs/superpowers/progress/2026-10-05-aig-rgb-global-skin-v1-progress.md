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
- Static gate observed locally: `AIG_RGB_GLOBAL_SKIN_STATIC_PASS|22_SURFACES|NO_VERSION_CALLBACK|MORNING_ASSET_PRIORITY|MOBILE_WINDOWS_SPLIT`.
- Gradle verification: PENDING_DEVICE.

Next: Studio adapters + AIG-II mirror contract/adapters. Button regrouping and project-name changes remain deferred.

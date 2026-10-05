# SDD ledger — plan: docs/superpowers/plans/2026-10-05-aig-rgb-global-skin-v1-implementation.md

Execution: Native
Spec: docs/superpowers/specs/2026-10-05-aig-rgb-global-skin-v1-design.md

Pre-flight interfaces:
- Task 1 -> Tasks 2/3: `AigRgbGlobalSkinV1`, surface/role/state enums. No conflict.
- Task 4 -> Task 5: mirror contract under `aigii`. No conflict.
- Tasks 1/4 -> Task 6: 22 surface IDs + palette + hard-lock parity. No conflict.

Ruling: Kotlin enum identifiers cannot begin with digits. Internal enum identifiers are `AX3/AX4/AX5/AX6`; public `id` values remain exactly `3AX/4AX/5AX/6AX`. No UI or contract text changes.
Ruling: the authorized Windows workspace is currently offline. Gradle/Android/Windows compile and real launch evidence stay `PENDING_DEVICE` and are never reported as PASS without the device.
Ruling: do not rewrite large `MainActivity`/`DesktopApp` or monolithic shared files through blind full-file replacement while the PC is offline. Create focused skin/adapter files first; perform minimal bridge edits when the workspace is online. This reduces accidental CNC-core damage.
Ruling: Morning Approved RGB Asset Pack has priority. Android uses approved mobile art only; Windows uses approved desktop art only. If the approved binary is not yet present in repo, record `APPROVED_ASSET_PENDING_INGEST` and use procedural RGB Glass fallback; never fake ingestion.
Ruling: 4AX/5AX/6AX machine-model geometry and visual model assets are `DEFERRED_MODEL_MUTABLE` for this Global Skin pass. Their formal surfaces remain present and skinned. Future releases may add/replace horizontal/vertical models, supports, A/B/C mechanisms, 360-degree rotation and workpiece flip without rollback or freezing the current UI skin.
Ruling: `AigRgbGlobalSkinV1.MULTI_AXIS_MODEL_MUTABLE=true` and `MODEL_BINDING_POLICY="EXTERNAL_TO_SKIN"` are now focused-gate requirements. The skin may reference 4ax/5ax/6ax page art IDs, but it must never own or freeze machine-model geometry.
Ruling: a local isolated-container attempt to download branch source for fresh verifier execution was blocked by DNS (`INFRA_BLOCKED`). This is not a product failure and must not trigger rollback/regression.

Task 1 Studio shared semantic skin contract:
- RED observed: unresolved `AigRgbGlobalSkinV1` under `kotlinc`.
- GREEN observed: `AIG_RGB_GLOBAL_SKIN_PASS|22_SURFACES|BLACK_020407|PANEL_07111B|RED_STATUS_ONLY`.
- Focused Gradle task `rgbGlobalSkinRegression` is registered.
- Contract now explicitly preserves mutable multi-axis models outside the skin.
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
- `AigRgbDesktopSkinRuntime.install()` now installs black/RGB Swing defaults before the production `DesktopAppKt` is created; `DesktopBootstrap` invokes it without importing mobile geometry.
- Existing self-painted Desktop chrome/GlowButton remains authoritative for its richer RGB Glass effects.
- Windows Gradle compile: PENDING_DEVICE.

Task 6 dual parity / maintenance:
- `AGENTS.md` now points Global Skin issues to shared contract + platform adapters + focused gate.
- AIG-II dual-project verifier checks 22-surface/palette/alias/hard-lock parity and reports drift as `STATUS_ONLY|NO_ROLLBACK`.
- Dual parity now also requires `MULTI_AXIS_MODEL_MUTABLE=true` and `MODEL_BINDING_POLICY="EXTERNAL_TO_SKIN"`.
- Button regrouping / one-button-multi-function / project-name changes remain deferred next phase.
- 4AX/5AX/6AX model redesign is deferred and remains mutable; only their UI surfaces participate in this skin pass.

Morning Approved RGB index:
- `docs/assets/2026-10-05-morning-approved-rgb-index.json` records exact source SHA/dimensions and intended platform/surface mapping.
- Android HOME source: `aig_ii_cnc_智慧製造儀表板.png` SHA256 `eb24590daed56d303489976474fd9e06a02057f8d219437575c2c4a46e5fae74`, prepared 720x1280 JPEG SHA256 `93cc3f46b81588cf85f7be12f6d2513352d44cb67c084cad6138d452056a4b83`.
- Windows HOME source: `aig_ii_cnc_智慧加工控制台.png` SHA256 `5953c8eefd4331069d121946bd52e2c27af176f96b805ece0845ab788b06a8e2`, prepared 1280x720 JPEG SHA256 `e61a0c7a65a1509bf74eb17398d95bb9261796080ff755b1fd3ae1e1f453595b`.
- NC and LINK mobile references are indexed separately; no 4AX/5AX/6AX model asset is promoted by this pass.

Current evidence classes:
- SOURCE/STATIC: contract/adapters/Desktop bootstrap/parity structure is present; GitHub read-back confirms mutable-model tokens in both contracts.
- FRESH LOCAL VERIFIER EXECUTION AFTER MUTABLE-MODEL CHANGE: INFRA_BLOCKED by container DNS; not product RED.
- COMPILE: PENDING_DEVICE.
- ACTUAL RUNTIME LAUNCH/SCREENSHOT: PENDING_DEVICE.
- MORNING APPROVED RGB BINARY INGEST: `APPROVED_ASSET_PENDING_INGEST`; exact hashes are indexed, but binary repo upload remains pending.

Next: continue Global Skin V1 without changing 4AX/5AX/6AX models. When DESKTOP-6KOFHUK reconnects, pull this feature branch, run focused Gradle/static tasks, ingest the indexed SHA-verified mobile/Windows Morning Approved RGB binaries, and launch Android/Windows representative surfaces. Do not touch button regrouping, project naming, or multi-axis model redesign in this phase.

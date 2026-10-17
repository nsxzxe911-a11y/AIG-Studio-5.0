# AIG Dual-Project Foundation Recovery Backlog

Status: **PENDING_EXECUTION**
Date: 2026-10-17
Studio branch: `architecture/page-autonomy-ai-orchestrator-after-588`
AIG-II integration branch: `feature/dual-project-auto-finish-20261017`
Trusted release evidence baseline: Builder #588 / Studio SHA `3bdeed6cb4a504a65b23ba9ad355ba34d2af0e9b`

## Rules

- Inventory only. Do not merge to `main` from this document.
- Do not bump version from inventory work alone.
- Do not call any recovered module a release PASS until Android + Windows + Web entry wiring and the applicable dual-project Gate are verified.
- Forward-only. Do not replace a newer implementation with an older historical implementation.
- Recover existing mature foundations before reimplementing.
- Historical shells, plans, demo-only code and obsolete dependencies are not restored blindly.
- Runtime failures remain page-local; no recovery may reset unrelated CAD/CAM/SIM/NC state.

## Classification

- `ALREADY_IN_RUNTIME`: current formal runtime already uses the capability.
- `FOUND_PENDING_INTEGRATION`: mature implementation exists but is not fully wired into the current formal runtime.
- `GATE_ONLY`: belongs in CI/release verification, not the runtime application.
- `SUPERSEDED`: historical implementation has been replaced by a better current implementation; do not restore it.
- `DOC_ONLY`: design/spec only; not implementation evidence.
- `AUTHORITY_SOURCE`: visual/reference evidence, not runtime logic by itself.
- `AUDIT_BEFORE_RECOVERY`: historical dependency/capability exists, but current implementation may already supersede it.
- `SPEC_GAP`: required capability has no verified historical implementation to recover.

## P0 — Runtime architecture already built, still not fully in the formal entry path

| Foundation | Status | Evidence / source | Integration target | Do-not-regress |
|---|---|---|---|---|
| PageRuntime per department | FOUND_PENDING_INTEGRATION | Studio feature: `PageRuntimeContract.kt`, `CadPageRuntime.kt`, `CamPageRuntime.kt`, `SimPageRuntime.kt`, `AxisPageRuntime.kt`, `NcPageRuntime.kt`, `HomePageRuntime.kt`, `AiPageRuntime.kt` | Android `MainActivity`, Windows `DesktopApp`, Web runtime | Each page remains autonomous when disconnected |
| Typed Page/Subpage/Button command ownership | FOUND_PENDING_INTEGRATION | `PageCommandCatalog.kt`, ten page button manifests, 122 page buttons | Replace legacy direct callbacks | No Toast-only or display-only callbacks |
| Android PageRuntimeRouter | FOUND_PENDING_INTEGRATION | `app/.../PageRuntimeRouter.kt` | MainActivity navigation + page button dispatch | UI must not duplicate domain logic |
| Windows PageRuntimeRouter | FOUND_PENDING_INTEGRATION | `desktop/.../PageRuntimeRouter.kt` | DesktopApp navigation + page button dispatch | Same Page/Button IDs as Android |
| Web PageRuntimeRouter | FOUND_PENDING_INTEGRATION | `web/runtime/page-runtime-router.js` | Load and use from formal web runtime | Ten-page inventory includes AI |
| Typed CONNECT bridge | FOUND_PENDING_INTEGRATION | `RuntimeBridgeContract.kt`, `RuntimeBridgeCodecs.kt`, `RuntimeLinks.kt` | CAD→CAM→SIM→NC→MACHINE | CONNECT transports data only; disconnected pages stay usable |
| Machining AI Orchestrator | FOUND_PENDING_INTEGRATION | `MachiningOrchestrator.kt`, `AiPageRuntime.kt` | Formal AI page | AI cannot mutate domain truth or bypass SIM/NC safety |

## P0 — Runtime hot repair / no-full-redownload repair path

| Foundation | Status | Evidence / source | Integration target | Do-not-regress |
|---|---|---|---|---|
| Changed-package rolling update policy | FOUND_PENDING_INTEGRATION | Studio `RollingUpdatePolicy.kt` | Runtime repair coordinator | Changed packages only; no full reinstall for UI-only repair |
| Verified Working Copy + SHA + atomic promote | FOUND_PENDING_INTEGRATION | Studio `VerifiedWorkingCopy` | Android/Windows/Web repair staging | Failure retains stable package; no in-place overwrite |
| ThemePack hot swap | FOUND_PENDING_INTEGRATION | Studio `ThemePackHotSwapContract` / `AiLayoutComposer.kt` | Page visual repair | No engineering-shell fallback; no CNC-core mutation |
| AIG Web secure update transport | FOUND_PENDING_INTEGRATION | AIG-II `feature/aig-dual-ai-web-update-20261015`, `SecureServices.kt` | Feed repair manifest/artifacts to Studio policy | HTTPS/digest/signature/version validation, offline fast-fail |
| Dual-project update workflow dispatch/verification | GATE_ONLY | AIG-II web-update workflow history | AIG-II Gate | Do not place CI trigger logic in runtime |
| Page-level AI repair routing | FOUND_PENDING_INTEGRATION | Existing Page ID/Button ID/Message + hot-update foundations | `Page ID + Button ID + Message ID + Asset ID -> repair package -> Working Copy -> promote -> page refresh` | Kotlin/native/CNC safety changes still require binary release |

## P0 — 3AX/4AX/5AX/6AX cockpit foundations found outside current reduced contract

| Foundation | Status | Evidence / source | Integration target | Do-not-regress |
|---|---|---|---|---|
| Full Axis cockpit controls | FOUND_PENDING_INTEGRATION | AIG-II `feat/cam-sim-ui-controls-20261014` historical `AxisCockpitSkinContract.kt` | Current Axis page runtime/UI | Preserve large machining viewport |
| Playback: PLAY/PAUSE/STOP/STEP+/STEP-/REWIND/RESTART | FOUND_PENDING_INTEGRATION | Same historical contract | 3AX–6AX department manifests/runtime | No fake animation |
| Display G0/G1/G2/G3 | FOUND_PENDING_INTEGRATION | Same historical contract | Axis display controls | Visibility only; must not change path data |
| Visual toggles workpiece/fixture/tool/toolpath/material removal | FOUND_PENDING_INTEGRATION | Same historical contract | Axis/SIM views | Material removal remains true simulation |
| Speed 25/50/75/100/150/200% | FOUND_PENDING_INTEGRATION | Same historical contract | Playback controller | Speed changes presentation, not geometry |
| Solid/translucent/wireframe modes | FOUND_PENDING_INTEGRATION | Same historical contract | 3D renderer presentation | Default remains formal true 3D |
| Web axis Runtime auto-bind | FOUND_PENDING_INTEGRATION | AIG-II `feature/aig-visual-runtime-editor-20261016`, `web/authority-compare/axis-scene-autobind-v3.js` | Formal Web 3AX–6AX stages | Reuse current axis state; avoid observer feedback loop |
| 6AX tool-direction vector/HUD | FOUND_PENDING_INTEGRATION | AIG-II main `shared/aigii/SixAxisToolDirection.kt` | Current 6AX Runtime | Z stays linear; A/B determine tool tilt; C remains rotary HUD axis |
| 6AX tool-axis follow camera | FOUND_PENDING_INTEGRATION | `SixAxisToolDirectionContract.cameraAnglesAlongTool()` + historical `AxisCockpitSkinInstaller.kt` | 6AX view controls | Camera follows tool direction only; never mutates machining coordinates |
| 6AX tool arrow/contact/previous-pose visual evidence | FOUND_PENDING_INTEGRATION | `SixAxisToolDirectionContract` flags | 6AX renderer/HUD | Visual evidence only, external to machining truth |

## P1 — CAD / PHOTO / file workflow foundations

| Foundation | Status | Evidence / source | Integration target | Do-not-regress |
|---|---|---|---|---|
| Mobile EXIF normalization | FOUND_PENDING_INTEGRATION | AIG-II main `MobileImaging.kt` | Current `CAD.PHOTO` pipeline | Do not reset CAD canvas on image error |
| Photo capture recovery | FOUND_PENDING_INTEGRATION | `MobileImaging.kt` | Android PHOTO workflow | Offline/local first |
| Photo-to-CAD recognition | FOUND_PENDING_INTEGRATION | AIG-II main `PhotoCadRecognizer.kt` | Feed existing `CAD.PHOTO.ALIGN/SCALE` and CAD geometry | mm calibration required before trace |
| PHOTO ALIGN/SCALE page state | ALREADY_IN_RUNTIME | Current `CadPageRuntime.kt` | Keep current implementation | Recover ingest/recognizer around it; do not replace it |
| DXF import/export codec | FOUND_PENDING_INTEGRATION | AIG-II main `shared/aigii/CadAdvancedTools.kt` / `CadDxfCodec` | Current `CAD.FILE.IMPORT/EXPORT` | Connect codec to PageRuntime; do not rewrite from scratch |
| AutoSave scheduling | FOUND_PENDING_INTEGRATION | AIG-II main `Core.kt` / `AutoSave` | Current ProjectRepository | Use modern atomic repository storage |
| CrashRecovery checkpoint/restore orchestration | FOUND_PENDING_INTEGRATION | AIG-II main `Core.kt` / `CrashRecovery` | Current ProjectRepository startup/recovery | Restore orchestration only; do not restore old storage implementation |

## P1 — NC / Fanuc foundations

| Foundation | Status | Evidence / source | Integration target | Do-not-regress |
|---|---|---|---|---|
| Modern Fanuc safety/parser/profile | ALREADY_IN_RUNTIME | Current Studio `FanucNc.kt`, `NcPageRuntime.kt` | Keep current | Do not replace with older Fanuc profile |
| Custom M-code code→label/use registry | FOUND_PENDING_INTEGRATION | Historical AIG-II `FanucMachineProfile.cs` | Current `NcPageRuntime` custom M-code support | Preserve current fail-closed validation; add metadata only |
| Custom M-code set / M42-M44 safety participation | ALREADY_IN_RUNTIME | Current `NcPageRuntime.kt` | Keep | Label registry must not weaken validation |

## P1 — Responsive layout / runtime repair

| Foundation | Status | Evidence / source | Integration target | Do-not-regress |
|---|---|---|---|---|
| `AiLayoutComposerContract` | FOUND_PENDING_INTEGRATION | Current Studio `AiLayoutComposer.kt` | Android/Windows/Web layout application | Keep destructive controls isolated and touch sizes >= contract minimum |
| Theme runtime | ALREADY_IN_RUNTIME | `StudioThemePackRuntime` references in current Android/Windows | Keep | Hot repair uses existing theme runtime, not a second theme system |
| Renderer compatibility / performance policy | ALREADY_IN_RUNTIME | Current `RenderCompatibilityContract`, EnvironmentSettings | Keep | No older GPU shell recovery unless a capability is proven missing |
| Environment settings | ALREADY_IN_RUNTIME / SUPERSEDES_436 | Current `EnvironmentSettings.kt` | Keep | Includes FPS/power/thermal/memory/input/precision beyond old settings |

## P2 — Login / persistence sync (intentionally after core closure)

| Foundation | Status | Evidence / source | Integration target | Do-not-regress |
|---|---|---|---|---|
| Google Identity Provider | FOUND_PENDING_INTEGRATION | AIG-II `feat/aig-436-login-reentry`, `GoogleIdentityProvider.kt` | Login layer | Google password never stored in app |
| Local account credential store | FOUND_PENDING_INTEGRATION | `LocalLoginStore.kt` PBKDF2-HMAC-SHA256 + random salt | Login layer | No plaintext password |
| Offline direct entry contract | FOUND_PENDING_INTEGRATION | historical login-reentry branch | Startup/login | Offline formal runtime must remain usable |
| revision/digest/conflict policy | ALREADY_IN_RUNTIME | Current `ProjectRevisionSync + SharedProjectFolderSync` | Keep | No silent conflict overwrite |
| Google Drive file transport | SPEC_GAP | No verified Drive transport implementation found in historical login branch | New transport layer later | Do not claim Google login == Drive sync |

## Audit-only / do not restore blindly

| Item | Classification | Reason |
|---|---|---|
| JTS 1.20.0 dependency | AUDIT_BEFORE_RECOVERY | Old mobile-memory branch added dependency; current CAD core may supersede it |
| Rosemoe editor 0.24.6 | AUDIT_BEFORE_RECOVERY | Old branch added dependency only; current NC editor may supersede it |
| `ExtraRebuildActivity` clean 10-page shell | SUPERSEDED | Buttons explicitly said `CORE BIND NEXT`; not acceptable formal runtime |
| `design/cam-sim-v2-layered-runtime-20261014` tip | DOC_ONLY | Design plan is not implementation evidence |
| `design/runtime-ui-gpu-a-20261008` tip | DOC_ONLY | Spec only at branch tip; recover only proven missing renderer code elsewhere |
| `design/full-open-policy-20261005` tip | DOC_ONLY | Current `OpenRuntimePolicy` is newer; do not restore plan as code |
| two-finger focal zoom | ALREADY_IN_RUNTIME | Current CAD uses ScaleGestureDetector focal zoom |
| two-finger center pan | SPEC_GAP | Neither verified historical AIG-II implementation nor current Studio implementation found |

## Existing foundations that are already absorbed — do not duplicate

- `StudioProjectRepository`: already used by current Android/Windows runtime.
- Current `ProjectSync`: supersedes old revision/digest/conflict-only implementation.
- `EnvironmentSettings`: supersedes old 436 RuntimeSettings.
- `StudioThemePackRuntime`: already live in formal UI.
- `RenderCompatibilityContract`: already widely integrated.
- Current `FanucNc` / `NcPageRuntime`: newer than historical Fanuc profile/post foundation.
- `CAD.PHOTO.ALIGN` / `CAD.PHOTO.SCALE`: already present in current CAD PageRuntime; missing part is photo ingest/EXIF/recognizer integration.

## Pending execution order

1. Complete Task 9: Android/Windows/Web formal entry uses PageRuntimeRouter.
2. Replace all legacy direct/Toast callbacks with 122 typed Page/Button routes.
3. Make PageMessage/Error the only page-local UI message path.
4. Wire typed CAD→CAM→SIM→NC→MACHINE bridges into formal UI.
5. Wire AI Machining Orchestrator into formal AI page without domain mutation authority.
6. Recover full Axis cockpit controls + 6AX tool-direction/HUD/tool-axis camera + Web axis auto-bind.
7. Integrate Runtime Hot Repair: Page/Button/Message/Asset diagnostics → changed package → verified working copy → atomic promote → page refresh.
8. Recover CAD PHOTO ingest/EXIF/recognizer + DXF codec + AutoSave/CrashRecovery orchestration.
9. Add custom M-code label/use metadata registry without weakening current safety validation.
10. Apply AiLayoutComposer plans to Android/Windows/Web responsive layout/hot repair.
11. Close core/runtime Gate before login work.
12. Integrate Google Identity + local auth + offline entry; separately implement real Google Drive transport.
13. Run AIG-II dual-project exact-SHA Gate, Android APK, Windows EXE and formal Runtime evidence.

## Release boundary

This inventory is **not** proof that the formal main programs contain these capabilities. It is a recovery map of mature foundations and verified gaps. No item becomes `ALREADY_IN_RUNTIME` until its formal Android/Windows/Web entry wiring is verified. No release is complete until the dual-project Gate validates exact SHAs and the applicable APK/EXE/runtime evidence.

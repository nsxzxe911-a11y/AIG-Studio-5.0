# AIG RGB Global Skin V1 — Dual-Project UI/UX Design

Date: 2026-10-05
Status: Design approved in chat; implementation not started
Scope: AIG Studio 5.0 + AIG-II, Android + Windows

## 1. Goal

Replace the remaining mixed/legacy control-surface styling with one shared AIG RGB Glass visual system across all formal Runtime UI surfaces, while preserving all existing functional callbacks and machining logic.

Success means every formal control surface launches and remains usable with the approved black-background Traditional-Chinese AIG RGB Glass language, without falling back to the engineering shell and without changing CAD/CAM/SIM/NC computation behavior.

## 2. Fixed product constraints

- Formal Runtime UI only. Engineering shell is never the initial or primary UI.
- Traditional Chinese first; technical tokens such as CAD/CAM/SIM/NC/3AX/4AX/5AX/6AX/G/M remain unchanged.
- Base visual language: black `#020407`, panel `#07111B`, semi-transparent RGB Glass, adaptive glow, replaceable visuals.
- Visual states: NORMAL / PRESSED / SELECTED / DISABLED / WARNING / ALARM.
- Red is status/alarm only. It must never be wired to regression, rollback, downgrade, or version-change callbacks.
- AI version-control write remains hard-disabled. Auto regression / rollback / downgrade remain OFF.
- Android and Windows keep their own responsive layouts, but consume the same semantic skin contract.
- Existing callbacks remain authoritative. The skin layer may decorate or select assets, but may not duplicate or replace CAD/CAM/SIM/NC logic.
- Missing optional artwork is non-blocking. Use procedural RGB Glass fallback and continue Runtime.
- No version downgrade and no rollback to an older visual baseline.

## 3. Architecture

Create one semantic `AigRgbGlobalSkin` contract shared conceptually by both projects. It defines colors, glass/effect roles, widget roles, state semantics, surface metadata, and optional approved artwork IDs.

Each platform keeps a thin adapter:

- Android adapter maps semantic roles to existing Android Views/GlowButton/theme/backdrop code.
- Windows adapter maps the same semantic roles to existing Swing/Desktop UI helpers.

No page owns its own independent palette. Page code requests a surface ID and widget role; the skin engine resolves the visual treatment.

## 4. Formal surface registry

The global registry must cover exactly these formal surfaces in V1:

`HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI, SETTINGS, VIEW, PHOTO, CORNER, EDIT, FILE, TOOL, WORK, ALARM, MONITOR, SYNC, LINK`

Aliases may normalize into these IDs, for example `5X -> 5AX`, `3D -> SIM`, `NC_EDIT -> NC`, but the semantic registry remains stable.

Every surface entry defines:

- surface ID
- title/Traditional-Chinese label where applicable
- accent role
- glass depth/effect profile
- optional approved asset ID
- procedural fallback profile
- danger/status policy

## 5. Visual semantics

Base palette:

- Background: `#020407`
- Panel: `#07111B`
- Text: high-contrast near-white
- Accent/selected: cyan RGB
- Cutting/healthy: green
- Rapid/axis motion: magenta/purple
- Warning: yellow/amber
- Alarm: red

Widget roles:

- NAV
- TOOL
- PRIMARY
- STATUS
- WARNING
- DANGER
- INPUT
- GROUP

State behavior:

- NORMAL: restrained glow, readable glass fill
- PRESSED: brighter edge + short feedback
- SELECTED: persistent accent/glow
- DISABLED: low contrast, no dangerous action
- WARNING: amber status emphasis
- ALARM: red visual emphasis only; never a version-control action

## 6. Surface treatment

### HOME
Approved AIG RGB home artwork may be used as the visual base. Navigation and quick actions remain live controls above it.

### CAD / CAM / SIM / 3AX–6AX / NC
Preserve current machining canvases and toolpath/NC content. Skin only affects surrounding chrome, panels, controls, HUD, status and optional visual backdrop overlays.

### AI / SETTINGS / work pages
Use the same RGB Glass components and role system. Do not create a second visual dialect.

### ALARM / MONITOR / SYNC / LINK
Status colors remain semantic. Alarm red is informational; sync/link disconnected states remain gray/yellow/red as status only. No destructive callback is bound to status color.

## 7. Artwork policy

Approved AI-generated AIG RGB images are optional assets, not functional UI by themselves.

If an approved asset exists:

1. resolve by surface ID;
2. validate manifest/SHA when the current asset pipeline requires it;
3. draw it below live controls;
4. preserve all interactive controls/callbacks.

If an asset is missing or invalid:

- log/status WARNING;
- use procedural AIG RGB Glass fallback;
- keep the surface usable;
- do not trigger rollback, downgrade, regression, or engineering-shell fallback.

## 8. Mobile / Windows split

Shared:

- palette
- state semantics
- surface IDs
- widget roles
- approved artwork identity
- danger/status policy

Platform-specific:

- layout geometry
- portrait/landscape behavior
- button grouping density
- Windows shortcuts
- mobile touch target sizing

This avoids forcing desktop geometry onto mobile while keeping both products visually identical in language.

## 9. Integration strategy

Prefer extending existing theme/backdrop infrastructure instead of rewriting page files.

Studio:

- extend the existing theme-pack/runtime abstraction;
- add full surface registry and shared semantic resolver;
- adapt Android and Desktop controls to request semantic skin roles.

AIG-II:

- extend existing `AigUiTheme`, widget roles, backdrop/surface contracts;
- expand the current CAD/CAM/SIM/AXIS/NC surface coverage to the full V1 registry;
- preserve existing callbacks and runtime state objects.

Large `MainActivity` / `DesktopApp` files should receive only minimal bridge calls where unavoidable. New skin logic belongs in focused theme/skin files.

## 10. Non-goals

This change does not:

- alter geometry, CAM toolpath math, SIM material removal, NC/Post behavior, coordinates or machine profiles;
- re-enable deep regression;
- re-enable rollback/downgrade;
- turn static images into fake functional controls;
- replace mobile/desktop layout systems with one shared layout;
- require network access to render the UI.

## 11. Failure policy

Skin/art failures are fail-open:

- invalid/missing optional visual -> WARNING + procedural fallback;
- unsupported optional effect -> disable that effect only;
- optional skin module compile issue that cannot be repaired in the current round -> remove that optional module from installation and continue with the existing formal Runtime UI.

Core compile/runtime errors remain visible development failures and must be fixed before claiming build PASS. They are never solved by silently downgrading versions.

## 12. Verification scope

This is a visual/UI integration change, so verification is intentionally focused:

1. skin registry coverage for all V1 surfaces;
2. Android and Windows semantic parity;
3. page navigation still works;
4. existing callbacks remain reachable/clickable;
5. no overlap at representative mobile portrait/landscape and Windows layouts;
6. missing-art fallback keeps Runtime usable;
7. red/alarm surfaces have no rollback/downgrade/regression callback;
8. Android compile;
9. Windows compile;
10. actual Runtime launch evidence when the device is online.

Do not rerun deep CAD/CAM/SIM/NC regression solely for skin-only changes unless a core machining file is touched.

## 13. Acceptance criteria

V1 is acceptable when:

- every listed formal surface resolves to an AIG RGB semantic skin;
- no formal surface falls back to engineering-shell styling;
- Android and Windows visually use the same semantic language;
- phone and desktop layouts remain distinct and usable;
- live controls remain live controls, not image-only replacements;
- missing artwork never blocks Runtime;
- callback behavior and machining logic are unchanged;
- rollback/downgrade/regression hard-locks remain OFF;
- focused UI gates plus Android/Windows compile pass;
- actual launch evidence is reported separately from source/static evidence.

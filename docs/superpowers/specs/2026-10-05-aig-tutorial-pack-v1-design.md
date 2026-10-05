# AIG Tutorial Pack V1 — Shared Tutorial / AI Navigation / Banter Design

Date: 2026-10-05
Status: Design approved in chat; written-spec review pending
Scope: AIG-II + AIG Studio 5.0 / AIG CNC

## 1. Goal

Create one logical, versioned, offline-first tutorial pack shared by AIG-II and AIG Studio so both products expose the same tutorial IDs, lesson structure, AI navigation behavior, maintenance lookup, and Banter Mode semantics.

The user should be able to enter a tutorial from the current page without returning to a global menu. AI maintenance should also be able to locate the correct source file, callback, asset pack, gate, version, or checkpoint without scanning multi-thousand-line runtime files first.

## 2. Core principles

1. One logical Tutorial Pack, mirrored identically into both repositories and verified by a pack digest.
2. Offline-first: tutorial index, lesson text, mode metadata, and required tutorial assets are bundled locally.
3. Data-driven: lesson content lives in JSON/asset data; platform adapters only render and route.
4. Android and Windows may use different layout adapters but resolve the same lesson IDs.
5. Tutorial code never mutates CAD/CAM/SIM/NC results unless the user explicitly invokes an existing product callback.
6. Warnings and alarms remain informational according to the current full-open runtime policy; tutorial UI must not reintroduce rollback/regression blocking.
7. Banter Mode changes wording only. It never changes numeric values, G-code, machine state, toolpath, coordinates, callbacks, or safety logic.

## 3. Shared pack structure

```text
shared/tutorial/
├─ tutorial-index.json
├─ tutorial-version.properties
├─ pack-digest.sha256
├─ lessons/
│  ├─ beginner.json
│  ├─ quick.json
│  ├─ step-by-step.json
│  ├─ ai-teacher.json
│  ├─ cad.json
│  ├─ cam.json
│  ├─ sim.json
│  ├─ 3ax.json
│  ├─ 4ax.json
│  ├─ 5ax.json
│  ├─ 6ax.json
│  ├─ nc-fanuc.json
│  ├─ work-pages.json
│  ├─ diagnostics.json
│  └─ maintenance.json
└─ assets/
   ├─ manifest.json
   └─ <AIG RGB tutorial assets>
```

Because the projects are separate repositories, the pack is physically mirrored into both repositories for offline packaging. A deterministic digest must prove that the logical pack is identical. Drift between AIG-II and Studio is a verification failure for the tutorial pack only; it does not trigger product rollback.

## 4. Tutorial modes in V1

1. Beginner — HOME → CAD → CAM → SIM → NC workflow.
2. Quick — show only the next action or target control.
3. Step-by-step — one instruction at a time with previous/next.
4. AI Teacher — explain the current page, state, and next reasonable action.
5. CAD — Line, Rect, Circle, Arc, Hole, Chamfer, Fillet, Snap, Dimension, Trim, Extend, Offset, Array.
6. CAM — AUTO/MANUAL, inside/outside, direction, lead-in/out, Safe-Z, avoidance, G41/G42.
7. SIM — real 3D, material removal, path display, compare, collision messages, recalculate vs show/hide.
8. 3AX/4AX/5AX/6AX — A/B/C, zero, 360°, flip/orientation, playback, Fit, coordinate display.
9. NC / Fanuc — G/M, G54, G90, G43/H, G0/G1/G2/G3, drilling cycles, subprograms, custom M-code concepts.
10. Diagnostics — CAD/CAM/SIM/NC messages explained in their own domain without blocking Runtime.
11. Work pages — VIEW, PHOTO, CORNER, EDIT, FILE, TOOL, WORK, ALARM, MONITOR, SYNC.
12. AI Maintenance — fast developer lookup for file, symbol, callback, asset, gate, version, exact-bind, checkpoint, and minimal verification command.
13. Banter Mode — tone layer only; see section 7.

## 5. AI navigation

Three entry points are required:

- AI Navigation: recommends the correct page/tutorial based on the current Runtime page and state.
- Tutorial Center: browse all modes and lessons.
- Current Page Help: opens the tutorial mapped to the current page immediately.

Each lesson has a stable `lesson_id`, one or more `page_targets`, and optional `action_targets`. Adapters resolve these targets to existing callbacks. No duplicate tutorial-specific implementation of CAD/CAM/SIM/NC actions is allowed.

## 6. Runtime adapter model

Each project owns only a thin adapter:

- Android adapter: current page → lesson ID → local tutorial renderer → existing callback.
- Windows adapter: current page → lesson ID → local tutorial renderer → existing callback.

AIG-II and Studio can have different runtime class names, but they must expose the same shared semantic target IDs such as `CAD.LINE`, `CAM.MANUAL_PATH`, `SIM.MATERIAL_REMOVAL`, `AXIS.6AX`, `NC.G54`, `SETTINGS.UPDATE`, `WORK.PHOTO_ALIGN`.

## 7. Banter Mode / 嘴炮模式

User-facing name: `嘴炮模式`
Internal ID: `BANTER`

Levels:

- `OFF`: formal professional wording.
- `LIGHT`: mild playful remark.
- `NORMAL`: workshop-master style, direct and concise.
- `MAX`: strong teasing tone, but no personal attacks, harassment, slurs, or obscuring critical facts.

Rules:

1. Banter is a presentation transform applied after the factual message payload is produced.
2. Numeric values, coordinates, feed/speed, tool IDs, G/M codes, error IDs, file names, and recommended action IDs remain byte-for-byte semantically unchanged.
3. For ALARM / artifact-invalid / compile or package failures, the factual message appears first. Banter may only appear as a secondary sentence.
4. Banter never auto-executes a Runtime callback and never changes a setting.
5. Banter preference is a user setting and defaults to `OFF` unless the user explicitly enables it.

Example:

- Fact: `CAM 刀路已變更，請重新計算。`
- NORMAL: `CAM 刀路已變更，請重新計算。刀路改了還不重算，機台可不會替你猜。`

## 8. AI quick-maintenance index

Both repos receive:

- root `AGENTS.md` — a 30-second AI entry point.
- `docs/ai/AI_MAINTENANCE_QUICK_GUIDE.md` — detailed lookup table.

The root file explicitly instructs AI:

> Read AGENTS.md first. Unless the index cannot resolve the issue, do not begin by scanning entire multi-thousand-line MainActivity/DesktopApp files.

The detailed guide maps:

`symptom → first file → symbol/search token → minimal verification`

Required areas:

- startup / HOME
- AIG RGB asset packs and AI-generated image promotion
- CAD
- CAM
- SIM
- 3D / 3AX / 4AX / 5AX / 6AX
- NC / Fanuc / Post
- Android / Windows split
- settings center
- RuntimeLink
- sync/update
- regression/rollback full-open policy
- exact-bind
- breakpoint recovery: last trusted checkpoint → diff → unfinished tasks → evidence

## 9. Versioning and digest

Tutorial Pack has its own version independent from application version, beginning at `1.0.0`.

Both projects package:

- same `tutorial-version.properties`
- same `tutorial-index.json`
- same lesson files
- same shared tutorial asset manifest
- same calculated SHA-256 pack digest

A tutorial pack update is allowed without forcing a deep CAD/CAM/NC regression when only tutorial text/assets change.

## 10. Verification

Focused verification must cover:

1. schema parse and required lesson IDs;
2. AIG-II pack digest == Studio pack digest;
3. all page targets resolve through each project adapter;
4. offline load succeeds;
5. Current Page Help resolves correctly for HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI/settings/work pages;
6. Banter OFF/LIGHT/NORMAL/MAX renders while preserving the same factual payload and action target;
7. Banter cannot change numeric/G-code payloads;
8. AI Maintenance index resolves representative problems without scanning full large runtime files;
9. Android and Windows compile after adapter integration.

## 11. Non-goals for V1

- No new machine-control protocol.
- No autonomous Cycle Start.
- No duplicate CAD/CAM/SIM/NC implementation inside tutorial code.
- No cloud dependency for basic lessons.
- No automatic rollback/regression gate reintroduction.
- No requirement to finish every tutorial illustration before the data/adapter contract is usable; missing tutorial art may be filled by the existing AI RGB asset pipeline.

## 12. Acceptance

V1 is accepted when both projects load the same pack digest offline, open the correct lesson from the current Runtime page on Android and Windows, expose Banter Mode as a tone-only setting, and provide the root AI maintenance index that routes future maintenance to the correct files/symbols before large-file scanning.

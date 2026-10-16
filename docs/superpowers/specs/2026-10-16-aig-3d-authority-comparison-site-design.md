# AIG / AIG II 3D Authority Comparison Site — Design

Date: 2026-10-16
Status: Design approved in chat; written spec pending user review

## Purpose

Create one fixed web comparison surface for validating 3AX–6AX machine models without relying on chat history, temporary previews, local folders, or APK/EXE screenshots alone.

The site is an evidence and comparison surface, not a replacement for the actual AIG Runtime.

Primary use:

- keep approved Authority imagery visible at all times;
- compare generated 3D model output against Authority;
- compare final AIG Runtime output against both Authority and generated model;
- keep model identity, SHA, version, pivot/axis capability and PASS/FAIL evidence together;
- prevent wrong-image, wrong-model and wrong-version regressions.

## Product Identity Rules

### AIG

AIG supports only 3AX.

The comparison site for AIG must expose only:

- 3AX

It must not expose 4AX, 5AX or 6AX as supported AIG product capability.

### AIG II

AIG II supports:

- 3AX
- 4AX
- 5AX
- 6AX

The site must preserve this capability split explicitly and must not infer product identity from repository name, branch name, theme, asset filename or old Engineering Shell content.

## Core Comparison Layout

Each axis page uses a fixed three-column evidence layout:

1. Authority
   - approved source image;
   - Authority identity;
   - original SHA-256;
   - source dimensions;
   - visual description.

2. Model / GLB
   - generated or reconstructed 3D model;
   - interactive orbit/zoom preview;
   - model SHA-256;
   - model version;
   - source/generator provenance;
   - license/provenance note;
   - part tree and pivot status;
   - axis capability declaration.

3. Runtime Evidence
   - Android Runtime screenshot;
   - Windows Runtime screenshot when available;
   - Runtime build/version;
   - APK/EXE SHA when available;
   - axis-state evidence;
   - persistence evidence;
   - PASS/FAIL status.

No column may silently replace another. A generated model is never Authority. A Runtime screenshot is never sufficient to redefine Authority.

## Locked Authority Identities

The site must preserve the following canonical Authority SHA-256 values as immutable comparison identities:

### 3AX

- SHA-256: `4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28`
- Visual: vertical VMC, vise, workpiece, blue toolpath

### 4AX

- SHA-256: `a46c11e6f08b28dde24df066ac697c4b965079de1cb4df5091e58c7ab60d4a26`
- Visual: horizontal A-axis, chuck, X/Y/Z/A

### 5AX

- SHA-256: `e8d8b0304873cd6768d93d20a495fa8969c9ec72adb09ba9810da5b3b25ec5b3`
- Visual: A/B trunnion/cradle, impeller, large machining viewport

### 6AX

- SHA-256: `73f34e958bb22925ceed32b986443240b9322a77bf0cadbc1b81f62501683be6`
- Visual: A/B/C, swivel head, multi-face machining, impeller

If a Library copy or derived image has different bytes because of re-encoding, cropping, resizing or export, it must be labeled `REFERENCE_DERIVATIVE`, never `AUTHORITY_ORIGINAL`.

## Model Evidence Contract

Each model entry must include at minimum:

- `productId`
- `axisMode`
- `modelVersion`
- `modelSha256`
- `sourceAuthoritySha256`
- `generatorOrSource`
- `licenseStatus`
- `parts[]`
- `pivots[]`
- `supportedAxes[]`
- `lodProfile`
- `pbrStatus`
- `runtimeCompatible`
- `createdAt`

Recommended part identities:

- Base
- Column / enclosure where relevant
- Spindle
- Tool
- Workpiece
- Fixture / vise / chuck
- Rotary A
- Rotary B
- Rotary C
- Trunnion / cradle
- Toolpath

## Pivot / Kinematics Display

The site must display model structure, not only a rendered mesh.

For every supported rotary axis, show:

- axis name;
- pivot node;
- rotation axis vector;
- parent node;
- allowed range;
- whether it is driven by real Runtime kinematics.

Camera transforms must be shown as camera/view state and must never be counted as A/B/C motion.

## Runtime Acceptance Evidence

A model may be marked `MODEL_VISUAL_PASS` before Runtime integration, but final product PASS requires Runtime evidence.

Final acceptance for an axis page requires:

- Authority image visible;
- correct model identity and SHA;
- correct machine structure;
- correct pivot hierarchy;
- real XYZ / supported A/B/C motion;
- Camera independent from machine axes;
- model loaded in formal RGB Runtime, not Engineering Shell;
- no fake GIF/video/static-image animation;
- model remains visible after page transition and state restore;
- CPU/GPU/thermal behavior remains within current product policy;
- Runtime screenshot evidence;
- no missing asset in packaged APK/EXE.

## Status Model

Use explicit states:

- `AUTHORITY_READY`
- `REFERENCE_DERIVATIVE`
- `MODEL_PENDING`
- `MODEL_GENERATED`
- `MODEL_VISUAL_PASS`
- `PIVOT_PENDING`
- `KINEMATICS_PENDING`
- `RUNTIME_PENDING`
- `RUNTIME_PASS`
- `RUNTIME_FAIL`
- `ASSET_MISSING`
- `SHA_MISMATCH`
- `BLOCKED`

No intermediate state may be displayed as final PASS.

## Asset Packaging Rule

The comparison site must make packaged-asset identity visible because previous APK/EXE builds could succeed while Runtime images were absent.

For each Release candidate, record whether the model and required Authority/runtime assets are physically present in the produced package.

The release evidence chain is:

Authority / model source
→ Runtime asset path
→ package inclusion
→ unpacked package SHA verification
→ Runtime loader success
→ visible offline Runtime evidence
→ PASS.

Build success alone is not product PASS.

## Site Navigation

### AIG view

- HOME / Summary
- 3AX
- Release Evidence

### AIG II view

- HOME / Summary
- 3AX
- 4AX
- 5AX
- 6AX
- Release Evidence

The site may provide a product selector, but it must not merge capability lists.

## Visual Behavior

- dark AIG presentation consistent with approved RGB family;
- comparison content has priority over decoration;
- large model preview;
- Authority image must remain visible while inspecting model;
- no Engineering Shell styling;
- no poster/contact-sheet image used as Runtime evidence;
- mobile and desktop layouts supported;
- status and SHA text must remain readable.

## Versioning

Authority original is immutable.

New generated models are append-only versions:

- V1
- V2
- V3
- ...

Do not overwrite historical model evidence.

A newer model may become the current candidate only after its provenance and SHA are recorded.

Runtime evidence is tied to exact build identity and must not float to later builds automatically.

## Hosting Recommendation

Primary recommendation: GitHub Pages or an equivalent static site committed with the AIG repositories/evidence flow.

Reasons:

- Authority metadata, model metadata and website version can be tied to Git history;
- SHA/version evidence is auditable;
- model history is not lost when a temporary preview expires;
- site content can be reproduced from repository state.

A temporary Replit or external preview may be used during development, but it is not the authoritative evidence store unless its output is archived back into the repository.

## External 3D Generation Workflow

The comparison site must support models produced by external 3D-generation services, but generator output is treated as a candidate only.

Workflow:

Authority original
→ derived generation crop (explicitly labeled derivative)
→ external Image-to-3D service
→ GLB/FBX candidate
→ record generator/source/license
→ record SHA
→ inspect geometry
→ split/normalize parts
→ define pivots
→ connect Runtime kinematics
→ compare against Authority
→ Runtime evidence
→ Gate decision.

The external generator is never trusted to define CNC kinematics or product capability.

## Performance / Thermal Evidence

Each Runtime evidence record should capture, where available:

- target FPS mode;
- observed frame stability;
- renderer backend;
- LOD profile;
- model triangle/vertex budget;
- thermal state;
- whether thermal degradation changed visual quality only or incorrectly affected CNC precision/safety.

Performance mitigation may reduce LOD, PBR quality, effects or FPS, but must not change:

- 0.001 mm precision;
- G90 coordinate semantics;
- axis kinematics;
- collision/safety logic;
- NC parsing;
- persistence integrity.

## Gate Rules

An axis page is BLOCKED when any of the following is true:

- wrong Authority identity;
- wrong product capability;
- missing GLB/model;
- missing packaged asset;
- SHA mismatch;
- fake animation;
- Camera movement used as axis motion;
- wrong pivot hierarchy;
- unsupported axis exposed;
- Engineering Shell used as formal evidence;
- model disappears after load/page transition;
- Runtime evidence absent.

## Scope Boundary

This site does not implement CAD, CAM, SIM, NC or machine communication itself.

It consumes evidence from those systems and provides one stable visual/identity comparison surface.

The site must not become another independent product core.

## Initial Delivery

First implementation milestone:

- static site shell;
- AIG/AIG II product switch;
- 3AX–6AX comparison pages;
- three-column Authority / Model / Runtime layout;
- interactive GLB viewer;
- metadata panel;
- SHA/version/status display;
- placeholder states when GLB or Runtime evidence is not yet available;
- no fake PASS.

The first milestone is complete only when the site can host the approved Authority identities and accept the first real GLB candidate without changing the evidence schema.

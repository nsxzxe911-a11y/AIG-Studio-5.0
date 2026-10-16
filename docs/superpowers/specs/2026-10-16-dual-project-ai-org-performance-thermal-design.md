# AIG Dual-Project AI Organization + Performance/Thermal Governance

Date: 2026-10-16
Scope: AIG / AIG-II shared product architecture
Status: Approved design intent from product owner; implementation pending per subsystem plans

## 1. Goal

Build AIG and AIG-II as one coordinated product family without repeated regressions or duplicated cores. Specialist AI workstreams own narrow domains, shared-foundation workstreams protect common contracts, and Integrator/Gate/Regression workstreams accept or block integration.

The product split is intentionally small:

- **AIG**: shared product stack, maximum machine capability **3AX**.
- **AIG-II**: same shared product stack, machine capability **3AX/4AX/5AX/6AX**.
- CAD/CAM/SIM/NC/AI, persistence, precision, safety, platform contracts and release evidence should remain single-source wherever technically possible.

## 2. Three-layer organization

### Layer A — Professional Construction AI

These workstreams build domain features and do not bypass shared contracts.

1. **CAD AI** — drawing/editing, dimensions, SNAP, layers, undo/redo, geometry correctness.
2. **CAM AI** — AUTO/MANUAL toolpaths, G41/G42, Safe-Z, lead-in/out, fixture avoidance, 3–6AX path data.
3. **Machine Model / 3D AI** — 3AX→4AX→5AX→6AX rigid-part models, pivots, XYZ/A/B/C kinematics, PBR/LOD, tool/workpiece/fixture scene graph.
4. **SIM / Material Removal AI** — true material removal, progressive simulation, collision/overcut evidence, multi-axis animation.
5. **NC / Fanuc AI** — parser, post, G/M-code, subprograms, drilling cycles, block skip, single block, NC-first workflow.
6. **AI Context / Assistance AI** — local CAD/CAM/SIM/NC context, Working Copy / Verified Main / Immutable Vault boundaries; no direct unsafe machine-output bypass.

### Layer B — Shared Foundation AI

These workstreams serve both projects and are not forked per axis family unless a hardware capability truly differs.

1. **Shared Core / Contract AI** — common data models, Command, State, Result, event contracts; prevents CAD/CAM/SIM/NC/AI core divergence.
2. **Persistence / Sync AI** — Save/Open, AutoSave, Recovery, Local-first, Google Drive revision/digest, explicit conflict resolution.
3. **Precision / Coordinate AI** — 0.001 mm end-to-end precision, G90, Master Origin, CAD→CAM→SIM→NC coordinate consistency.
4. **CNC Safety AI** — axis limits, collision, overcut, G-code Alarm, custom M-code policy, interlocks, NC→MACHINE output boundary.
5. **GPU / Performance / Thermal AI** — renderer efficiency, CPU/GPU load, FPS policy, LOD, texture/material budgets, animation scheduling, thermal adaptation.
6. **Android AI** — S23/S23 Ultra, touch/S Pen, orientation, adaptive layout, APK, offline cold start, Android thermal integration.
7. **Windows AI** — 4K UI, keyboard/mouse shortcuts, EXE/installer, GPU backend, DPI/window scaling, Windows performance telemetry.
8. **Input / Interaction AI** — two-finger pan, focus zoom, orbit, selection, drag, rubber-band preview, CNC keyboard; camera state must not mutate machine axes.
9. **Asset / Authority AI** — RGB Authority images, SHA fingerprints, Button-ID manifests, candidate Authority generation only when approved art is absent; engineering assets forbidden in formal runtime.
10. **Settings / Localization AI** — Traditional Chinese/English, FPS, Quality, Renderer, Precision, HUD, power mode through Shared Contract; no per-page hardcoded settings copies.
11. **Machine Profile AI** — Fanuc and controller capability matrix; 3/4/5/6-axis availability, M-code profiles, machine envelopes and custom-controller capabilities.
12. **Fault Isolation AI** — a failing module is isolated; HOME and unrelated modules remain usable; exceptions never clear project data or reset to defaults.

### Layer C — Integration / Verification AI

1. **Integrator AI** — composes formal product surfaces from verified modules; never substitutes engineering shells for missing product pages.
2. **Test / Evidence AI** — for every formal page: Authority → Runtime screenshot → Button-ID → callback → shared command → core result → persistence evidence.
3. **Regression AI** — prevents cross-module damage such as “fix CAD breaks CAM”, “replace model loses NC”, or “UI refresh disconnects core”.
4. **Release / Builder AI** — exact dual-project SHA binding, APK/EXE, artifact hashes, checkpoint/version evidence, release gate; any required red result BLOCKS release.
5. **End-to-End Workflow AI** — continuously verifies both primary flows:
   - CAD → CAM → 3D/SIM → NC
   - NC-first → 3D/SIM → validation → NC

## 3. Ownership rule

Every change has exactly one primary owner and may have multiple required reviewers. A specialist workstream must not silently reimplement a shared responsibility.

Examples:

- CAM may request a coordinate transform but **Precision / Coordinate AI owns the transform contract**.
- 3D may request a frame budget but **GPU / Performance / Thermal AI owns rendering policy**.
- Android may expose thermal state but **GPU / Performance / Thermal AI owns degradation behavior**.
- NC may report an alarm but **CNC Safety AI owns whether machine output is blocked**.
- UI may render a button but **Shared Core / Contract AI owns the command/result contract**.

## 4. CPU optimization contract

The performance implementation must prefer bounded, cancellable and event-driven work over unlimited background activity.

Required rules:

- UI thread is reserved for presentation/input; heavy geometry, CAM, SIM, parser, persistence and asset work run off the UI thread.
- Interactive state updates use coalescing/latest-wins where stale work has no value.
- Worker queues are bounded; cancellation is explicit when the page/model/request is superseded.
- Static or hidden 3D scenes do not continuously consume CPU just to preserve an FPS counter.
- Reuse frame/geometry buffers where practical; avoid large per-frame allocations and avoid rebuilding immutable meshes every frame.
- Persistence and cloud sync remain background, fail-fast and non-blocking for formal offline UI.
- Long CAM/SIM/NC calculations expose progress/cancellation and never freeze HOME/navigation.

## 5. GPU optimization contract

Required rules:

- Keep the renderer/context persistent across ordinary page/state changes where platform constraints allow; do not repeatedly cold-create the 3D stack.
- Separate immutable geometry from per-frame pose/state.
- Use view-frustum/back-face/visibility culling where applicable.
- Use model LOD tiers for Android/Web and preserve a higher-detail master for capable Windows hardware.
- LOD may remove visual detail but must never alter pivot positions, work coordinates, tool contact, machine axes or collision semantics.
- Batch/instance repeated visual primitives where useful; minimize texture/material state churn.
- PBR/material quality is degradable; axis geometry and tool/workpiece pose are not.
- 3D page target is smooth interaction at selected 60/90/120 Hz when the device can sustain it; performance policy may step down under load/thermal pressure.
- A hidden renderer should suspend or reduce rendering to event-driven updates.

## 6. Frame-time and responsiveness targets

Targets are product goals rather than permission to fake frames:

- 120 Hz target budget: **8.33 ms/frame**.
- 90 Hz target budget: **11.11 ms/frame**.
- 60 Hz target budget: **16.67 ms/frame**.
- 30 Hz thermal/power fallback budget: **33.33 ms/frame**.

When a target cannot be sustained, adaptive quality reduces optional visual cost before it reduces essential responsiveness.

Priority order for degradation:

1. reduce nonessential background work,
2. reduce shadow/post/PBR/material quality,
3. reduce model LOD/auxiliary overlays,
4. lower FPS target 120→90→60→30,
5. suspend nonessential 3D animation if thermal state becomes critical.

Never degrade CNC numeric precision, parser correctness, collision/safety logic, save integrity, or axis-state truth.

## 7. Thermal protection contract

Thermal protection is a first-class runtime state, not an alarm sticker.

### Android

- Prefer official Android thermal status / power APIs as the control signal.
- Do not infer a universal safe/unsafe threshold from a single raw temperature such as 88°C.
- If temperature telemetry is unavailable, display/report **UNKNOWN**, never `0°C` or a fabricated value.
- Thermal state drives adaptive FPS, quality, LOD and background-work limits.

### Windows

- Use reliable OS/GPU/vendor telemetry when available.
- Missing hardware sensor data is **UNKNOWN** and must not block normal editing by itself.
- Use sustained frame-time/load pressure as a secondary performance signal, not as a fake temperature estimate.

### Thermal states and behavior

- **NORMAL** — requested performance profile allowed.
- **WARM / MODERATE** — trim background work and expensive optional effects.
- **HOT / SEVERE** — reduce quality/LOD/FPS and pause nonessential compute.
- **CRITICAL** — stop nonessential animation/heavy background processing, preserve project state, keep safe editing/navigation available, and require recovery before resuming heavy workloads.

Thermal adaptation must be hysteretic/debounced so quality does not oscillate every few frames.

## 8. Data/safety guarantees during throttling

A performance or thermal action MUST NOT:

- change 0.001 mm precision,
- change Master Origin or G90 meaning,
- skip collision/overcut/axis-limit validation,
- permit blocked NC→MACHINE output,
- drop unsaved project state,
- silently reset CAD/CAM/SIM/NC data,
- substitute fake renderer evidence,
- replace formal RGB UI with an engineering shell.

If thermal pressure forces suspension, save/recovery state is preserved first.

## 9. Platform profile behavior

### AIG

- MAX_AXIS = 3.
- Shares all common departments and performance/thermal contracts.
- Must not expose 4AX/5AX/6AX controls, callbacks or machine profiles.

### AIG-II

- MAX_AXIS = 6.
- Requires 3AX/4AX/5AX/6AX model and workflow evidence.
- Uses the same shared CPU/GPU/thermal framework; higher axis complexity may select lower initial LOD on constrained Android devices.

## 10. Verification / Gate additions

A release candidate cannot claim performance/thermal completion from one screenshot.

Required evidence classes:

1. **Cold start** — formal UI opens offline without renderer/network blocking.
2. **Idle/static** — CPU/GPU activity falls when scene is static or hidden.
3. **Interaction** — orbit/pan/zoom and axis animation remain responsive without mutating machine coordinates.
4. **Sustained 3D/SIM load** — frame time, FPS target changes and thermal state transitions are recorded.
5. **Thermal degradation** — optional visuals/background work step down before safety/precision functions.
6. **Recovery** — after pressure drops, quality may recover without renderer reset/data loss.
7. **Fault isolation** — thermal/performance exception in one module does not kill HOME/other modules.
8. **Cross-project parity** — shared contract behavior matches between AIG and AIG-II for identical features.

Gate outcome:

- Missing telemetry may be marked UNKNOWN when the platform cannot expose it.
- Fabricated telemetry, data loss, safety bypass, precision change, uncontrolled runaway rendering, or engineering-shell fallback = **BLOCK**.

## 11. Model-first priority remains active

The current delivery order remains:

1. 3AX real model,
2. 4AX real model,
3. 5AX real model,
4. 6AX real model,
5. runtime/Authority evidence,
6. then reconnect deeper CAM/SIM/NC workflows as required.

GPU / Performance / Thermal AI participates from the first model, so optimization is not postponed until after all models are finished.

## 12. Integration principle

The fastest acceptable path is not maximum parallel code changes. It is maximum parallel specialist work **behind stable shared contracts**, followed by one Integrator/Gate/Regression path.

No department may declare product completion alone. A feature becomes release-eligible only when its owner evidence, shared-contract evidence, platform evidence and regression evidence agree.
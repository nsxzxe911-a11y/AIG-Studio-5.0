# AIG V88 — GPT 接手 Manus 設計／6AX 與 NC 真 Runtime 介面接入

Base: V87 commit `72839433188a460f173b0f3d3ed2f2c08d181796`. Candidate branch: `integration/v88-manus-runtime-gpt`.
Source of design: V87 Manus final delivery; only UI layout principles are adopted. Neither Manus candidate `app.js` nor its machine SVG is mounted.

## Actual implementation
- Load additive V88 CSS/JS from the original `mobile-runtime.html`, after the V86 adapter.
- 6AX desktop MACHINE: retain the **original WebGL canvas**, maximize it with NC collapsed, or show a 72/28 canvas/NC split with NC expanded.
- 6AX NC_FIRST: show original source editor on the left and true simulation viewport on the right. No copied textarea or duplicate execution handler.
- 6AX touch/mobile: retain original AIG dock, switch its code/view pane through existing dock buttons when the original V86 NC drawer is pressed.
- CAD/CAM/NC <=720 px: stack the original work areas instead of clipping sideways. No core rerouting.
- Append one honest LOCAL DRAFT / OFFLINE, machine-output BLOCKED note beside original runtimeStatus telemetry. No generated CNC numeric evidence.
- Update offline PWA asset list/cache revision for these two new files; unchanged CNC source and runtime handlers checked byte-for-byte by static Gate.

## Safety and verification boundary
- The static Gate compares the original Git blob SHA of `mobile-runtime.html` and `service-worker.js` after stripping only these additive changes.
- Layout source readiness is not proof of cutting, collision checks, Fanuc compatibility, 0.001 mm precision, executable APK or EXE.
- **Not deployed.** No Render production branch changes; no physical machine connection, and no machine output.
- Still required: actual desktop 3840x2160 + Android 1440x3088 browser screenshots, NC drawer show/hide and NC_FIRST round trip without G-code state loss, click/callback regression, true material removal and CNC safety Gate, APK/EXE tests.

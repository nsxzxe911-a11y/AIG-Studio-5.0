# V80 — Web / Windows Formal Runtime Parity Contract
Decision: Windows formal approved RGB Runtime is the primary design and interaction authority. Web desktop MUST match Windows desktop in page layout, navigation, control placement, command semantics and state rendering. Mobile Web may reflow layout for touch but must retain function parity.
Scope: HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI and dedicated 3D toolpath workspace.
Shared identifiers: Page ID, Subpage ID, Button ID, Command ID, callback, runtime state, output/error status. Every control must resolve to the same semantic command on Web and Windows.
Geometry and manufacturing: 0.001 mm numeric target; coordinate/origin contract; CAM manual-first and NC-first; 3–6AX axes; Fanuc post/parse; collision/material-removal evidence. Identical source logic or verified behavioral parity is required, not asserted.
Visual: independent approved per-page authority and RGB skin; no engineering shell in user-facing Runtime. Central machining viewport remains dominant; no overlays or hidden primary buttons. Desktop 3840x2160 reference; responsive mobile separate layout.
Release Gate: compare screenshots (Windows vs Web at matching desktop viewport), manifest digests, click/callback coverage, deterministic geometry/CAM/NC fixtures, safety tests, offline launch and performance. Any missing proof BLOCKS parity claim.
Known status: CONTRACT DEFINED ONLY. Windows build and Web currently not proven identical; no automatic deployment or verified end-to-end parity.

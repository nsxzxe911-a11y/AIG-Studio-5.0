# FastModel 6.9.4 — Defective technical humanoid quarantine

The user's actual Android screenshot of FastModel shows a badly disfigured ragdoll-like GLB (detached ponytail/head geometry, blocky facial shapes and limbs) with 3D recording disabled. The local procedural 6.4 and earlier AIG 5.x generators produce **technical proportion-based rigs**, not a user-approved likeness of the heroine or a release-ready rendered character.

**Fix shipped in source:**
- Unified RGB starts in compact Create, now adds a visible empty-preview information area until a real photo/story animation exists (does not show a blank black window as a completed result).
- 3D has a real guarded state: NO_MODEL shows a clear non-ready panel; TECHNICAL GLB is kept in memory, downloadable/testable under explicit technical inspection but **hidden from the large default character preview** and never treated as the approved heroine; an explicitly imported user GLB is viewable while still labeled unapproved.
- The original input event IDs, 6.4 GLB generator, 5.x technical exporters, GPU QA, cinema recording controls and associated feature tests remain on the page. Separate buttons now return to Create and open the existing local GLB picker. The long experimental controls are collapsed under an Advanced details section.
- AUTO does **not** choose real 3D clips from a technical internal GLB merely because those clips exist; it selects proven 2D/2.5D with the actual photo. Explicit real 3D imported user GLB still requires its real clips.
- Source gates plus actual Chromium 360px and desktop 1440px must demonstrate no blank/corrupted technical 3D being presented as a finished heroine. Browser QA is not artistic approval.
- **Not claiming:** that the low-quality GLB mesh was repaired, photorealistic 3D made from one photo, anime style matched, audio-viseme sync validated or heroine 1080p film delivered. Any of these remains BLOCKED until a true visual output and human review.

Release remains preview-only, original AIG Render website, no CNC changes and no third-party reconstruction service.

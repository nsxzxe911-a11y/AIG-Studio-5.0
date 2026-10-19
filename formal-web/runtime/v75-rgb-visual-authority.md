# AIG Dual Project — RGB Visual Authority / 2026-10-19
Source: user-supplied CAD reference screenshot in conversation. This document is a design contract; image binary is not yet committed to the repository.
Applies: AIG-II and AIG Studio 5.0, Web / Android / Windows.
- Formal runtime must not expose engineering shell. Engineering diagnostics only via Settings > Maintenance > Engineering.
- Desktop: top persistent HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI navigation; left page-specific tools; central dominant working canvas; right properties/coordinates/actions; bottom status/layers/AI.
- Mobile: rearrange panels into accessible tabs/drawers, never scale a desktop screenshot as the functional UI; preserve unobstructed canvas.
- RGB glass aesthetic: near-black #020407, panels #07111B, cyan/blue/purple RGB accents, clear selected/pressed/disabled/alarm states.
- All visual controls must be native interactive components mapped to stable Page ID / Button ID / Shared Command / callback / status. No image-only fake controls.
- Each page and subpage gets its own matching artwork and layout; do not substitute a machine reference photo for a whole UI screen.
- No automatic CNC machine output; safety and real CAM/SIM/NC gates remain separate.
- Acceptance: desktop and mobile screenshots for each page, no visible engineering shell, no obscured or offscreen primary controls, callback/state tests, visual comparison to user-approved authority.
Status: DESIGN AUTHORITY CONFIRMED; visual asset ingestion, complete runtime reconstruction, browser tests, and deployment pending.

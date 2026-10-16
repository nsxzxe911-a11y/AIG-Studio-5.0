# Web Authority Completion V1 Design

## Goal
Finish the formal Web Runtime surface contract without allowing any missing page or missing visual asset to fall back to an engineering shell.

## Binding baseline
- Base commit: `3bdeed6cb4a504a65b23ba9ad355ba34d2af0e9b` (Builder #588).
- Versions only move forward; no regression, rollback, or downgrade.
- Existing user-approved Authority assets are preserved and are never overwritten or relabeled.
- A missing page image means `APPROVED_ASSET_PENDING_INGEST`; it does not authorize Engineering/Debug UI.
- Until an approved image exists, the formal page uses the same procedural BLACK RGB Glass design language.

## Formal surfaces
The top formal navigation is exactly: HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI.

Every formal surface must render inside the product frame with BLACK RGB Glass styling, production controls, and a real runtime binding. Utility pages may remain nested but may not replace formal surfaces.

## Asset identity
Formal Web Runtime code must not reference `engineering-assets/` directly or indirectly as a release visual fallback. User-approved assets retain their provenance and SHA. Surfaces that do not yet have a user-approved full-page image remain explicitly provisional and use procedural RGB Glass rather than pretending an unapproved image is approved.

## AI surface
AI is a formal page, not a dialog-only or engineering utility. V1 exposes local project-context status, Working Copy / Verified Main / Immutable Vault states, and CAD/CAM/SIM/NC context indicators without enabling machine output or weakening CNC safety.

## Gate behavior
Focused Web gates must fail when:
- AI is absent from formal navigation.
- A required formal surface is absent.
- Web Runtime references `engineering-assets/`.
- HOME is not the default route.
- a missing approved asset is represented as an engineering shell instead of procedural RGB Glass.

## Non-goals for this subproject
This subproject does not claim every CAD/CAM/SIM/NC core function is complete. Those cores are audited and closed in separate focused subprojects after the Web formal-surface contract is green.

# AIG REVERSE ENGINEERING EXECUTION V1

This is the active execution rule for AIG project reverse engineering.

## Product boundary
AIG formal pages: HOME / CAD / CAM / SIM / 3AX / NC / AI.
BOOT / LOGIN / SETTINGS / PROJECT are allowed utility pages.
4AX / 5AX / 6AX belong to AIG-II and must not leak into AIG formal Runtime.

## Continuity first
At every resume, read current branch, HEAD SHA, recent commits, latest successful and failed workflow, artifacts, manifests, runtime screenshots, and BLOCKED/PENDING markers.
Classify evidence as CONFIRMED / FAILED / BLOCKED / UNKNOWN / NEXT.
Never redo verified work. Never rollback or downgrade.

## Reverse the real call chain
Do not trust filenames or UI labels. Trace actual references:
ENTRYPOINT -> PAGE -> CONTROL -> BUTTON ID -> COMMAND ID -> SHARED STATE -> RUNTIME -> CORE -> RESULT -> UI UPDATE.
The first missing or false link is FIRST BROKEN LINK.

## Truth classification
Every control/function is classified REAL / PARTIAL / DISPLAY_ONLY / BLOCKED / DEAD / FAKE.
A state string is not proof of a real core operation.
SAVE must persist. CAM must generate real path nodes. SIM must change stock/material. NC must parse real program state. AI must read real project context.

## Debug rule
For every failure record EXPECTED / ACTUAL / FIRST DIVERGENCE / ROOT CAUSE / AFFECTED FILES / MINIMAL FIX / REGRESSION RISK / VERIFICATION.
Fix only the first true divergence. Asset problems do not justify core rewrites. CSS problems do not justify CAM rewrites. Gate bugs do not justify product architecture changes.

## TDD / verification
Focused test first. Watch RED for the intended reason. Apply the smallest GREEN patch. Then run module/integration checks, launch Runtime, capture fresh screenshot, verify callback/state evidence, and finally regression relevant to the changed layer.
No fresh evidence means no PASS.

## UI / Authority
Authority is the visual acceptance source, not functional identity. Functional identity uses Page ID / Subpage ID / Button ID / Command ID.
Runtime must use real controls. Baked values, messages, errors, coordinates, feed, spindle, or other changing data never count as Runtime output.
No Engineering Shell as formal HOME.
No image upscale may be claimed as native 4K.

## Scope contamination
Before AIG Runtime acceptance, scan formal UI and active product routes for 4AX / 5AX / 6AX and rotary-axis-only content. Shared legacy/core code may remain only when isolated from AIG product surface.
If an approved source image itself contains wrong-project visual cues, preserve the source unchanged and mark SOURCE_SCOPE_CONTAMINATION. Runtime may mask the contaminated visual region with real AIG state, but this is a derived runtime treatment and must not be relabeled as a corrected source Authority.

## Disconnect recovery
Checkpoint every successful stage with branch / HEAD SHA / tests / results / artifact or screenshot / known blockers / NEXT.
After disconnect, resume that checkpoint instead of restarting.

## Completion report
Report only CURRENT HEAD / COMPLETED / FIXED / VERIFIED / FAILED / NEXT.
Never equate code written, CI green, mockup appearance, or an Authority image with final product PASS.

READ BEFORE WRITE.
TRACE BEFORE FIX.
FIX FIRST DIVERGENCE.
VERIFY BEFORE CLAIM.
KEEP GOOD WORK.
NEVER ROLLBACK.
NEVER FAKE PASS.

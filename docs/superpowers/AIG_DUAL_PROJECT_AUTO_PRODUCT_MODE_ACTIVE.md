# AIG Dual-Project Auto Product Mode — ACTIVE

Date: 2026-10-18
Priority: HIGHEST
Status: ACTIVE / USER APPROVED
Execution: Forward-only / Fail-Closed / Checkpoint-resumable

## Binding instruction

Resume from the newest verified checkpoint and continue until the Dual-Project Single-Gate finished-product contract is satisfied.

Execution chain:
`latest trusted checkpoint -> Authority/Registry exact mount -> real UI wiring -> core closure -> Android/Windows/Web -> Dual-Project Single-Gate`

## Binding documents

1. Design/spec:
`docs/superpowers/specs/2026-10-18-aig-dual-project-auto-product-mode-design.md`

2. Implementation plan:
`docs/superpowers/plans/2026-10-18-aig-dual-project-auto-product-mode.md`

This ACTIVE marker records the user's explicit approval of the execution mode and supersedes any earlier document header that still says review pending. The content of the approved design remains binding; implementation still follows the plan task-by-task with RED->GREEN verification.

## Product scope

AIG-II:
`HOME / CAD / CAM / SIM / 3AX / 4AX / 5AX / 6AX / NC / AI`

AIG:
`HOME / CAD / CAM / SIM / 3AX / NC / AI`

AIG does not mount `4AX / 5AX / 6AX`.

## Visual authority

Use the approved AIG-II RGB revision chain as the single visual authority source for both projects' shared pages.

Per-page lineage:
`10/5 RGB baseline -> approved Mobile/Desktop revision -> last approved page revision -> Runtime mounted Authority`

Runtime lookup is exact `Authority ID / Registry / SHA` only.
No filename similarity, semantic similarity, recency, or generated-image fallback.

## Fail-Closed rules

- No rollback.
- No restart from zero.
- No fake PASS.
- No wrong-image substitution.
- No Engineering shell as formal product UI.
- No product mutation to compensate for TOOL/SERVER/NETWORK failure.
- Any required Gate FAIL => overall BLOCK.
- Every completed unit records `STEP / INPUT SHA / OUTPUT SHA / PASS-FAIL / EVIDENCE / NEXT STEP`.
- After disconnect, resume from git + checkpoint ledger, not conversational memory.

## Completion claim

Only claim final completion when the joint Gate has evidence for both projects, all required platforms, exact artifact/Authority SHAs, formal RGB Runtime, real callbacks/core results, and all required Gate families.

Final success token:
`DUAL_PROJECT_SINGLE_GATE_PRODUCT_PASS`

# AIG V66 RGB Workspace — 6AX Visual Reference (NOT mechanism authority)

- **Asset ID:** `AIG-WEB-V66-RGB-6AX-VISUAL-REF-001`
- **Source:** user-reviewed AIG V66 conceptual workspace image (1672×941 PNG).
- **Image SHA-256:** `f04145f01858b8ea6ea3a30f7b1f9d21681c49a2e56b538b89effab904ae13a5`
- **Classification:** RGB UI visual / layout reference — **not a validated 6-axis machine model or kinematic authority**.
- **Approved inspiration:** black #020407, semi-transparent RGB-bordered buttons, large 3D machining viewport, adjacent tool/axis/NC panels, platform-specific phone layout.
- **Not approved as machine geometry:** this concept depicts a substantial enclosure despite the user's previously approved **open, no outer shell** 6AX mechanism.
- **Workpiece contract:** blade/impeller is an interchangeable `WORKPIECE`; never bake it into the machine.
- **Machine contract:** separate `FRAME`, `XYZ`, `SPINDLE`, `A`, `B`, `C`, `CHUCK`, `TOOL`, `WORKPIECE`. Distinct axis nodes and explicit kinematic hierarchy.
- **Safety:** labels X/Y/Z/A/B/C and a static image do **not** prove a six-axis mechanism. Six controllable DoF, mechanical assembly, motion ranges, actual axes transformation, collision envelopes, inverse kinematics, and CNC post/TCP must be independently tested before claiming 6AX.
- **Keep separate:** RGB workspace style authority ≠ real 6AX mechanism ≠ machine-cutting/SIM safety Gate.
- **Asset status:** image held in generated local handoff package; **image binary has not been committed to GitHub**. Reference metadata/checksum only.
- **No deployment:** V66 reference registration does not change the Render site.

## Machine suitability review

The visualization clearly presents a vertical spindle, trunnion/cradle fixture and a HUD with XYZABC. It does not visibly establish three **independent** rotational degrees of freedom. The assembly could be a 5-axis trunnion arrangement with a C readout. Therefore this picture may be labeled **6AX UI concept**, never **6AX mechanical PASS**.

## Acceptance milestones

1. Build or ingest real no-enclosure structural 3D GLB with independent A/B/C pivots.
2. Verify animations for A, B, C one-at-a-time and combined, with distinct matrix transformations and exact axis states.
3. Confirm tool, clamp, stock/workpiece are detachable and can be reloaded.
4. Run sampled swept collision tests against moving parts and travel boundaries; unknown or missing machine post must fail closed.
5. Test independent Android / Windows viewport without injecting fake results or changing existing NC state.

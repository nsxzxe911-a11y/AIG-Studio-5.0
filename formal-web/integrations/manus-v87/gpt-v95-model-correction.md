# AIG V95 — 6AX Model Display Repair

Cause: prior visual-only GLB rendering removed static frame/bridge/rear B supports and WORKPIECE in the attempt to make a single-arm model. It distorted the machine. The HOME preview also used non-uniform model matrices to transform normals directly and washed out the materials with a strong blue blend; orbit did not compute actual mesh bounds.

Repair: preserve fixed frame, bridge, B bearings, workpiece and vertical spindle while suppressing only the redundant moving left A/B arm cluster. Render the same visible profile in HOME and real 6AX native renderer. Use inverse-transpose normal matrix, more neutral lighting and camera fit based on transformed mesh extent.

Automated checks: retained components, valid geometry bounds and completed actual WebGL draw, real navigation 4K and S23 screenshots, source CNC unchanged.

Mechanical fidelity: Visual V9.3 remains provisional; it is not a certified fixed-Z single-arm machine or collision-free CNC model. CNC machine output remains BLOCKED, and HTML/RGB approved-pixel visual match is still a separate gate.

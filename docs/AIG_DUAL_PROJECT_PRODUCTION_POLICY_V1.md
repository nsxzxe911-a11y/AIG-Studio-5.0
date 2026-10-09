# AIG Dual-Project Production Policy V1.0

## Core rule
AIG-II and AIG CNC are produced in the same round. A page is not considered complete by looking at only one project.

## Two final core departments
1. Programming Department
2. 3D Animation Art Department

The Programming Department must read the approved AIG RGB reference before implementing page structure, callbacks, Shared Contract wiring, Runtime commands, and result/state writeback.

The 3D Animation Art Department owns the production visual language, machine/tool/workpiece appearance, RGB materials, axis visual distinction, and real CAM/SIM motion presentation. Visual motion must be driven by real runtime state; visual-only fake motion is prohibited.

## Mobile and desktop are separate UI art products
Android uses the AIG RGB MOBILE asset/layout family. Windows uses the AIG RGB DESKTOP/CONSOLE asset/layout family. They share product identity, Shared Contracts, Runtime truth, localization keys, and functional inventory, but do not share a single fixed layout.

## Same-round page matrix
HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC/G-code, AI, Settings, Link Manager, Files/Projects, System Monitor.

Every page must deliver in the same round: approved RGB reference, page layout, real buttons, callbacks, Shared State binding, Runtime command, result/state writeback, localization keys, error/status display, Android screenshot, and Windows screenshot.

## Comparison rule
Compare AIG-II Android against AIG CNC Android, and AIG-II Windows against AIG CNC Windows. A missing page, callback, visual asset, or unexplained Runtime result difference blocks that page. This is how the two projects expose what is right and what is missing.

## Prohibited shortcuts
Engineering shell as product UI, fake/no-op buttons, fake connection/runtime state, one fixed layout stretched across phone and desktop, and programming a product page before reading its approved AIG RGB baseline.
# AIG RGB Full UI/UX Expansion Spec

Status: `SPEC_LOCKED / WAIT_EXECUTION`
Scope: AIG-II + AIG Studio 5.0
Purpose: lock the next product-expansion requirements without starting implementation yet.

## 1. Non-negotiable product rule

Every main page and every subpage must remain a formal AIG RGB product surface. Opening any child page, tool page, settings page, editor, dialog, inspector, machine page, or advanced page must never fall back to an engineering shell, test dashboard, runtime shell, placeholder workspace, or generic debug panel.

Forbidden fallback markers include: `runtime-shell`, `dual-runtime`, `product-pane`, `engineering shell`, `test dashboard`, generic placeholder/debug UI.

If a function is not ready, the route must still render inside the same formal RGB design system and report a controlled disabled/not-ready state. It must not replace the product UI with an engineering shell.

## 2. Formal main-page families

The formal navigation/product families include at minimum:

- HOME
- CAD
- CAM
- 3D Toolpath / Toolpath View
- SIM
- 3AX
- 4AX
- 5AX
- 6AX
- NC
- AI
- Settings

Product capability manifests may decide which axis pages are exposed per product build, but the shared page contract and RGB design system remain common.

## 3. Required RGB subpages

### HOME / Project
- Recent projects
- Project create/open/save/save-as
- AutoSave / Recovery
- Local-first status
- Cloud/Drive sync status
- Conflict resolution
- Device/runtime status
- Quick resume

### CAD
All existing and planned CAD functions must remain available. Button-count reduction is allowed only by grouping commands; no function may disappear.

Required CAD function groups:
- Draw: Line / Polyline / Rectangle / Circle / Arc / Hole
- Corner: Chamfer / Fillet
- Modify: Trim / Extend / Offset / Move / Copy / Rotate / Mirror / Scale
- Pattern: Linear Array / Circular Array
- Selection: single / multi-select / window / crossing
- Constraints/SNAP: endpoint / midpoint / center / intersection / horizontal / vertical / tangent
- Dimension: linear / aligned / radius / diameter / angle / driven dimension
- Layers
- Text / annotation
- Origin / coordinate tools
- Photo Align / Photo Scale
- Undo / Redo
- Open / Save / Import / Export

#### CAD one-button multifunction UX
To prevent toolbars from becoming a wall of buttons while preserving every function:
- short tap = execute the primary/recent command
- long press or expansion tap = open the full command family
- selected command remains visible on the multifunction button
- contextual options appear only when relevant
- mobile uses grouped command trays; desktop may expose shortcuts in parallel
- all child commands require stable Button-ID -> Shared Command -> Runtime/Core binding
- hiding a command from the first toolbar level does not remove the command from the product

Recommended formal multifunction families:
- SMART DRAW
- SMART EDIT
- SMART CORNER
- SMART PATTERN
- SMART DIMENSION
- SMART SNAP
- SMART PHOTO
- SMART FILE

### CAM
- CAM Source: AUTO / MANUAL
- Rapid strategy selection
- Rough / Finish / Contour / Pocket / Drill
- G41 / G42
- Tool selection
- Diameter / depth / feed / spindle
- Safe-Z
- lead-in / lead-out
- tool-change point
- machining region
- inside/outside direction
- manual point-by-point toolpath
- G0/G1 node editing
- 4AX/5AX/6AX A/B/C node editing when applicable
- fixture/clamp avoidance
- toolpath list and property inspector
- post preview

### 3D Toolpath / SIM
- 3D toolpath view
- stock / finished part comparison
- true material-removal view
- Play / Pause / Stop / Reset / Single Block
- playback speed
- camera presets
- collision/interference view
- tool / holder / fixture visibility
- G0/G1/G2/G3 visibility filters
- removed-volume and coordinate evidence
- analysis / warning panel

### 3AX / 4AX / 5AX / 6AX
Each supported axis family requires formal RGB pages for:
- Live machining
- NC-first workspace
- Manual/JOG
- Axis status
- Work coordinate / machine coordinate
- Tool / holder / spindle status
- Camera/view controls
- Program playback
- Feed/spindle override display
- Machine setup
- Safety / limit / collision status
- Axis parameters
- diagnostics/status without engineering-shell fallback

Axis identity:
- 3AX = XYZ
- 4AX = XYZ+A
- 5AX = XYZ+A+B
- 6AX = XYZ+A+B+C

### NC
- G-code editor
- parser/error list
- line-linked error navigation
- 3D path preview
- material-removal preview
- NC-first workflow
- program/subprogram management
- Fanuc post settings
- G90/G54/G43/H
- G0/G1/G2/G3
- canned drilling cycles
- M98/P subprogram flow
- M00/M01 / Block Skip / Single Block / Dry Run
- custom M-code management
- machine-output safety gate

### AI
- CAD context assistant
- CAM strategy assistant
- NC/G-code assistant
- parser error explanation
- collision/toolpath analysis
- setup guidance
- project context summary
- teaching/tutorial view
- Working Copy / Verified Main / Immutable Vault status

## 4. Additional formal product pages that must exist

### Tool System
- Tool Library
- Tool Manager
- holder library
- tool assembly
- tool geometry
- tool number / H offset
- wear/offset data
- feeds & speeds presets
- tool life/status
- CAM tool assignment

### Stock / Fixture / Workholding
- stock definition
- fixture library
- vise / chuck / clamps
- placement / orientation
- keep-out zones
- collision participation
- assembly view

### Machine Setup
- machine profile
- supported axes
- rotary-axis configuration
- travel/soft limits
- machine origin / work origin
- kinematic parameters
- controller profile
- Fanuc compatibility profile

### System Settings
Must use the same formal RGB style and Shared Settings Contract.

Required categories:
- Language
- Renderer backend
- GPU / 3D policy
- FPS: Auto / 120 / 90 / 60 / 30
- Quality
- Power / thermal policy
- RGB intensity/effects
- HUD
- precision (0.001 mm)
- display/layout scaling
- mobile/desktop adaptive layout
- input / S Pen / keyboard shortcuts
- local storage / AutoSave / Recovery
- Google Drive sync
- network/cloud status
- CONNECT / DISCONNECT module semantics
- update/version information
- Maintenance -> Engineering only as a non-default maintenance route

### Display / View Settings
- UI scale
- panel density
- viewport size
- HUD density
- grid / origin / axis visibility
- toolpath visibility
- stock / fixture visibility
- transparency
- PBR/material quality
- camera behavior

### File / Data / Recovery
- project browser
- import/export
- recent files
- recovery snapshots
- autosave history
- local/Drive sync state
- conflict resolution

## 5. AI-generated subpage layout rule

AI may generate and optimize missing subpage layouts automatically, but it must obey the formal design contract:
- background `#020407`
- panel `#07111B`
- AIG RGB Glass states: Normal / Pressed / Selected / Disabled / Alarm
- same product header/navigation language as the parent page
- responsive mobile and desktop layouts
- machining viewport must remain dominant where applicable
- safety-critical actions are visually separated
- all generated controls receive stable Button-IDs
- all functional controls bind to real Shared Commands/core callbacks
- no whole-image fake UI
- no engineering-shell fallback

AI-generated layouts are allowed to reorganize density and grouping, but may not delete required functionality.

## 6. Page growth is allowed

The product is not limited to the original top-level pages. Additional formal RGB pages/subpages may be added whenever they improve CNC/CAD/CAM workflow, provided they follow the shared product contract and do not replace approved main-page Authority identities.

Examples include:
- Tool Library
- Tool Setup
- Fixture / Assembly
- Machine Setup
- Display Settings
- Renderer Settings
- Coordinate Setup
- Post / Fanuc Settings
- Custom M-code
- Collision Analysis
- Diagnostics
- Project Recovery
- Sync
- Tutorials

## 7. Acceptance rule

A page/subpage counts as product-complete only when all applicable items are true:
- formal RGB UI present
- parent/child navigation stays in the product shell
- responsive mobile/desktop layout
- stable Button-ID manifest
- real callback/command binding
- state change/status feedback
- core connection where applicable
- no engineering shell
- no fake button
- no image-only fake runtime
- screenshot/runtime evidence exists
- errors stay isolated to the module/action and never reset the whole product

## 8. Execution hold

This document is requirements-only. Do not begin the UI expansion from this commit alone. Start implementation only when the user explicitly resumes execution.

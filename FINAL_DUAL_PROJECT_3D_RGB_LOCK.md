# Dual-Project FINAL 3D + RGB Lock

This file is release-authoritative for both AIG-II and AIG Studio 5.0.

## Shared hard requirements
- Real 2D editable geometry only. No decorative or pre-rendered geometry presented as editable CAD.
- Real 3D engine driven from project geometry / stock / toolpath / simulation data.
- Android must render and interact with the 3D machining view; desktop-only 3D is not sufficient.
- Real CAM toolpath generation. A non-empty UI without generated machining data is not PASS.
- Real machining visualization must distinguish rapid, cutting, safe-Z, entry, exit and direction.
- Material-removal simulation must be derived from the generated toolpath and tool diameter/depth.
- 3D view must support rotate, zoom and pan.
- 0.000 is display formatting / origin display. 0.001 mm is the numeric precision contract.
- RGB is functional state UI: current page/tool/status/warning only; lighting must not substitute for functionality.
- Layout must be adaptable for portrait/landscape and may differ between the two projects.
- Buttons, displayed numbers and visual machining results must be connected to real state/data.

## Zero-tolerance blockers
Any of the following blocks FINAL:
- fake/static 3D presented as runtime 3D
- placeholder machining result
- hard-coded status or machining number presented as live data
- button without real action/state/data change
- CAM screen with no generated toolpath
- simulation screen not derived from toolpath/material removal
- 3D machining unavailable on Android
- layout overlap that blocks operation
- regression of 0.001 mm precision

## Project split
### AIG-II
Primary emphasis: 3D machining runtime, CAM/SIM/5X integration, mobile operation.

### AIG Studio 5.0
Different UI language is allowed, but must reach the same real 3D/CAM/SIM/no-fake standard.

## Department execution order
1. Engine: 2D geometry, 3D mesh, tool/workpiece, mobile rendering.
2. UI: RGB state lighting, adaptable layout, typography/spacing.
3. Interaction: real actions, touch/gesture/S Pen conflict control.
4. CAM/SIM: toolpath, safe-Z, removal, machining direction.
5. Gate: no-fake scan, precision, Android launch, 2D→CAM→3D→SIM chain.

FINAL is allowed only when the implementation and automated evidence satisfy these requirements.

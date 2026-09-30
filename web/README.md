# AIG CNC Web UI/UX Prototype

This branch starts from a clean production-facing UI/UX shell instead of reusing the old engineering workstation root.

## Goals

- Traditional Chinese first, technical codes retained.
- One responsive UI for Android-class mobile screens and Windows desktop widths.
- Direct HOME entries: CAD / CAM / SIM / 3AX / 4AX / 5AX / NC / AI.
- RGB glass interaction states and large touch targets.
- Destructive controls visually separated.
- No maintenance/network/system engineering chrome mixed into normal machining pages.
- UI prototype only: no CNC machine control or NC execution is enabled here.

## Preview

Open `web/index.html` locally, or deploy the `web` directory with GitHub Pages.

## Next

1. Replace placeholder stage with actual 2D CAD canvas.
2. Add 3D/4AX/5AX WebGL model scene.
3. Connect existing CAD/CAM/SIM data contracts after UI acceptance.
4. Keep maintenance in a separate HOME-only entry.

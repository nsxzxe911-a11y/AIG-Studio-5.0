# AIG II / AIG CNC Mobile Page Skin Replacement Design

## Purpose
Replace the current mixed/narrow mobile page surfaces with the newly saved AIG II RGB pages, remove the visible MULTIFUNCTION page, promote its approved content to HOME, and make every top-level page feel like one continuous product when flipping pages.

## Scope
Applies to both AIG CNC and AIG-II Android Runtime pages: HOME, CAD, CAM, SIM, 3AX, 4AX, 5AX, 6AX, NC, AI. This is a Fast Loop preview replacement first; current generated images remain REFERENCE_ONLY until formal 1440×3088 masters exist.

## Approved preview asset mapping
- HOME: `E:\AIG-10\ChatGPT 圖像 2026年10月11日 上午08_39_58.png` (941×1672, SHA256 `55408281cbc57e487e64f38b4b99161580a39c651b4b99aa5c10a19df3ec71d8`), selected because it is the approved multifunction-derived HOME without a phone-shaped outer bezel.
- CAD: `...上午08_53_12-1.png` (856×1836, SHA256 `742d9fbe1f92f004712dab6f4011160954b83d21789c37cf3db58c2ce9662b10`)
- CAM: `...上午08_53_14-2.png` (856×1836, SHA256 `507dfa0dd85b891a55fa1102c8ae6509cfaea605c16e18d3d53f98a3e08e547a`)
- 3AX: `...上午08_53_15-3.png` (856×1836, SHA256 `b52968cba8e09824a8bf39f561543edd8cde7d7d70557cc3e66d0502ab74b7bf`)
- 4AX: `...上午08_53_16-4.png` (856×1836, SHA256 `784b3ee1273a68308ac024620774dc7f0aacbfcc90c82ad2c5b0684451aafa50`)
- 5AX: `...上午08_53_18-5.png` (856×1836, SHA256 `3f8faaa2c261891f6c9b0bacc8f4fedbde9e106293ca4fb7d7687c197d4b1c32`)
- 6AX: `...上午08_53_20-6.png` (856×1836, SHA256 `eff6f369f8f70e286d26fec1708f14ffc47d26c94e05fc684ee5b0ca736b9561`)
- NC: `...上午08_53_21-7.png` (856×1836, SHA256 `253b642139195f0f4cb70c0e8823fde54612f1f1861d4422592f09ccb20ccbbe`)
- AI: `...上午08_53_23-8.png` (856×1836, SHA256 `3413ce32f77909e5133757fcd9c80905c753c08e3a77c617f2efe7885e8212f0`)
- SIM: `E:\AIG-10\霓虹 CNC 智慧加工模擬儀表板.png` (941×1672, SHA256 `c78fc52cf46e2778616469fb56137b667548e03648ac68c9e667e908f3de3d12`), selected because it has no phone-shaped outer bezel and already matches the shared HOME navigation geometry.

## Shared navigation contract
All pages expose exactly the same top row in the same order: `首頁 / CAD / CAM / SIM / 3AX / 4AX / 5AX / 6AX / NC / AI`.
The button bounds, spacing, Y position and touch targets are defined once from a normalized reference contract and reused on all ten pages. Only the selected/highlighted state changes per page. No page may add a second global ribbon above or below the skin.

## MULTIFUNCTION removal
MULTIFUNCTION is removed from visible navigation and may not have its own page surface. Existing `PageId.MULTIFUNCTION` / `SceneId.MULTIFUNCTION` references remain temporarily for compatibility, but any navigation to them redirects to HOME. The previous multifunction dashboard content is now the HOME product surface.

## Adaptive width policy
The formal mobile aspect ratio remains 1440×3088, with 1080×2316 and 720×1544 variants. When the actual portrait viewport is wider than that ratio (for example Nox 2160×3840), do not use CONTAIN letterboxing.

Use one `AdaptivePageTransform` for skin rendering, hit-testing and dynamic overlays:
- normal target-ratio phones: proportional fit to the full viewport;
- wider portrait viewports: map reference X coordinates across the full viewport width and reference Y coordinates across the full viewport height (`scaleX = viewportWidth / referenceWidth`, `scaleY = viewportHeight / referenceHeight`);
- no black side bars;
- no top/bottom crop;
- all image-backed hitboxes and live overlays use the exact same transform as the skin.

This intentional horizontal expansion is a preview/runtime adaptation for wide emulators. Formal release masters still target 1440×3088 and must pass the existing formal asset gate.

## Runtime truth rules
The skin is static art only. Existing real CAD/CAM/SIM/3AX–6AX/NC/AI callbacks, state, 3D scenes, toolpaths and NC/AI runtime remain authoritative. Demo numbers baked into an image must never be treated as live data; where a page has live data zones, the static content is covered and replaced from real runtime state. Buttons without a real action remain disabled/not hit-testable.

## Preservation requirements
- Keep CAM image-backed command wiring already verified in focused tests.
- Keep SIM real material-removal/runtime overlay behavior while replacing the visible skin.
- Preserve One Scene / One Renderer / No Overlay semantics for 3AX–6AX.
- Do not reintroduce Engineering Shell or a second navigation layer.
- Do not package release APK/EXE during page-by-page Fast Loop work.

## Verification
1. Asset/SHA gate: every mapped preview asset must match its exact SHA before enabling its image hit-map.
2. Shared navigation regression: every page returns identical normalized top-nav bounds and only the active page state differs.
3. Adaptive transform regression: 1440×3088, 1080×2316, 720×1544 and Nox 2160×3840 all map the reference full-width without black side bars; hitbox centers still hit the intended page.
4. Runtime-focused regressions for CAD/CAM/SIM and axis pages must stay green.
5. Nox manual sequence: `HOME→CAD→CAM→SIM→3AX→4AX→5AX→6AX→NC→AI→HOME`; capture one screenshot per page so missing/incorrect pages are obvious.
6. MULTIFUNCTION must not appear in the visible navigation and any legacy route must land on HOME.

## Success criteria
On Nox the pages occupy the usable width instead of appearing as a narrow centered strip. Flipping pages preserves the same top navigation geometry and selected-page highlight, with no duplicate chrome. All ten mapped pages can be viewed consecutively so remaining missing or undesirable pages can be identified visually before formal high-resolution asset production.

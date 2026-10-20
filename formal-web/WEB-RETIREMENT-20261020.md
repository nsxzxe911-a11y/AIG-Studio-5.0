# AIG decommission record — Web V90–V95 withdrawn

Decision: User explicitly ordered deleting the later lower-grade Web workspaces, keeping native AIG-II and AIG Studio Android APK and Windows EXE source/artifacts unmodified. The scheduled automatic Web redesign was disabled separately.

This change removes from the current formal-web tree the 12 generated preview/workspace JS/CSS/HTML V90–V95 assets, removes legacy V86 and V90 standalone preview files, replaces the now-invalid 2 direct workbench entry HTML pages with minimal retired notice and points index menus to native release status. It does not delete Git history or any native Android/Windows sources. Exact historical evidence is still traceable to predecessor commit cd4e19b102d67678b7048575c79beb4c8e5ff4d3 and earlier.

It intentionally does not delete localStorage/IndexedDB/G-code/CAD/CAM/NC drafts. A local-only browser backup helper lets the current device export its matching CNC working keys without account/auth data and without network transfer. Other devices must export from their own browser.

The original marketing/dual-project information portal, user-approved visual library, native GitHub Release links, FAQs and guides remain. AIG-II is private and requires authorized login; historic Studio downloads are NOT represented as the latest native builds. The old Web model/simulator cannot be called product PASS.

Acceptance: source test verifies 12 removals, the portal links, PWA offline safe cache, no local data deletion, plus 4K and S23 Playwright screenshot and backup download. Render must be exactly the matching formal branch SHA and LIVE before claiming public withdrawal complete.

Known history: Web V91–V95 were successive commits on one formal URL, not five simultaneously active deployed binaries. This retirement prevents them from being counted as independent current product versions. Release builds remain FOUR: two native projects each with APK and EXE; Web is a public management/updates site, not another low-spec runtime.

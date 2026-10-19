# AIG V89 — NC-first 原始程式 / 工作副本 / 切頁狀態接回

Parent checkpoint: V88 `7a4f51f4d4f06180acda66f2ab71c4672e362d3b`.

## Genuine source path
- `aig-code-6AX`: original saved NC main program. **Only the original SAVE button or standalone NC SAVE writes it.**
- `aig-nc-working-copy-6AX-v89`: local-only unsaved edit, revision + updatedAt + baseMain.
- 6AX tab switching never creates or reloads the WebGL/NC editor. DOM snapshot check confirms source editor/canvas remain the same and progress/volume do not regress by switching.
- Reload/NC page: pending draft explicitly recovered or explicitly imported into the independent NC editor. No automatic overwrite if the independent NC page has unsaved changes.
- Running simulation cannot recover a draft. Explicit Recovery calls original parser; this is not machining verification.
- No automatic machine output. Local PWA offline cache includes V89 styles/logic.

## Gates
- V89 static Gate strips only V88/V89 additive tags and verifies V87 original Runtime HTML Git blob hash and original service-worker hash.
- Playwright Gate exercises 6AX desktop + Android-width real DOM: original NC edits → debounce working copy → MACHINE/NC_FIRST round trip → reload explicit recovery → original save; produces screenshots.
- **CNC numerical material removal/physics, coordinate precision, collision, actual 4K/S23 authority visual comparison, APK and EXE are NOT covered by this UI/browser Gate.**
- **Formal Render remains unchanged until approval and evidence PASS.**

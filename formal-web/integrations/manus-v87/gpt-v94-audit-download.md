# AIG V94 — HOME auto-review and real download routing

The HOME RGB display was kept intact: we added one real button to the original V93 top bar plus a mobile footer shortcut; only one modal in document.body. No fake screenshot and no CNC source edited.

The modal refreshes the public GitHub Actions API for **exact formal branch HEAD SHA**, displays only matching V93/V94 Gate run results, and always labels CNC physical output BLOCKED. GitHub network/CORS/rate-limits show UNKNOWN rather than pretend PASS. It refreshes ~15 minutes only while HOME is open. API calls are read-only and use no GitHub secret.

Downloads come ONLY from existing published (not draft/prerelease) GitHub Release assets with HTTPS github.com browser_download_url under matching AIG-II / AIG-Studio-5.0 repositories. The latest published APK/EXE found are OLD legacy release assets and explicitly labeled non-current web version. No binary is built by V94 web source Gate. Web V94 cannot be advertised as APK/EXE.

4K + S23 Chromium Gate checks native HOME core preserved, simulated API fixtures for CI stability, historical-version warning, 4 real Release URL links, CPC output locked, navigation still works. The test uses fixtures, not a proof of live GitHub API CORS.

Render release requires matching V94 formal-branch test pass + exact deployed SHA. No real CNC machine-output privilege is granted.

Security correction: AIG-II repository is PRIVATE. The homepage does not request its private Releases anonymously and does not expose private asset URLs; it offers an authenticated GitHub Releases link. Only public AIG Studio 5.0 release APK/EXE assets are direct download links. Browser Gate asserts this.

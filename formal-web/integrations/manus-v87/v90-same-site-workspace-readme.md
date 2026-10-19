# V90 Review Workspace on Existing AIG Render Site
Production original: /mobile-runtime.html#HOME (UNCHANGED).
Candidate: /mobile-runtime-v90.html#HOME (V90 native runtime copy + additive V88/V89/V90 CSS/JS).
The original HTML CNC source and service-worker stay untouched; no Manus candidate source is loaded. Main index.html only gains a labelled review link.
Review page runs a same-realm Storage.prototype wrapper for localStorage getItem/setItem/removeItem/clear with namespace AIG_V90_REVIEW_ONLY:. This prevents normal preview localStorage reads and writes from targeting formal project keys. It is a namespace boundary, NOT a security sandbox. Review data is separate from production; don't expect originals to appear here.
Gates: V89 #39288268226 SUCCESS and V90 #39288405323 SUCCESS (Chromium 4K/S23 UI and runtime). Production CNC numerical/visual Authority, collision, APK and EXE Gates remain blocked.
No machine output and no automatic project migration.

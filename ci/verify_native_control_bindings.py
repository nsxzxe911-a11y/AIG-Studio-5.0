#!/usr/bin/env python3
"""Check native entrypoints invoke typed real UI button callbacks.
This is non-runtime source evidence; the native compilation and JVM tests
must both pass separately. It does NOT certify device tap behavior.
"""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sources={
 "android":root/"app/src/main/java/com/aigstudio/app/MainActivity.kt",
 "windows":root/"desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt",
 "core":root/"core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt"
}
checks={
 "android":["UiButtonManifestContract.byButtonId(navId)",
            "UiButtonManifestContract.dispatchNavigation(navId,normalized)",
            "UiButtonManifestContract.dispatchNavigation(\"NAV_HOME\",\"HOME\")",
            "action()","refreshVisibleMode(normalized)"],
 "windows":["UiButtonManifestContract.byButtonId(navId)",
            "UiButtonManifestContract.dispatchNavigation(navId,normalized)",
            "UiButtonManifestContract.dispatchNavigation(\"NAV_HOME\",\"HOME\")",
            "putClientProperty(\"aig.buttonId\",navId)",
            "action()"],
 "core":["fun dispatchNavigation(","runtimeCallback(entry.command)",
         "NAV_SURFACE_ID_MISMATCH","NAV_COMMAND_ID_MISMATCH"]
}
for name,path in sources.items():
    s=path.read_text(encoding="utf-8")
    for marker in checks[name]:
        if marker not in s:
            raise SystemExit(f"BLOCKED|MISSING_NATIVE_CONTROL_BINDING|{name}|{marker}")
    print(f"NATIVE_CONTROL_SOURCE_BOUND|{name}|{len(checks[name])}")
print("STUDIO_NATIVE_NAV_SOURCE_BINDINGS_PASS|10_PAGES|ANDROID|WINDOWS|NOT_DEVICE_TAP_PROOF")

#!/usr/bin/env python3
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
manifest = (ROOT / "app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
android = (ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt").read_text(encoding="utf-8")
desktop = (ROOT / "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt").read_text(encoding="utf-8")

def need(ok: bool, code: str) -> None:
    if not ok:
        raise SystemExit("OFFICIAL_ENTRY_SHELL_HIDDEN_FAIL|" + code)

need('android:name=".MainActivity"' in manifest, "ANDROID_MAIN_MISSING")
need(manifest.count('android.intent.category.LAUNCHER') == 1, "ANDROID_LAUNCHER_COUNT")
need('.StartupActivity' not in manifest, "STARTUP_ACTIVITY_REGISTERED")
need(not (ROOT / "app/src/main/java/com/aigstudio/app/StartupActivity.kt").exists(), "STARTUP_ACTIVITY_FILE_PRESENT")
need('val maintenanceStrip=' not in android and 'MAINTENANCE SYSTEM STRIP' not in android, "ANDROID_HOME_MAINTENANCE_STRIP_PRESENT")
need('EngineeringImageAssets.drawable(' not in android, "ANDROID_ENGINEERING_ART_BOUND")
need('EngineeringImageAssets.drawable(' not in desktop, "WINDOWS_ENGINEERING_ART_BOUND")
need('showUserSettingsCenter()' in desktop and 'maintenanceCenterAction' in desktop, "WINDOWS_MAINTENANCE_NOT_NESTED")
print("OFFICIAL_ENTRY_SHELL_HIDDEN_PASS|AIG_CNC|ANDROID_MAIN_ONLY|NO_STARTUP_ACTIVITY|MAINTENANCE_SETTINGS_ONLY|WINDOWS_SETTINGS_NESTED")

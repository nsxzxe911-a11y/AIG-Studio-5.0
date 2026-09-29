#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

version_line = (ROOT / "release-version.properties").read_text(encoding="utf-8").strip()
if not version_line.startswith("versionName="):
    raise SystemExit("release version metadata missing")
version = version_line.split("=", 1)[1]
parts = tuple(int(x) for x in version.split("."))
if parts < (209, 0, 0):
    raise SystemExit(f"production runtime line requires >=209.0.0, got {version}")

runtime_roots = [
    ROOT / "app" / "src" / "main",
    ROOT / "desktop" / "src" / "main",
]
for runtime_root in runtime_roots:
    for path in runtime_root.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".kt", ".java", ".xml", ".kts", ".properties"}:
            text = path.read_text(encoding="utf-8", errors="ignore")
            if "engineering-assets/" in text or "\\engineering-assets\\" in text:
                raise SystemExit(f"runtime source must not consume engineering-assets as release UI: {path}")

android_main = (ROOT / "app" / "src" / "main" / "java" / "com" / "aigstudio" / "app" / "MainActivity.kt").read_text(encoding="utf-8")
startup = (ROOT / "app" / "src" / "main" / "java" / "com" / "aigstudio" / "app" / "StartupOverlay.kt").read_text(encoding="utf-8")
desktop = (ROOT / "desktop" / "src" / "main" / "kotlin" / "com" / "aigstudio" / "desktop" / "DesktopApp.kt").read_text(encoding="utf-8")
env = (ROOT / "core" / "src" / "main" / "kotlin" / "com" / "aigstudio" / "core" / "EnvironmentSettings.kt").read_text(encoding="utf-8")
android_build = (ROOT / "build_android_release.sh").read_text(encoding="utf-8")
windows_build = (ROOT / "build_windows_native.ps1").read_text(encoding="utf-8")

required_android = [
    "AigStartupOverlay(this)",
    "CadView(this)",
    "Machining3DView",
    "UnifiedMachiningWorkspaceContract",
]
for marker in required_android:
    if marker not in android_main:
        raise SystemExit(f"Android production runtime marker missing: {marker}")

if 'context.assets.open("visuals/studio_startup_original.png")' not in startup:
    raise SystemExit("Android production startup asset binding missing")

required_desktop = [
    'JFrame("AIG CNC — OFFICIAL RGB ORIGINAL")',
    "buildProductionCamPanel",
    "--smoke",
    "desktop_launch.png",
    "desktop_3d.png",
]
for marker in required_desktop:
    if marker not in desktop:
        raise SystemExit(f"Windows production runtime marker missing: {marker}")

if 'const val PROFILE="AIG_CNC_PRODUCTION_RUNTIME_209"' not in env:
    raise SystemExit("production startup profile missing")
if "release_state=PRODUCTION_RUNTIME_CANDIDATE_NOT_FINAL" not in android_build:
    raise SystemExit("Android production release state missing")
if "release_class=PRODUCTION_RUNTIME" not in android_build:
    raise SystemExit("Android production release class missing")
if "runtime-evidence" not in windows_build:
    raise SystemExit("Windows production runtime evidence packaging missing")
if "WINDOWS_EXECUTABLE_SMOKE_CAPTURED" not in windows_build:
    raise SystemExit("Windows executable smoke evidence marker missing")

print("PRODUCTION_RUNTIME_ONLY_GATE_PASS|STUDIO_209|ANDROID_RUNTIME|WINDOWS_RUNTIME|ENGINEERING_ASSETS_NOT_RELEASE_EVIDENCE")

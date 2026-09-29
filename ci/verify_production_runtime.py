#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

version_line = (ROOT / "release-version.properties").read_text(encoding="utf-8").strip()
if not version_line.startswith("versionName="):
    raise SystemExit("release version metadata missing")
version = version_line.split("=", 1)[1]
parts = tuple(int(x) for x in version.split("."))
if parts < (214, 0, 0):
    raise SystemExit(f"production runtime line requires >=214.0.0, got {version}")

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

if 'const val PROFILE="AIG_CNC_PRODUCTION_RUNTIME_214"' not in env:
    raise SystemExit("production startup profile missing")
if "release_state=PRODUCTION_RUNTIME_CANDIDATE_NOT_FINAL" not in android_build:
    raise SystemExit("Android production release state missing")
if "release_class=PRODUCTION_RUNTIME" not in android_build:
    raise SystemExit("Android production release class missing")
if "runtime-evidence" not in windows_build:
    raise SystemExit("Windows production runtime evidence packaging missing")
if "WINDOWS_EXECUTABLE_SMOKE_CAPTURED" not in windows_build:
    raise SystemExit("Windows executable smoke evidence marker missing")

switch_modes = 'val modes = listOf("CAD","CAM","SIM","3AX","4AX","5AX","NC","AI")'
if switch_modes not in env:
    raise SystemExit("production UI stable-order contract missing")
for marker in [
    'contentDescription = "PRODUCTION UI SWITCH"',
    'addProductionUi("CAD")',
    'addProductionUi("CAM")',
    'addProductionUi("SIM")',
    'addProductionUi("3AX")',
    'addProductionUi("4AX")',
    'addProductionUi("5AX")',
    'addProductionUi("NC")',
    'addProductionUi("AI")',
]:
    if marker not in android_main:
        raise SystemExit(f"Android production UI switch marker missing: {marker}")
for marker in [
    'productionUiButton("CAD"',
    'productionUiButton("CAM"',
    'productionUiButton("SIM"',
    'productionUiButton("3AX"',
    'productionUiButton("4AX"',
    'productionUiButton("5AX"',
    'productionUiButton("NC"',
    'productionUiButton("AI"',
]:
    if marker not in desktop:
        raise SystemExit(f"Windows production UI switch marker missing: {marker}")

print("PRODUCTION_UI_SWITCH_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|STABLE_ORDER|LIVE_RUNTIME")
if 'const val POLICY = "NO_UI_NO_FUNCTION"' not in env:
    raise SystemExit("visible-function UI policy missing")
for marker in [
    'contentDescription="VISIBLE FUNCTION ACTIONS"',
    'refreshVisibleMode(normalized)',
    'action("AI 檢查",3){cad.aiInspect()}',
]:
    if marker not in android_main:
        raise SystemExit(f"Android visible-function UI marker missing: {marker}")
for marker in [
    'productionUiButton("AI"',
    'name="AI_CARD"',
    'AI LOCAL ASSIST',
]:
    if marker not in desktop:
        raise SystemExit(f"Windows visible-function UI marker missing: {marker}")
print("VISIBLE_FUNCTION_UI_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS")
for marker in [
    'const val POLICY = "OFFLINE_FIRST_UI_BOOT"',
    'const val NETWORK_REQUIRED_FOR_STARTUP = false',
]:
    if marker not in env:
        raise SystemExit(f"offline-first contract missing: {marker}")
for marker in [
    'bootOverlay.completeAndDetach(bootShell)',
    'scheduleBackgroundOnlineServices()',
    'if(network!="ONLINE / VALIDATED")',
]:
    if marker not in android_main:
        raise SystemExit(f"Android offline-first marker missing: {marker}")
if android_main.index('bootOverlay.completeAndDetach(bootShell)') > android_main.index('scheduleBackgroundOnlineServices()'):
    raise SystemExit("online services must be scheduled after UI detach")
for marker in [
    'OFFLINE READY • AIG CNC',
    'OFFLINE-FIRST',
]:
    if marker not in desktop:
        raise SystemExit(f"Windows offline-first marker missing: {marker}")
print("OFFLINE_FIRST_UI_GATE_PASS|ANDROID|WINDOWS|NETWORK_NOT_REQUIRED|DIRECT_UI|LOCAL_RUNTIME|BACKGROUND_ONLINE_ONLY")
print("PRODUCTION_RUNTIME_ONLY_GATE_PASS|STUDIO_214|ANDROID_RUNTIME|WINDOWS_RUNTIME|ENGINEERING_ASSETS_NOT_RELEASE_EVIDENCE")

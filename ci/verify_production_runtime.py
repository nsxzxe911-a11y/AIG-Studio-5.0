#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

version_line = (ROOT / "release-version.properties").read_text(encoding="utf-8").strip()
if not version_line.startswith("versionName="):
    raise SystemExit("release version metadata missing")
version = version_line.split("=", 1)[1]
parts = tuple(int(x) for x in version.split("."))
if parts < (221, 0, 0):
    raise SystemExit(f"production runtime line requires >=221.0.0, got {version}")

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
secure_services = (ROOT / "app" / "src" / "main" / "java" / "com" / "aigstudio" / "app" / "SecureServices.kt").read_text(encoding="utf-8")

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
    'JFrame("AIG CNC — OFFICIAL RGB ORIGINAL — v"+desktopVersionName())',
    "buildProductionCamPanel",
    "--smoke",
    "desktop_launch.png",
    "desktop_3d.png",
]
for marker in required_desktop:
    if marker not in desktop:
        raise SystemExit(f"Windows production runtime marker missing: {marker}")

if 'const val PROFILE="AIG_CNC_PRODUCTION_RUNTIME_221"' not in env:
    raise SystemExit("production startup profile missing")
if "release_state=PRODUCTION_RUNTIME_CANDIDATE_NOT_FINAL" not in android_build:
    raise SystemExit("Android production release state missing")
if "release_class=PRODUCTION_RUNTIME" not in android_build:
    raise SystemExit("Android production release class missing")
if "runtime-evidence" not in windows_build:
    raise SystemExit("Windows production runtime evidence packaging missing")
if "WINDOWS_EXECUTABLE_SMOKE_CAPTURED" not in windows_build:
    raise SystemExit("Windows executable smoke evidence marker missing")

switch_modes = 'val modes = listOf("CAD","CAM","SIM","NC","AI")'
if switch_modes not in env:
    raise SystemExit("production UI stable-order contract missing")
for marker in [
    'contentDescription = "PRODUCTION UI SWITCH"',
    'addProductionUi("CAD")',
    'addProductionUi("CAM")',
    'addProductionUi("SIM")',
    'addProductionUi("NC")',
    'addProductionUi("AI")',
    'action("3/4/5AX"',
    'openCategory("加工")',
]:
    if marker not in android_main:
        raise SystemExit(f"Android production UI switch marker missing: {marker}")
for marker in [
    'productionUiButton("CAD"',
    'productionUiButton("CAM"',
    'productionUiButton("SIM"',
    'productionUiButton("NC"',
    'productionUiButton("AI"',
    'camAction("軸模式"',
]:
    if marker not in desktop:
        raise SystemExit(f"Windows production UI switch marker missing: {marker}")

print("PRODUCTION_UI_SWITCH_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|NC|AI|AXIS_NESTED|STABLE_ORDER|LIVE_RUNTIME")
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
    'cm.registerDefaultNetworkCallback(callback)',
]:
    if marker not in android_main:
        raise SystemExit(f"Android offline-first marker missing: {marker}")
if android_main.index('bootOverlay.completeAndDetach(bootShell)') > android_main.index('scheduleBackgroundOnlineServices()'):
    raise SystemExit("online services must be scheduled after UI detach")
for marker in [
    'LOCAL READY • NETWORK OPTIONAL',
    'OFFLINE-FIRST',
]:
    if marker not in desktop:
        raise SystemExit(f"Windows offline-first marker missing: {marker}")
print("OFFLINE_FIRST_UI_GATE_PASS|ANDROID|WINDOWS|NETWORK_NOT_REQUIRED|DIRECT_UI|LOCAL_RUNTIME|BACKGROUND_ONLINE_ONLY")
for marker in [
    'const val POST_READY_NETWORK_OBSERVER = true',
    'const val NETWORK_STATUS_MUST_NOT_OVERRIDE_OPERATION = true',
]:
    if marker not in env:
        raise SystemExit(f"network-resume contract missing: {marker}")
for marker in [
    'contentDescription="NETWORK OPTIONAL STATUS"',
    'cm.registerDefaultNetworkCallback(callback)',
    'cm.unregisterNetworkCallback(callback)',
]:
    if marker not in android_main:
        raise SystemExit(f"Android network-resume marker missing: {marker}")
for marker in [
    'LOCAL READY • NETWORK OPTIONAL',
]:
    if marker not in desktop:
        raise SystemExit(f"Windows network-optional marker missing: {marker}")
print("NETWORK_RESUME_UI_GATE_PASS|POST_READY_OBSERVER|NO_STATUS_RACE|NETWORK_OPTIONAL|UNREGISTER_ON_DESTROY")
for marker in [
    'const val NETWORK_RETRY_ON_RECONNECT = true',
    'const val NETWORK_BADGE_COMPACT = true',
    'const val SINGLE_UPDATE_CHECK_AT_A_TIME = true',
]:
    if marker not in env:
        raise SystemExit(f"network retry contract missing: {marker}")
for marker in [
    'java.util.concurrent.atomic.AtomicBoolean(false)',
    'onlineAutoCheckRunning.compareAndSet(false,true)',
    'onlineAutoCheckCompleted.set(false)',
    'renderNetworkState(true,"更新可用")',
    'renderNetworkState(true,"更新快速重試")',
    'renderNetworkState(true,"更新待手動重試")',
]:
    if marker not in android_main:
        raise SystemExit(f"Android network retry marker missing: {marker}")
if 'renderNetworkState(true,"更新可用 • "+result.message)' in android_main:
    raise SystemExit("network badge must stay compact")
print("NETWORK_RETRY_UI_GATE_PASS|ATOMIC_SINGLE_CHECK|RETRY_ON_RECONNECT|COMPACT_BADGE|NO_LONG_MESSAGE")
for marker in [
    'const val POLICY = "ENGINEERING_TOOLS_IN_PRODUCTION_UI"',
    'const val DEFAULT_BOOT_TARGET = "PRODUCTION_UI"',
    'const val SEPARATE_ENGINEERING_SHELL = false',
    'const val OFFLINE_MAINTENANCE_AVAILABLE = true',
]:
    if marker not in env:
        raise SystemExit(f"integrated maintenance contract missing: {marker}")
for marker in [
    'contentDescription="MAINTENANCE CENTER"',
    'private fun showMaintenanceCenter()',
    '"AIG CNC • 維修 / 診斷"',
    'action("Recovery / AutoSave")',
    'action("系統監控 HUD")',
    'action("環境 / FPS / 溫度")',
    'action("Security")',
    'action("AI SYSTEM SUITE")',
    'action("ChatGPT AI 更新")',
]:
    if marker not in android_main:
        raise SystemExit(f"Android integrated maintenance marker missing: {marker}")
for marker in [
    'GlassActionButton("維修"',
    'fun showMaintenanceCenter()',
    '"AIG CNC • 維修 / 診斷"',
    'showApp(startup=null,showWindow=false)',
    'productionFrame.contentPane',
]:
    if marker not in desktop:
        raise SystemExit(f"Windows integrated maintenance/production-shell evidence marker missing: {marker}")
print("INTEGRATED_MAINTENANCE_UI_GATE_PASS|ANDROID|WINDOWS|PRODUCTION_UI_BOOT|NO_SEPARATE_ENGINEERING_SHELL|OFFLINE_MAINT|REAL_ACTIONS")
print("PRODUCTION_SHELL_EVIDENCE_GATE_PASS|DESKTOP_LAUNCH_FROM_SHOWAPP|NO_SMOKE_ROOT_AS_AUTHORITY")
for marker in [
    'const val BACKGROUND_AUTO_DOWNLOAD = false',
    'const val BACKGROUND_NETWORK_DELAY_MS = 180L',
    'const val BACKGROUND_NETWORK_RETRY_DELAY_MS = 350L',
    'const val BACKGROUND_NETWORK_MAX_ATTEMPTS = 2',
]:
    if marker not in env:
        raise SystemExit(f"low latency network contract missing: {marker}")
for marker in [
    'onlineAutoRetryScheduled',
    'onlineAutoRetryCount',
    'updateConfig.copy(',
    'autoDownload=OfflineFirstRuntimeContract.BACKGROUND_AUTO_DOWNLOAD',
    '"更新快速重試"',
    '"更新待手動重試"',
]:
    if marker not in android_main:
        raise SystemExit(f"Android low latency network marker missing: {marker}")
for marker in [
    'MANIFEST_CONNECT_TIMEOUT_MS = 1200',
    'MANIFEST_READ_TIMEOUT_MS = 2000',
    'APK_CONNECT_TIMEOUT_MS = 2500',
    'APK_READ_TIMEOUT_MS = 5000',
]:
    if marker not in secure_services:
        raise SystemExit(f"secure update latency marker missing: {marker}")
print("LOW_LATENCY_NETWORK_GATE_PASS|START_180MS|MANIFEST_1200_2000|APK_IDLE_2500_5000|RETRY_350MS_X2|BACKGROUND_CHECK_ONLY|UI_NEVER_WAIT")
print("PRODUCTION_RUNTIME_ONLY_GATE_PASS|ANDROID_RUNTIME|WINDOWS_RUNTIME|ENGINEERING_ASSETS_NOT_RELEASE_EVIDENCE")

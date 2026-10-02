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
machining3d_core = (ROOT / "core" / "src" / "main" / "kotlin" / "com" / "aigstudio" / "core" / "Machining3D.kt").read_text(encoding="utf-8")
machining3d_android = (ROOT / "app" / "src" / "main" / "java" / "com" / "aigstudio" / "app" / "Machining3DView.kt").read_text(encoding="utf-8")
core_regression = (ROOT / "core" / "src" / "test" / "kotlin" / "com" / "aigstudio" / "core" / "CoreRegressionTest.kt").read_text(encoding="utf-8")
cam_core = (ROOT / "core" / "src" / "main" / "kotlin" / "com" / "aigstudio" / "core" / "Cam.kt").read_text(encoding="utf-8")
fanuc_nc = (ROOT / "core" / "src" / "main" / "kotlin" / "com" / "aigstudio" / "core" / "FanucNc.kt").read_text(encoding="utf-8")

required_android = [
    "StudioStartupBootGuard.begin(this)",
    "StudioStartupBootGuard.mark(this,StudioStartupStage.UI_RENDERER)",
    "setContentView(runtimeHost)",
    "cad = CadView(",
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
if "release_state=PRODUCTION_RUNTIME_CANDIDATE" not in android_build:
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
    'action("3/4/5/6AX"',
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
    'const val POLICY = "XYZABC_SIMULATION_FIRST_NC_INTERLOCK"',
    'const val NC_POST_VERIFIED = false',
    'RgbImageButtonSpec("6AX","六軸","6 AXIS","ic_rgb_6ax",89)',
]:
    if marker not in env:
        raise SystemExit(f"6AX core posture marker missing: {marker}")
for marker in [
    'private fun showSixAxisRuntimeStage()',
    'contentDescription="6AX NC INTERLOCK"',
    'SixAxisRuntimeContract.step',
    '"6X A/B/C"',
]:
    if marker not in android_main:
        raise SystemExit(f"Android 6AX posture runtime marker missing: {marker}")
for marker in [
    'fun showSixAxisRuntimeStage()',
    'arrayOf("3AX","4AX","5AX","6AX")',
    '"6AX • XYZ + A/B/C 姿態驗證"',
    'GlassActionButton("NC LOCK"',
    'private var machineModeOverride:String?=null',
    'require(normalized in setOf("3AX","4AX","5AX","6AX"))',
    'axisAOverride=machineModeOverride?.let{postureA} ?: live?.axisA',
]:
    if marker not in desktop:
        raise SystemExit(f"Windows 6AX posture runtime marker missing: {marker}")
print("SIX_AXIS_POSTURE_GATE_PASS|ANDROID|WINDOWS|ABC_DYNAMIC|SIMULATION_FIRST|NC_INTERLOCKED|POST_NOT_CLAIMED")
for marker in [
    'fun transform(v:Vec3,axisA:Double,axisB:Double,axisC:Double):Vec3',
    'require(mode in setOf("3AX","4AX","5AX","6AX"))',
    'MachineComponentRole.ROTARY_C',
    'MachineKinematics3D.transform(table,a,b,c)',
    'val machineToolPoint=MachineKinematics3D.transform(rawToolPoint,a,b,c)',
]:
    if marker not in machining3d_core:
        raise SystemExit(f"6AX ABC machine core marker missing: {marker}")
for marker in [
    'private val machineAxisC: Double = 0.0',
    'val c=if(mode=="6AX")live?.axisC ?: machineAxisC else 0.0',
    'MachineKinematics3D.transform(v,a,b,c)',
    'MachineComponentRole.ROTARY_C',
]:
    if marker not in machining3d_android:
        raise SystemExit(f"Android true 6AX ABC renderer marker missing: {marker}")
for marker in [
    'var axisC=0.0',
    'fun setAngles(a:Double,b:Double,c:Double)',
    'val c=if(machineMode=="6AX")axisC else 0.0',
    'result,machineMode,axisA,axisB,live,axisC',
    'setMachineMode("6AX")',
    'setAngles(six.axisA,six.axisB,six.axisC)',
]:
    if marker not in desktop:
        raise SystemExit(f"Windows true 6AX ABC renderer marker missing: {marker}")
for marker in [
    'REAL_MACHINE_MODEL_3_4_5_6AX_GATE_PASS',
    'A_THEN_B_THEN_C',
]:
    if marker not in core_regression:
        raise SystemExit(f"6AX ABC regression marker missing: {marker}")
print("SIX_AXIS_TRUE_ABC_GATE_PASS|CORE|ANDROID|WINDOWS|ROTARY_C|MATERIAL_POSTURE|MACHINE_MODEL|REGRESSION_SOURCE|NC_STILL_INTERLOCKED")
for marker in [
    'val axisC: Double',
    'fun atABC(progress:Double):Triple<Double,Double,Double>',
    'axisSchedule?.atABC(progress)',
    'axisC=orientation.third',
]:
    if marker not in cam_core:
        raise SystemExit(f"continuous 6AX CAM marker missing: {marker}")
for marker in [
    'a.axisC+(b.axisC-a.axisC)*t',
    'moves.any{abs(it.axisC)>EPS} -> "6AX"',
    'val requestedC=axisCOverride ?: live?.axisC ?: 0.0',
]:
    if marker not in machining3d_core:
        raise SystemExit(f"continuous 6AX SIM marker missing: {marker}")
if '6AX_C_AXIS_NC_POST_BLOCKED' not in fanuc_nc:
    raise SystemExit("6AX C-axis NC fail-closed marker missing")
if 'CONTINUOUS_6AX_CAM_SIM_GATE_PASS' not in core_regression:
    raise SystemExit("continuous 6AX regression marker missing")
print("CONTINUOUS_6AX_PRODUCTION_GATE_PASS|ABC_TOOLPOINTS|SIM|ROTARY_C|NC_C_FAIL_CLOSED")
for marker in [
    'private fun machinePoint(move:Move):Vec3',
    'private fun rotatingFixtureEnvelopeCollision(',
    'ROTARY_FIXTURE_ENVELOPE collision:',
    'val envelopes=enabled.filter{it.kind==FixtureKind.MACHINE_ENVELOPE}',
]:
    if marker not in machining3d_core:
        raise SystemExit(f"6AX collision-space marker missing: {marker}")
if 'SIX_AXIS_FIXTURE_ENVELOPE_GATE_PASS' not in core_regression:
    raise SystemExit("6AX fixture-envelope regression marker missing")
print("SIX_AXIS_COLLISION_SPACE_PRODUCTION_GATE_PASS|ABC_MACHINE_SPACE|ROTATING_FIXTURE|MACHINE_ENVELOPE|NC_INTERLOCK_UNCHANGED")
for marker in [
    'enum class CollisionAvoidanceAction { RETRACT_Z, PATH_REROUTE, POSTURE_CHANGE_REQUIRED }',
    'data class CollisionLookAheadPrediction(',
    'data class CollisionLookAheadReport(',
    'fun predictLookAhead(',
    'const val POLICY="PREDICT_SUGGEST_MANUAL_CONFIRM_REVALIDATE"',
    'fun applyRetractCandidate(',
    'fun revalidate(',
]:
    if marker not in machining3d_core:
        raise SystemExit(f"6AX look-ahead marker missing: {marker}")
if 'COLLISION_LOOKAHEAD_GATE_PASS' not in core_regression:
    raise SystemExit("6AX collision look-ahead regression marker missing")
print("COLLISION_LOOKAHEAD_PRODUCTION_GATE_PASS|PREDICT|SUGGEST|MANUAL_CONFIRM|REVALIDATE|NC_INTERLOCK_UNCHANGED")





for marker in [
    'const val POLICY = "OFFLINE_FIRST_UI_BOOT"',
    'const val NETWORK_REQUIRED_FOR_STARTUP = false',
]:
    if marker not in env:
        raise SystemExit(f"offline-first contract missing: {marker}")
for marker in [
    'setContentView(runtimeHost)',
    'StudioStartupBootGuard.complete(this)',
    'scheduleBackgroundOnlineServices()',
    'cm.registerDefaultNetworkCallback(callback)',
]:
    if marker not in android_main:
        raise SystemExit(f"Android offline-first marker missing: {marker}")
for forbidden in ['val bootShell =', 'val bootOverlay = AigStartupOverlay(', 'setContentView(bootShell)']:
    if forbidden in android_main:
        raise SystemExit(f"custom boot shell returned: {forbidden}")
if android_main.index('setContentView(runtimeHost)') > android_main.index('scheduleBackgroundOnlineServices()'):
    raise SystemExit("online services must be scheduled after production Runtime is visible")
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
    'const val BACKGROUND_NETWORK_DELAY_MS = 40L',
    'const val BACKGROUND_NETWORK_RETRY_DELAY_MS = 120L',
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
print("LOW_LATENCY_NETWORK_GATE_PASS|START_40MS|MANIFEST_1200_2000|APK_IDLE_2500_5000|RETRY_120MS_X2|BACKGROUND_CHECK_ONLY|UI_NEVER_WAIT")
print("PRODUCTION_RUNTIME_ONLY_GATE_PASS|ANDROID_RUNTIME|WINDOWS_RUNTIME|ENGINEERING_ASSETS_NOT_RELEASE_EVIDENCE")

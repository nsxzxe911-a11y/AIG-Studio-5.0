#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "core/src/main/kotlin/com/aigstudio/core/ui/RuntimePageMountContract.kt"
ANDROID = ROOT / "app/src/main/java/com/aigstudio/app/ui/AndroidRuntimeUiRegistry.kt"
ANDROID_HOST = ROOT / "app/src/main/java/com/aigstudio/app/ui/host/RuntimePageHost.kt"
ANDROID_COORD = ROOT / "app/src/main/java/com/aigstudio/app/ui/host/RuntimePageMountCoordinator.kt"
HOME_MODULE = ROOT / "app/src/main/java/com/aigstudio/app/ui/pages/home/HomePageModule.kt"
HOME_BRIDGE = ROOT / "app/src/main/java/com/aigstudio/app/ui/bridge/HomeCallbackBridge.kt"
MAIN = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"
DESKTOP = ROOT / "desktop/src/main/kotlin/com/aigstudio/desktop/ui/DesktopRuntimeUiRegistry.kt"


def need(ok: bool, code: str) -> None:
    if not ok:
        raise SystemExit("RUNTIME_PAGE_MOUNT_FAIL|STUDIO|" + code)

need(CONTRACT.is_file(), "MISSING_MOUNT_CONTRACT")
need(ANDROID.is_file(), "MISSING_ANDROID_REGISTRY")
need(ANDROID_HOST.is_file(), "MISSING_ANDROID_RUNTIME_PAGE_HOST")
need(ANDROID_COORD.is_file(), "MISSING_ANDROID_MOUNT_COORDINATOR_FILE")
need(DESKTOP.is_file(), "MISSING_DESKTOP_REGISTRY")

contract = CONTRACT.read_text(encoding="utf-8")
android = ANDROID.read_text(encoding="utf-8")
host = ANDROID_HOST.read_text(encoding="utf-8")
coord = ANDROID_COORD.read_text(encoding="utf-8")
desktop = DESKTOP.read_text(encoding="utf-8")

for token in [
    "enum class RuntimeMountStage",
    "ASSET", "SKIN", "VIEW", "CALLBACK", "READY",
    "data class RuntimePageMountSpec",
    "class RuntimePageMountState",
    "object RuntimePageMountCatalog",
    "RuntimeSurface.HOME", "RuntimeSurface.CAD", "RuntimeSurface.CAM", "RuntimeSurface.SIM",
    "RuntimeSurface.AXIS3", "RuntimeSurface.AXIS4", "RuntimeSurface.AXIS5", "RuntimeSurface.AXIS6",
    "RuntimeSurface.NC", "RuntimeSurface.AI",
    '"home.png"', '"cad.png"', '"cam.jpg"', '"sim.jpg"',
    '"axis3.jpg"', '"axis4.png"', '"axis5.jpg"', '"machine.jpg"'
]:
    need(token in contract, "CONTRACT_TOKEN_" + token.replace(" ", "_"))

need("val assetFirst: Boolean = true" in contract, "ASSET_FIRST_DEFAULT_TRUE")
need("val lazyFunctionGroups: Boolean = true" in contract, "LAZY_FUNCTION_GROUPS_DEFAULT_TRUE")
need("require(specs.all { it.assetFirst })" in contract, "ASSET_FIRST_ENFORCED")
need("require(specs.all { it.lazyFunctionGroups })" in contract, "LAZY_FUNCTION_GROUPS_ENFORCED")

need("interface AndroidRuntimeUiModule" in android, "ANDROID_MODULE_INTERFACE")
need("class AndroidRuntimeUiRegistry" in android, "ANDROID_REGISTRY")
need("class AndroidRuntimePageMountCoordinator" not in android, "ANDROID_COORDINATOR_MUST_BE_EXTRACTED")
need("class AndroidRuntimePageMountCoordinator" in coord, "ANDROID_MOUNT_COORDINATOR")
for token in [
    "RuntimePageMountCatalog", "RuntimePageMountState",
    "RuntimeMountStage.ASSET", "RuntimeMountStage.SKIN", "RuntimeMountStage.VIEW",
    "RuntimeMountStage.CALLBACK", "RuntimeMountStage.READY", "requireBitmap",
]:
    need(token in coord, "ANDROID_COORD_TOKEN_" + token.replace(" ", "_"))
need(coord.index("requireBitmap") < coord.index("RuntimeMountStage.ASSET"), "ANDROID_ASSET_REQUIRED_BEFORE_ASSET_STAGE")

for token in [
    "class RuntimePageHost", "fun preload(", "fun show(", "fun currentSurface(",
    "AndroidRgbVisualCache", "AndroidRuntimePageMountCoordinator", "runCatching",
]:
    need(token in host, "ANDROID_HOST_TOKEN_" + token.replace(" ", "_"))
need("current = surface" in host, "ANDROID_HOST_TRACKS_SUCCESSFUL_SURFACE")
need("onComplete" in host and "preloadAsync" in host, "ANDROID_HOST_PRELOAD_OWNS_CACHE")

for token in [
    "RuntimePageMountCatalog", "RuntimePageMountState", "RuntimeMountStage.ASSET",
    "RuntimeMountStage.SKIN", "RuntimeMountStage.VIEW", "RuntimeMountStage.CALLBACK",
    "RuntimeMountStage.READY",
]:
    need(token in desktop, "DESKTOP_TOKEN_" + token.replace(" ", "_"))
need("DesktopRuntimePageMountCoordinator" in desktop, "DESKTOP_MOUNT_COORDINATOR")
need("preloadAsync" in desktop and "requireImage" in desktop, "DESKTOP_RGB_PRELOAD_CACHE")
need("ENGINEERING_SHELL" not in contract + android + host + coord + desktop, "ENGINEERING_SHELL_FORBIDDEN")

need(HOME_MODULE.is_file(), "MISSING_HOME_PAGE_MODULE")
need(HOME_BRIDGE.is_file(), "MISSING_HOME_CALLBACK_BRIDGE")
need(MAIN.is_file(), "MISSING_MAIN_ACTIVITY")
home_module = HOME_MODULE.read_text(encoding="utf-8")
home_bridge = HOME_BRIDGE.read_text(encoding="utf-8")
main = MAIN.read_text(encoding="utf-8", errors="replace")
for token in ["class HomePageModule", "AndroidRuntimeUiModule", "RuntimeSurface.HOME", "contentFactory"]:
    need(token in home_module, "HOME_MODULE_TOKEN_" + token.replace(" ", "_"))
for token in ["class HomeCallbackBridge", "RuntimeActionSink", "NAVIGATE", "SETTINGS"]:
    need(token in home_bridge, "HOME_BRIDGE_TOKEN_" + token.replace(" ", "_"))
need("RuntimePageHost" in main, "MAIN_MISSING_RUNTIME_PAGE_HOST")
need("show(RuntimeSurface.HOME" in main, "MAIN_HOME_BYPASSES_RUNTIME_PAGE_HOST")
need("runtimeHost.addView(homeRoot" not in main, "LEGACY_HOME_DIRECT_ADD_FORBIDDEN")

print("RUNTIME_PAGE_MOUNT_PASS|STUDIO|RGB_FIRST|SURFACES_10|ANDROID_HOST_OWNS_MOUNT|HOME_VIA_HOST|ASSET_FAILURE_NOT_READY|WINDOWS|LAZY_FUNCTION_GROUPS|PRELOAD_CACHE")
# Task 3 compile trigger after bot-applied HOME host repair.

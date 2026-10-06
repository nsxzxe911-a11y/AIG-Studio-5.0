#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "core/src/main/kotlin/com/aigstudio/core/ui/RuntimePageMountContract.kt"
ANDROID = ROOT / "app/src/main/java/com/aigstudio/app/ui/AndroidRuntimeUiRegistry.kt"
DESKTOP = ROOT / "desktop/src/main/kotlin/com/aigstudio/desktop/ui/DesktopRuntimeUiRegistry.kt"


def need(ok: bool, code: str) -> None:
    if not ok:
        raise SystemExit("RUNTIME_PAGE_MOUNT_FAIL|STUDIO|" + code)

need(CONTRACT.is_file(), "MISSING_MOUNT_CONTRACT")
need(ANDROID.is_file(), "MISSING_ANDROID_REGISTRY")
need(DESKTOP.is_file(), "MISSING_DESKTOP_REGISTRY")

contract = CONTRACT.read_text(encoding="utf-8")
android = ANDROID.read_text(encoding="utf-8")
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

for source, label in [(android, "ANDROID"), (desktop, "DESKTOP")]:
    for token in [
        "RuntimePageMountCatalog",
        "RuntimePageMountState",
        "RuntimeMountStage.ASSET",
        "RuntimeMountStage.SKIN",
        "RuntimeMountStage.VIEW",
        "RuntimeMountStage.CALLBACK",
        "RuntimeMountStage.READY",
    ]:
        need(token in source, f"{label}_TOKEN_" + token.replace(" ", "_"))

need("AndroidRuntimePageMountCoordinator" in android, "ANDROID_MOUNT_COORDINATOR")
need("DesktopRuntimePageMountCoordinator" in desktop, "DESKTOP_MOUNT_COORDINATOR")
need("preloadAsync" in android and "requireBitmap" in android, "ANDROID_RGB_PRELOAD_CACHE")
need("preloadAsync" in desktop and "requireImage" in desktop, "DESKTOP_RGB_PRELOAD_CACHE")
need("ENGINEERING_SHELL" not in contract + android + desktop, "ENGINEERING_SHELL_FORBIDDEN")

print("RUNTIME_PAGE_MOUNT_PASS|STUDIO|RGB_FIRST|SURFACES_10|ASSET_SKIN_VIEW_CALLBACK_READY|ANDROID|WINDOWS|LAZY_FUNCTION_GROUPS|PRELOAD_CACHE")

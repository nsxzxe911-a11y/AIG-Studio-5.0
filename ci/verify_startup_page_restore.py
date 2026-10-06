#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
android = (ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt").read_text(encoding="utf-8")
desktop = (ROOT / "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt").read_text(encoding="utf-8")
startup = (ROOT / "app/src/main/java/com/aigstudio/app/StartupOverlay.kt").read_text(encoding="utf-8")


def require(source: str, marker: str, label: str) -> None:
    if marker not in source:
        raise SystemExit(f"STARTUP_RESTORE_FAIL|{label}|missing={marker}")


# The approved startup artwork must remain the real local startup source.
require(startup, 'context.assets.open("visuals/studio_startup_original.png")', "ANDROID_STARTUP_ASSET")

# Android: visible startup overlay first, then local formal RGB HOME.
for marker in (
    "val bootShell = FrameLayout(this)",
    "val bootOverlay = AigStartupOverlay(this)",
    "bootOverlay.setRuntimeProfile(startupQuality,startupSafeBoot)",
    "setContentView(bootShell)",
    "bootOverlay.advance(StartupMilestone.LOADING_UI)",
    "bootShell.addView(runtimeHost,0,FrameLayout.LayoutParams(",
    "bootOverlay.advance(StartupMilestone.READY)",
    "bootOverlay.completeAndDetach(bootShell)",
):
    require(android, marker, "ANDROID_VISIBLE_STARTUP")

if android.index("setContentView(bootShell)") > android.index("bootShell.addView(runtimeHost,0,FrameLayout.LayoutParams("):
    raise SystemExit("STARTUP_RESTORE_FAIL|ANDROID_ORDER|startup shell must own the content view before Runtime is attached")
if android.index("bootShell.addView(runtimeHost,0,FrameLayout.LayoutParams(") > android.index("bootOverlay.completeAndDetach(bootShell)"):
    raise SystemExit("STARTUP_RESTORE_FAIL|ANDROID_ORDER|Runtime must be attached before startup overlay detaches")

# Windows: the existing official startup window must be visible before showApp().
for marker in (
    "private fun showApp(startup:StudioDesktopStartupWindow?=null,showWindow:Boolean=true):JFrame",
    "startup?.advance(StudioStartupStage.UI_RENDERER,\"載入 RGB UI / Renderer\")",
    "val startup=StudioDesktopStartupWindow()",
    "startup.show()",
    "startup.advance(StudioStartupStage.SAFE_THEME,\"載入原版 RGB 啟動圖\")",
    "showApp(startup)",
    "startup?.advance(StudioStartupStage.HOME,WorkstationChromeContract.MASTER_ORIGIN+\" • CAD READY\")",
    "startup?.close()",
):
    require(desktop, marker, "WINDOWS_VISIBLE_STARTUP")

print("STUDIO_STARTUP_PAGE_RESTORE_PASS|ANDROID_STARTUP_OVERLAY_THEN_RGB_HOME|WINDOWS_STARTUP_WINDOW_THEN_RUNTIME|OFFLINE_LOCAL_ASSET|NO_ENGINEERING_SHELL")

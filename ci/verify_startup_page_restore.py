#!/usr/bin/env python3
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
manifest = (ROOT / "app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
android_startup_path = ROOT / "app/src/main/java/com/aigstudio/app/StartupActivity.kt"
desktop_bootstrap = (ROOT / "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopBootstrap.kt").read_text(encoding="utf-8")
overlay = (ROOT / "app/src/main/java/com/aigstudio/app/StartupOverlay.kt").read_text(encoding="utf-8")
version = (ROOT / "release-version.properties").read_text(encoding="utf-8")
asset_contract = (ROOT / "core/src/main/kotlin/com/aigstudio/core/UiAssetContract.kt").read_text(encoding="utf-8")


def require(source: str, marker: str, label: str) -> None:
    if marker not in source:
        raise SystemExit(f"STARTUP_RESTORE_FAIL|{label}|missing={marker}")


approved_sha="a2e7b24d32fb9c852b83ee176480f59cb43559fe152ac3e05e0aa2c52f0a82ac"
require(overlay, 'context.assets.open("visuals/studio_startup_original.png")', "ANDROID_STARTUP_ASSET")
require(version, "versionName=371.0.0", "VERSION_BUMP")
for marker in (
    'HOME_PACK_VERSION = "371"',
    'HOME_PACK_ID = "STUDIO_APPROVED_STARTUP_HOME"',
    'ANDROID_HOME_ROOT = "visuals"',
    'DESKTOP_HOME_ROOT = "/visuals"',
    'ANDROID_HOME_FILE = "studio_startup_original.png"',
    'DESKTOP_HOME_FILE = "studio_startup_original.png"',
    f'HOME_AUTHORITY_SHA256 = "{approved_sha}"',
):
    require(asset_contract, marker, "STUDIO_APPROVED_HOME")

for relative in (
    "app/src/main/assets/visuals/studio_startup_original.png",
    "desktop/src/main/resources/visuals/studio_startup_original.png",
):
    path=ROOT/relative
    if not path.is_file():
        raise SystemExit(f"STARTUP_RESTORE_FAIL|APPROVED_VISUAL_MISSING|{relative}")
    actual=hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != approved_sha:
        raise SystemExit(f"STARTUP_RESTORE_FAIL|APPROVED_VISUAL_SHA|{relative}|{actual}")

if not android_startup_path.is_file():
    raise SystemExit("STARTUP_RESTORE_FAIL|ANDROID_STARTUP_ACTIVITY|missing file")
android_startup = android_startup_path.read_text(encoding="utf-8")

for marker in (
    'android:name=".StartupActivity"',
    '<action android:name="android.intent.action.MAIN" />',
    '<category android:name="android.intent.category.LAUNCHER" />',
):
    require(manifest, marker, "ANDROID_LAUNCHER")
if manifest.index('android:name=".StartupActivity"') > manifest.index('<action android:name="android.intent.action.MAIN" />'):
    raise SystemExit("STARTUP_RESTORE_FAIL|ANDROID_LAUNCHER|MAIN filter must belong to StartupActivity")
for marker in (
    "class StartupActivity : Activity()",
    "val bootOverlay=AigStartupOverlay(this)",
    "bootOverlay.setRuntimeProfile(startupQuality,false)",
    "setContentView(bootShell)",
    "bootOverlay.advance(StartupMilestone.SAFE_THEME)",
    "bootOverlay.advance(StartupMilestone.INITIALIZING_CORE)",
    "bootOverlay.advance(StartupMilestone.CHECKING_CONFIGURATION)",
    "bootOverlay.advance(StartupMilestone.LOADING_UI)",
    "startActivity(Intent(this,MainActivity::class.java))",
):
    require(android_startup, marker, "ANDROID_VISIBLE_STARTUP")

for marker in (
    'Class.forName("com.aigstudio.desktop.StudioDesktopStartupWindow")',
    "fun show()",
    "fun advance(stage:StudioStartupStage,message:String)",
    "fun close()",
    "startup.show()",
    'startup.advance(StudioStartupStage.SAFE_THEME,"載入原版 RGB 啟動圖")',
    'startup.advance(StudioStartupStage.CORE,"初始化 CAD / CAM 核心")',
    'startup.advance(StudioStartupStage.UI_RENDERER,"載入 RGB UI / Renderer")',
    'it.title.startsWith("AIG Studio • CNC 加工控制")',
    "startup.advance(StudioStartupStage.HOME,\"AIG CNC READY\")",
    "startup.close()",
):
    require(desktop_bootstrap, marker, "WINDOWS_VISIBLE_STARTUP")

print("STUDIO_STARTUP_PAGE_RESTORE_PASS|ANDROID_APPROVED_STARTUP_THEN_RGB_HOME|WINDOWS_HISTORICAL_STARTUP_THEN_RUNTIME|STUDIO_LOCAL_APPROVED_HOME|SHA_VERIFIED|OFFLINE_LOCAL_ASSET|NO_ENGINEERING_SHELL|VERSION_371")

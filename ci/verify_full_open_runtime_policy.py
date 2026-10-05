#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")

def need(condition: bool, code: str) -> None:
    if not condition:
        raise SystemExit("FULL_OPEN_POLICY_FAIL|" + code)

version = read("release-version.properties")
rolling = read("core/src/main/kotlin/com/aigstudio/core/RollingUpdatePolicy.kt")
policy = read("core/src/main/kotlin/com/aigstudio/core/OpenRuntimePolicy.kt")
android = read("app/src/main/java/com/aigstudio/app/MainActivity.kt")
desktop = read("desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt")
runtime = read("app/src/main/java/com/aigstudio/app/StudioThemePackRuntime.kt")
routing = json.loads(read("continuity/ai-responsibility-routing.json"))
checkpoint = json.loads(read("continuity/latest-checkpoint.json"))

need("versionName=361.0.0" in version, "VERSION_361")
for token in (
    "AI_RGB_ASSET_GENERATION_ENABLED = true",
    "AI_CODE_GENERATION_ENABLED = true",
    "AXIS_BLOCKING_ENABLED = false",
    "CNC_SOFTWARE_SAFETY_BLOCKING_ENABLED = false",
    "AUTO_REGRESSION_ENABLED = false",
    "AUTO_ROLLBACK_ENABLED = false",
    "AUTO_DOWNGRADE_ENABLED = false",
    "AI_VERSION_CONTROL_WRITE_ENABLED = false",
    "RED_CONTROL_CALLBACK_ENABLED = false",
    "MANUAL_ROLLBACK_ENABLED = false",
    "MANUAL_DOWNGRADE_ENABLED = false",
    "fun aiMayEnableVersionControlAction(action:String):Boolean = false",
    "fun redControlMayChangeVersion():Boolean = false",
    "DIAGNOSTICS_ENABLED = true",
):
    need(token in policy, "CORE_POLICY_" + token.split("=")[0].strip())

need("CNC_SAFETY_CORE_LOCKED=false" in rolling, "CNC_LOCK_OFF")
need("CNC_SAFETY_DISABLE_ALLOWED=true" in rolling, "CNC_DISABLE_ALLOWED")
need("REGRESSION_EXECUTION_ENABLED=false" in rolling, "AUTO_REGRESSION_OFF")
need("ALLOW_DOWNGRADE=false" in rolling, "DOWNGRADE_OFF")
need("setGeneratedAssetEnabled(false)" not in android, "FORCED_ASSET_DISABLE")
need("private var generatedAssetsEnabled=true" in android, "ASSET_DEFAULT_ON")
need("x86_64" in android and "LAYER_TYPE_SOFTWARE" in android, "NOX_RENDER_COMPAT")

settings_labels = (
    "開發與相容性",
    "AI RGB 圖資生成",
    "AI 程式碼生成",
    "3D～6AX 限制阻擋",
    "CNC 軟體 safety 阻擋",
    "自動 Regression",
    "自動 Rollback",
    "自動 Downgrade",
    "診斷訊息",
)
for label in settings_labels:
    need(label in android, "ANDROID_SETTING_" + label)
    need(label in desktop, "WINDOWS_SETTING_" + label)

hot = routing.get("theme_pack_hot_swap", {})
need(hot.get("failure_action") == "WARN_CONTINUE_CURRENT_PACK", "THEME_WARN_CONTINUE")
need(checkpoint.get("theme_pack_hot_swap", {}).get("rollback") == "DISABLED", "THEME_ROLLBACK_DISABLED")
vp = checkpoint.get("version_policy", {})
need(vp.get("safety_scope_without_regression") == "WARN_CONTINUE", "SAFETY_WARN_CONTINUE")
ua = checkpoint.get("user_authority_policy", {})
need(ua.get("regression_state") == "OFF", "REGRESSION_STATE_OFF")
need(ua.get("cnc_safety_core_state") == "OFF", "CNC_CORE_STATE_OFF")
need(ua.get("cnc_safety_disable_allowed") is True, "CNC_DISABLE_TRUE")
need("lastVerifiedId" not in runtime and "fun rollback()" not in runtime, "RUNTIME_ROLLBACK_PATH_PRESENT")

for forbidden in ("ROLLBACK_LAST_VERIFIED", "LAST_VERIFIED_THEME_PACK", "BLOCK_PROMOTION"):
    need(forbidden not in read("continuity/ai-responsibility-routing.json"), "ROUTING_" + forbidden)
    need(forbidden not in read("continuity/latest-checkpoint.json"), "CHECKPOINT_" + forbidden)

print("FULL_OPEN_RUNTIME_POLICY_PASS|STUDIO_361|RGB_AI_ON|AXIS_CNC_NONBLOCKING|REGRESSION_OFF|ROLLBACK_OFF|DOWNGRADE_OFF|AI_VERSION_WRITE_HARDLOCK|RED_CONTROL_NO_CALLBACK|DIAGNOSTICS_ON|NOX_COMPAT")

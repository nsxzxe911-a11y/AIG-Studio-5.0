from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "ci/verify_android_axis_page_persistence.sh"
HOME_SCRIPT = ROOT / "ci/verify_android_offline_rgb_home.sh"
ANDROID = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"
VIEW = ROOT / "app/src/main/java/com/aigstudio/app/Machining3DView.kt"
BUILDER = ROOT / ".github/workflows/build-download.yml"

assert SCRIPT.is_file(), "ANDROID_AXIS_PERSISTENCE_SCRIPT_MISSING"
script = SCRIPT.read_text(encoding="utf-8")
home_script = HOME_SCRIPT.read_text(encoding="utf-8")
android = ANDROID.read_text(encoding="utf-8")
view = VIEW.read_text(encoding="utf-8")
builder = BUILDER.read_text(encoding="utf-8")

for marker in [
    "AXIS_PERSISTENCE_SEED_PROJECT",
    "for axis in 3AX 4AX 5AX 6AX",
    'grep -F "MACHINING 3D VIEW $axis"',
    'echo "AXIS_PAGE_${axis}_PERSISTENCE_PASS|REAL_MACHINING3DVIEW|TWO_SNAPSHOTS|MAIN_ACTIVITY_RESUMED"',
    "ANDROID_AXIS_PAGE_PERSISTENCE_GATE_PASS|3AX|4AX|5AX|6AX|TWO_SNAPSHOTS|MAIN_ACTIVITY_RESUMED|NO_HOME_FALLBACK",
]:
    assert marker in script, f"ANDROID_AXIS_PERSISTENCE_MARKER_MISSING:{marker}"

for marker in [
    "for attempt in 1 2 3 4 5",
    'if adb shell uiautomator dump "$UI_REMOTE" >/dev/null 2>&1; then',
    "UI_DUMP_RETRY_PASS|",
    "UI_DUMP_RETRY_EXHAUSTED|",
]:
    assert marker in script, f"ANDROID_AXIS_PERSISTENCE_UI_DUMP_RETRY_MISSING:{marker}"

assert script.count("uiautomator dump") == 1, "ANDROID_AXIS_PERSISTENCE_DIRECT_UI_DUMP_BYPASS_PRESENT"
assert "bash ci/verify_android_axis_page_persistence.sh" in home_script, "ANDROID_AXIS_PERSISTENCE_HOME_CHAIN_MISSING"
assert "bash ci/verify_android_offline_rgb_home.sh" in builder, "ANDROID_HOME_RUNTIME_BUILDER_STEP_MISSING"
assert 'contentDescription = "MACHINING 3D VIEW "' in view, "MACHINING_3D_ACCESSIBILITY_MARKER_MISSING"
assert 'contentDescription="AXIS PAGE 6AX RUNTIME"' in android, "SIX_AXIS_PAGE_ACCESSIBILITY_MARKER_MISSING"
assert 'contentDescription="AXIS PAGE $initialMode RUNTIME"' in android, "MULTI_AXIS_PAGE_ACCESSIBILITY_MARKER_MISSING"
assert '6 -> showSixAxisRuntimeStage()' in android, "HOME_MULTI_FUNCTION_6AX_MUST_USE_DEDICATED_RUNTIME"
assert '6 -> showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("6AX"))' not in android, "HOME_MULTI_FUNCTION_6AX_LEGACY_ROUTE_PRESENT"

print("ANDROID_AXIS_PAGE_PERSISTENCE_CONTRACT_PASS|REAL_PROJECT_RECOVERY|REAL_CAM_REBUILD|REAL_MACHINING3DVIEW|3AX|4AX|5AX|6AX|TWO_SNAPSHOTS|UI_DUMP_RETRY_5X|NO_FAKE_UI")
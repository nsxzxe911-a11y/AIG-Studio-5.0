from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"
DESKTOP = ROOT / "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt"
CONTRACT = ROOT / "core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt"
TEST = ROOT / "core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt"
PRODUCTION_VERIFY = ROOT / "ci/verify_production_runtime.py"
SURFACE_VERIFY = ROOT / "ci/verify_runtime_surfaces.py"
BUILDER = ROOT / ".github/workflows/build-download.yml"

android = ANDROID.read_text(encoding="utf-8")
desktop = DESKTOP.read_text(encoding="utf-8")
contract = CONTRACT.read_text(encoding="utf-8")
test = TEST.read_text(encoding="utf-8")
production_verify = PRODUCTION_VERIFY.read_text(encoding="utf-8")
surface_verify = SURFACE_VERIFY.read_text(encoding="utf-8")
builder = BUILDER.read_text(encoding="utf-8")

modes = 'val modes = listOf("CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI")'
assert modes in contract, "FORMAL_GLOBAL_NAV_9_MODE_CONTRACT_MISSING"
assert 'check(ProductionUiSwitchContract.modes==listOf("CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"))' in test, "FORMAL_GLOBAL_NAV_REGRESSION_EXPECTATION_STALE"

android_required = [
    '"3AX" to 0xFF3B82F6.toInt()',
    '"4AX" to 0xFFF59E0B.toInt()',
    '"5AX" to 0xFFEC4899.toInt()',
    '"6AX" to 0xFF9F72FF.toInt()',
    '"6AX" -> {',
    'action("開啟 6AX",5){showSixAxisRuntimeStage()}',
    'addProductionUi("3AX") { showUnifiedMachiningWorkspace("3AX") }',
    'addProductionUi("4AX") { showUnifiedMachiningWorkspace("4AX") }',
    'addProductionUi("5AX") { showUnifiedMachiningWorkspace("5AX") }',
    'addProductionUi("6AX") { showSixAxisRuntimeStage() }',
    'productionUiSwitch.visibility=View.VISIBLE',
]
for marker in android_required:
    assert marker in android, f"FORMAL_GLOBAL_NAV_ANDROID_MISSING:{marker}"
assert 'productionUiSwitch.visibility=View.GONE' not in android, "FORMAL_GLOBAL_NAV_ANDROID_HIDDEN"

android_order = [
    'addProductionUi("CAD")',
    'addProductionUi("CAM")',
    'addProductionUi("SIM")',
    'addProductionUi("3AX")',
    'addProductionUi("4AX")',
    'addProductionUi("5AX")',
    'addProductionUi("6AX")',
    'addProductionUi("NC")',
    'addProductionUi("AI")',
]
android_positions = [android.index(marker) for marker in android_order]
assert android_positions == sorted(android_positions), f"FORMAL_GLOBAL_NAV_ANDROID_ORDER_INVALID:{android_positions}"

for marker in [
    'n.contains("6AX") || n.contains("6 AXIS") || n=="6X" || name.contains("六軸") -> "6ax"',
    'productionUiButton("3AX", Color(59,130,246))',
    'productionUiButton("4AX", Color(245,158,11))',
    'productionUiButton("5AX", Color(236,72,153))',
    'productionUiButton("6AX", Color(159,114,255))',
    'showUnifiedMachiningEditor(\n                frame,doc,status,productionCamDerivedCache,"3AX"',
    'showUnifiedMachiningEditor(\n                frame,doc,status,productionCamDerivedCache,"4AX"',
    'showUnifiedMachiningEditor(\n                frame,doc,status,productionCamDerivedCache,"5AX"',
    'showSixAxisRuntimeStage()',
]:
    assert marker in desktop, f"FORMAL_GLOBAL_NAV_WINDOWS_MISSING:{marker}"

home_6ax_single = 'add(homeLaunch("6AX",Color(159,114,255)){productionUiButtons["6AX"]?.doClick()})'
home_6ax_double = 'add(homeLaunch("6AX",Color(159,114,255)){productionUiButtons["6AX"]?.doClick(); runCatching{showUnifiedMachiningEditor('
assert home_6ax_single in desktop, "FORMAL_GLOBAL_NAV_WINDOWS_HOME_6AX_SINGLE_PATH_MISSING"
assert home_6ax_double not in desktop, "FORMAL_GLOBAL_NAV_WINDOWS_HOME_6AX_DOUBLE_LAUNCH"

desktop_order = [
    'productionUiButton("CAD"',
    'productionUiButton("CAM"',
    'productionUiButton("SIM"',
    'productionUiButton("3AX"',
    'productionUiButton("4AX"',
    'productionUiButton("5AX"',
    'productionUiButton("6AX"',
    'productionUiButton("NC"',
    'productionUiButton("AI"',
]
desktop_positions = [desktop.index(marker) for marker in desktop_order]
assert desktop_positions == sorted(desktop_positions), f"FORMAL_GLOBAL_NAV_WINDOWS_ORDER_INVALID:{desktop_positions}"

new_switch_marker = 'PRODUCTION_UI_SWITCH_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|DIRECT_AXIS_NAV|STABLE_ORDER|LIVE_RUNTIME'
new_visible_marker = 'VISIBLE_FUNCTION_UI_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS'
new_surface_marker = 'PRODUCTION_UI_SWITCH_RUNTIME_SURFACE_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|DIRECT_AXIS_NAV|STABLE_ORDER'
new_surface_visible = 'VISIBLE_FUNCTION_UI_RUNTIME_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS'

assert modes in production_verify, "FORMAL_GLOBAL_NAV_PRODUCTION_VERIFIER_9_MODE_MISSING"
assert new_switch_marker in production_verify, "FORMAL_GLOBAL_NAV_PRODUCTION_VERIFIER_OUTPUT_STALE"
assert new_visible_marker in production_verify, "FORMAL_GLOBAL_NAV_VISIBLE_VERIFIER_OUTPUT_STALE"
assert modes in surface_verify, "FORMAL_GLOBAL_NAV_SURFACE_VERIFIER_9_MODE_MISSING"
assert new_surface_marker in surface_verify, "FORMAL_GLOBAL_NAV_SURFACE_VERIFIER_OUTPUT_STALE"
assert new_surface_visible in surface_verify, "FORMAL_GLOBAL_NAV_SURFACE_VISIBLE_OUTPUT_STALE"
for marker in (new_switch_marker,new_visible_marker,new_surface_marker,new_surface_visible):
    assert marker in builder, f"FORMAL_GLOBAL_NAV_BUILDER_EXPECTATION_STALE:{marker}"

for stale in (
    'PRODUCTION_UI_SWITCH_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|NC|AI|AXIS_NESTED|STABLE_ORDER|LIVE_RUNTIME',
    'PRODUCTION_UI_SWITCH_RUNTIME_SURFACE_GATE_PASS|WINDOWS|CAD|CAM|SIM|NC|AI|AXIS_NESTED_3AX_4AX_5AX_6AX|STABLE_ORDER',
    'VISIBLE_FUNCTION_UI_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS',
    'VISIBLE_FUNCTION_UI_RUNTIME_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS',
):
    assert stale not in builder, f"FORMAL_GLOBAL_NAV_STALE_BUILDER_MARKER:{stale}"

print("FORMAL_GLOBAL_NAVIGATION_PASS|ANDROID_WINDOWS|9_MODE_CONTRACT|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|DIRECT_AXIS_NAV|6AX_DISTINCT|HOME_6AX_SINGLE_PATH|LIVE_CALLBACKS")

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt"
TEST = ROOT / "core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt"
RUNTIME = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    assert old in text, f"PATCH_SOURCE_MISSING:{label}"
    path.write_text(text.replace(old, new, 1), encoding="utf-8")

replace_once(
    ENV,
    '    val modes = listOf("CAD","CAM","SIM","NC","AI")',
    '    val modes = listOf("CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI")',
    "production_modes",
)

replace_once(
    TEST,
    '    check(ProductionUiSwitchContract.modes==listOf("CAD","CAM","SIM","NC","AI"))',
    '    check(ProductionUiSwitchContract.modes==listOf("CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"))',
    "production_modes_regression",
)
replace_once(
    TEST,
    '    println("VISIBLE_FUNCTION_UI_CORE_GATE_PASS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS")',
    '    println("VISIBLE_FUNCTION_UI_CORE_GATE_PASS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS")',
    "visible_gate_evidence",
)

replace_once(
    RUNTIME,
    '            "5AX" to 0xFFEC4899.toInt(),\n            "NC" to 0xFF50AAFF.toInt(),',
    '            "5AX" to 0xFFEC4899.toInt(),\n            "6AX" to 0xFF9F72FF.toInt(),\n            "NC" to 0xFF50AAFF.toInt(),',
    "six_axis_color",
)

replace_once(
    RUNTIME,
    '''                "5AX" -> {\n                    action("開啟 5AX",1){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("5AX"))}\n                    action("加工工具",5){openCategory("加工"){showMachiningBranch()}}\n                }\n                "NC" -> {''',
    '''                "5AX" -> {\n                    action("開啟 5AX",1){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("5AX"))}\n                    action("加工工具",5){openCategory("加工"){showMachiningBranch()}}\n                }\n                "6AX" -> {\n                    action("開啟 6AX",5){showSixAxisRuntimeStage()}\n                    action("加工工具",5){openCategory("加工"){showMachiningBranch()}}\n                }\n                "NC" -> {''',
    "six_axis_visible_mode",
)

replace_once(
    RUNTIME,
    '''        addProductionUi("SIM") { showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM")) }\n        addProductionUi("NC") { showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC")) }''',
    '''        addProductionUi("SIM") { showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM")) }\n        addProductionUi("3AX") { showUnifiedMachiningWorkspace("3AX") }\n        addProductionUi("4AX") { showUnifiedMachiningWorkspace("4AX") }\n        addProductionUi("5AX") { showUnifiedMachiningWorkspace("5AX") }\n        addProductionUi("6AX") { showSixAxisRuntimeStage() }\n        addProductionUi("NC") { showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC")) }''',
    "axis_global_buttons",
)

replace_once(
    RUNTIME,
    '        productionUiSwitch.visibility=View.GONE',
    '        productionUiSwitch.visibility=View.VISIBLE',
    "global_navigation_visibility",
)

print("APPLY_FORMAL_GLOBAL_NAVIGATION_PASS|9_MODE|3AX_4AX_5AX_6AX|6AX_ACTIONS|VISIBLE")

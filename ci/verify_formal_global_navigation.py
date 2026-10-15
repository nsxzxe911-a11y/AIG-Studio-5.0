from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"
text = RUNTIME.read_text(encoding="utf-8")

required = [
    '"3AX" to 0xFF3B82F6.toInt()',
    '"4AX" to 0xFFF59E0B.toInt()',
    '"5AX" to 0xFFEC4899.toInt()',
    '"6AX" to 0xFF9F72FF.toInt()',
    'addProductionUi("3AX") { showUnifiedMachiningWorkspace("3AX") }',
    'addProductionUi("4AX") { showUnifiedMachiningWorkspace("4AX") }',
    'addProductionUi("5AX") { showUnifiedMachiningWorkspace("5AX") }',
    'addProductionUi("6AX") { showSixAxisRuntimeStage() }',
    'productionUiSwitch.visibility=View.VISIBLE',
]
for marker in required:
    assert marker in text, f"FORMAL_GLOBAL_NAV_MISSING:{marker}"

assert 'productionUiSwitch.visibility=View.GONE' not in text, "FORMAL_GLOBAL_NAV_HIDDEN"

ordered = [
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
positions = [text.index(marker) for marker in ordered]
assert positions == sorted(positions), f"FORMAL_GLOBAL_NAV_ORDER_INVALID:{positions}"

print("FORMAL_GLOBAL_NAVIGATION_PASS|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|HOME_RETURN|VISIBLE")

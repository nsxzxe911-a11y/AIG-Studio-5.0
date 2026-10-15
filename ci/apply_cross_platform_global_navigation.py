import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = ROOT / "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt"
DESKTOP_PACK = ROOT / "desktop/src/main/resources/aig-generated-rgb/approved/184"
PRODUCTION_VERIFY = ROOT / "ci/verify_production_runtime.py"
SURFACE_VERIFY = ROOT / "ci/verify_runtime_surfaces.py"
BUILDER = ROOT / ".github/workflows/build-download.yml"
EXPECTED_6AX_SHA = "7105975cb624dc589a677839a4aac7f1ca2e12a42c3b0e16a7641c56ed0c4bc1"


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    assert old in text, f"PATCH_SOURCE_MISSING:{label}"
    path.write_text(text.replace(old, new, 1), encoding="utf-8")

# Windows Authority metadata for the already-added, byte-identical 6AX asset.
png = DESKTOP_PACK / "6ax.png"
assert png.is_file(), "WINDOWS_6AX_BINARY_MISSING"
digest = hashlib.sha256(png.read_bytes()).hexdigest()
assert digest == EXPECTED_6AX_SHA, f"WINDOWS_6AX_BINARY_SHA_MISMATCH:{digest}"
manifest_path = DESKTOP_PACK / "manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
entry = {
    "id": "6ax",
    "label": "6AX",
    "semantic_role": "AXIS",
    "filename": "6ax.png",
    "sha256": digest,
    "width": 48,
    "height": 48,
    "accent_rgb": "#9F72FF",
}
assets = manifest["assets"]
existing = next((i for i, item in enumerate(assets) if item.get("id") == "6ax"), None)
if existing is None:
    insert_at = next(i for i, item in enumerate(assets) if item.get("id") == "5ax") + 1
    assets.insert(insert_at, entry)
else:
    assets[existing] = entry
manifest["asset_count"] = len(assets)
assert manifest["asset_count"] == 33, manifest["asset_count"]
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

hash_path = DESKTOP_PACK / "sha256.properties"
lines = [line for line in hash_path.read_text(encoding="utf-8").splitlines() if not line.startswith("6ax=")]
insert_at = next(i for i, line in enumerate(lines) if line.startswith("5ax=")) + 1
lines.insert(insert_at, f"6ax={digest}")
hash_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

# Windows Runtime: distinct 6AX visual authority and direct 9-mode production navigation.
replace_once(
    DESKTOP,
    '            n.contains("6AX") || n.contains("6 AXIS") || n=="6X" || name.contains("六軸") -> "5ax"',
    '            n.contains("6AX") || n.contains("6 AXIS") || n=="6X" || name.contains("六軸") -> "6ax"',
    "windows_6ax_asset_mapping",
)
replace_once(
    DESKTOP,
    '    mode("6AX","六軸","6 AXIS",Color(34,211,238),"6AX"){',
    '    mode("6AX","六軸","6 AXIS",Color(159,114,255),"6AX"){',
    "windows_6ax_workspace_accent",
)
replace_once(
    DESKTOP,
    '        add(homeLaunch("6AX",Color(34,211,238)){runCatching{showUnifiedMachiningEditor(',
    '        add(homeLaunch("6AX",Color(159,114,255)){productionUiButtons["6AX"]?.doClick(); runCatching{showUnifiedMachiningEditor(',
    "windows_home_6ax_accent",
)

axis_nav = '''    moduleButtons.add(productionUiButton("3AX", Color(59,130,246)) {
        runCatching { showUnifiedMachiningEditor(
                frame,doc,status,productionCamDerivedCache,"3AX",productionCamSettings,productionFixtures,productionToolAssembly
            ) }
            .onSuccess { status.text="UX • "+RuntimeUxFlowContract.title("3AX")+" • XYZ • "+WorkstationChromeContract.PRECISION }
            .onFailure { status.text="3AX WARNING • "+(it.message?:"error") }
    })
    moduleButtons.add(productionUiButton("4AX", Color(245,158,11)) {
        runCatching { showUnifiedMachiningEditor(
                frame,doc,status,productionCamDerivedCache,"4AX",productionCamSettings,productionFixtures,productionToolAssembly
            ) }
            .onSuccess { status.text="UX • "+RuntimeUxFlowContract.title("4AX")+" • XYZA • "+WorkstationChromeContract.PRECISION }
            .onFailure { status.text="4AX WARNING • "+(it.message?:"error") }
    })
    moduleButtons.add(productionUiButton("5AX", Color(236,72,153)) {
        runCatching { showUnifiedMachiningEditor(
                frame,doc,status,productionCamDerivedCache,"5AX",productionCamSettings,productionFixtures,productionToolAssembly
            ) }
            .onSuccess { status.text="UX • "+RuntimeUxFlowContract.title("5AX")+" • XYZAB • "+WorkstationChromeContract.PRECISION }
            .onFailure { status.text="5AX WARNING • "+(it.message?:"error") }
    })
    moduleButtons.add(productionUiButton("6AX", Color(159,114,255)) {
        showSixAxisRuntimeStage()
        status.text="UX • "+RuntimeUxFlowContract.title("6AX")+" • XYZABC • "+WorkstationChromeContract.PRECISION
    })
'''
replace_once(
    DESKTOP,
    '''    moduleButtons.add(productionUiButton("NC", Color(80,170,255)) {''',
    axis_nav + '''    moduleButtons.add(productionUiButton("NC", Color(80,170,255)) {''',
    "windows_direct_axis_nav",
)

# Formal production verifier: 9-mode is now the authority on both platforms.
replace_once(
    PRODUCTION_VERIFY,
    'switch_modes = \'val modes = listOf("CAD","CAM","SIM","NC","AI")\'',
    'switch_modes = \'val modes = listOf("CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI")\'',
    "production_verifier_modes",
)
for old, new, label in [
    ('    \'addProductionUi("NC")\',', '    \'addProductionUi("3AX")\',\n    \'addProductionUi("4AX")\',\n    \'addProductionUi("5AX")\',\n    \'addProductionUi("6AX")\',\n    \'addProductionUi("NC")\',', "production_verifier_android_axis"),
    ('    \'productionUiButton("NC"\',', '    \'productionUiButton("3AX"\',\n    \'productionUiButton("4AX"\',\n    \'productionUiButton("5AX"\',\n    \'productionUiButton("6AX"\',\n    \'productionUiButton("NC"\',', "production_verifier_windows_axis"),
    ('print("PRODUCTION_UI_SWITCH_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|NC|AI|AXIS_NESTED|STABLE_ORDER|LIVE_RUNTIME")', 'print("PRODUCTION_UI_SWITCH_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|DIRECT_AXIS_NAV|STABLE_ORDER|LIVE_RUNTIME")', "production_verifier_switch_output"),
    ('print("VISIBLE_FUNCTION_UI_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS")', 'print("VISIBLE_FUNCTION_UI_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS")', "production_verifier_visible_output"),
]:
    replace_once(PRODUCTION_VERIFY, old, new, label)

# Runtime surface verifier: same 9-mode authority, no stale nested-only requirement.
replace_once(
    SURFACE_VERIFY,
    '    \'val modes = listOf("CAD","CAM","SIM","NC","AI")\',',
    '    \'val modes = listOf("CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI")\',',
    "surface_verifier_modes",
)
replace_once(
    SURFACE_VERIFY,
    '    \'productionUiButton("NC"\',',
    '    \'productionUiButton("3AX"\',\n    \'productionUiButton("4AX"\',\n    \'productionUiButton("5AX"\',\n    \'productionUiButton("6AX"\',\n    \'productionUiButton("NC"\',',
    "surface_verifier_windows_axis",
)
replace_once(
    SURFACE_VERIFY,
    'print("PRODUCTION_UI_SWITCH_RUNTIME_SURFACE_GATE_PASS|WINDOWS|CAD|CAM|SIM|NC|AI|AXIS_NESTED_3AX_4AX_5AX_6AX|STABLE_ORDER")',
    'print("PRODUCTION_UI_SWITCH_RUNTIME_SURFACE_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|DIRECT_AXIS_NAV|STABLE_ORDER")',
    "surface_verifier_switch_output",
)
replace_once(
    SURFACE_VERIFY,
    'print("VISIBLE_FUNCTION_UI_RUNTIME_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS")',
    'print("VISIBLE_FUNCTION_UI_RUNTIME_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS")',
    "surface_verifier_visible_output",
)

# Formal builder must consume the promoted contract, not stale nested-axis evidence strings.
for old, new, label in [
    ("PRODUCTION_UI_SWITCH_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|NC|AI|AXIS_NESTED|STABLE_ORDER|LIVE_RUNTIME", "PRODUCTION_UI_SWITCH_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|DIRECT_AXIS_NAV|STABLE_ORDER|LIVE_RUNTIME", "builder_switch_marker"),
    ("VISIBLE_FUNCTION_UI_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS", "VISIBLE_FUNCTION_UI_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS", "builder_visible_marker"),
    ("PRODUCTION_UI_SWITCH_RUNTIME_SURFACE_GATE_PASS|WINDOWS|CAD|CAM|SIM|NC|AI|AXIS_NESTED_3AX_4AX_5AX_6AX|STABLE_ORDER", "PRODUCTION_UI_SWITCH_RUNTIME_SURFACE_GATE_PASS|ANDROID|WINDOWS|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|DIRECT_AXIS_NAV|STABLE_ORDER", "builder_surface_switch_marker"),
    ("VISIBLE_FUNCTION_UI_RUNTIME_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS", "VISIBLE_FUNCTION_UI_RUNTIME_GATE_PASS|ANDROID|WINDOWS|NO_UI_NO_FUNCTION|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|VISIBLE_ACTIONS|LIVE_CALLBACKS", "builder_surface_visible_marker"),
    ("AXIS_NESTED_GATE", "DIRECT_AXIS_NAV_GATE", "builder_toolchain_label"),
]:
    replace_once(BUILDER, old, new, label)

print("APPLY_CROSS_PLATFORM_GLOBAL_NAVIGATION_PASS|ANDROID_WINDOWS|9_MODE|6AX_DISTINCT|FORMAL_GATES_PROMOTED")

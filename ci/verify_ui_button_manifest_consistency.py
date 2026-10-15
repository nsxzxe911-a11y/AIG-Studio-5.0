import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "design/ui/button-manifest-v1.json"
KOTLIN_PATH = ROOT / "core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt"
RUNTIME_PATH = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"

manifest = json.loads(JSON_PATH.read_text(encoding="utf-8"))
contract = KOTLIN_PATH.read_text(encoding="utf-8")
runtime = RUNTIME_PATH.read_text(encoding="utf-8")

assert manifest["schema"] == "aig-ui-button-manifest-v1"
assert manifest["pipeline"] == "AUTHORITY_RGB_TO_BUTTON_ID_TO_MANIFEST_TO_SHARED_COMMAND_TO_RUNTIME_CORE"
assert manifest["boundsVerified"] is False
assert 'const val SCHEMA="aig-ui-button-manifest-v1"' in contract
assert 'const val AUTHORITY_POLICY="AUTHORITY_RGB_TO_BUTTON_ID_TO_MANIFEST_TO_SHARED_COMMAND_TO_RUNTIME_CORE"' in contract
assert "val bounds: UiButtonBounds? = null" in contract
assert "PRODUCTION_NAVIGATION.all { it.bounds == null }" in contract

nav_match = re.search(
    r"val\s+PRODUCTION_NAVIGATION\s*=\s*listOf\((.*?)\n\s*\)\n\n\s*init\s*\{",
    contract,
    re.DOTALL,
)
assert nav_match, "UI_BUTTON_KOTLIN_NAVIGATION_BLOCK_MISSING"
nav_text = nav_match.group(1)
chunks = nav_text.split("UiButtonManifestEntry(")[1:]
assert chunks, "UI_BUTTON_KOTLIN_ENTRIES_MISSING"

kotlin_entries = {}
for chunk in chunks:
    def field(pattern: str, label: str) -> str:
        match = re.search(pattern, chunk, re.DOTALL)
        assert match, f"UI_BUTTON_KOTLIN_FIELD_MISSING:{label}"
        return match.group(1)

    button_id = field(r'buttonId\s*=\s*"([^"]+)"', "buttonId")
    surface_id = field(r'surfaceId\s*=\s*"([^"]+)"', f"{button_id}:surfaceId")
    asset_id = field(r'assetId\s*=\s*"([^"]+)"', f"{button_id}:assetId")
    command = field(r'command\s*=\s*SharedUiCommand\.([A-Z0-9_]+)', f"{button_id}:command")
    callback_match = re.search(
        r'verifiedCallback\s*=\s*(?:"""(.*?)"""|"([^"\n]*)")',
        chunk,
        re.DOTALL,
    )
    assert callback_match, f"UI_BUTTON_KOTLIN_FIELD_MISSING:{button_id}:verifiedCallback"
    callback = callback_match.group(1) if callback_match.group(1) is not None else callback_match.group(2)
    assert button_id not in kotlin_entries, f"UI_BUTTON_KOTLIN_DUPLICATE_ID:{button_id}"
    kotlin_entries[button_id] = {
        "surfaceId": surface_id,
        "assetId": asset_id,
        "sharedCommand": command,
        "verifiedCallback": callback,
    }

json_entries = {}
for entry in manifest["buttons"]:
    button_id = entry["buttonId"]
    assert button_id not in json_entries, f"UI_BUTTON_JSON_DUPLICATE_ID:{button_id}"
    assert entry["bounds"] is None, f"UI_BUTTON_BOUNDS_MUST_REMAIN_NULL:{button_id}"
    json_entries[button_id] = entry

assert set(json_entries) == set(kotlin_entries), (
    "UI_BUTTON_ID_SET_DRIFT:"
    f"JSON={sorted(json_entries)}:KOTLIN={sorted(kotlin_entries)}"
)

for button_id, json_entry in sorted(json_entries.items()):
    kotlin_entry = kotlin_entries[button_id]
    for field_name in ("surfaceId", "assetId", "sharedCommand", "verifiedCallback"):
        assert json_entry[field_name] == kotlin_entry[field_name], (
            f"UI_BUTTON_MANIFEST_DRIFT:{button_id}:{field_name}:"
            f"JSON={json_entry[field_name]!r}:KOTLIN={kotlin_entry[field_name]!r}"
        )

    callback = json_entry["verifiedCallback"]
    assert callback in runtime, f"UI_BUTTON_RUNTIME_CALLBACK_MISSING:{button_id}:{callback}"

assert len(json_entries) == 6, f"UI_BUTTON_VERIFIED_NAV_COUNT_MISMATCH:{len(json_entries)}"
print(
    "UI_BUTTON_MANIFEST_CONSISTENCY_PASS|"
    "JSON_KOTLIN_RUNTIME|6_VERIFIED_NAV|CALLBACKS_LIVE|BOUNDS_NULL"
)

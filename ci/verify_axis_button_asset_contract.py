import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "app/src/main/assets/aig-generated-rgb/approved/184"
MANIFEST = PACK / "manifest.json"
HASHES = PACK / "sha256.properties"
RUNTIME = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
hashes = {}
for raw in HASHES.read_text(encoding="utf-8").splitlines():
    line = raw.strip()
    if line and not line.startswith("#") and "=" in line:
        key, value = line.split("=", 1)
        hashes[key] = value

assets = {item["id"]: item for item in manifest["assets"]}
for axis in ("3ax", "4ax", "5ax", "6ax"):
    assert axis in assets, f"AXIS_AUTHORITY_ASSET_MISSING:{axis}"
    path = PACK / assets[axis]["filename"]
    assert path.is_file(), f"AXIS_AUTHORITY_FILE_MISSING:{axis}"
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert assets[axis]["sha256"] == digest, f"AXIS_MANIFEST_SHA_MISMATCH:{axis}"
    assert hashes.get(axis) == digest, f"AXIS_RUNTIME_SHA_MISMATCH:{axis}"
    assert assets[axis]["semantic_role"] == "AXIS", f"AXIS_SEMANTIC_ROLE_MISMATCH:{axis}"
    assert assets[axis]["width"] == 48 and assets[axis]["height"] == 48, f"AXIS_SIZE_MISMATCH:{axis}"

assert manifest["asset_count"] == len(manifest["assets"]), "AUTHORITY_ASSET_COUNT_DRIFT"
assert manifest["asset_count"] == 33, f"AUTHORITY_ASSET_COUNT_EXPECTED_33:{manifest['asset_count']}"
axis_hashes = [hashes[key] for key in ("3ax", "4ax", "5ax", "6ax")]
assert len(set(axis_hashes)) == 4, "AXIS_AUTHORITY_ASSETS_MUST_BE_DISTINCT"
assert assets["6ax"]["accent_rgb"] == "#9F72FF", "6AX_PRIMARY_ACCENT_MUST_MATCH_RUNTIME_C_AXIS"

runtime = RUNTIME.read_text(encoding="utf-8")
assert 'n.contains("6AX") || n.contains("6 AXIS") || n=="6X" -> "6ax"' in runtime, "6AX_RUNTIME_ASSET_MAPPING_MISSING"
assert 'n.contains("6AX") || n.contains("6 AXIS") || n=="6X" -> "5ax"' not in runtime, "6AX_MUST_NOT_REUSE_5AX_ASSET"
assert 'color=0xFF9F72FF.toInt()' in runtime, "6AX_RUNTIME_PRIMARY_ACCENT_MISSING"
assert 'color=0xFF27E9FF.toInt()' in runtime, "6AX_RUNTIME_SECONDARY_ACCENT_MISSING"

print("AXIS_BUTTON_ASSET_CONTRACT_PASS|3AX|4AX|5AX|6AX_DISTINCT|184_PACK|RUNTIME_MAPPING|HASH_VERIFIED")

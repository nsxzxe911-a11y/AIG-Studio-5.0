import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "app/src/main/assets/aig-generated-rgb/approved/184"
PNG = PACK / "6ax.png"
MANIFEST = PACK / "manifest.json"
HASHES = PACK / "sha256.properties"
RUNTIME = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"
EXPECTED = "7105975cb624dc589a677839a4aac7f1ca2e12a42c3b0e16a7641c56ed0c4bc1"

assert PNG.is_file(), "6AX_BINARY_MISSING"
digest = hashlib.sha256(PNG.read_bytes()).hexdigest()
assert digest == EXPECTED, f"6AX_BINARY_SHA_MISMATCH:{digest}"

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
assets = manifest["assets"]
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
existing = next((i for i, item in enumerate(assets) if item.get("id") == "6ax"), None)
if existing is None:
    insert_at = next(i for i, item in enumerate(assets) if item.get("id") == "5ax") + 1
    assets.insert(insert_at, entry)
else:
    assets[existing] = entry
manifest["asset_count"] = len(assets)
assert manifest["asset_count"] == 33, manifest["asset_count"]
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

lines = HASHES.read_text(encoding="utf-8").splitlines()
lines = [line for line in lines if not line.startswith("6ax=")]
insert_at = next(i for i, line in enumerate(lines) if line.startswith("5ax=")) + 1
lines.insert(insert_at, f"6ax={digest}")
HASHES.write_text("\n".join(lines) + "\n", encoding="utf-8")

runtime = RUNTIME.read_text(encoding="utf-8")
old = 'n.contains("6AX") || n.contains("6 AXIS") || n=="6X" -> "5ax"'
new = 'n.contains("6AX") || n.contains("6 AXIS") || n=="6X" -> "6ax"'
if old in runtime:
    runtime = runtime.replace(old, new, 1)
assert new in runtime, "6AX_RUNTIME_ASSET_MAPPING_MISSING"
assert 'color=0xFF9F72FF.toInt()' in runtime, "6AX_PRIMARY_ACCENT_MISSING"
assert 'color=0xFF27E9FF.toInt()' in runtime, "6AX_SECONDARY_ACCENT_MISSING"
RUNTIME.write_text(runtime, encoding="utf-8")

print(f"APPLY_6AX_AUTHORITY_METADATA_PASS|SHA256={digest}|ASSET_COUNT={manifest['asset_count']}|RUNTIME=6ax")

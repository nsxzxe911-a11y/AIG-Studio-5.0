import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKS = {
    "ANDROID": ROOT / "app/src/main/assets/aig-generated-rgb/approved/184",
    "WINDOWS": ROOT / "desktop/src/main/resources/aig-generated-rgb/approved/184",
}
ANDROID_RUNTIME = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"
WINDOWS_RUNTIME = ROOT / "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt"
EXPECTED_6AX_SHA = "7105975cb624dc589a677839a4aac7f1ca2e12a42c3b0e16a7641c56ed0c4bc1"

for platform, pack in PACKS.items():
    manifest_path = pack / "manifest.json"
    hashes_path = pack / "sha256.properties"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    hashes = {}
    for raw in hashes_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            hashes[key] = value

    assets = {item["id"]: item for item in manifest["assets"]}
    for axis in ("3ax", "4ax", "5ax", "6ax"):
        assert axis in assets, f"{platform}_AXIS_AUTHORITY_ASSET_MISSING:{axis}"
        path = pack / assets[axis]["filename"]
        assert path.is_file(), f"{platform}_AXIS_AUTHORITY_FILE_MISSING:{axis}"
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        assert assets[axis]["sha256"] == digest, f"{platform}_AXIS_MANIFEST_SHA_MISMATCH:{axis}"
        assert hashes.get(axis) == digest, f"{platform}_AXIS_RUNTIME_SHA_MISMATCH:{axis}"
        assert assets[axis]["semantic_role"] == "AXIS", f"{platform}_AXIS_SEMANTIC_ROLE_MISMATCH:{axis}"
        assert assets[axis]["width"] == 48 and assets[axis]["height"] == 48, f"{platform}_AXIS_SIZE_MISMATCH:{axis}"

    assert manifest["asset_count"] == len(manifest["assets"]), f"{platform}_AUTHORITY_ASSET_COUNT_DRIFT"
    assert manifest["asset_count"] == 33, f"{platform}_AUTHORITY_ASSET_COUNT_EXPECTED_33:{manifest['asset_count']}"
    axis_hashes = [hashes[key] for key in ("3ax", "4ax", "5ax", "6ax")]
    assert len(set(axis_hashes)) == 4, f"{platform}_AXIS_AUTHORITY_ASSETS_MUST_BE_DISTINCT"
    assert assets["6ax"]["accent_rgb"] == "#9F72FF", f"{platform}_6AX_PRIMARY_ACCENT_MUST_MATCH_C_AXIS"
    assert hashes["6ax"] == EXPECTED_6AX_SHA, f"{platform}_6AX_SHA_UNEXPECTED:{hashes['6ax']}"

android = ANDROID_RUNTIME.read_text(encoding="utf-8")
assert 'n.contains("6AX") || n.contains("6 AXIS") || n=="6X" -> "6ax"' in android, "ANDROID_6AX_RUNTIME_ASSET_MAPPING_MISSING"
assert 'n.contains("6AX") || n.contains("6 AXIS") || n=="6X" -> "5ax"' not in android, "ANDROID_6AX_MUST_NOT_REUSE_5AX_ASSET"
assert 'color=0xFF9F72FF.toInt()' in android, "ANDROID_6AX_RUNTIME_PRIMARY_ACCENT_MISSING"
assert 'color=0xFF27E9FF.toInt()' in android, "ANDROID_6AX_RUNTIME_SECONDARY_ACCENT_MISSING"

windows = WINDOWS_RUNTIME.read_text(encoding="utf-8")
assert 'n.contains("6AX") || n.contains("6 AXIS") || n=="6X" || name.contains("六軸") -> "6ax"' in windows, "WINDOWS_6AX_RUNTIME_ASSET_MAPPING_MISSING"
assert 'n.contains("6AX") || n.contains("6 AXIS") || n=="6X" || name.contains("六軸") -> "5ax"' not in windows, "WINDOWS_6AX_MUST_NOT_REUSE_5AX_ASSET"
assert 'productionUiButton("6AX", Color(159,114,255))' in windows, "WINDOWS_6AX_NAV_ACCENT_MISSING"

print("AXIS_BUTTON_ASSET_CONTRACT_PASS|ANDROID_WINDOWS|3AX|4AX|5AX|6AX_DISTINCT|184_PACK|RUNTIME_MAPPING|HASH_VERIFIED")

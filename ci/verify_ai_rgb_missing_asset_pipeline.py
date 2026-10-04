#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT / "app/src/main/assets/aig-generated-rgb/ai-supplemental/362"
DESKTOP = ROOT / "desktop/src/main/resources/aig-generated-rgb/ai-supplemental/362"
EXPECTED = {
    "home_mobile.jpg": "a6df39d8195bd71c37b41648d6f3e2c30713893ebc47c7b7f743759a2ab9f62f",
    "home_desktop.jpg": "028311df6f288dc1fb70fd4c48a13b5760565709e412503cd103de4fea70681d",
}

def fail(code):
    raise SystemExit("AI_RGB_MISSING_ASSET_FAIL|" + code)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

if "versionName=362.0.0" not in (ROOT / "release-version.properties").read_text(encoding="utf-8"):
    fail("VERSION_362")
contract = (ROOT / "core/src/main/kotlin/com/aigstudio/core/AiRgbMissingAssetContract.kt").read_text(encoding="utf-8")
for token in (
    'SCHEMA = "AIG_AI_RGB_ASSET_V1"',
    "PIPELINE_ENABLED = true",
    "AUTO_REPLACE_EXISTING = false",
    "PRESERVE_HISTORICAL_PACKS = true",
    "RUNTIME_LOAD_REQUIRES_SHA = true",
    'FALLBACK_PACK = "184"',
):
    if token not in contract:
        fail("CONTRACT_" + token.split("=")[0].strip())
for root in (ANDROID, DESKTOP):
    manifest_path = root / "manifest.json"
    if not manifest_path.is_file():
        fail("MANIFEST_MISSING_" + root.parts[-4])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schema") != "AIG_AI_RGB_ASSET_V1":
        fail("MANIFEST_SCHEMA")
    if manifest.get("policy", {}).get("failure_action") != "WARN_AND_FALLBACK_PACK_184":
        fail("FAILURE_ACTION")
    for file_name, expected in EXPECTED.items():
        path = root / file_name
        if not path.is_file():
            fail("ASSET_MISSING_" + file_name)
        if sha(path) != expected:
            fail("SHA_" + file_name)
if not (ROOT / "app/src/main/assets/aig-generated-rgb/approved/184").is_dir():
    fail("ANDROID_184_REMOVED")
if not (ROOT / "desktop/src/main/resources/aig-generated-rgb/approved/184").is_dir():
    fail("DESKTOP_184_REMOVED")
android = (ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt").read_text(encoding="utf-8")
desktop = (ROOT / "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt").read_text(encoding="utf-8")
for text, code in ((android, "ANDROID"), (desktop, "WINDOWS")):
    if "缺圖 AI RGB 補圖" not in text:
        fail(code + "_SETTING")
if "AiRgbSupplementalAssets.loadMobileHome" not in android:
    fail("ANDROID_CALLBACK")
if "AiRgbSupplementalAssets.loadDesktopHome" not in desktop:
    fail("WINDOWS_CALLBACK")
print("AI_RGB_MISSING_ASSET_GATE_PASS|STUDIO_362|MOBILE_DESKTOP|SHA_VERIFIED|PACK_184_PRESERVED|AUTO_REPLACE_OFF|WARN_FALLBACK|REAL_CALLBACKS")

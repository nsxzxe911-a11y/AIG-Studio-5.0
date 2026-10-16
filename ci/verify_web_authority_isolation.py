from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/"web/index.html").read_text(encoding="utf-8")
manifest_path=ROOT/"design/approved/web-runtime-surface-authority-v1.json"

assert "engineering-assets/" not in html, "WEB_RUNTIME_ENGINEERING_ASSET_REFERENCE"
assert "\\engineering-assets\\" not in html, "WEB_RUNTIME_ENGINEERING_ASSET_REFERENCE_WINDOWS"
assert '["AI","' in html, "FORMAL_AI_SURFACE_MISSING"
assert "function aiPage()" in html, "FORMAL_AI_PAGE_MISSING"
assert manifest_path.exists(), "WEB_RUNTIME_AUTHORITY_MANIFEST_MISSING"
data=json.loads(manifest_path.read_text(encoding="utf-8"))
expected=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]
assert data.get("formal_surfaces")==expected, "FORMAL_SURFACE_AUTHORITY_ORDER_MISMATCH"
surfaces=data.get("surfaces",{})
assert set(surfaces)==set(expected), "FORMAL_SURFACE_AUTHORITY_COVERAGE_MISMATCH"
for name in expected:
    entry=surfaces[name]
    status=entry.get("status")
    assert status in {"USER_APPROVED_VISUAL_TARGET","APPROVED_ASSET_PENDING_INGEST"}, f"INVALID_AUTHORITY_STATUS:{name}:{status}"
    serialized=json.dumps(entry,ensure_ascii=False).upper()
    assert "ENGINEERING" not in serialized, f"ENGINEERING_FALLBACK_FORBIDDEN:{name}"
    if status=="APPROVED_ASSET_PENDING_INGEST":
        assert entry.get("fallback")=="PROCEDURAL_RGB_GLASS", f"PENDING_SURFACE_FALLBACK_INVALID:{name}"
print("WEB_AUTHORITY_ISOLATION_GATE_PASS|NO_ENGINEERING_ASSETS|10_FORMAL_SURFACES|PROCEDURAL_RGB_GLASS_FALLBACK")

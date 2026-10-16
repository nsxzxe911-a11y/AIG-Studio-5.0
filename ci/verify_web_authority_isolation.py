from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/"web/index.html").read_text(encoding="utf-8")

assert "engineering-assets/" not in html, "WEB_RUNTIME_ENGINEERING_ASSET_REFERENCE"
assert "\\engineering-assets\\" not in html, "WEB_RUNTIME_ENGINEERING_ASSET_REFERENCE_WINDOWS"
assert '["AI","' in html, "FORMAL_AI_SURFACE_MISSING"
assert "function aiPage()" in html, "FORMAL_AI_PAGE_MISSING"
print("WEB_AUTHORITY_ISOLATION_GATE_PASS|NO_ENGINEERING_ASSETS|AI_FORMAL_SURFACE")

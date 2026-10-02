from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/"web/index.html").read_text(encoding="utf-8")

for page in ("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC"):
    assert f'["{page}","' in html, f"FORMAL_NAV_MISSING:{page}"

assert '["功能",' not in re.search(r"const pages=\[(.*?)\];",html,re.S).group(1), "UTILITY_IN_FORMAL_NAV:功能"
assert '["刀路",' not in re.search(r"const pages=\[(.*?)\];",html,re.S).group(1), "UTILITY_IN_FORMAL_NAV:刀路"
assert "function homePage()" in html, "HOME_RUNTIME_MISSING"
assert "function simHubPage()" in html, "SIM_HUB_MISSING"
assert "function ncPage()" in html, "NC_RUNTIME_MISSING"
assert "function makeNcRuntime(root)" in html, "NC_BINDING_MISSING"
assert 'data-nc-axis' in html and 'data-nc-code' in html, "NC_EDITOR_MISSING"
assert 'data-open-page="刀路"' in html, "TOOLPATH_ENTRY_MISSING"
assert 'data-open-page="功能"' in html, "UTILITY_ENTRY_MISSING"
assert 'location.hash||"#HOME"' in html, "HOME_NOT_DEFAULT"
print("FORMAL_WEB_NAV_GATE_PASS|HOME|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|UTILITY_NESTED|NC_REAL_EDITOR")

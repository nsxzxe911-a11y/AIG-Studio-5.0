from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/"web/index.html").read_text(encoding="utf-8")

for page in ("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"):
    assert f'["{page}","' in html, f"FORMAL_NAV_MISSING:{page}"

assert '["功能",' not in re.search(r"const pages=\[(.*?)\];",html,re.S).group(1), "UTILITY_IN_FORMAL_NAV:功能"
assert '["刀路",' not in re.search(r"const pages=\[(.*?)\];",html,re.S).group(1), "UTILITY_IN_FORMAL_NAV:刀路"
assert "function homePage()" in html, "HOME_RUNTIME_MISSING"
assert "function simHubPage()" in html, "SIM_HUB_MISSING"
assert "function ncPage()" in html, "NC_RUNTIME_MISSING"
assert "function aiPage()" in html, "AI_RUNTIME_MISSING"
assert "data-ai-runtime" in html, "AI_RUNTIME_BINDING_MISSING"
assert "function makeAiRuntime(root)" in html, "AI_RUNTIME_CALLBACK_MISSING"
for marker in ("data-ai-working","data-ai-verified","data-ai-vault","data-ai-context-cad","data-ai-context-cam","data-ai-context-sim","data-ai-context-nc"):
    assert marker in html, f"AI_CONTEXT_MARKER_MISSING:{marker}"
assert "function makeNcRuntime(root)" in html, "NC_BINDING_MISSING"
assert 'data-nc-axis' in html and 'data-nc-code' in html, "NC_EDITOR_MISSING"
assert 'data-open-page="刀路"' in html, "TOOLPATH_ENTRY_MISSING"
assert 'data-open-page="功能"' in html, "UTILITY_ENTRY_MISSING"
assert 'location.hash||"#HOME"' in html, "HOME_NOT_DEFAULT"
print("FORMAL_WEB_NAV_GATE_PASS|HOME|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|UTILITY_NESTED|NC_REAL_EDITOR|AI_FORMAL_RUNTIME")

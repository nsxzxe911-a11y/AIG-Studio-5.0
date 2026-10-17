#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    path = ROOT / rel
    if not path.is_file():
        raise SystemExit(f"RGB_RESPONSIVE_CONTRACT_RED|MISSING={rel}")
    return path.read_text(encoding="utf-8")


contract = read("web/runtime/page-contract.js")
terms = read("web/runtime/zh-TW.js")
tokens = read("web/runtime/rgb-tokens.css")

required_pages = {
    "HOME": "首頁",
    "CAD": "製圖",
    "CAM": "加工",
    "TOOLPATH_3D": "3D 刀路",
    "SIM": "模擬",
    "3AX": "三軸",
    "4AX": "四軸",
    "5AX": "五軸",
    "6AX": "六軸",
    "NC": "程式",
    "AI": "AI 助手",
    "SETTINGS": "設定",
}
for page_id, label in required_pages.items():
    if f'id: "{page_id}"' not in contract:
        raise SystemExit(f"RGB_RESPONSIVE_CONTRACT_FAIL|PAGE_ID={page_id}")
    if f'"{page_id}": "{label}"' not in terms:
        raise SystemExit(f"RGB_RESPONSIVE_CONTRACT_FAIL|ZH_TW={page_id}:{label}")

for marker in ("pageId", "panelIds", "buttonIds", "layoutPriority", "safetyClass"):
    if marker not in contract:
        raise SystemExit(f"RGB_RESPONSIVE_CONTRACT_FAIL|METADATA={marker}")

for token in (
    "--aig-bg: #020407",
    "--aig-panel: #07111B",
    "--aig-rgb-normal",
    "--aig-rgb-pressed",
    "--aig-rgb-selected",
    "--aig-rgb-disabled",
    "--aig-rgb-alarm",
):
    if token not in tokens:
        raise SystemExit(f"RGB_RESPONSIVE_CONTRACT_FAIL|TOKEN={token}")

combined = "\n".join((contract, terms, tokens)).lower()
for forbidden in ("runtime-shell", "dual-runtime", "product-pane", "engineering shell", "debug dashboard", "placeholder workspace"):
    if forbidden in combined:
        raise SystemExit(f"RGB_RESPONSIVE_CONTRACT_FAIL|FORBIDDEN={forbidden}")

if "AIG_PAGE_REGISTRY" not in contract or "AIG_ZHTW_TERMS" not in terms:
    raise SystemExit("RGB_RESPONSIVE_CONTRACT_FAIL|EXPORTS")

print("AIG_RGB_RESPONSIVE_PAGE_CONTRACT_PASS")

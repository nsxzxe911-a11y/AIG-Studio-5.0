#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = (ROOT / "web" / "main-runtime-preview.html").read_text(encoding="utf-8")


def require(needle: str, label: str) -> None:
    if needle not in WEB:
        raise SystemExit(f"STUDIO_FORMAL_WEB_RUNTIME_FAIL|{label}|missing={needle}")


def forbid(needle: str, label: str) -> None:
    if needle in WEB:
        raise SystemExit(f"STUDIO_FORMAL_WEB_RUNTIME_FAIL|{label}|forbidden={needle}")


require('<title>AIG Studio 5.0 • Main Runtime Web Preview</title>', "PRODUCT_IDENTITY")
require('<b>AIG Studio 5.0</b>', "BRAND_IDENTITY")
require('const names=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","設定"]', "FORMAL_PAGE_ORDER")
require('AUTO-FINISH • VERSION FROZEN', "VERSION_FREEZE")
require('6AX Web Runtime Mirror', "SIX_AXIS_EXPLICIT_MIRROR")
require('X/Y/Z/A/B/C', "SIX_AXIS_ABC_CONTRACT")
require('NATIVE PRODUCTION CORE VERIFIED', "NATIVE_6AX_PROVENANCE")
for stale in ("Studio 356", "Studio 356 Web Runtime"):
    forbid(stale, "STALE_BUILDER_IDENTITY")
for fake in ('6AX 真 3D / 材料移除',):
    forbid(fake, "FAKE_WEB_3D_CLAIM")
for shell in ("runtime-shell.js", "dual-runtime", "product-pane", "雙產品工作區", "engineering shell", "工程殼"):
    forbid(shell, "ENGINEERING_SHELL")
print("STUDIO_FORMAL_WEB_RUNTIME_GATE_PASS|AIG_STUDIO_5_0|6AX_MIRROR|NATIVE_PRODUCTION_PROVENANCE|NO_FAKE_WEB_3D")

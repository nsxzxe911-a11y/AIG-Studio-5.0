#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FORBIDDEN_PRODUCTION_TOKENS = (
    "runtime-shell.js",
    "dual-runtime",
    "product-pane",
    "雙產品工作區",
    "engineering shell",
    "工程殼",
    "authority-compare/index.html",
)


def validate_entry_text(text: str, *, source: str) -> None:
    folded = text.casefold()
    for token in FORBIDDEN_PRODUCTION_TOKENS:
        if token.casefold() in folded:
            raise ValueError(f"ENGINEERING_SHELL_FORBIDDEN|{source}|{token}")


def read_text(rel: str) -> str:
    path = ROOT / rel
    if not path.is_file():
        raise SystemExit(f"BLOCKED FORMAL_RUNTIME_ENTRY_MISSING|{rel}")
    return path.read_text(encoding="utf-8")


def main() -> None:
    recovery = json.loads(read_text("continuity/dual-project-auto-finish.json"))
    policy = recovery.get("formalRuntimePolicy") or {}
    if policy.get("homeFirst") is not True:
        raise SystemExit("BLOCKED FORMAL_HOME_FIRST_POLICY")
    if policy.get("engineeringShellFallback") is not False:
        raise SystemExit("BLOCKED ENGINEERING_SHELL_FALLBACK_POLICY")
    if policy.get("authorityCompareProductionEntry") is not False:
        raise SystemExit("BLOCKED AUTHORITY_COMPARE_PRODUCTION_POLICY")

    configured = tuple(policy.get("forbiddenProductionTokens") or ())
    missing = [token for token in FORBIDDEN_PRODUCTION_TOKENS if token not in configured]
    if missing:
        raise SystemExit(f"BLOCKED FORMAL_RUNTIME_FORBIDDEN_TOKEN_POLICY_MISSING|{missing}")

    dockerfile = read_text("Dockerfile.web-runtime")
    if "COPY web/main-runtime-preview.html /usr/share/nginx/html/index.html" not in dockerfile:
        raise SystemExit("BLOCKED WEB_PRODUCTION_ENTRY_NOT_MAIN_RUNTIME")
    validate_entry_text(dockerfile, source="Dockerfile.web-runtime")

    web_entry = read_text("web/main-runtime-preview.html")
    validate_entry_text(web_entry, source="web/main-runtime-preview.html")
    if "正式 HOME" not in web_entry:
        raise SystemExit("BLOCKED WEB_FORMAL_HOME_MARKER_MISSING")

    production_runtime = read_text("ci/verify_production_runtime.py")
    if "PRODUCTION_UI_SWITCH_GATE_PASS" not in production_runtime:
        raise SystemExit("BLOCKED STUDIO_PRODUCTION_RUNTIME_VERIFIER_MISSING")

    print("STUDIO_FORMAL_RUNTIME_ENTRY_GATE_PASS|HOME_FIRST|NO_ENGINEERING_SHELL_FALLBACK|WEB_MAIN_RUNTIME")


if __name__ == "__main__":
    main()

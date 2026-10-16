#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERIFIER = ROOT / "ci" / "verify_formal_runtime_entry.py"


def fail(message: str) -> None:
    print(f"FORMAL_RUNTIME_ENTRY_TEST_FAIL|{message}")
    raise SystemExit(1)


if not VERIFIER.is_file():
    fail("EXPECTED_RED|FORMAL_RUNTIME_VERIFIER_MISSING")

spec = importlib.util.spec_from_file_location("verify_formal_runtime_entry", VERIFIER)
if spec is None or spec.loader is None:
    fail("IMPORT_SPEC")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

validate_entry_text = getattr(module, "validate_entry_text", None)
if validate_entry_text is None:
    fail("validate_entry_text_MISSING")

for forbidden in (
    "runtime-shell.js",
    "dual-runtime",
    "product-pane",
    "雙產品工作區",
    "engineering shell",
    "工程殼",
    "authority-compare/index.html",
):
    try:
        validate_entry_text(f"FORMAL RGB HOME\n{forbidden}\n", source="fixture")
    except ValueError as exc:
        if "ENGINEERING_SHELL_FORBIDDEN" not in str(exc):
            fail(f"WRONG_REJECTION|{forbidden}|{exc}")
    else:
        fail(f"FORBIDDEN_ACCEPTED|{forbidden}")

formal = "FORMAL RGB HOME\nHOME_FIRST=true\nAUTHORITY_RUNTIME=true\nENGINEERING_SHELL_FALLBACK=false\n"
try:
    validate_entry_text(formal, source="fixture")
except Exception as exc:  # noqa: BLE001
    fail(f"FORMAL_REJECTED|{exc}")

print("STUDIO_FORMAL_RUNTIME_ENTRY_UNIT_GATE_PASS")

#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "core/src/main/kotlin/com/aigstudio/core/ui/RuntimeUiContract.kt"
MAIN = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"


def need(ok: bool, code: str) -> None:
    if not ok:
        raise SystemExit("MODULAR_UI_FAIL|" + code)

need(CONTRACT.is_file(), "MISSING_SHARED_CONTRACT")
text = CONTRACT.read_text(encoding="utf-8")
for token in [
    "enum class RuntimeSurface",
    "HOME", "CAD", "CAM", "SIM", "AXIS3", "AXIS4", "AXIS5", "AXIS6", "NC", "AI",
    "enum class RuntimeLayoutClass",
    "data class RuntimeViewport",
    "object RuntimeResponsivePolicy",
    "data class RuntimeAction",
    "fun interface RuntimeActionSink",
]:
    need(token in text, "CONTRACT_TOKEN_" + token.replace(" ", "_"))

need("ENGINEERING_SHELL" not in text, "ENGINEERING_SHELL_IN_SHARED_CONTRACT")
need(MAIN.is_file(), "MAIN_ACTIVITY_MISSING")
print(
    "MODULAR_UI_CONTRACT_PASS|STUDIO|SURFACES_10|PURE_KOTLIN_CONTRACT|"
    f"MAIN_BYTES_{MAIN.stat().st_size}|MIGRATION_INCREMENTAL"
)

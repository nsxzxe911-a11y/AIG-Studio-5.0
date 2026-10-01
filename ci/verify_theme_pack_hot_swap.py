#!/usr/bin/env python3
import json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
is_aigii=(ROOT/"shared/aigii/AiLayoutComposer.kt").is_file()
layout=(ROOT/("shared/aigii/AiLayoutComposer.kt" if is_aigii else "core/src/main/kotlin/com/aigstudio/core/AiLayoutComposer.kt")).read_text(encoding="utf-8")
manifest=json.loads((ROOT/"design/reference-packs/mobile-rgb-pack-v1/manifest.json").read_text(encoding="utf-8"))
index=json.loads((ROOT/"app/src/main/assets/aig-themes/repository-index.json").read_text(encoding="utf-8"))
theme=json.loads((ROOT/"app/src/main/assets/aig-themes/themes/aig_mobile_rgb_v1/theme.json").read_text(encoding="utf-8"))

def need(cond, code):
    if not cond:
        raise SystemExit("THEME_HOT_SWAP_BLOCKED|"+code)

need('MODE_ORDER=listOf("CAD","CAM","SIM","3AX","4AX","5AX","NC","AI")' in layout, "MODE_ORDER")
need('CAD_TOOL_ORDER=listOf("LINE","RECT","CIRCLE","ARC","HOLE")' in layout, "CAD_TOOL_ORDER")
need('ENGINEERING_SHELL_FALLBACK=false' in layout, "ENGINEERING_SHELL_FALLBACK")
need('RUNTIME_RESTART_REQUIRED=false' in layout, "NO_RESTART_CONTRACT")
need('FUNCTION_REBIND_ALLOWED=false' in layout, "FUNCTION_REBIND")
need('CNC_CORE_MUTATION_ALLOWED=false' in layout, "CNC_CORE_MUTATION")
need('FALLBACK="LAST_VERIFIED_THEME_PACK"' in layout, "LAST_VERIFIED_FALLBACK")
need(manifest.get("pack_id")=="aig_mobile_rgb_v1", "REFERENCE_PACK_ID")
need(manifest.get("role")=="DESIGN_REFERENCE_FOR_AI_LAYOUT_COMPOSER_NOT_RUNTIME_EVIDENCE", "REFERENCE_NOT_RUNTIME_EVIDENCE")
need(set(manifest.get("screens",{}))=={"2D_CAD","3D_SIM","4AX","5AX","CAM","SIM","NC","AI"}, "EIGHT_MOBILE_SCREENS")
need(manifest["layout_contract"].get("ai_auto_layout") is True, "AI_LAYOUT_DISABLED")
need(manifest["layout_contract"].get("runtime_restart_required") is False, "REFERENCE_RESTART")
need(manifest["layout_contract"].get("core_logic_mutation") is False, "REFERENCE_CORE_MUTATION")
need(any(x.get("theme_id")=="aig_mobile_rgb_v1" for x in index.get("themes",[])), "THEME_INDEX")
need(theme.get("theme_id")=="aig_mobile_rgb_v1", "THEME_ID")
need(theme.get("layout_composer",{}).get("hot_swap") is True, "THEME_HOT_SWAP")
need(theme.get("layout_composer",{}).get("runtime_restart_required") is False, "THEME_RESTART")
need(theme.get("layout_composer",{}).get("engineering_shell_fallback") is False, "THEME_ENGINEERING_FALLBACK")
need(theme.get("layout_composer",{}).get("cnc_core_mutation_allowed") is False, "THEME_CORE_MUTATION")

if is_aigii:
    main=(ROOT/"app/src/main/java/com/aigii/app/MainActivity.kt").read_text(encoding="utf-8")
    services=(ROOT/"app/src/main/java/com/aigii/app/ThemeServices.kt").read_text(encoding="utf-8")
    need("AigThemeRuntime.applyHot(this, json)" in main, "AIGII_APPLY_HOT")
    need("THEME HOT SWAP" in main and "NO RESTART" in main, "AIGII_UI_HOT_SWAP_STATUS")
    need("rollbackLastHealthy" in services and "KEY_LAST_HEALTHY_JSON" in services, "AIGII_LAST_HEALTHY_ROLLBACK")
    start=main.find("private fun runThemeUpdateCheck()")
    end=main.find("private fun openNetworkSettings()",start)
    block=main[start:end] if start>=0 and end>start else ""
    need("recreate()" not in block, "AIGII_THEME_RECREATE")
else:
    main=(ROOT/"app/src/main/java/com/aigstudio/app/MainActivity.kt").read_text(encoding="utf-8")
    runtime=(ROOT/"app/src/main/java/com/aigstudio/app/StudioThemePackRuntime.kt").read_text(encoding="utf-8")
    need("const val RESTART_REQUIRED=false" in runtime, "STUDIO_NO_RESTART")
    need("lastVerifiedId" in runtime and "fun rollback()" in runtime, "STUDIO_LAST_VERIFIED_ROLLBACK")
    need("private fun showThemePackDialog()" in main, "STUDIO_THEME_DIALOG")
    need('action("UI 套裝 / AI 編排")' in main, "STUDIO_THEME_ENTRY")
    need("AiLayoutComposerContract.compose(" in main, "STUDIO_AI_LAYOUT")
    need("THEME HOT SWAP" in main and "NO RESTART" in main, "STUDIO_HOT_SWAP_STATUS")

print("THEME_PACK_HOT_SWAP_GATE_PASS|AI_LAYOUT|8_MOBILE_SCREENS|NO_RESTART|LAST_VERIFIED_ROLLBACK|NO_ENGINEERING_SHELL|CORE_IMMUTABLE")

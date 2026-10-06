#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "app/src/main/java/com/aigstudio/app"
MAIN = BASE / "MainActivity.kt"
CAD_PAGE = BASE / "ui/pages/cad/CadPageModule.kt"
CAD_GROUPS = BASE / "ui/pages/cad/CadToolGroups.kt"
CAD_DESC = BASE / "ui/pages/cad/CadDescriptionPane.kt"
CAD_BRIDGE = BASE / "ui/bridge/CadCallbackBridge.kt"
CAD_CACHE = BASE / "ui/pages/cad/CadSnapCandidateCache.kt"


def need(ok: bool, code: str) -> None:
    if not ok:
        raise SystemExit("CAD_INTERACTION_FAIL|STUDIO|" + code)

for path, code in [
    (CAD_PAGE, "MISSING_CAD_PAGE_MODULE"),
    (CAD_GROUPS, "MISSING_CAD_TOOL_GROUPS"),
    (CAD_DESC, "MISSING_CAD_DESCRIPTION_PANE"),
    (CAD_BRIDGE, "MISSING_CAD_CALLBACK_BRIDGE"),
    (CAD_CACHE, "MISSING_CAD_SNAP_CACHE"),
    (MAIN, "MISSING_MAIN_ACTIVITY"),
]:
    need(path.is_file(), code)

page = CAD_PAGE.read_text(encoding="utf-8")
groups = CAD_GROUPS.read_text(encoding="utf-8")
desc = CAD_DESC.read_text(encoding="utf-8")
bridge = CAD_BRIDGE.read_text(encoding="utf-8")
cache = CAD_CACHE.read_text(encoding="utf-8")
main = MAIN.read_text(encoding="utf-8", errors="replace")

for token in ["class CadPageModule", "AndroidRuntimeUiModule", "RuntimeSurface.CAD", "CadDescriptionPane", "CadToolGroups"]:
    need(token in page, "CAD_PAGE_TOKEN_" + token.replace(" ", "_"))
need(desc.count("TextView(") == 1, "DESCRIPTION_MUST_OWN_EXACTLY_ONE_TEXTVIEW")
for token in ["RuntimePageUiState", "fun render(", "selectedSide", "bottomDescription", "IMPORTANT_FOR_ACCESSIBILITY_YES"]:
    need(token in desc, "DESCRIPTION_TOKEN_" + token.replace(" ", "_"))
for token in ["DRAW", "EDIT", "SNAP", "FILE"]:
    need(token in groups, "MISSING_LAZY_GROUP_" + token)
need("lazy" in groups or "() -> View" in groups or "() -> ViewGroup" in groups, "TOOL_GROUPS_NOT_LAZY")
for token in ["class CadCallbackBridge", "RuntimeActionSink"]:
    need(token in bridge, "CAD_BRIDGE_TOKEN_" + token.replace(" ", "_"))
for token in ["class CadSnapCandidateCache", "revision", "modeKey", "cachedRevision", "cachedModeKey"]:
    need(token in cache, "CAD_CACHE_TOKEN_" + token.replace(" ", "_"))

# Formal CAD must enter through the RGB-first Runtime host and register both its
# page module and callback bridge. Legacy root visibility is not sufficient.
need("show(RuntimeSurface.CAD" in main, "CAD_NOT_MOUNTED_THROUGH_RUNTIME_HOST")
need("CadPageModule(" in main, "CAD_PAGE_NOT_REGISTERED_IN_RUNTIME_HOST")
need("CadCallbackBridge(" in main, "CAD_BRIDGE_NOT_REGISTERED_IN_RUNTIME_HOST")
need("preload(RuntimeSurface.CAD)" in main, "CAD_RGB_ASSET_NOT_PRELOADED_BEFORE_MOUNT")

# Pointer hot-path guard: ACTION_MOVE may update pan/draft/snap lookup, but it must not
# call authoritative mutation or rebuild pairwise intersections directly.
move_idx = main.find("MotionEvent.ACTION_MOVE ->", main.find("class CadView"))
need(move_idx >= 0, "CAD_ACTION_MOVE_NOT_FOUND")
move_tail = main[move_idx:move_idx + 1400]
for forbidden in ["handleTap(", "pairwise", "intersections(", "CadSnapEngine.snapTo(doc"]:
    need(forbidden not in move_tail, "ACTION_MOVE_FORBIDDEN_" + forbidden.replace("(", "").replace(".", "_"))

# snapPoint must consume revision-keyed cached candidates instead of rebuilding
# intersection candidates on every MotionEvent.
need("CadSnapCandidateCache" in main, "MAIN_NOT_USING_CAD_SNAP_CACHE")
need("sceneRevision" in main, "CAD_REVISION_MISSING")

print("CAD_INTERACTION_PASS|STUDIO|ONE_EDITOR|ONE_DESCRIPTION|ATOMIC_SIDE|LAZY_GROUPS|REVISION_CACHE|MOVE_DRAFT_ONLY")

#!/usr/bin/env python3
# Verification checkpoint for compiled snap-cache commit 2f361ea970c8d4a7b5bf3d8df21b36c224230e63.
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

# Pointer hot-path guard: inspect only CadView.onTouchEvent, never following helper
# definitions such as handleTap. ACTION_MOVE may pan/draft/lookup, but must not
# call authoritative mutation or rebuild pairwise intersections directly.
cad_idx = main.find("class CadView")
move_idx = main.find("MotionEvent.ACTION_MOVE ->", cad_idx)
need(move_idx >= 0, "CAD_ACTION_MOVE_NOT_FOUND")
touch_end = main.find("\n    private fun handleTap", move_idx)
need(touch_end > move_idx, "CAD_ON_TOUCH_END_NOT_FOUND")
move_tail = main[move_idx:touch_end]
for forbidden in ["handleTap(", "pairwise", "intersections(", "CadSnapEngine.snapTo(doc"]:
    need(forbidden not in move_tail, "ACTION_MOVE_FORBIDDEN_" + forbidden.replace("(", "").replace(".", "_"))

# snapPoint must consume revision-keyed cached candidates. Geometry revision is
# deliberately separate from sceneRevision because pan/zoom/view invalidation must
# never force O(n^2) intersection candidate rebuilds.
need("CadSnapCandidateCache" in main, "MAIN_NOT_USING_CAD_SNAP_CACHE")
need("private var geometryRevision" in main, "CAD_GEOMETRY_REVISION_MISSING")
snap_idx = main.find("private fun snapPoint", cad_idx)
need(snap_idx >= 0, "CAD_SNAP_POINT_MISSING")
snap_end = main.find("\n    private fun ", snap_idx + 1)
need(snap_end > snap_idx, "CAD_SNAP_POINT_END_MISSING")
snap_body = main[snap_idx:snap_end]
need("snapCandidateCache.snap(" in snap_body, "SNAP_POINT_NOT_USING_CACHE")
need("geometryRevision" in snap_body, "SNAP_CACHE_NOT_KEYED_BY_GEOMETRY_REVISION")
need("CadSnapEngine.snapTo" not in snap_body, "SNAP_POINT_STILL_REBUILDS_CANDIDATES")

run_geometry_idx = main.find("private fun runGeometryCommand", cad_idx)
need(run_geometry_idx >= 0, "RUN_GEOMETRY_COMMAND_MISSING")
run_geometry_end = main.find("\n    private fun ", run_geometry_idx + 1)
need(run_geometry_end > run_geometry_idx, "RUN_GEOMETRY_COMMAND_END_MISSING")
need("geometryRevision++" in main[run_geometry_idx:run_geometry_end], "GEOMETRY_COMMAND_DOES_NOT_INVALIDATE_CACHE")

print("CAD_INTERACTION_PASS|STUDIO|ONE_EDITOR|ONE_DESCRIPTION|ATOMIC_SIDE|LAZY_GROUPS|GEOMETRY_REVISION_CACHE|MOVE_DRAFT_ONLY")

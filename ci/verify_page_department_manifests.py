import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]
SCHEMA = "aig-page-button-manifest-v1"
DANGER = {"NORMAL","CAUTION","CNC_OUTPUT"}
ID_RE = re.compile(r"^[A-Z0-9]+(?:\.[A-Z0-9_]+){2,}$")

def expected_commands():
    out = {
        "HOME": ["HOME.PROJECTS.OPEN","HOME.PROJECTS.NEW","HOME.PROJECTS.SAVE","HOME.SETTINGS.OPEN","HOME.SYNC.STATUS"],
        "CAD": [
            *[f"CAD.DRAW.{x}" for x in ["LINE","RECT","CIRCLE","ARC","HOLE"]],
            *[f"CAD.EDIT.{x}" for x in ["TRIM","EXTEND","OFFSET","ARRAY","CHAMFER","FILLET","UNDO","REDO"]],
            *[f"CAD.FILE.{x}" for x in ["OPEN","SAVE","IMPORT","EXPORT"]],
            "CAD.PHOTO.ALIGN","CAD.PHOTO.SCALE","CAD.VIEW.SNAP",
        ],
        "CAM": [
            *[f"CAM.AUTO.{x}" for x in ["GENERATE","ROUGH","FINISH","CONTOUR","DRILL"]],
            *[f"CAM.MANUAL.{x}" for x in ["ADD_POINT","EDIT_POINT","DELETE_POINT","SET_MOTION_G0","SET_MOTION_G1","SET_SAFE_Z"]],
            "CAM.MAIN.COMP_G41","CAM.MAIN.COMP_G42","CAM.TOOL.SELECT","CAM.REGION.SELECT","CAM.POST_PREVIEW.GENERATE",
        ],
        "SIM": [
            *[f"SIM.PLAYBACK.{x}" for x in ["PLAY","PAUSE","SINGLE_BLOCK","STOP","RESET"]],
            "SIM.MATERIAL.RUN","SIM.COLLISION.CHECK","SIM.MAIN.VIEW_3D","SIM.RESULT.ACCEPT",
        ],
        "NC": [
            "NC.EDITOR.INSERT","NC.EDITOR.DELETE","NC.EDITOR.BLOCK_SKIP","NC.EDITOR.CUSTOM_M_CODE",
            "NC.PARSER.PARSE","NC.PREVIEW.RENDER","NC.VERIFY.RUN","NC.VERIFY.SINGLE_BLOCK","NC.VERIFY.DRY_RUN",
            "NC.OUTPUT.PREPARE","NC.OUTPUT.SEND_MACHINE",
        ],
        "AI": ["AI.ASSIST.EXPLAIN","AI.PLAN.BUILD","AI.PLAN.OPTIMIZE","AI.AUDIT.RUN","AI.RECOVERY.REPLAN"],
    }
    for page, axes in [("3AX","XYZ"),("4AX","XYZA"),("5AX","XYZAB"),("6AX","XYZABC")]:
        items = [f"{page}.MACHINE.VIEW", f"{page}.MACHINE.HOME_VIEW", f"{page}.NC_FIRST.OPEN", f"{page}.NC_FIRST.PARSE", f"{page}.NC_FIRST.PREVIEW"]
        for axis in axes:
            items += [f"{page}.MACHINE.JOG_{axis}_POS", f"{page}.MACHINE.JOG_{axis}_NEG"]
        out[page] = items
    return out

def expected_subpage(page, command):
    if page == "HOME":
        if command.startswith("HOME.PROJECTS."): return "HOME.PROJECTS"
        if command.startswith("HOME.SETTINGS."): return "HOME.SETTINGS"
        return "HOME.MAIN"
    if page in {"3AX","4AX","5AX","6AX"}:
        return f"{page}.NC_FIRST" if ".NC_FIRST." in command else f"{page}.MACHINE"
    parts = command.split(".")
    return f"{parts[0]}.{parts[1]}"

def verify_page_manifests(root=ROOT):
    expected = expected_commands()
    global_ids = set()
    total = 0
    for page in PAGES:
        path = root / "design" / "ui" / "pages" / page / "button-manifest.json"
        assert path.is_file(), f"PAGE_MANIFEST_MISSING:{page}"
        doc = json.loads(path.read_text(encoding="utf-8"))
        assert doc["schema"] == SCHEMA, f"PAGE_MANIFEST_SCHEMA:{page}"
        assert doc["pageId"] == page, f"PAGE_MANIFEST_PAGE_ID:{page}"
        buttons = doc["buttons"]
        actual = {b["commandId"] for b in buttons}
        assert actual == set(expected[page]), f"PAGE_COMMAND_SET_DRIFT:{page}:actual={sorted(actual)}:expected={sorted(expected[page])}"
        for button in buttons:
            bid = button["buttonId"]
            assert ID_RE.fullmatch(bid), f"PAGE_BUTTON_ID_NOT_HIERARCHICAL:{bid}"
            assert bid == button["commandId"], f"PAGE_BUTTON_COMMAND_ID_MISMATCH:{bid}:{button['commandId']}"
            assert bid not in global_ids, f"PAGE_BUTTON_DUPLICATE:{bid}"
            global_ids.add(bid)
            assert button["pageId"] == page
            assert button["subpageId"] == expected_subpage(page, button["commandId"])
            assert button["ownerDomain"] == page
            callback = button["callbackContract"].strip()
            assert callback == "PageRuntime.dispatch", f"PAGE_CALLBACK_NOT_TYPED:{bid}:{callback}"
            assert "toast" not in callback.lower(), f"PAGE_CALLBACK_TOAST_ONLY:{bid}"
            assert button["messageChannel"] == f"{page}.LOCAL"
            assert button["dangerClass"] in DANGER
            assert button["availabilityRule"] == "PAGE_ACTIVE"
            assert button.get("bounds") is None
            total += 1
    assert total >= 100, f"PAGE_BUTTON_PROFESSIONAL_COVERAGE_TOO_SMALL:{total}"
    return total

if __name__ == "__main__":
    total = verify_page_manifests()
    print(f"PAGE_DEPARTMENT_MANIFEST_PASS|10_PAGES|{total}_BUTTONS|PAGE_SUBPAGE_ACTION_ID|BUTTON_ID_EQUALS_COMMAND_ID|TYPED_CALLBACK|LOCAL_MESSAGES|NO_FAKE_BOUNDS")

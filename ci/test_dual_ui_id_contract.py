import json
import shutil
import tempfile
from pathlib import Path

from verify_page_department_manifests import verify_page_manifests

ROOT=Path(__file__).resolve().parents[1]
PAGES=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]


def load_all(root=ROOT):
    out=[]
    for page in PAGES:
        path=root/"design"/"ui"/"pages"/page/"button-manifest.json"
        out.extend(json.loads(path.read_text(encoding="utf-8"))["buttons"])
    return out


def main():
    buttons=load_all()
    assert len(buttons)==122, f"DUAL_ID_BUTTON_COUNT:{len(buttons)}"
    view_ids=[]
    for b in buttons:
        expected="VIEW."+b["buttonId"]
        assert b.get("viewId")==expected, f"DUAL_ID_VIEW_MISSING_OR_DRIFT:{b['buttonId']}:{b.get('viewId')}:{expected}"
        assert b["buttonId"]==b["commandId"], f"DUAL_ID_COMMAND_DRIFT:{b['buttonId']}:{b['commandId']}"
        view_ids.append(b["viewId"])
    assert len(view_ids)==len(set(view_ids)), "DUAL_ID_VIEW_DUPLICATE"
    print("DUAL_UI_ID_CONTRACT_PASS|122_BUTTONS|VIEW_ID|BUTTON_COMMAND_ID|ONE_TO_ONE")


if __name__=="__main__":
    main()

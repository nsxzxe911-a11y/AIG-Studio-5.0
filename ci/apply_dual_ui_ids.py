import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PAGES=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]


def main():
    total=0
    for page in PAGES:
        path=ROOT/"design"/"ui"/"pages"/page/"button-manifest.json"
        doc=json.loads(path.read_text(encoding="utf-8"))
        for button in doc["buttons"]:
            button["viewId"]="VIEW."+button["buttonId"]
            total+=1
        path.write_text(json.dumps(doc,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    if total!=122:
        raise SystemExit(f"DUAL_UI_ID_MIGRATION_COUNT:{total}")
    print("DUAL_UI_ID_MIGRATION_PASS|10_PAGES|122_BUTTONS|VIEW_DOT_BUTTON_ID")

if __name__=="__main__":
    main()

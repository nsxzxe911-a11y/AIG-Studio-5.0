import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PAGES=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]
EXPECTED_DIGEST="f6402866130d3c7efc80c7cb1190e1404fa3fdd67bf62809c51be5dd774505b1"


def canonical_rows():
    rows=[]
    for page in PAGES:
        doc=json.loads((ROOT/"design"/"ui"/"pages"/page/"button-manifest.json").read_text(encoding="utf-8"))
        for b in doc["buttons"]:
            rows.append((
                b["viewId"],b["buttonId"],b["commandId"],b["pageId"],b["subpageId"],b["dangerClass"]
            ))
    rows.sort()
    return rows


def main():
    rows=canonical_rows()
    assert len(rows)==122, f"DUAL_UI_TUPLE_COUNT:{len(rows)}"
    payload="\n".join("|".join(row) for row in rows).encode("utf-8")
    digest=hashlib.sha256(payload).hexdigest()
    assert digest==EXPECTED_DIGEST, f"DUAL_PROJECT_UI_ID_PARITY_DRIFT:{digest}:{EXPECTED_DIGEST}"
    print(f"DUAL_PROJECT_UI_ID_PARITY_PASS|122_TUPLES|VIEW_BUTTON_COMMAND_PAGE_SUBPAGE_DANGER|{digest}")

if __name__=="__main__": main()

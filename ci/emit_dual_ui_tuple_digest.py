import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PAGES=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]


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
    print(f"DUAL_UI_TUPLE_DIGEST|122|{digest}")

if __name__=="__main__": main()

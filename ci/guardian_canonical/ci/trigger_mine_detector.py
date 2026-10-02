#!/usr/bin/env python3
from pathlib import Path
import argparse, json, re, sys

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description="AIG Trigger Mine Detector / Manual-Only Cleaner")
parser.add_argument("--apply",action="store_true")
args=parser.parse_args()

findings=[]
changed=[]
AUTO_FIX="AUTO_FIX"
REVIEW="REVIEW"
LOCKED="LOCKED"

def add(rule,severity,path,detail):
    findings.append({"rule":rule,"class":severity,"path":path,"detail":detail})

def read(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def write(rel,text):
    p=ROOT/rel
    old=read(rel)
    if old!=text:
        p.write_text(text,encoding="utf-8")
        changed.append(rel)

for path in sorted((ROOT/".github/workflows").glob("*.yml")):
    rel=str(path.relative_to(ROOT))
    text=path.read_text(encoding="utf-8")
    head=text.split("permissions:",1)[0].split("jobs:",1)[0]
    if any(token in head for token in ("push:","pull_request:","schedule:")):
        add("AUTO_TRIGGER_ENABLED",AUTO_FIX,rel,"Automatic workflow trigger violates MANUAL_ONLY policy")
        if args.apply:
            end=text.find("\npermissions:")
            if end<0:
                end=text.find("\njobs:")
            if end>=0:
                start=text.find("on:\n")
                text=text[:start]+"on:\n  workflow_dispatch:\n\n"+text[end+1:]
                write(rel,text)
    elif "workflow_dispatch:" not in head and "workflow_call:" not in head:
        add("MANUAL_TRIGGER_MISSING",REVIEW,rel,"Workflow is not manually callable")

# Runtime safety semantics remain locked; this cleaner never edits them.
for rel in (
    "core/src/main/kotlin/com/aigstudio/core/FanucNc.kt",
    "core/src/main/kotlin/com/aigstudio/core/Cam.kt",
    "core/src/main/kotlin/com/aigstudio/core/Geometry.kt",
    "core/src/main/kotlin/com/aigstudio/core/Machining3D.kt",
):
    if (ROOT/rel).exists():
        add("CNC_SAFETY_ZONE",LOCKED,rel,"Protected: CNC semantics are never auto-cleaned")

summary={
    "detector":"AIG_TRIGGER_MINE_DETECTOR_V2",
    "policy":"MANUAL_ONLY_ALL_WORKFLOWS",
    "mode":"APPLY_SAFE_AUTOFIX" if args.apply else "SCAN_ONLY",
    "counts":{
        AUTO_FIX:sum(x["class"]==AUTO_FIX for x in findings),
        REVIEW:sum(x["class"]==REVIEW for x in findings),
        LOCKED:sum(x["class"]==LOCKED for x in findings),
    },
    "changed":changed,
}
print(json.dumps(summary,ensure_ascii=False))
for f in findings:
    print(f'{f["class"]}|{f["rule"]}|{f["path"]}|{f["detail"]}')
unsafe=[x for x in findings if x["class"] in (AUTO_FIX,REVIEW)]
if args.apply and changed:
    print("TRIGGER_MINE_AUTO_CLEAN_APPLIED|"+",".join(changed))
if not unsafe:
    print("TRIGGER_MINE_DETECTOR_PASS|MANUAL_ONLY|NO_AUTOMATIC_REGRESSION|CNC_SAFETY_LOCKED")
sys.exit(0)

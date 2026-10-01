#!/usr/bin/env python3
from pathlib import Path
import argparse, hashlib, json, shutil, sys

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description="AIG Trigger Guardian / canonical self-restore")
parser.add_argument("--restore",action="store_true")
args=parser.parse_args()

EXPECTED={
 "ci/trigger_mine_detector.py":(
   "ci/guardian_canonical/ci/trigger_mine_detector.py",
   "bf4f7da080686efd82e40cd1a11ccb7e85052d79",
 ),
 "ci/verify_trigger_policy.py":(
   "ci/guardian_canonical/ci/verify_trigger_policy.py",
   "4f70a683d882a1a8a36e6d32f7722bfb8a1655ed",
 ),
 "ci/prebaseline_trigger_clean.py":(
   "ci/guardian_canonical/ci/prebaseline_trigger_clean.py",
   "abca720b9d237127fb4c47997ac274cace359ab6",
 ),
 ".github/workflows/trigger-mine-auto-clean.yml":(
   "ci/guardian_canonical/github/workflows/trigger-mine-auto-clean.yml",
   "7e4ed3a3b5f965a6a96caa0aef308c6b6635d00c",
 ),
 ".github/workflows/prebaseline-trigger-clean.yml":(
   "ci/guardian_canonical/github/workflows/prebaseline-trigger-clean.yml",
   "b5c5baf2f982f2407fee8caa8dc651699dbc1a1f",
 ),
}

def blob_sha(path:Path)->str:
    data=path.read_bytes()
    header=f"blob {len(data)}\0".encode()
    return hashlib.sha1(header+data).hexdigest()

findings=[]
changed=[]
for active,(canonical,expected_sha) in EXPECTED.items():
    ap=ROOT/active
    cp=ROOT/canonical
    if not cp.is_file():
        findings.append(("REVIEW","CANONICAL_MISSING",canonical))
        continue
    actual_canonical=blob_sha(cp)
    if actual_canonical!=expected_sha:
        findings.append(("REVIEW","CANONICAL_HASH_DRIFT",f"{canonical}:{actual_canonical}"))
        continue
    active_ok=ap.is_file() and blob_sha(ap)==expected_sha
    if not active_ok:
        findings.append(("AUTO_FIX","ACTIVE_MISSING_OR_DRIFT",active))
        if args.restore:
            ap.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(cp,ap)
            changed.append(active)

print(json.dumps({
  "guardian":"AIG_TRIGGER_GUARDIAN_V1",
  "mode":"RESTORE" if args.restore else "SCAN",
  "auto_fix":sum(x[0]=="AUTO_FIX" for x in findings),
  "review":sum(x[0]=="REVIEW" for x in findings),
  "changed":changed,
},ensure_ascii=False))
for cls,rule,detail in findings:
    print(f"{cls}|{rule}|{detail}")

if any(x[0]=="REVIEW" for x in findings):
    raise SystemExit("TRIGGER_GUARDIAN_REVIEW_REQUIRED")
if args.restore:
    remaining=[]
    for active,(canonical,expected_sha) in EXPECTED.items():
        ap=ROOT/active
        if not ap.is_file() or blob_sha(ap)!=expected_sha:
            remaining.append(active)
    if remaining:
        raise SystemExit("TRIGGER_GUARDIAN_RESTORE_FAILED:"+",".join(remaining))
    print("TRIGGER_GUARDIAN_RESTORE_PASS|ACTIVE_MATCHES_CANONICAL")
elif not findings:
    print("TRIGGER_GUARDIAN_PASS|ACTIVE_MATCHES_CANONICAL")

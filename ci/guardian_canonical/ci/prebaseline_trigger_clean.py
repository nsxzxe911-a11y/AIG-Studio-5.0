#!/usr/bin/env python3
from pathlib import Path
import subprocess, sys

ROOT=Path(__file__).resolve().parents[1]

def run(*args):
    p=subprocess.run(args,cwd=ROOT,text=True,capture_output=True)
    if p.stdout: print(p.stdout,end="")
    if p.stderr: print(p.stderr,end="",file=sys.stderr)
    return p

try:
    detector_source=(ROOT/"ci/trigger_mine_detector.py").read_text(encoding="utf-8")
    compile(detector_source,str(ROOT/"ci/trigger_mine_detector.py"),"exec")
except Exception as exc:
    print(exc,file=sys.stderr)
    raise SystemExit("PREBASELINE_DETECTOR_SELF_CHECK_FAIL")

apply=run(sys.executable,"ci/trigger_mine_detector.py","--apply")
if apply.returncode:
    raise SystemExit("PREBASELINE_AUTOCLEAN_EXEC_FAIL")

scan=run(sys.executable,"ci/trigger_mine_detector.py")
if scan.returncode:
    raise SystemExit("PREBASELINE_SCAN_EXEC_FAIL")
if "AUTO_FIX|" in scan.stdout:
    raise SystemExit("PREBASELINE_AUTO_FIX_REMAINS")
if "REVIEW|" in scan.stdout:
    raise SystemExit("PREBASELINE_REVIEW_REQUIRED")

policy=run(sys.executable,"ci/verify_trigger_policy.py")
if policy.returncode:
    raise SystemExit("PREBASELINE_TRIGGER_POLICY_FAIL")

dirty=subprocess.check_output(["git","status","--porcelain"],cwd=ROOT,text=True)
if dirty.strip():
    print(dirty,end="")
    raise SystemExit("PREBASELINE_AUTOFIX_PENDING_COMMIT")

print("PREBASELINE_TRIGGER_MINE_PASS|AUTO_FIX_0|REVIEW_0|CNC_SAFETY_LOCKED|READY_TO_PROMOTE")

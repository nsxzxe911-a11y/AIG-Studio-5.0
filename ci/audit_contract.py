#!/usr/bin/env python3
import json, os, re, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEPARTMENTS=("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","UIUX","ANDROID_BUILD","WINDOWS_BUILD","WEB","PRO_AUDIT")
PRO_OWNERSHIP_KEYS=("PROFESSIONAL_CROSS_AUDIT","PROFESSIONAL_REPAIR_ORCHESTRATION","STALE_GATE_DETECTION","AUDIT_REPORT_EVIDENCE_CLASSIFICATION")

def read_text(rel):
    path=ROOT/rel
    return path.read_text(encoding="utf-8",errors="replace") if path.is_file() else ""

def load_json(rel):
    text=read_text(rel)
    return json.loads(text) if text else {}

def release_version():
    match=re.fullmatch(r"versionName=(\d+)\.0\.0",read_text("release-version.properties").strip())
    return f"{match.group(1)}.0.0" if match else ""

def source_sha():
    sha=os.environ.get("GITHUB_SHA","").strip()
    if sha:
        return sha
    try:
        return subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True,stderr=subprocess.DEVNULL).strip()
    except Exception:
        return "UNKNOWN"

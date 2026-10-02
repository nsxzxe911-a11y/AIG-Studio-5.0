#!/usr/bin/env python3
import json
from pathlib import Path
from audit_contract import DEPARTMENTS

ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "release-version.properties"
CHECKPOINT_FILE = ROOT / "continuity" / "latest-checkpoint.json"
REQUIRED = DEPARTMENTS

def read_version():
    for line in VERSION_FILE.read_text(encoding="utf-8").splitlines():
        if line.startswith("versionName="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("CONTINUITY_FAIL: versionName missing")

version = read_version()
checkpoint = json.loads(CHECKPOINT_FILE.read_text(encoding="utf-8"))
errors = []
if checkpoint.get("mode") != "RESUME_FROM_LAST_CHECKPOINT":
    errors.append("mode")
if checkpoint.get("version") != version:
    errors.append("version")
if checkpoint.get("record_policy", {}).get("chat_state_required") is not False:
    errors.append("chat_state_required")
departments = checkpoint.get("departments", {})
for name in REQUIRED:
    if departments.get(name) not in {"CHECKPOINTED", "PASS", "PENDING", "RESUME_READY", "EXECUTE_UNTIL_PASS", "REWORK", "AI_REVERIFY"}:
        errors.append(f"department:{name}")
if errors:
    raise SystemExit("CONTINUITY_FAIL: " + ",".join(errors))
print(f"CONTINUITY_PASS version={version} departments={len(REQUIRED)} mode=RESUME_FROM_LAST_CHECKPOINT")

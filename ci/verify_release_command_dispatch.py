#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
cmd=json.loads((ROOT/"continuity/release-command.json").read_text(encoding="utf-8"))
version=(ROOT/"release-version.properties").read_text(encoding="utf-8").strip().split("=",1)[1]
required=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","UIUX","ANDROID_BUILD","WINDOWS_BUILD","WEB"]
assert cmd["version"]==version
assert cmd["command"]=="RELEASE_ALL_DEPARTMENTS_EXECUTE"
assert cmd["command_scope"]=="ALL_DEPARTMENTS"
net=cmd["network_policy"]
assert net["command_dispatch_requires_network"] is False
assert net["network_may_block_command"] is False
assert net["local_work_continues_when_offline"] is True
assert net["ui_waits_for_network"] is False
for d in required:
    assert cmd["departments"][d]["directive"]=="EXECUTE_NOW"
    assert cmd["departments"][d]["network_gate"]=="NONE"
print("ALL_DEPARTMENT_RELEASE_COMMAND_PASS|"+("|".join(required))+"|NETWORK_NOT_A_COMMAND_GATE|OFFLINE_CONTINUE")

#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
routing=json.loads((ROOT/"continuity/ai-responsibility-routing.json").read_text(encoding="utf-8"))
cmd=json.loads((ROOT/"continuity/release-command.json").read_text(encoding="utf-8"))
version=(ROOT/"release-version.properties").read_text(encoding="utf-8").strip().split("=",1)[1]
required=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","UIUX","ANDROID_BUILD","WINDOWS_BUILD","WEB","PRO_AUDIT"]
expected={"HOME_ROUTING":"HOME","STARTUP_RUNTIME_ENTRY":"HOME","CAD_GEOMETRY":"CAD","CAD_SNAP_DIM_EDIT":"CAD","CAM_TOOLPATH":"CAM","CAM_SAFE_Z_TOOLING":"CAM","SIM_MATERIAL_REMOVAL":"SIM","SIM_COLLISION_PLAYBACK":"SIM","AXIS3_KINEMATICS":"3AX","AXIS4_A_ROTATION":"4AX","AXIS5_AB_TCP":"5AX","AXIS6_ABC_POSTURE":"6AX","AXIS6_COLLISION_SPACE":"6AX","AXIS6_COLLISION_LOOKAHEAD":"6AX","AXIS6_MANUAL_CAM_EDIT_CONTINUITY":"6AX","AXIS6_MANUAL_CAM_ORIENTATION_EDIT":"6AX","AXIS6_MACHINE_POST":"NC","NC_FANUC_POST":"NC","NC_GCODE_SAFETY":"NC","AI_UPDATE_RECOVERY":"AI","UI_LAYOUT_THEME_LANGUAGE":"UIUX","ANDROID_COMPILE_PACKAGE_LAUNCH":"ANDROID_BUILD","WINDOWS_COMPILE_PACKAGE_LAUNCH":"WINDOWS_BUILD","WEB_RUNTIME_PREVIEW":"WEB","PROFESSIONAL_CROSS_AUDIT":"PRO_AUDIT","PROFESSIONAL_REPAIR_ORCHESTRATION":"PRO_AUDIT"}
assert routing["version"]==version
assert routing["detector"]=="AI"
assert routing["close_rule"]=="ONLY_AI_REVERIFY_PASS_CAN_MARK_COMPLETE"
assert routing["ownership"]==expected
assert routing["external_conditions"]["NETWORK"]["owner"] is None
assert routing["external_conditions"]["NETWORK"]["product_failure"] is False
assert routing["external_conditions"]["INFRASTRUCTURE"]["owner"] is None
assert routing["rework_policy"]["return_to_owner"] is True
assert routing["rework_policy"]["unrelated_departments_continue"] is True
assert routing["completion_policy"]["command_stays_active_until_complete"] is True
for d in required:
    assert cmd["departments"][d]["directive"]=="EXECUTE_NOW"
print("AI_RESPONSIBILITY_ROUTING_PASS|DETECT|ASSIGN_OWNER|RETURN_REWORK|OWNER_REDO|AI_REVERIFY|PASS_COMPLETE")
print("AI_NETWORK_NOT_OWNER_PASS|NETWORK_DEFER_ONLY_SUBSTEP|OTHER_DEPARTMENTS_CONTINUE")

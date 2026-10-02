#!/usr/bin/env python3
from audit_contract import DEPARTMENTS, PRO_OWNERSHIP_KEYS, ROOT

assert len(DEPARTMENTS)==15
assert len(set(DEPARTMENTS))==15
assert DEPARTMENTS[-1]=="PRO_AUDIT"
assert len(PRO_OWNERSHIP_KEYS)==4

targets=(
    "ci/pro_audit.py",
    "ci/department_autocheck.py",
    "ci/verify_release_command_dispatch.py",
    "ci/verify_ai_responsibility_routing.py",
    "ci/verify_continuity_checkpoint.py",
    "ci/verify_xml_cache_update_standard.py",
)
for rel in targets:
    text=(ROOT/rel).read_text(encoding="utf-8")
    assert "from audit_contract import" in text, rel
    assert '["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","UIUX","ANDROID_BUILD","WINDOWS_BUILD","WEB","PRO_AUDIT"]' not in text, rel

print("AUDIT_CONTRACT_GATE_PASS|15_DEPARTMENTS|SINGLE_AUTHORITY|PRO_AUDIT_LAST|NO_DUPLICATE_DEPARTMENT_LISTS")

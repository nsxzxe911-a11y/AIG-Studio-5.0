#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT/path).read_text(encoding="utf-8")

workflow_dir=ROOT/".github/workflows"
workflow_files=sorted(workflow_dir.glob("*.yml"))
assert workflow_files, "no workflows found"

for path in workflow_files:
    text=path.read_text(encoding="utf-8")
    head=text.split("permissions:",1)[0].split("jobs:",1)[0]
    assert "push:" not in head, f"{path.name}: automatic push trigger is disabled"
    assert "pull_request:" not in head, f"{path.name}: automatic PR trigger is disabled"
    assert "schedule:" not in head, f"{path.name}: automatic schedule trigger is disabled"
    assert "workflow_dispatch:" in head or "workflow_call:" in head, f"{path.name}: manual/callable trigger required"

build=read(".github/workflows/build-download.yml")
android=read("build_android_release.sh")
windows=read("build_windows_native.ps1")
prod=read("ci/verify_production_runtime.py")
assert "workflow_dispatch:" in build.split("permissions:",1)[0]
assert "release_state=PRODUCTION_RUNTIME_CANDIDATE" in android
assert "device_launch_evidence=REQUIRED_FOR_RUNTIME_EVIDENCE" in android
assert "release_state=PRODUCTION_RUNTIME_CANDIDATE" in windows
for name,text in (("android",android),("windows",windows),("production_verify",prod),("build_workflow",build)):
    for token in ("PRODUCTION_RUNTIME_CANDIDATE_NOT_FINAL","REQUIRED_FOR_FINAL","BUILD_ARTIFACT_ONLY_NOT_FINAL"):
        assert token not in text, f"{name}: obsolete token {token}"

print("STUDIO_TRIGGER_POLICY_GATE_PASS|MANUAL_ONLY_ALL_WORKFLOWS|NO_PUSH|NO_PR|NO_SCHEDULE|FULL_BUILD_MANUAL_ONLY|NO_FINAL_RELEASE_STATE")

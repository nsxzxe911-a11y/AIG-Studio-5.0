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
rolling=read("core/src/main/kotlin/com/aigstudio/core/RollingUpdatePolicy.kt")
nc_coordinate=read(".github/workflows/nc-coordinate-drift-gate.yml")
nc_semantic=read(".github/workflows/nc-semantic-timeline-gate.yml")
assert ":core:coreRegression" not in android
assert ":core:coreRegression" not in windows
assert "REGRESSION_EXECUTION_DISABLED_BY_POLICY_314" in nc_coordinate and "if: ${{ false }}" in nc_coordinate
assert "REGRESSION_EXECUTION_DISABLED_BY_POLICY_314" in nc_semantic and "if: ${{ false }}" in nc_semantic
assert "REGRESSION_EXECUTION_ENABLED=false" in rolling
assert "ALLOW_DOWNGRADE=false" in rolling
assert "ALLOW_EQUAL_VERSION_REINSTALL=false" in rolling

prod=read("ci/verify_production_runtime.py")
assert "workflow_dispatch:" in build.split("permissions:",1)[0]
assert "release_state=PRODUCTION_RUNTIME_CANDIDATE" in android
assert "device_launch_evidence=REQUIRED_FOR_RUNTIME_EVIDENCE" in android
assert "release_state=PRODUCTION_RUNTIME_CANDIDATE" in windows
for name,text in (("android",android),("windows",windows),("production_verify",prod),("build_workflow",build)):
    for token in ("PRODUCTION_RUNTIME_CANDIDATE_NOT_FINAL","REQUIRED_FOR_FINAL","BUILD_ARTIFACT_ONLY_NOT_FINAL"):
        assert token not in text, f"{name}: obsolete token {token}"

print("STUDIO_TRIGGER_POLICY_GATE_PASS|NO_PUSH|NO_PR|NO_SCHEDULE|REGRESSION_EXECUTION_OFF|BUILD_NO_REGRESSION|DOWNGRADE_OFF|EQUAL_REINSTALL_OFF")

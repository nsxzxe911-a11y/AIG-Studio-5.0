#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT/path).read_text(encoding="utf-8")

build=read(".github/workflows/build-download.yml")
semantic=read(".github/workflows/nc-semantic-timeline-gate.yml")
coord=read(".github/workflows/nc-coordinate-drift-gate.yml")
ai=read(".github/workflows/ai-network-update-gate.yml")
ui=read(".github/workflows/ui-art-diff-gate.yml")
android=read("build_android_release.sh")
windows=read("build_windows_native.ps1")
prod=read("ci/verify_production_runtime.py")

# Heavy full build is an explicit release action, never a normal development push.
build_on=build.split("permissions:",1)[0]
assert "push:" not in build_on, "full release validation must be manual-only"
assert "workflow_dispatch:" in build_on

# CNC regression gates may auto-run on push, but only for explicit NC/runtime source paths.
# Full APK/EXE release validation remains manual-only above.
for name,text in (("semantic",semantic),("coordinate",coord)):
    head=text.split("permissions:",1)[0]
    assert "push:" in head, f"{name}: scoped NC regression must run on relevant pushes"
    assert "paths:" in head, f"{name}: NC push trigger must be path-scoped"
    assert "'release-version.properties'" not in head, f"{name}: version bump must not trigger CNC"
    assert "'core/**'" not in head, f"{name}: broad core glob would trigger unrelated AI/UI work"
    assert "'ci/**'" not in head, f"{name}: broad CI glob would trigger CNC"
    required_paths=(
        "core/src/main/kotlin/com/aigstudio/core/FanucNc.kt",
        "core/src/test/**",
        "app/src/main/java/com/aigstudio/app/MainActivity.kt",
        "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt",
    )
    for marker in required_paths:
        assert marker in head, f"{name}: missing scoped NC path {marker}"

# AI and UI gates trigger from their real scopes, not merely from rolling the version.
ai_head=ai.split("permissions:",1)[0]
ui_head=ui.split("permissions:",1)[0]
assert "'release-version.properties'" not in ai_head
assert "'release-version.properties'" not in ui_head
assert "SecureServices.kt" in ai_head and "RollingUpdatePolicy.kt" in ai_head
for marker in ("MainActivity.kt","Machining3DView.kt","DesktopApp.kt"):
    assert marker in ui_head, marker

# Version evidence must be rolling/dynamic.
assert "STUDIO_254_AI_NETWORK_RELEVANT_GATE_PASS" not in ai
assert 'VERSION="$(awk -F=' in ai

# FINAL is not a release state or acceptance target anymore.
for name,text in (("android",android),("windows",windows),("production_verify",prod),("build_workflow",build)):
    forbidden=("PRODUCTION_RUNTIME_CANDIDATE_NOT_FINAL","REQUIRED_FOR_FINAL","BUILD_ARTIFACT_ONLY_NOT_FINAL")
    for token in forbidden:
        assert token not in text, f"{name}: obsolete token {token}"
assert "release_state=PRODUCTION_RUNTIME_CANDIDATE" in android
assert "device_launch_evidence=REQUIRED_FOR_RUNTIME_EVIDENCE" in android
assert "release_state=PRODUCTION_RUNTIME_CANDIDATE" in windows

print("STUDIO_TRIGGER_POLICY_GATE_PASS|FULL_BUILD_MANUAL_ONLY|NC_SCOPED_AUTO_REGRESSION|NC_EXPLICIT_SCOPE|NO_VERSION_BUMP_HEAVY_GATE|AI_UI_REAL_PATHS|DYNAMIC_VERSION_EVIDENCE|NO_FINAL_RELEASE_STATE")

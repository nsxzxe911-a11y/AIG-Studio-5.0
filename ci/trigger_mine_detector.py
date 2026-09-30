#!/usr/bin/env python3
from pathlib import Path
import argparse, json, re, sys

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description="AIG Trigger Mine Detector / Auto Cleaner")
parser.add_argument("--apply", action="store_true", help="Apply only AUTO_FIX rules. Never edits CNC safety logic.")
args = parser.parse_args()

findings=[]
changed=[]

AUTO_FIX="AUTO_FIX"
REVIEW="REVIEW"
LOCKED="LOCKED"

def add(rule, severity, path, detail):
    findings.append({"rule":rule,"class":severity,"path":path,"detail":detail})

def read(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def write(rel, text):
    p=ROOT/rel
    old=read(rel)
    if old!=text:
        p.write_text(text,encoding="utf-8")
        changed.append(rel)

# Rule 1: full release build must stay manual-only.
rel=".github/workflows/build-download.yml"
t=read(rel)
if t:
    head=t.split("permissions:",1)[0]
    if "push:" in head:
        add("HEAVY_BUILD_AUTO_PUSH",AUTO_FIX,rel,"Full APK/EXE validation auto-runs on push")
        if args.apply:
            # Replace only the workflow trigger block before permissions with manual dispatch.
            t=re.sub(r"on:\n(?:.|\n)*?\npermissions:", "on:\n  workflow_dispatch:\n\npermissions:", t, count=1)
            write(rel,t)

# Rule 2: NC gates may never trigger from generic version/CI/core changes.
for rel in (".github/workflows/nc-coordinate-drift-gate.yml",".github/workflows/nc-semantic-timeline-gate.yml"):
    t=read(rel)
    if not t: continue
    head=t.split("permissions:",1)[0]
    for bad in ("      - 'release-version.properties'\n","      - 'ci/**'\n","      - 'core/**'\n"):
        if bad in head:
            add("NC_BROAD_TRIGGER",AUTO_FIX,rel,bad.strip())
            if args.apply:
                t=t.replace(bad,"")
    if "push:" in head and "contains(github.event.head_commit.message, '[nc-check]')" not in t:
        add("NC_PUSH_WITHOUT_EXPLICIT_TAG",REVIEW,rel,"Push-triggered NC gate lacks explicit [nc-check] classifier")
    write(rel,t) if args.apply else None

# Rule 3: AI/UI gates must not run merely because the version moved.
for rel in (".github/workflows/ai-network-update-gate.yml",".github/workflows/ui-art-diff-gate.yml"):
    t=read(rel)
    if not t: continue
    head=t.split("permissions:",1)[0]
    bad="      - 'release-version.properties'\n"
    if bad in head:
        add("VERSION_ONLY_SIDE_GATE",AUTO_FIX,rel,"Version bump incorrectly triggers AI/UI gate")
        if args.apply:
            write(rel,t.replace(bad,""))

# Rule 4: evidence markers may not freeze a numeric rolling version.
rel=".github/workflows/ai-network-update-gate.yml"
t=read(rel)
if re.search(r"STUDIO_\d+_AI_NETWORK_RELEVANT_GATE_PASS",t):
    add("HARDCODED_GATE_VERSION",AUTO_FIX,rel,"AI gate evidence hardcodes a release number")
    if args.apply:
        replacement = """shell: bash
        run: |
          VERSION="$(awk -F= '$1=="versionName"{print $2}' release-version.properties)"
          echo "STUDIO_${VERSION}_AI_NETWORK_RELEVANT_GATE_PASS|NO_CNC_HEAVY_REGRESSION|ROLLING_BASELINE_CANDIDATE""""
        t=re.sub(
            r"run: echo 'STUDIO_\d+_AI_NETWORK_RELEVANT_GATE_PASS\|NO_CNC_HEAVY_REGRESSION\|ROLLING_BASELINE_CANDIDATE'",
            replacement,
            t
        )
        write(rel,t)

# Rule 5: obsolete FINAL-state tokens are safe to normalize.
replacements={
 "PRODUCTION_RUNTIME_CANDIDATE_NOT_FINAL":"PRODUCTION_RUNTIME_CANDIDATE",
 "REQUIRED_FOR_FINAL":"REQUIRED_FOR_RUNTIME_EVIDENCE",
 "BUILD_ARTIFACT_ONLY_NOT_FINAL":"BUILD_ARTIFACT_PENDING_RUNTIME_EVIDENCE",
}
for rel in ("build_android_release.sh","build_windows_native.ps1",".github/workflows/build-download.yml","ci/verify_production_runtime.py"):
    t=read(rel)
    if not t: continue
    new=t
    for old,newv in replacements.items():
        if old in new:
            add("OBSOLETE_FINAL_STATE",AUTO_FIX,rel,old)
            new=new.replace(old,newv)
    if args.apply: write(rel,new)

# Rule 6: visible runtime version must not be frozen.
for rel in ("app/src/main/java/com/aigstudio/app/MainActivity.kt",
            "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt"):
    t=read(rel)
    for m in re.finditer(r"AIG CNC (\d+\.0\.0)",t):
        add("VISIBLE_HARDCODED_VERSION",REVIEW,rel,m.group(0))

# Rule 7: update channel must route unconfigured users to settings, not a dead BLOCKED button.
rel="app/src/main/java/com/aigstudio/app/MainActivity.kt"
t=read(rel)
if t:
    required=("if (!config.configured)","showUpdateSettings()","更新設定未完成")
    if not all(x in t for x in required):
        add("UPDATE_ONECLICK_DEAD_END",REVIEW,rel,"One-click updater lacks safe settings route")

# Rule 8: forward-only and trigger guards are required.
for rel,markers in {
 "ci/verify_trigger_policy.py":("FULL_BUILD_MANUAL_ONLY","NO_FINAL_RELEASE_STATE"),
 "ci/verify_rolling_version.py":("ROLLING_VERSION_DOWNGRADE_BLOCKED","FORWARD_ONLY"),
}.items():
    t=read(rel)
    if not t or not all(x in t for x in markers):
        add("MISSING_TRIGGER_GUARD",REVIEW,rel,"Rolling-baseline guard missing or incomplete")

# LOCKED safety zones: detector reports but never rewrites.
locked_paths=(
 "core/src/main/kotlin/com/aigstudio/core/FanucNc.kt",
 "core/src/main/kotlin/com/aigstudio/core/Cam.kt",
 "core/src/main/kotlin/com/aigstudio/core/Geometry.kt",
 "core/src/main/kotlin/com/aigstudio/core/Machining3D.kt",
)
for rel in locked_paths:
    if (ROOT/rel).exists():
        add("CNC_SAFETY_ZONE",LOCKED,rel,"Protected: G-code/coordinate/compensation/collision semantics are never auto-cleaned")

summary={
 "detector":"AIG_TRIGGER_MINE_DETECTOR_V1",
 "mode":"APPLY_SAFE_AUTOFIX" if args.apply else "SCAN_ONLY",
 "counts":{
   AUTO_FIX:sum(x["class"]==AUTO_FIX for x in findings),
   REVIEW:sum(x["class"]==REVIEW for x in findings),
   LOCKED:sum(x["class"]==LOCKED for x in findings),
 },
 "changed":changed,
}
print(json.dumps(summary,ensure_ascii=False))
for f in findings:
    print(f'{f["class"]}|{f["rule"]}|{f["path"]}|{f["detail"]}')

unsafe=[x for x in findings if x["class"] in (AUTO_FIX,REVIEW)]
if args.apply and changed:
    print("TRIGGER_MINE_AUTO_CLEAN_APPLIED|"+",".join(changed))
if not unsafe:
    print("TRIGGER_MINE_DETECTOR_PASS|NO_DEVELOPMENT_BLOCKERS|CNC_SAFETY_LOCKED")
sys.exit(0)

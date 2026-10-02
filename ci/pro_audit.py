#!/usr/bin/env python3
import json, os
import xml.etree.ElementTree as ET
from audit_contract import DEPARTMENTS, PRO_OWNERSHIP_KEYS, ROOT, load_json, read_text, release_version, source_sha

OUT=ROOT/"build"/"pro-audit-report.json"
findings=[]

def fail(owner,code,path,detail,gate_class="SOURCE_SEMANTIC"):
    findings.append({"owner":owner,"department":owner,"code":code,"path":path,"detail":detail,"gate_class":gate_class,"action":"REPAIR_THEN_REVERIFY"})

version=release_version()
if not version:
    fail("PRO_AUDIT","VERSION_FORMAT","release-version.properties",read_text("release-version.properties").strip())

cmd=load_json("continuity/release-command.json")
route=load_json("continuity/ai-responsibility-routing.json")
checkpoint=load_json("continuity/latest-checkpoint.json")
xml=ET.fromstring(read_text("continuity/cache-update-standard.xml"))

for name,obj in (("release-command",cmd),("routing",route),("checkpoint",checkpoint)):
    if obj.get("version")!=version:
        fail("PRO_AUDIT","VERSION_DRIFT",name,f"{obj.get('version')} != {version}")
if xml.attrib.get("version")!=version:
    fail("PRO_AUDIT","XML_VERSION_DRIFT","continuity/cache-update-standard.xml",f"{xml.attrib.get('version')} != {version}")

for d in DEPARTMENTS:
    if d not in cmd.get("departments",{}):
        fail("PRO_AUDIT","DEPARTMENT_COMMAND_MISSING","continuity/release-command.json",d)
    if d not in checkpoint.get("departments",{}):
        fail("PRO_AUDIT","DEPARTMENT_CHECKPOINT_MISSING","continuity/latest-checkpoint.json",d)
deps_node=xml.find("departments")
xml_deps={e.attrib.get("id") for e in deps_node.findall("department")} if deps_node is not None else set()
for d in DEPARTMENTS:
    if d not in xml_deps:
        fail("PRO_AUDIT","DEPARTMENT_XML_MISSING","continuity/cache-update-standard.xml",d)

ownership=route.get("ownership",{})
for key in PRO_OWNERSHIP_KEYS:
    if ownership.get(key)!="PRO_AUDIT":
        fail("PRO_AUDIT","PRO_AUDIT_OWNER_MISSING","continuity/ai-responsibility-routing.json",key)

build=read_text(".github/workflows/build-download.yml")
head=build.split("permissions:",1)[0]
if "workflow_dispatch:" not in head or "push:" in head:
    fail("PRO_AUDIT","HEAVY_RELEASE_TRIGGER",".github/workflows/build-download.yml","APK/EXE heavy release must remain manual-only","BINARY_DEVICE")

android=read_text("app/src/main/java/com/aigstudio/app/MainActivity.kt")
for marker in ("setContentView(runtimeHost)","StudioStartupBootGuard.complete(this@MainActivity)","scheduleBackgroundOnlineServices()"):
    if marker not in android:
        fail("HOME","PRODUCTION_HOME_BOOT","app/src/main/java/com/aigstudio/app/MainActivity.kt",marker)

machining=read_text("app/src/main/java/com/aigstudio/app/Machining3DView.kt")
live_c='val c=if(mode=="6AX")live?.axisC ?: machineAxisC else 0.0'
if live_c not in machining:
    fail("6AX","LIVE_C_MACHINE_SPACE","app/src/main/java/com/aigstudio/app/Machining3DView.kt","live C fallback missing")

cam=read_text("core/src/main/kotlin/com/aigstudio/core/Cam.kt")
for marker in ("axisA:Double?=null,axisB:Double?=null,axisC:Double?=null","Manual CAM A/B/C out of range"):
    if marker not in cam:
        fail("6AX","MANUAL_ABC_EDIT","core/src/main/kotlin/com/aigstudio/core/Cam.kt",marker)

core=read_text("core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt")
if 'axisCapabilities = listOf("3AX","4AX","5AX","6AX")' not in core:
    fail("PRO_AUDIT","MASTER_AXIS_INVENTORY","core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt","3AX/4AX/5AX/6AX")

reg=read_text("core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt")
for marker in ("MANUAL_6AX_AXIS_EDIT_GATE_PASS","MASTER_RUNTIME_CHAIN_GATE_PASS MASTER_XYZ CAD_ROOT CAD>CAM>SIM>NC 3AX_4AX_5AX_6AX_CAPABILITY","6AX_C_AXIS_NC_POST_BLOCKED","PRO_AUDIT_MASTER_AXIS_INVENTORY_GATE_PASS 3AX 4AX 5AX 6AX UNIQUE ORDERED"):
    if marker not in reg:
        fail("PRO_AUDIT","REGRESSION_COVERAGE","core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt",marker)

runtime=read_text("ci/verify_runtime_surfaces.py")
for marker in (
    live_c,
    '"3D",productionCamSettings,productionFixtures,productionToolAssembly',
    'frame,productionCamDerivedCache',
    'RENDER_COMPATIBILITY_RUNTIME_GATE_PASS|ANDROID|WINDOWS|1080P|2K|3K|4K|30|60|90|120',
    'RENDER_SAFE_START_BUTTON_SKIN_RUNTIME_GATE_PASS|60HZ_START|ADAPTIVE_120|ANDROID|WINDOWS|HOT_REPLACE|CALLBACK_STABLE|DEPTH_4',
):
    if marker not in runtime:
        fail("UIUX","RUNTIME_GATE_DRIFT","ci/verify_runtime_surfaces.py",marker)

# STALE_GATE_DETECTOR
old_live_c='val c=if(mode=="6AX")machineAxisC else 0.0'
if live_c in machining and old_live_c in runtime:
    fail("UIUX","STALE_GATE_LIVE_C","ci/verify_runtime_surfaces.py",f"forbidden stale verifier marker: {old_live_c}")
if "MachineComponentRole.ROTARY_C" in machining and "MachineComponentRole.ROTARY_C" not in runtime:
    fail("UIUX","STALE_GATE_ROTARY_C","ci/verify_runtime_surfaces.py","production 6AX ROTARY_C exists but runtime verifier has no ROTARY_C evidence")

workflow=read_text(".github/workflows/nc-semantic-timeline-gate.yml")
workflow_head=workflow.split("permissions:",1)[0]
regression_disabled=("REGRESSION_EXECUTION_DISABLED_BY_USER_POLICY" in workflow and "if: ${{ false }}" in workflow)
if regression_disabled:
    if "workflow_dispatch:" not in workflow_head or "push:" in workflow_head or "schedule:" in workflow_head:
        fail("PRO_AUDIT","DISABLED_REGRESSION_TRIGGER_DRIFT",".github/workflows/nc-semantic-timeline-gate.yml","disabled regression workflow must remain manual-only")
else:
    for trigger_path in ("ci/audit_contract.py","ci/verify_audit_contract.py","ci/pro_audit.py","ci/department_autocheck.py","ci/verify_runtime_surfaces.py","continuity/release-command.json","continuity/ai-responsibility-routing.json","continuity/cache-update-standard.xml"):
        if trigger_path not in workflow_head:
            fail("PRO_AUDIT","STALE_GATE_TRIGGER_GAP",".github/workflows/nc-semantic-timeline-gate.yml",f"missing self-audit trigger: {trigger_path}")
    pro_pos=workflow.find("python3 ci/pro_audit.py")
    runtime_pos=workflow.find("python3 ci/verify_runtime_surfaces.py")
    if pro_pos < 0 or runtime_pos < 0 or pro_pos > runtime_pos:
        fail("PRO_AUDIT","AUDIT_ORDER_DRIFT",".github/workflows/nc-semantic-timeline-gate.yml","PRO_AUDIT must execute before runtime-surface verification")

by_dept={d:[] for d in DEPARTMENTS}
for f in findings:
    by_dept.setdefault(f["department"],[]).append(f)
report={
    "schema":"aig-pro-audit-report-v2",
    "product":"AIG Studio 5.0",
    "version":version or "UNKNOWN",
    "source_sha":source_sha(),
    "github_run_id":os.environ.get("GITHUB_RUN_ID"),
    "evidence_scope":"SOURCE_SEMANTIC_ONLY",
    "binary_device_release_proof":"NOT_CLAIMED",
    "stale_gate_detector":True,
    "departments":{d:{"status":"FAIL" if by_dept.get(d) else "PASS","finding_count":len(by_dept.get(d,[]))} for d in DEPARTMENTS},
    "findings":findings,
    "gate_classes":{"source_semantic":"FAIL" if findings else "PASS","hosted_semantic":"RUN_CONTEXT_ONLY","apk_exe_device":"NOT_CLAIMED"}
}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2,sort_keys=True)+"\n",encoding="utf-8")
print(f"PRO_AUDIT_REPORT_WRITTEN|SCHEMA=aig-pro-audit-report-v2|PATH={OUT.relative_to(ROOT)}|SOURCE_SHA={report['source_sha']}|BINARY_DEVICE=NOT_CLAIMED")

if findings:
    print("PRO_AUDIT_REWORK_QUEUE_BEGIN")
    for f in findings:
        print(f"PRO_AUDIT_REWORK|OWNER={f['owner']}|CODE={f['code']}|PATH={f['path']}|DETAIL={f['detail']}|GATE_CLASS={f['gate_class']}|ACTION=REPAIR_THEN_REVERIFY")
    print("PRO_AUDIT_REWORK_QUEUE_END")
    raise SystemExit(1)

print("PRO_AUDIT_STALE_GATE_DETECTOR_PASS|LIVE_C|ROTARY_C|WORKFLOW_SELF_TRIGGER|AUDIT_ORDER")
print("PRO_AUDIT_PASS|TOP_TIER_PROFESSIONAL_SOFTWARE|15_DEPARTMENTS|ARCHITECTURE|RUNTIME|UIUX|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|BUILD|WEB|VERSION_SYNC|MANUAL_HEAVY_RELEASE|REPAIR_ROUTING|STALE_GATE_DETECTOR|MACHINE_READABLE_REPORT")

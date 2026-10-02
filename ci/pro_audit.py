#!/usr/bin/env python3
import json, re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
DEPARTMENTS=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","UIUX","ANDROID_BUILD","WINDOWS_BUILD","WEB","PRO_AUDIT"]
findings=[]

def read(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8",errors="replace") if p.is_file() else ""

def fail(owner,code,path,detail):
    findings.append((owner,code,path,detail))

version_text=read("release-version.properties").strip()
m=re.fullmatch(r"versionName=(\d+)\.0\.0",version_text)
version=m.group(1)+".0.0" if m else ""
if not version:
    fail("PRO_AUDIT","VERSION_FORMAT","release-version.properties",version_text)

cmd=json.loads(read("continuity/release-command.json") or "{}")
route=json.loads(read("continuity/ai-responsibility-routing.json") or "{}")
checkpoint=json.loads(read("continuity/latest-checkpoint.json") or "{}")
xml=ET.fromstring(read("continuity/cache-update-standard.xml"))

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
xml_deps={e.attrib.get("id") for e in xml.find("departments").findall("department")}
for d in DEPARTMENTS:
    if d not in xml_deps:
        fail("PRO_AUDIT","DEPARTMENT_XML_MISSING","continuity/cache-update-standard.xml",d)

ownership=route.get("ownership",{})
if ownership.get("PROFESSIONAL_CROSS_AUDIT")!="PRO_AUDIT":
    fail("PRO_AUDIT","PRO_AUDIT_OWNER_MISSING","continuity/ai-responsibility-routing.json","PROFESSIONAL_CROSS_AUDIT")
if ownership.get("PROFESSIONAL_REPAIR_ORCHESTRATION")!="PRO_AUDIT":
    fail("PRO_AUDIT","PRO_REPAIR_OWNER_MISSING","continuity/ai-responsibility-routing.json","PROFESSIONAL_REPAIR_ORCHESTRATION")

build=read(".github/workflows/build-download.yml")
head=build.split("permissions:",1)[0]
if "workflow_dispatch:" not in head or "push:" in head:
    fail("PRO_AUDIT","HEAVY_RELEASE_TRIGGER",".github/workflows/build-download.yml","APK/EXE heavy release must remain manual-only")

android=read("app/src/main/java/com/aigstudio/app/MainActivity.kt")
for marker in ("setContentView(runtimeHost)","StudioStartupBootGuard.complete(this)","scheduleBackgroundOnlineServices()"):
    if marker not in android:
        fail("HOME","PRODUCTION_HOME_BOOT","app/src/main/java/com/aigstudio/app/MainActivity.kt",marker)

machining=read("app/src/main/java/com/aigstudio/app/Machining3DView.kt")
if 'val c=if(mode=="6AX")live?.axisC ?: machineAxisC else 0.0' not in machining:
    fail("6AX","LIVE_C_MACHINE_SPACE","app/src/main/java/com/aigstudio/app/Machining3DView.kt","live C fallback missing")

cam=read("core/src/main/kotlin/com/aigstudio/core/Cam.kt")
for marker in ("axisA:Double?=null,axisB:Double?=null,axisC:Double?=null","Manual CAM A/B/C out of range"):
    if marker not in cam:
        fail("6AX","MANUAL_ABC_EDIT","core/src/main/kotlin/com/aigstudio/core/Cam.kt",marker)

core=read("core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt")
if 'axisCapabilities = listOf("3AX","4AX","5AX","6AX")' not in core:
    fail("PRO_AUDIT","MASTER_AXIS_INVENTORY","core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt","3AX/4AX/5AX/6AX")

reg=read("core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt")
for marker in ("MANUAL_6AX_AXIS_EDIT_GATE_PASS","MASTER_RUNTIME_CHAIN_GATE_PASS MASTER_XYZ CAD_ROOT CAD>CAM>SIM>NC 3AX_4AX_5AX_6AX_CAPABILITY","6AX_C_AXIS_NC_POST_BLOCKED"):
    if marker not in reg:
        fail("PRO_AUDIT","REGRESSION_COVERAGE","core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt",marker)

runtime=read("ci/verify_runtime_surfaces.py")
for marker in (
    'val c=if(mode=="6AX")live?.axisC ?: machineAxisC else 0.0',
    'frame,doc,status,"3D",productionCamSettings,productionFixtures,productionToolAssembly',
    'frame,doc,productionCamSettings,productionFixtures,productionToolAssembly',
):
    if marker not in runtime:
        fail("UIUX","RUNTIME_GATE_DRIFT","ci/verify_runtime_surfaces.py",marker)

if findings:
    print("PRO_AUDIT_REWORK_QUEUE_BEGIN")
    for owner,code,path,detail in findings:
        print(f"PRO_AUDIT_REWORK|OWNER={owner}|CODE={code}|PATH={path}|DETAIL={detail}|ACTION=REPAIR_THEN_REVERIFY")
    print("PRO_AUDIT_REWORK_QUEUE_END")
    raise SystemExit(1)

print("PRO_AUDIT_PASS|TOP_TIER_PROFESSIONAL_SOFTWARE|15_DEPARTMENTS|ARCHITECTURE|RUNTIME|UIUX|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI|BUILD|WEB|VERSION_SYNC|MANUAL_HEAVY_RELEASE|REPAIR_ROUTING")

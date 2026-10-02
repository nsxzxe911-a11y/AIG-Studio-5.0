#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"build"/"department-autocheck.json"
DEPARTMENTS=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","UIUX","ANDROID_BUILD","WINDOWS_BUILD","WEB","PRO_AUDIT"]
findings=[]

def add(dept,code,path,detail,hint,severity="BLOCKING"):
    findings.append({"department":dept,"owner":dept,"code":code,"path":path,"detail":detail,"repair_hint":hint,"severity":severity})

def read(rel,dept,code):
    p=ROOT/rel
    if not p.is_file():
        add(dept,code,rel,"required file missing","restore or regenerate the department source file")
        return ""
    return p.read_text(encoding="utf-8",errors="replace")

def need(dept,code,rel,text,markers,hint):
    for marker in markers:
        if marker not in text:
            add(dept,code,rel,f"missing marker: {marker}",hint)

def forbid(dept,code,rel,text,markers,hint,severity="BLOCKING"):
    for marker in markers:
        if marker in text:
            add(dept,code,rel,f"stale/forbidden marker present: {marker}",hint,severity)

version_text=read("release-version.properties","HOME","VERSION_FILE_MISSING")
m=re.fullmatch(r"versionName=(\d+)\.0\.0\s*",version_text)
if not m:
    add("HOME","VERSION_FORMAT","release-version.properties",version_text.strip(),"restore MAJOR.0.0 forward-only version metadata")

android=read("app/src/main/java/com/aigstudio/app/MainActivity.kt","HOME","ANDROID_RUNTIME_MISSING")
desktop=read("desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt","HOME","WINDOWS_RUNTIME_MISSING")
doc=read("core/src/main/kotlin/com/aigstudio/core/Document.kt","CAD","CAD_CORE_MISSING")
machining=read("core/src/main/kotlin/com/aigstudio/core/Machining3D.kt","SIM","MACHINING_CORE_MISSING")
reg=read("core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt","NC","REGRESSION_MISSING")
secure=read("app/src/main/java/com/aigstudio/app/SecureServices.kt","AI","SECURE_SERVICES_MISSING")
android_build=read("build_android_release.sh","ANDROID_BUILD","ANDROID_BUILD_SCRIPT_MISSING")
windows_build=read("build_windows_native.ps1","WINDOWS_BUILD","WINDOWS_BUILD_SCRIPT_MISSING")
runtime_verify=read("ci/verify_runtime_surfaces.py","UIUX","RUNTIME_VERIFY_MISSING")
web_verify=read("ci/verify_web_runtime.mjs","WEB","WEB_VERIFY_MISSING")
web_html=read("web/index.html","WEB","WEB_RUNTIME_MISSING")
uiux_index=read("uiux/index.html","UIUX","UIUX_INDEX_MISSING")
uiux_visual=read("uiux/visual.html","UIUX","UIUX_VISUAL_MISSING")
cmd_text=read("continuity/release-command.json","AI","RELEASE_COMMAND_MISSING")
route_text=read("continuity/ai-responsibility-routing.json","AI","RESPONSIBILITY_ROUTE_MISSING")
cache_xml=read("continuity/cache-update-standard.xml","AI","CACHE_XML_STANDARD_MISSING")
pro_audit=read("ci/pro_audit.py","PRO_AUDIT","PRO_AUDIT_SCRIPT_MISSING")

need("HOME","HOME_RUNTIME_ENTRY","app/src/main/java/com/aigstudio/app/MainActivity.kt",android,["setContentView(runtimeHost)",'contentDescription = "PRODUCTION UI SWITCH"',"StudioStartupBootGuard.complete(this)","scheduleBackgroundOnlineServices()"],"restore direct production runtimeHost HOME boot; complete StartupBootGuard before post-ready network services")
need("HOME","HOME_DESKTOP_ENTRY","desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt",desktop,['JFrame("AIG CNC — OFFICIAL RGB ORIGINAL — v"',"LOCAL READY • NETWORK OPTIONAL"],"restore production desktop frame and offline-first status")

need("CAD","CAD_EDIT_CORE","core/src/main/kotlin/com/aigstudio/core/Document.kt",doc,["object CadEditEngine","object CadSnapEngine","object DimensionDriveEngine","TRIM","EXTEND","OFFSET","ARRAY","connect(","disconnect("],"restore CAD edit/snap/dimension/topology implementation at 0.001 mm")
need("CAD","CAD_UI_BINDING","app/src/main/java/com/aigstudio/app/MainActivity.kt",android,["cad.toggleSnap()","CadSnapEngine.snapTo","DimensionDriveEngine.command","TRIM","EXTEND","OFFSET","ARRAY"],"rebind CAD production controls to live CAD callbacks")

need("CAM","CAM_GENERATION","core/src/main/kotlin/com/aigstudio/core/Machining3D.kt",machining,["CamModel.fromCad","toolpaths","settings.safeZ","settings.toolDiameter"],"restore CAM generation, tooling and Safe-Z data flow")
need("CAM","CAM_REGRESSION","core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt",reg,["CAM_WORKSTATION_UI_GATE_PASS","CAM_RUNTIME_NO_FAKE_GATE_PASS"],"restore CAM quick-operation and persistence regression coverage")

need("SIM","SIM_REMOVAL","core/src/main/kotlin/com/aigstudio/core/Machining3D.kt",machining,["object MaterialRemoval3D","class RemovalField3D","MaterialRemoval3D.simulate"],"restore real material-removal simulation")
need("SIM","SIM_REGRESSION","core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt",reg,["MATERIAL_REMOVAL","CONTINUOUS_MULTIAXIS_CAM_SIM_GATE_PASS"],"restore numeric material-removal and CAM/SIM regression evidence")

need("3AX","AXIS3_RUNTIME","core/src/main/kotlin/com/aigstudio/core/Machining3D.kt",machining,['"3AX"',"cam.toolpaths"],"restore 3AX scene/toolpath path")
need("4AX","AXIS4_RUNTIME","core/src/main/kotlin/com/aigstudio/core/Machining3D.kt",machining,['"4AX"',"axisA"],"restore A-axis 4AX transformation")
need("5AX","AXIS5_RUNTIME","core/src/main/kotlin/com/aigstudio/core/Machining3D.kt",machining,['"5AX"',"axisA","axisB"],"restore A/B 5AX transformation and synchronized tool orientation")
need("5AX","AXIS5_REGRESSION","core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt",reg,["5AX","axisA","axisB","CONTINUOUS_MULTIAXIS_CAM_SIM_GATE_PASS"],"restore 5AX A/B provenance and synchronized regression")
need("6AX","AXIS6_RUNTIME","app/src/main/java/com/aigstudio/app/MainActivity.kt",android,["showSixAxisRuntimeStage()",'setMachineMode("6AX")',"axisC"],"restore 6AX A/B/C production runtime stage")
need("6AX","AXIS6_REGRESSION","core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt",reg,["MANUAL_6AX_AXIS_EDIT_GATE_PASS","6AX_C_AXIS_NC_POST_BLOCKED"],"restore 6AX editable ABC continuity and NC fail-closed regression")

need("NC","NC_FANUC","core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt",reg,["Fanuc","G90","G54","G43","G41","G42","M98","G34","G81","G83"],"restore Fanuc post/semantic coverage and compensation/cycle checks")
need("NC","NC_UI","app/src/main/java/com/aigstudio/app/MainActivity.kt",android,["G41","G42","G90","G54","G81","G83"],"restore visible NC editing and Fanuc command support")

need("AI","AI_UPDATE_SECURITY","app/src/main/java/com/aigstudio/app/SecureServices.kt",secure,["data class UpdateConfig","https://","sha256","Signature","ConnectivityManager"],"restore signed/hash-verified update service")
need("AI","AI_COMMAND_ROUTING","continuity/ai-responsibility-routing.json",route_text,['"detector": "AI"','"network_is_never_default_owner": true','"RETURN_FOR_REWORK"'],"restore AI detect→owner→rework→reverify routing")
need("AI","AI_RELEASE_COMMAND","continuity/release-command.json",cmd_text,['"command_scope": "ALL_DEPARTMENTS"','"network_may_block_command": false','"mode": "EXECUTE_UNTIL_PASS"'],"restore all-department local-first release command")

need("UIUX","UIUX_RUNTIME_THEME","app/src/main/java/com/aigstudio/app/MainActivity.kt",android,["aigii_rgb_neon_v2","pressedNow -> 0.54f","selectedGlow -> 0.42f"],"restore production RGB glass theme states")
need("UIUX","UIUX_WARNING_HELPER","ci/verify_runtime_surfaces.py",runtime_verify,["def warn(label: str, detail: str) -> None:"],"define the nonblocking warning helper so metadata warnings do not crash verification")
forbid("UIUX","UIUX_ENGINEERING_SHELL","app/src/main/java/com/aigstudio/app/MainActivity.kt",android,["engineering-assets/"],"remove engineering-asset binding from production runtime")
for rel,text in (("uiux/index.html",uiux_index),("uiux/visual.html",uiux_visual)):
    if re.search(r"正式 UI 基礎 • 非工程殼 • \\d+\\.0\\.0",text):
        add("UIUX","UIUX_STALE_VERSION_LABEL",rel,"hard-coded numeric UI library version","use release-version.properties as the single version authority")

need("ANDROID_BUILD","ANDROID_PACKAGE","build_android_release.sh",android_build,[":app:assembleDebug","AIG_Studio_5_0_RGB_FULL_INSTALLABLE.apk","release-version.properties","SHA256SUMS.txt"],"restore Android compile/package/hash pipeline")
need("WINDOWS_BUILD","WINDOWS_PACKAGE","build_windows_native.ps1",windows_build,["jpackage","AIG_Studio_PC.jar","WINDOWS_EXECUTABLE_SMOKE_CAPTURED","release-version.properties"],"restore Windows app-image/EXE/runtime-evidence pipeline")

need("WEB","WEB_RUNTIME","web/index.html",web_html,["BLACK RGB Runtime","function parseProgram","function generateFanucNC","TRIM","EXTEND","OFFSET","ARRAY","materialRemovalDepth"],"restore live web CAD/CAM/SIM/NC runtime")
need("WEB","WEB_VERIFY_DYNAMIC_VERSION","ci/verify_web_runtime.mjs",web_verify,["releaseMajor","WEB_RUNTIME_VERSION_TOO_OLD","console.log(`AIG_WEB_RUNTIME_","_GATE_PASS|VERSION_"],"bind web verification to the current forward-only release major")
forbid("WEB","WEB_STALE_VERSION_PIN","ci/verify_web_runtime.mjs",web_verify,["versionName=253.0.0","AIG_WEB_RUNTIME_253_GATE_PASS|VERSION_253|"],"remove stale hard-coded WEB release version")

need("PRO_AUDIT","PRO_AUDIT_CONTRACT","ci/pro_audit.py",pro_audit,["PRO_AUDIT_PASS","PRO_AUDIT_REWORK|OWNER=","15_DEPARTMENTS","HEAVY_RELEASE_TRIGGER","LIVE_C_MACHINE_SPACE"],"restore top-tier professional cross-department audit/rebuild script and repair routing")

by_dept={d:[] for d in DEPARTMENTS}
for finding in findings:
    by_dept.setdefault(finding["department"],[]).append(finding)

report={"schema":"aig-department-autocheck-v1","product":"AIG Studio 5.0","version":version_text.strip().split("=",1)[-1] if "=" in version_text else "UNKNOWN","mode":"SCAN_ALL_DEPARTMENTS_NO_EARLY_EXIT","network_is_owner":False,"departments":{},"findings":findings}
for d in DEPARTMENTS:
    fs=by_dept.get(d,[])
    report["departments"][d]={"status":"FAIL" if any(x["severity"]=="BLOCKING" for x in fs) else "PASS","finding_count":len(fs),"codes":[x["code"] for x in fs]}
    status=report["departments"][d]["status"]
    codes=",".join(report["departments"][d]["codes"]) or "NONE"
    print(f"DEPT_{status}|{d}|FINDINGS={len(fs)}|CODES={codes}")

OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
blocking=[x for x in findings if x["severity"]=="BLOCKING"]
print(f"DEPARTMENT_AUTOCHECK_SUMMARY|TOTAL={len(DEPARTMENTS)}|BLOCKING={len(blocking)}|FINDINGS={len(findings)}|REPORT={OUT.relative_to(ROOT)}")
if blocking:
    print("AI_REWORK_QUEUE_BEGIN")
    for x in blocking:
        print(f"REWORK|OWNER={x['owner']}|CODE={x['code']}|PATH={x['path']}|DETAIL={x['detail']}|HINT={x['repair_hint']}")
    print("AI_REWORK_QUEUE_END")
    raise SystemExit(1)
print("ALL_DEPARTMENTS_SOURCE_AUTOCHECK_PASS")

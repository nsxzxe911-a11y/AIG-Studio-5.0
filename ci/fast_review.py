#!/usr/bin/env python3
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8",errors="replace")
    sys.stderr.reconfigure(encoding="utf-8",errors="replace")
except Exception:
    pass

ROOT=Path(__file__).resolve().parents[1]
CHECKS=[["operator-ui","UIUX",[sys.executable,"ci/verify_operator_ui.py"]],["audit-contract","PRO_AUDIT",[sys.executable,"ci/verify_audit_contract.py"]],["release-command","AI",[sys.executable,"ci/verify_release_command_dispatch.py"]],["responsibility","AI",[sys.executable,"ci/verify_ai_responsibility_routing.py"]],["continuity","AI",[sys.executable,"ci/verify_continuity_checkpoint.py"]],["xml-cache","AI",[sys.executable,"ci/verify_xml_cache_update_standard.py"]],["theme-hot-swap","UIUX",[sys.executable,"ci/verify_theme_pack_hot_swap.py"]],["network-resilience","UIUX",[sys.executable,"ci/verify_network_resilience.py"]],["departments","AI",[sys.executable,"ci/department_autocheck.py"]],["professional-audit","PRO_AUDIT",[sys.executable,"ci/pro_audit.py"]],["production-runtime","HOME",[sys.executable,"ci/verify_production_runtime.py"]],["runtime-surfaces","UIUX",[sys.executable,"ci/verify_runtime_surfaces.py"]],["web-runtime","WEB",["node","ci/verify_web_runtime.mjs"]],["replit-web","WEB",[sys.executable,"ci/verify_replit_web_runtime.py"]],["formal-web-nav","UIUX",[sys.executable,"ci/verify_formal_web_navigation.py"]],["web-nc-editor","NC",[sys.executable,"ci/verify_web_nc_editor.py"]],["web-cam-flow","CAM",[sys.executable,"ci/verify_web_cam_toolpath_sim_flow.py"]],["web-sim-motion","SIM",[sys.executable,"ci/verify_web_sim_motion_semantics.py"]],["web-sim-focus","SIM",[sys.executable,"ci/verify_web_sim_focus_visuals.py"]],["web-5ax-camera","5AX",[sys.executable,"ci/verify_web_5ax_camera_focus.py"]],["web-5ax-camera-math","5AX",["node","ci/verify_web_5ax_camera_math.mjs"]],["web-5ax-occlusion","5AX",[sys.executable,"ci/verify_web_5ax_occlusion_camera.py"]],["web-5ax-occlusion-math","5AX",["node","ci/verify_web_5ax_occlusion_math.mjs"]],["web-5ax-occlusion-candidate","5AX",["node","ci/verify_web_5ax_occlusion_candidate.mjs"]],["web-5ax-hysteresis","5AX",[sys.executable,"ci/verify_web_5ax_camera_hysteresis.py"]],["web-5ax-hysteresis-math","5AX",["node","ci/verify_web_5ax_hysteresis_math.mjs"]],["web-5ax-camera-response","5AX",[sys.executable,"ci/verify_web_5ax_camera_response.py"]],["web-5ax-camera-response-math","5AX",["node","ci/verify_web_5ax_camera_response_math.mjs"]],["web-5ax-auto-zoom","5AX",[sys.executable,"ci/verify_web_5ax_auto_zoom.py"]],["web-5ax-auto-zoom-math","5AX",["node","ci/verify_web_5ax_auto_zoom_math.mjs"]]]

def run_one(item):
    name, owner, command = item
    p=subprocess.run(command,cwd=ROOT,text=True,capture_output=True,encoding="utf-8",errors="replace")
    return name, owner, command, p.returncode, p.stdout, p.stderr

results=[]
with ThreadPoolExecutor(max_workers=min(8,len(CHECKS))) as pool:
    futures=[pool.submit(run_one,item) for item in CHECKS]
    for future in as_completed(futures):
        results.append(future.result())

failed=[]
for name,owner,command,code,out,err in sorted(results):
    print(f"FAST_REVIEW_CHECK|{name}|OWNER={owner}|RC={code}")
    if (out or "").strip():
        print((out or "").rstrip())
    if (err or "").strip():
        print((err or "").rstrip(),file=sys.stderr)
    if code!=0:
        failed.append((name,owner,code))

if failed:
    print("FAST_REVIEW_REWORK_QUEUE_BEGIN")
    for name,owner,code in failed:
        print(f"FAST_REVIEW_FAIL|OWNER={owner}|CHECK={name}|RC={code}|ACTION=RETURN_TO_OWNER_REWORK")
    print("FAST_REVIEW_REWORK_QUEUE_END")
    raise SystemExit(1)

print("FAST_REVIEW_PASS|PRODUCT=AIG_STUDIO|MODE=PARALLEL|NO_EARLY_SERIAL_WAIT|XML_CACHE_STANDARD|OWNER_ROUTING|ALL_CHECKS_PASS")

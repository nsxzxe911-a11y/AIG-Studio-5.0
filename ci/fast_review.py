#!/usr/bin/env python3
import subprocess, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CHECKS=[["release-command","AI",["python3","ci/verify_release_command_dispatch.py"]],["responsibility","AI",["python3","ci/verify_ai_responsibility_routing.py"]],["continuity","AI",["python3","ci/verify_continuity_checkpoint.py"]],["xml-cache","AI",["python3","ci/verify_xml_cache_update_standard.py"]],["theme-hot-swap","UIUX",["python3","ci/verify_theme_pack_hot_swap.py"]],["network-resilience","UIUX",["python3","ci/verify_network_resilience.py"]],["departments","AI",["python3","ci/department_autocheck.py"]],["production-runtime","HOME",["python3","ci/verify_production_runtime.py"]],["runtime-surfaces","UIUX",["python3","ci/verify_runtime_surfaces.py"]],["web-runtime","WEB",["node","ci/verify_web_runtime.mjs"]],["pro-audit","PRO_AUDIT",["python3","ci/pro_audit.py"]]]

def run_one(item):
    name, owner, command = item
    p=subprocess.run(command,cwd=ROOT,text=True,capture_output=True)
    return name, owner, command, p.returncode, p.stdout, p.stderr

results=[]
with ThreadPoolExecutor(max_workers=min(8,len(CHECKS))) as pool:
    futures=[pool.submit(run_one,item) for item in CHECKS]
    for future in as_completed(futures):
        results.append(future.result())

failed=[]
for name,owner,command,code,out,err in sorted(results):
    print(f"FAST_REVIEW_CHECK|{name}|OWNER={owner}|RC={code}")
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip(),file=sys.stderr)
    if code!=0:
        failed.append((name,owner,code))

if failed:
    print("FAST_REVIEW_REWORK_QUEUE_BEGIN")
    for name,owner,code in failed:
        print(f"FAST_REVIEW_FAIL|OWNER={owner}|CHECK={name}|RC={code}|ACTION=RETURN_TO_OWNER_REWORK")
    print("FAST_REVIEW_REWORK_QUEUE_END")
    raise SystemExit(1)

print("FAST_REVIEW_PASS|PRODUCT=AIG_STUDIO|MODE=PARALLEL|NO_EARLY_SERIAL_WAIT|XML_CACHE_STANDARD|OWNER_ROUTING|ALL_CHECKS_PASS")

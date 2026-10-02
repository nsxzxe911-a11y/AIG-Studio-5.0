from __future__ import annotations
import argparse, hashlib, os, shutil, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
API=36
BUILD_TOOLS="36.0.0"
# Purity rule: PROCESS_ENV_ONLY. Never create or modify local.properties.

def first_valid(paths):
    seen=set()
    for raw in paths:
        if not raw: continue
        p=Path(raw).expanduser()
        key=str(p).lower()
        if key in seen: continue
        seen.add(key)
        if p.exists(): return p.resolve()
    return None

def find_sdk():
    candidates=[os.environ.get("ANDROID_HOME"),os.environ.get("ANDROID_SDK_ROOT")]
    if os.environ.get("LOCALAPPDATA"):
        candidates.append(Path(os.environ["LOCALAPPDATA"])/"Android"/"Sdk")
    home=Path.home()
    candidates += [home/"AppData"/"Local"/"Android"/"Sdk",home/"Library"/"Android"/"sdk",home/"Android"/"Sdk"]
    sdk=first_valid(candidates)
    if not sdk: raise SystemExit("LOCAL_ANDROID_SDK_NOT_FOUND")
    platform=sdk/"platforms"/f"android-{API}"/"android.jar"
    bt=sdk/"build-tools"/BUILD_TOOLS
    signer=bt/("apksigner.bat" if os.name=="nt" else "apksigner")
    if not platform.exists(): raise SystemExit(f"ANDROID_PLATFORM_{API}_MISSING:{platform}")
    if not bt.exists(): raise SystemExit(f"ANDROID_BUILD_TOOLS_MISSING:{bt}")
    if not signer.exists(): raise SystemExit(f"APKSIGNER_MISSING:{signer}")
    return sdk,signer

def find_gradle(explicit=None):
    candidates=[explicit,os.environ.get("AIG_GRADLE"),shutil.which("gradle.bat"),shutil.which("gradle")]
    if os.name=="nt":
        drive=ROOT.drive or "E:"
        candidates += [Path(drive+"/")/"AIG_TOOLS"/"gradle-9.7.0"/"bin"/"gradle.bat",Path("E:/AIG_TOOLS/gradle-9.7.0/bin/gradle.bat")]
    gradle=first_valid(candidates)
    if not gradle: raise SystemExit("GRADLE_9_7_NOT_FOUND_SET_AIG_GRADLE")
    return gradle

def sha256(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
    return h.hexdigest().upper()
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--probe-only",action="store_true")
    ap.add_argument("--gradle")
    args=ap.parse_args()
    sdk,signer=find_sdk()
    gradle=find_gradle(args.gradle)
    print(f"LOCAL_ANDROID_TOOLCHAIN|SDK={sdk}|API={API}|BUILD_TOOLS={BUILD_TOOLS}|GRADLE={gradle}|PROCESS_ENV_ONLY|NO_LOCAL_PROPERTIES_WRITE")
    if args.probe_only:
        print("LOCAL_ANDROID_PROBE_PASS")
        return 0
    env=os.environ.copy()
    env["ANDROID_HOME"]=str(sdk)
    env["ANDROID_SDK_ROOT"]=str(sdk)
    subprocess.run([str(gradle),"-p",str(ROOT),":app:assembleDebug","--no-daemon"],env=env,check=True)
    apk=ROOT/"app"/"build"/"outputs"/"apk"/"debug"/"app-debug.apk"
    if not apk.exists(): raise SystemExit(f"APK_MISSING:{apk}")
    digest=sha256(apk)
    verify=subprocess.run([str(signer),"verify","--verbose","--print-certs",str(apk)],env=env,text=True,capture_output=True,errors="replace")
    sys.stdout.write(verify.stdout)
    sys.stderr.write(verify.stderr)
    if verify.returncode!=0 or "Verifies" not in verify.stdout:
        raise SystemExit("APK_SIGNATURE_VERIFY_FAIL")
    print(f"LOCAL_ANDROID_BUILD_PASS|APK={apk}|SHA256={digest}|SIZE={apk.stat().st_size}|APKSIGNER=PASS|PROCESS_ENV_ONLY")
    return 0

if __name__=="__main__":
    raise SystemExit(main())

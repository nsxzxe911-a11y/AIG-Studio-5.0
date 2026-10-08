#!/usr/bin/env python3
import argparse, pathlib, re, subprocess, time

SURFACES={
    "HOME":["首頁","HOME"],"CAD":["CAD","2D CAD"],"CAM":["CAM"],"SIM":["SIM","3D SIM"],
    "3AX":["3AX"],"4AX":["4AX"],"5AX":["5AX","5X"],"6AX":["6AX","6X"],
    "NC":["NC","NC EDIT","NC 編輯"],"AI":["AI","AI 智能"]
}

def run(*args,check=True,text=True):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=text)
    if check and p.returncode: raise RuntimeError("command failed: "+" ".join(args)+"\n"+(p.stdout or ""))
    return p.stdout or ""

def dump_xml(adb):
    run(adb,"shell","uiautomator","dump","/sdcard/aig-window.xml")
    return run(adb,"shell","cat","/sdcard/aig-window.xml")

def find_bounds(xml,names):
    for name in names:
        esc=re.escape(name)
        pat=re.compile(r'<node[^>]*(?:text|content-desc)="'+esc+r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*/>')
        m=pat.search(xml)
        if not m:
            pat=re.compile(r'<node[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*(?:text|content-desc)="'+esc+r'"[^>]*/>')
            m=pat.search(xml)
        if m: return tuple(map(int,m.groups()))
    return None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--apk",required=True)
    ap.add_argument("--package",default="com.aigstudio.app")
    ap.add_argument("--adb",default="adb")
    ap.add_argument("--evidence",default="evidence/blackbox/android")
    args=ap.parse_args()
    evidence=pathlib.Path(args.evidence); evidence.mkdir(parents=True,exist_ok=True)
    run(args.adb,"install","-r",args.apk)
    run(args.adb,"shell","am","force-stop",args.package)
    run(args.adb,"shell","monkey","-p",args.package,"-c","android.intent.category.LAUNCHER","1")
    time.sleep(2.0)
    focus=run(args.adb,"shell","dumpsys","window","windows")
    if args.package not in focus: raise RuntimeError("packaged APK did not become visible")
    run(args.adb,"exec-out","screencap","-p",check=True,text=False)
    home=(evidence/"00_HOME.png").open("wb")
    home.write(subprocess.check_output([args.adb,"exec-out","screencap","-p"])); home.close()
    report=["PACKAGED_APK_LAUNCH=PASS","FOREGROUND_PACKAGE=PASS","HOME_SCREENSHOT=PASS"]
    index=1
    for surface,names in SURFACES.items():
        xml=dump_xml(args.adb)
        bounds=find_bounds(xml,names)
        if surface=="HOME" and not bounds:
            report.append("HOME=MAIN_WINDOW_VISIBLE"); continue
        if not bounds:
            report.append(surface+"=MISSING"); continue
        x1,y1,x2,y2=bounds
        run(args.adb,"shell","input","tap",str((x1+x2)//2),str((y1+y2)//2))
        time.sleep(.45)
        shot=evidence/(f"{index:02d}_{surface}.png")
        shot.write_bytes(subprocess.check_output([args.adb,"exec-out","screencap","-p"]))
        report.append(surface+"=VISIBLE_CONTROL_FOUND")
        index+=1
    if not any(x.endswith("=MISSING") for x in report): report.append("TEN_SURFACE_REACHABILITY=PASS")
    else: report.append("TEN_SURFACE_REACHABILITY=REVIEW")
    (evidence/"BLACKBOX_STATUS.txt").write_text("\n".join(report)+"\n",encoding="utf-8")
    print("\n".join(report))

if __name__=="__main__": main()

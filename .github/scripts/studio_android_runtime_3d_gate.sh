#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$GITHUB_WORKSPACE/AIG_Studio_5_0_UI_branch_update/AIG_Studio_5_0"
APK="$APP_DIR/AIGStudio5_B001.apk"
EVIDENCE="$APP_DIR/runtime-evidence"
mkdir -p "$EVIDENCE"

adb wait-for-device
for i in $(seq 1 120); do
  boot="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  if [ "$boot" = "1" ]; then break; fi
  sleep 2
done
test "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1"

adb shell wm size 1080x2340
adb shell wm density 425
adb shell settings put system accelerometer_rotation 0 >/dev/null 2>&1 || true
adb shell settings put system user_rotation 0 >/dev/null 2>&1 || true
adb shell settings put system font_scale 1.0 >/dev/null 2>&1 || true

adb install --no-streaming -r "$APK"
adb shell am force-stop com.aigstudio.app
adb shell am start -W -n com.aigstudio.app/.MainActivity | tee "$EVIDENCE/ANDROID_START.txt"

alive=false
for i in $(seq 1 30); do
  adb shell pidof com.aigstudio.app > "$EVIDENCE/PID.txt" 2>/dev/null || true
  adb shell dumpsys activity activities > "$EVIDENCE/ACTIVITY.txt" 2>/dev/null || true
  if [ -s "$EVIDENCE/PID.txt" ] && grep -Fq 'com.aigstudio.app/.MainActivity' "$EVIDENCE/ACTIVITY.txt"; then
    alive=true
    break
  fi
  sleep 2
done
test "$alive" = true

dump_ui() {
  local target="$1"
  local out="$2"
  local ok=false
  for i in $(seq 1 12); do
    adb shell rm -f "$target" >/dev/null 2>&1 || true
    if adb shell uiautomator dump "$target" >/dev/null 2>&1; then
      if adb exec-out cat "$target" > "$out" 2>/dev/null && grep -q '<hierarchy' "$out"; then
        ok=true
        break
      fi
    fi
    sleep 1
  done
  test "$ok" = true
}

tap_ui_text() {
  local label="$1"
  dump_ui /data/local/tmp/aigstudio-action.xml "$EVIDENCE/UI_ACTION.xml"
  local coords
  coords="$(python3 - "$label" "$EVIDENCE/UI_ACTION.xml" <<'PY'
import re, sys, xml.etree.ElementTree as ET
label=sys.argv[1]
path=sys.argv[2]
root=ET.parse(path).getroot()
for n in root.iter("node"):
    text=n.attrib.get("text","")
    desc=n.attrib.get("content-desc","")
    if text==label or desc==label or text.endswith(label) or desc.endswith(label):
        m=re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", n.attrib.get("bounds",""))
        if m:
            x1,y1,x2,y2=map(int,m.groups())
            print((x1+x2)//2, (y1+y2)//2)
            raise SystemExit(0)
raise SystemExit(2)
PY
)"
  test -n "$coords"
  adb shell input tap $coords
  sleep 1
}

dump_ui /data/local/tmp/aigstudio-ui.xml "$EVIDENCE/UI.xml"
grep -Fq 'AIG Studio 5.0' "$EVIDENCE/UI.xml"
grep -Fq '繪圖' "$EVIDENCE/UI.xml"

tap_ui_text "矩形"
adb shell input tap 300 600
adb shell input tap 760 1250
sleep 1

tap_ui_text "加工 ＋"
tap_ui_text "3D 加工"

for i in $(seq 1 12); do
  dump_ui /data/local/tmp/aigstudio-3d.xml "$EVIDENCE/UI_3D.xml" || true
  if grep -Fq 'RGB 真 3D 加工' "$EVIDENCE/UI_3D.xml" && grep -Fq 'TRUE 3D' "$EVIDENCE/UI_3D.xml"; then
    break
  fi
  sleep 1
done
grep -Fq 'RGB 真 3D 加工' "$EVIDENCE/UI_3D.xml"
grep -Fq 'TRUE 3D' "$EVIDENCE/UI_3D.xml"

adb exec-out screencap -p > "$EVIDENCE/TRUE_3D_BEFORE.png"
adb shell input swipe 300 650 760 820 450
sleep 1
adb exec-out screencap -p > "$EVIDENCE/TRUE_3D_AFTER.png"
test -s "$EVIDENCE/TRUE_3D_BEFORE.png"
test -s "$EVIDENCE/TRUE_3D_AFTER.png"
if cmp -s "$EVIDENCE/TRUE_3D_BEFORE.png" "$EVIDENCE/TRUE_3D_AFTER.png"; then
  echo "STUDIO_TRUE_3D_INTERACTION=FAIL"
  exit 66
fi
echo "STUDIO_TRUE_3D_INTERACTION=PASS" | tee "$EVIDENCE/TRUE_3D_GATE.txt"

adb exec-out screencap -p > "$EVIDENCE/STARTUP.png"
test -s "$EVIDENCE/STARTUP.png"
adb logcat -d -t 600 > "$EVIDENCE/LOGCAT.txt" 2>/dev/null || true

{
  echo "ANDROID_EMULATOR_PROFILE=GOOGLE_APIS_PIXEL_7_HEADLESS"
  adb shell wm size
  adb shell wm density
  echo "USER_ROTATION=$(adb shell settings get system user_rotation | tr -d '\r')"
  echo "FONT_SCALE=$(adb shell settings get system font_scale | tr -d '\r')"
  echo "STUDIO_ANDROID_RUNTIME_GATE=PASS"
} | tee "$EVIDENCE/RUNTIME_GATE.txt"

grep -Eq 'Override size: 1080x2340|Physical size: 1080x2340' "$EVIDENCE/RUNTIME_GATE.txt"
grep -Eq 'Override density: 425|Physical density: 425' "$EVIDENCE/RUNTIME_GATE.txt"

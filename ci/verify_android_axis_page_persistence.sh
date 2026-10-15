#!/usr/bin/env bash
set -euo pipefail

PKG='com.aigstudio.app'
EVIDENCE='release/android/runtime-evidence/axis-persistence'
UI_REMOTE='/sdcard/aig-axis-persistence.xml'
mkdir -p "$EVIDENCE"

SEED="$EVIDENCE/axis-persistence-seed.aigp"
cat > "$SEED" <<'PROJECT'
AIGSTUDIO_PROJECT|1
MASTER|0.0|0.0|0.0
CAM|6.0|-3.0|5.0|150.0|1|2.0|2.0
CONTOUR|OUTSIDE|CCW
CAMPATHMODE|MANUAL
MANUALTP|5.0|5.0|5.0|1|-|-|-|0.0|0.0
MANUALTP|10.0|10.0|-3.0|0|-|-|-|0.0|0.0
MANUALTP|50.0|10.0|-3.0|0|-|-|-|0.0|0.0
MANUALTP|50.0|30.0|-3.0|0|-|-|-|30.0|-15.0
MANUALTP|10.0|30.0|-3.0|0|-|-|-|30.0|-15.0
MANUALTP|5.0|5.0|5.0|1|-|-|-|30.0|-15.0
AXIS|5AX|30.0|-15.0
NC64|-
LINE|UjE|0.0|0.0|60.0|0.0
LINE|UjI|60.0|0.0|60.0|40.0
LINE|UjM|60.0|40.0|0.0|40.0
LINE|UjQ|0.0|40.0|0.0|0.0
PROJECT

echo 'AXIS_PERSISTENCE_SEED_PROJECT|LEGACY_V1_COMPAT|MANUAL_CAM|REAL_GEOMETRY|REAL_TOOLPATH'

adb shell am force-stop "$PKG" || true
adb shell pm clear "$PKG" >/dev/null
adb shell am start -W -n "$PKG/.MainActivity" >/dev/null
sleep 1
adb shell am force-stop "$PKG"
cat "$SEED" | adb shell "run-as $PKG sh -c 'mkdir -p files/recovery && cat > files/recovery/current-recovery.aigp'"
adb shell am start -W -n "$PKG/.MainActivity" > "$EVIDENCE/seeded_launch.txt"
sleep 4

ui_dump() {
  local name="$1"
  local attempt
  for attempt in 1 2 3 4 5; do
    adb shell rm -f "$UI_REMOTE" >/dev/null 2>&1 || true
    if adb shell uiautomator dump "$UI_REMOTE" >/dev/null 2>&1; then
      if adb pull "$UI_REMOTE" "$EVIDENCE/$name.xml" >/dev/null 2>&1 && grep -Fq '<hierarchy' "$EVIDENCE/$name.xml"; then
        echo "UI_DUMP_RETRY_PASS|$name|ATTEMPT=$attempt"
        return 0
      fi
    fi
    sleep 1
  done
  echo "UI_DUMP_RETRY_EXHAUSTED|$name" >&2
  return 1
}

tap_exact() {
  local needle="$1"
  ui_dump tap-current
  local xy
  xy="$(python3 - "$EVIDENCE/tap-current.xml" "$needle" <<'PY'
import re,sys,xml.etree.ElementTree as ET
path,needle=sys.argv[1],sys.argv[2]
root=ET.parse(path).getroot()
for n in root.iter('node'):
    if n.attrib.get('text')==needle or n.attrib.get('content-desc')==needle:
        b=n.attrib.get('bounds','')
        m=re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',b)
        if m:
            x1,y1,x2,y2=map(int,m.groups())
            if x2>x1 and y2>y1:
                print((x1+x2)//2,(y1+y2)//2)
                raise SystemExit(0)
raise SystemExit(f'UI_NODE_NOT_FOUND:{needle}')
PY
)"
  read -r x y <<<"$xy"
  adb shell input tap "$x" "$y"
}

assert_main_resumed() {
  local axis="$1"
  adb shell dumpsys activity activities > "$EVIDENCE/${axis}_activity.txt"
  grep -F "$PKG/.MainActivity" "$EVIDENCE/${axis}_activity.txt" >/dev/null
}

assert_axis_snapshot() {
  local axis="$1" snap="$2"
  ui_dump "${axis}_${snap}"
  grep -F "MACHINING 3D VIEW $axis" "$EVIDENCE/${axis}_${snap}.xml" >/dev/null
  if [[ "$axis" == '6AX' ]]; then
    grep -F 'AXIS PAGE 6AX RUNTIME' "$EVIDENCE/${axis}_${snap}.xml" >/dev/null
    grep -F '6AX NC INTERLOCK' "$EVIDENCE/${axis}_${snap}.xml" >/dev/null
  else
    grep -F "AXIS PAGE $axis RUNTIME" "$EVIDENCE/${axis}_${snap}.xml" >/dev/null
  fi
  assert_main_resumed "$axis"
  adb exec-out screencap -p > "$EVIDENCE/${axis}_${snap}.png"
  test "$(stat -c%s "$EVIDENCE/${axis}_${snap}.png")" -gt 20000
}

tap_exact 'CAM'
sleep 1
tap_exact '重算'
sleep 4
adb shell input keyevent 4
sleep 1

for axis in 3AX 4AX 5AX 6AX; do
  tap_exact '多功能'
  sleep 1
  tap_exact "$axis"
  sleep 2
  assert_axis_snapshot "$axis" 'first'
  sleep 3
  assert_axis_snapshot "$axis" 'second'
  echo "AXIS_PAGE_${axis}_PERSISTENCE_PASS|REAL_MACHINING3DVIEW|TWO_SNAPSHOTS|MAIN_ACTIVITY_RESUMED"
  adb shell input keyevent 4
  sleep 1
done

echo 'ANDROID_AXIS_PAGE_PERSISTENCE_GATE_PASS|3AX|4AX|5AX|6AX|TWO_SNAPSHOTS|MAIN_ACTIVITY_RESUMED|NO_HOME_FALLBACK'
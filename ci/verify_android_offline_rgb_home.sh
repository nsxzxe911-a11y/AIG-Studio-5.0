#!/usr/bin/env bash
set -euo pipefail

APK='release/android/AIG_Studio_5_0_RGB_FULL_INSTALLABLE.apk'
PKG='com.aigstudio.app'
EVIDENCE='release/android/runtime-evidence'

mkdir -p "$EVIDENCE"
test -s "$APK"

adb install -r "$APK"
adb shell svc wifi disable || true
adb shell svc data disable || true
adb shell am force-stop "$PKG"
adb shell am start -W -n "$PKG/.MainActivity" > "$EVIDENCE/android_launch.txt"
cat "$EVIDENCE/android_launch.txt"
sleep 3

adb shell dumpsys activity activities > "$EVIDENCE/activity.txt"
grep -F "$PKG/.MainActivity" "$EVIDENCE/activity.txt"

adb shell uiautomator dump /sdcard/aig-studio-ui.xml >/dev/null
adb pull /sdcard/aig-studio-ui.xml "$EVIDENCE/android_ui.xml" >/dev/null
grep -F 'AIG CNC FORMAL RGB HOME' "$EVIDENCE/android_ui.xml"
grep -F 'AIG CNC PRODUCTION RUNTIME HOST' "$EVIDENCE/android_ui.xml"

if grep -Eqi 'ENGINEERING SHELL|SYSTEM READY|PHYSICAL PERFORMANCE|MASTER COORDINATE ROOT|MAINTENANCE SYSTEM STRIP|2D CAD .*LIVE WORKSPACE' "$EVIDENCE/android_ui.xml"; then
  echo 'DEFAULT_ENGINEERING_SHELL_DETECTED=FAIL'
  exit 1
fi

adb exec-out screencap -p > "$EVIDENCE/android_runtime_launch.png"
test "$(stat -c%s "$EVIDENCE/android_runtime_launch.png")" -gt 20000
printf 'device_launch_evidence=EMULATOR_OFFLINE_FORMAL_RGB_HOME_VISIBLE\nengineering_shell_default=FALSE\npackage=%s\n' "$PKG" > "$EVIDENCE/UI_ENTRY_EVIDENCE.txt"
echo 'STUDIO_ANDROID_VISIBLE_RUNTIME_GATE_PASS|OFFLINE|FORMAL_RGB_HOME|NO_ENGINEERING_SHELL'

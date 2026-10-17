#!/usr/bin/env bash
set -euo pipefail

APK='app/build/outputs/apk/debug/app-debug.apk'
PKG='com.aigstudio.app'
ACTIVITY="$PKG/.MainActivity"
EVIDENCE='release/android/dev-authority-evidence'
STABLE_ID='AIG_RGB_HOME_427'
STABLE_SHA='8835cded863074b4de9b848e12eb037254119b5a7f21e135b66657f764fbd652'

mkdir -p "$EVIDENCE"
test -s "$APK"

adb install -r "$APK"
adb shell svc wifi disable || true
adb shell svc data disable || true
adb shell am force-stop "$PKG"
adb shell am start -W -n "$ACTIVITY" | tee "$EVIDENCE/android_launch.txt"
sleep 4

adb shell dumpsys activity activities > "$EVIDENCE/activity.txt"
grep -F "$PKG/.MainActivity" "$EVIDENCE/activity.txt"

UI_XML="$EVIDENCE/android_ui.xml"
rm -f "$UI_XML"
for attempt in 1 2 3 4 5; do
  adb shell rm -f /sdcard/aig-authority-ui.xml || true
  if adb shell uiautomator dump /sdcard/aig-authority-ui.xml >/dev/null 2>&1 && \
     adb pull /sdcard/aig-authority-ui.xml "$UI_XML" >/dev/null 2>&1 && \
     test -s "$UI_XML"; then
    echo "UIAUTOMATOR_DUMP_ATTEMPT=$attempt|PASS"
    break
  fi
  echo "UIAUTOMATOR_DUMP_ATTEMPT=$attempt|RETRY"
  sleep 1
done

test -s "$UI_XML"

# The first formal Runtime surface must be present.
grep -F 'AIG CNC PRODUCTION HOME RUNTIME • FIRST FRAME' "$UI_XML"

# Dev visual-only proof accepts the verified 2026-10-05 stable Authority fallback.
grep -F "AIG RGB HOME STABLE AUTHORITY APPLIED|${STABLE_ID}|${STABLE_SHA}" "$UI_XML"
grep -F 'AIG RGB STABLE AUTHORITY • VISUAL FALLBACK ONLY • NO UNVERIFIED HIT MAP' "$UI_XML"

# A formal Authority HOME is one visible product layer. Programmatic engineering
# children and global auxiliary overlays are forbidden on this surface.
for forbidden in \
  'HOME COCKPIT LINK SHORTCUTS' \
  'FORMAL RGB HOME MODES' \
  'HOME LINK MANAGER TOGGLE' \
  'STARTUP UPDATE PROGRESS' \
  '目前圖面預覽' \
  'MASTER COORDINATE ROOT' \
  'SYSTEM READY' \
  'MAINTENANCE SYSTEM STRIP' \
  'VISIBLE FUNCTION ACTIONS' \
  'CAD FIXED QUICK REACH' \
  'AI 教程' \
  'AI 導航 / 教程中心 / 目前頁面說明 / 嘴炮模式' \
  'AIG_TUTORIAL_FLOAT'; do
  if grep -Fq "$forbidden" "$UI_XML"; then
    echo "VISIBLE_HOME_OVERLAY_OR_SHELL_LEAK=$forbidden|FAIL"
    cat "$UI_XML"
    exit 1
  fi
done

adb exec-out screencap -p > "$EVIDENCE/authority_home.png"
test "$(stat -c%s "$EVIDENCE/authority_home.png")" -gt 20000

cat > "$EVIDENCE/DEV_VISUAL_EVIDENCE.txt" <<EOF
scope=DEV_VISUAL_ONLY_NOT_RELEASE_AUTHORITY
package=$PKG
network=OFFLINE
home_visual=VERIFIED_STABLE_RGB_AUTHORITY_427
stable_authority_id=$STABLE_ID
stable_authority_sha256=$STABLE_SHA
engineering_shell_visible=FALSE
tutorial_overlay_visible=FALSE
current_2026_10_16_authority_ingest=STILL_REQUIRED_FOR_RELEASE
release_gate=BLOCKED_UNTIL_CURRENT_AUTHORITY_BINARY_VERIFIED
EOF

echo 'ANDROID_DEV_AUTHORITY_ONLY_HOME_PASS|OFFLINE|427_STABLE_RGB_VISIBLE|ENGINEERING_SHELL_HIDDEN|TUTORIAL_OVERLAY_HIDDEN|NO_UNVERIFIED_HIT_MAP|NOT_RELEASE_AUTHORITY'

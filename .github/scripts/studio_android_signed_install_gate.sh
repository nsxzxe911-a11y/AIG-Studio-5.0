#!/usr/bin/env bash
set -Eeuo pipefail

APK="signed-release/AIG_Studio_5_0_RGB_FULL_RELEASE.apk"
PACKAGE="com.aigstudio.app"
EVIDENCE="signed-release/install-evidence"
mkdir -p "$EVIDENCE"
test -f "$APK"

adb wait-for-device
READY=0
for i in $(seq 1 120); do
  if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && adb shell pm path android >/dev/null 2>&1; then
    echo "ANDROID_READY_ATTEMPT=$i" | tee "$EVIDENCE/ANDROID_READY.txt"
    READY=1
    break
  fi
  sleep 2
done
test "$READY" = "1"

install_apk() {
  label="$1"
  shift
  ok=0
  for i in 1 2 3 4 5; do
    echo "$label install attempt $i/5"
    if adb install --no-streaming "$@" "$APK"; then ok=1; break; fi
    adb reconnect offline || true
    adb kill-server || true
    sleep 3
    adb start-server
    adb wait-for-device
    sleep 5
  done
  test "$ok" = "1"
}

verify_package() {
  label="$1"
  adb shell pm path "$PACKAGE" | tee "$EVIDENCE/"$label"_PM_PATH.txt"
  adb shell dumpsys package "$PACKAGE" | grep -E 'versionCode=|versionName=' | tee "$EVIDENCE/"$label"_VERSION.txt"
  grep -q 'versionCode=50000' "$EVIDENCE/"$label"_VERSION.txt"
  grep -q 'versionName=5.0.0' "$EVIDENCE/"$label"_VERSION.txt"
}

launch_app() {
  label="$1"
  adb shell am force-stop "$PACKAGE"
  adb shell am start -W -n "$PACKAGE/.MainActivity" | tee "$EVIDENCE/"$label"_START.txt"
  sleep 3
  adb shell pidof "$PACKAGE" | tee "$EVIDENCE/"$label"_PID.txt"
  test -s "$EVIDENCE/"$label"_PID.txt"
  adb shell dumpsys activity activities > "$EVIDENCE/"$label"_ACTIVITY.txt"
  grep -Fq "$PACKAGE/.MainActivity" "$EVIDENCE/"$label"_ACTIVITY.txt"
}

adb uninstall "$PACKAGE" >/dev/null 2>&1 || true
install_apk FRESH
verify_package FRESH
launch_app FRESH

echo "STUDIO_SIGNED_APK_FRESH_INSTALL_LAUNCH_PASS" | tee "$EVIDENCE/FINAL_INSTALL_GATE.txt"

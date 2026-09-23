#!/usr/bin/env bash
set -Eeuo pipefail

: "${SIGNED_APK:?SIGNED_APK is required}"
PACKAGE="com.aigstudio.app"
EVIDENCE_DIR="signed-install-evidence"
mkdir -p "$EVIDENCE_DIR"

adb wait-for-device
ready=0
for i in $(seq 1 120); do
  if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] &&
     adb shell pm path android >/dev/null 2>&1; then
    echo "ANDROID_READY_ATTEMPT=$i" | tee "$EVIDENCE_DIR/ANDROID_READY.txt"
    ready=1
    break
  fi
  sleep 2
done
test "$ready" = "1"

install_apk() {
  local label="$1"
  shift
  local ok=0
  for i in 1 2 3 4 5; do
    if adb install --no-streaming "$@" "$SIGNED_APK" | tee "$EVIDENCE_DIR/${label}_INSTALL.txt"; then
      ok=1
      break
    fi
    adb reconnect offline || true
    adb kill-server || true
    sleep 2
    adb start-server
    adb wait-for-device
  done
  test "$ok" = "1"
}

verify_package() {
  local label="$1"
  adb shell pm path "$PACKAGE" | tee "$EVIDENCE_DIR/${label}_PM_PATH.txt"
  adb shell dumpsys package "$PACKAGE" | grep -E 'versionCode=|versionName=' | tee "$EVIDENCE_DIR/${label}_VERSION.txt"
  grep -q 'versionCode=50000' "$EVIDENCE_DIR/${label}_VERSION.txt"
  grep -q 'versionName=5.0.0' "$EVIDENCE_DIR/${label}_VERSION.txt"
}

launch_app() {
  local label="$1"
  adb shell am force-stop "$PACKAGE"
  adb shell am start -W -n "$PACKAGE/.MainActivity" | tee "$EVIDENCE_DIR/${label}_START.txt"
  local alive=0
  for i in $(seq 1 30); do
    if adb shell pidof "$PACKAGE" > "$EVIDENCE_DIR/${label}_PID.txt" 2>/dev/null &&
       [ -s "$EVIDENCE_DIR/${label}_PID.txt" ]; then
      alive=1
      break
    fi
    sleep 1
  done
  test "$alive" = "1"
  adb shell dumpsys activity activities > "$EVIDENCE_DIR/${label}_ACTIVITY.txt"
  grep -Fq "$PACKAGE/.MainActivity" "$EVIDENCE_DIR/${label}_ACTIVITY.txt"
}

adb uninstall "$PACKAGE" >/dev/null 2>&1 || true

install_apk FRESH
verify_package FRESH
launch_app FRESH

install_apk UPGRADE -r
verify_package UPGRADE
launch_app UPGRADE

adb uninstall "$PACKAGE" | tee "$EVIDENCE_DIR/UNINSTALL.txt"
if adb shell pm path "$PACKAGE" >/dev/null 2>&1; then
  echo "STUDIO_ANDROID_UNINSTALL=FAIL"
  exit 72
fi

install_apk CLEAN_REINSTALL
verify_package CLEAN_REINSTALL
launch_app CLEAN_REINSTALL

echo "STUDIO_SIGNED_FRESH_UPGRADE_UNINSTALL_REINSTALL_PASS" | tee "$EVIDENCE_DIR/FINAL_INSTALL_GATE.txt"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$ROOT/AIG_Studio_5_0_UI_branch_update/AIG_Studio_5_0"
ANDROID_OUT="$ROOT/release/android"
SOURCE_OUT="$ROOT/release/source"

rm -rf "$ANDROID_OUT" "$SOURCE_OUT"
mkdir -p "$ANDROID_OUT" "$SOURCE_OUT"

gradle -p "$PROJECT" --no-daemon :app:assembleDebug

APK="$PROJECT/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"

cp "$APK" "$ANDROID_OUT/AIG_Studio_5_0_RGB_FULL_INSTALLABLE.apk"
(
  cd "$ANDROID_OUT"
  sha256sum AIG_Studio_5_0_RGB_FULL_INSTALLABLE.apk > SHA256SUMS.txt
)

cd "$ROOT"
git archive --format=zip --output="$SOURCE_OUT/AIG_Studio_FULL_PROJECT_SOURCE.zip" HEAD
(
  cd "$SOURCE_OUT"
  sha256sum AIG_Studio_FULL_PROJECT_SOURCE.zip > SHA256SUMS.txt
)

echo "AIG_STUDIO_ANDROID_PACKAGE=PASS"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$ROOT/AIG_Studio_5_0_UI_branch_update/AIG_Studio_5_0"

gradle -p "$PROJECT" --no-daemon :app:assembleDebug

APK="$PROJECT/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"

cp "$APK" "$ROOT/AIG_Studio_5_0_RGB_FULL_INSTALLABLE.apk"
sha256sum "$ROOT/AIG_Studio_5_0_RGB_FULL_INSTALLABLE.apk" > "$ROOT/AIG_Studio_5_0_RGB_FULL_INSTALLABLE.apk.sha256"

cd "$ROOT"
git archive --format=zip --output=AIG_Studio_FULL_PROJECT_SOURCE.zip HEAD
sha256sum AIG_Studio_FULL_PROJECT_SOURCE.zip > AIG_Studio_FULL_PROJECT_SOURCE.zip.sha256

echo "AIG_STUDIO_ANDROID_PACKAGE=PASS"

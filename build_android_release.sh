#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_OUT="$ROOT/release/android"
SOURCE_OUT="$ROOT/release/source"
VERSION="$(awk -F= '$1=="versionName"{print $2}' "$ROOT/release-version.properties")"
GIT_SHA="$(git -C "$ROOT" rev-parse HEAD)"

test -n "$VERSION"
test -n "$GIT_SHA"
test -f "$ROOT/settings.gradle.kts"

rm -rf "$ANDROID_OUT" "$SOURCE_OUT"
mkdir -p "$ANDROID_OUT" "$SOURCE_OUT"

gradle -p "$ROOT" --no-daemon :core:coreRegression :app:assembleDebug

APK="$ROOT/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"

APK_NAME="AIG_Studio_5_0_RGB_FULL_INSTALLABLE.apk"
cp "$APK" "$ANDROID_OUT/$APK_NAME"
(
  cd "$ANDROID_OUT"
  sha256sum "$APK_NAME" > SHA256SUMS.txt
  APK_SHA="$(awk '{print $1}' SHA256SUMS.txt)"
  cat > RELEASE_MANIFEST.txt <<EOF
product=AIG-Studio
version=$VERSION
git_sha=$GIT_SHA
artifact=$APK_NAME
sha256=$APK_SHA
release_state=BUILD_ARTIFACT_ONLY_NOT_FINAL
EOF
)

cd "$ROOT"
SOURCE_NAME="AIG_Studio_FULL_PROJECT_SOURCE.zip"
git archive --format=zip --output="$SOURCE_OUT/$SOURCE_NAME" HEAD
(
  cd "$SOURCE_OUT"
  sha256sum "$SOURCE_NAME" > SHA256SUMS.txt
  SOURCE_SHA="$(awk '{print $1}' SHA256SUMS.txt)"
  cat > RELEASE_MANIFEST.txt <<EOF
product=AIG-Studio
version=$VERSION
git_sha=$GIT_SHA
artifact=$SOURCE_NAME
sha256=$SOURCE_SHA
release_state=BUILD_ARTIFACT_ONLY_NOT_FINAL
EOF
)

echo "AIG_STUDIO_ANDROID_PACKAGE=PASS"

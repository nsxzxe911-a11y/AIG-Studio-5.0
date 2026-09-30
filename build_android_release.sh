#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_OUT="$ROOT/release/android"
SOURCE_OUT="$ROOT/release/source"
VERSION="$(awk -F= '$1=="versionName"{print $2}' "$ROOT/release-version.properties")"
RELEASE_MAJOR="${VERSION%%.*}"
UI_VERIFY_PACKAGE="com.aigstudio.app.uiverify${RELEASE_MAJOR}"
GIT_SHA="$(git -C "$ROOT" rev-parse HEAD)"

test -n "$VERSION"
test -n "$GIT_SHA"
test -f "$ROOT/settings.gradle.kts"

rm -rf "$ANDROID_OUT" "$SOURCE_OUT"
mkdir -p "$ANDROID_OUT" "$SOURCE_OUT"

gradle -p "$ROOT" --no-daemon :app:verifyAndroidPlatform :core:coreRegression :app:assembleDebug

APK="$ROOT/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"

APK_NAME="AIG_Studio_5_0_RGB_FULL_INSTALLABLE.apk"
cp "$APK" "$ANDROID_OUT/$APK_NAME"

gradle -p "$ROOT" --no-daemon -PaigUiVerifySideLoad=true :app:verifyAndroidPlatform :app:assembleDebug
UI_VERIFY_APK="$ROOT/app/build/outputs/apk/debug/app-debug.apk"
test -s "$UI_VERIFY_APK"
UI_VERIFY_APK_NAME="AIG_Studio_5_0_RGB_UI_VERIFY_SIDELOAD.apk"
cp "$UI_VERIFY_APK" "$ANDROID_OUT/$UI_VERIFY_APK_NAME"
(
  cd "$ANDROID_OUT"
  sha256sum "$APK_NAME" "$UI_VERIFY_APK_NAME" > SHA256SUMS.txt
  APK_SHA="$(awk 'NR==1{print $1}' SHA256SUMS.txt)"
  UI_VERIFY_APK_SHA="$(awk 'NR==2{print $1}' SHA256SUMS.txt)"
  cat > RELEASE_MANIFEST.txt <<EOF
product=AIG-Studio
version=$VERSION
git_sha=$GIT_SHA
artifact=$APK_NAME
sha256=$APK_SHA
ui_verify_artifact=$UI_VERIFY_APK_NAME
ui_verify_package=$UI_VERIFY_PACKAGE
ui_verify_sha256=$UI_VERIFY_APK_SHA
ui_verify_runtime=PRODUCTION_RUNTIME_SAME_CODE_DIFFERENT_PACKAGE_ID
ui_verify_purpose=SIDE_BY_SIDE_INSTALL_WHEN_EXISTING_PACKAGE_SIGNATURE_CONFLICTS
release_state=PRODUCTION_RUNTIME_CANDIDATE
release_class=PRODUCTION_RUNTIME
runtime_evidence=APK_BUILD_SIGN_PACKAGE
device_launch_evidence=REQUIRED_FOR_RUNTIME_EVIDENCE
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
release_state=PRODUCTION_RUNTIME_CANDIDATE
release_class=PRODUCTION_RUNTIME
runtime_evidence=APK_BUILD_SIGN_PACKAGE
device_launch_evidence=REQUIRED_FOR_RUNTIME_EVIDENCE
EOF
)

echo "AIG_STUDIO_ANDROID_PACKAGE=PASS"

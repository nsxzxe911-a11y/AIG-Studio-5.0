#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/build"
kotlinc \
  "$ROOT/core/src/main/kotlin/com/aigstudio/core/Geometry.kt" \
  "$ROOT/core/src/main/kotlin/com/aigstudio/core/Document.kt" \
  "$ROOT/core/src/main/kotlin/com/aigstudio/core/Transform.kt" \
  "$ROOT/core/src/main/kotlin/com/aigstudio/core/Cam.kt" \
  "$ROOT/core/src/main/kotlin/com/aigstudio/core/AiAssist.kt" \
  "$ROOT/core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt" \
  -include-runtime -d "$ROOT/build/core-tests.jar"
java -jar "$ROOT/build/core-tests.jar"

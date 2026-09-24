#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$ROOT/AIG_Studio"
MAIN="$PROJECT/core/src/main/kotlin"
TEST="$PROJECT/core/src/test/kotlin"
OUT="$PROJECT/build/core-tests.jar"

test -f "$PROJECT/settings.gradle.kts"
mapfile -t SOURCES < <(find "$MAIN" "$TEST" -type f -name '*.kt' | sort)
test "${#SOURCES[@]}" -gt 0

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"

kotlinc "${SOURCES[@]}" -include-runtime -d "$OUT"
test -s "$OUT"
java -jar "$OUT"

echo "AIG_STUDIO_CORE_REGRESSION=PASS"

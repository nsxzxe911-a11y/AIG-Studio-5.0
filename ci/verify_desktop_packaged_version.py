#!/usr/bin/env python3
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
text = (root / "release-version.properties").read_text(encoding="utf-8")
m = re.search(r"^versionName=(\d+\.\d+\.\d+)\s*$", text, re.M)
if not m:
    raise SystemExit("STUDIO_DESKTOP_VERSION_FAIL|REASON=VERSION_NAME_MISSING")
version = m.group(1)
script = root / "desktop" / "build" / "scripts" / "desktop.bat"
if not script.is_file():
    raise SystemExit("STUDIO_DESKTOP_VERSION_FAIL|REASON=START_SCRIPT_MISSING")
content = script.read_text(encoding="utf-8", errors="replace")
needle = f"-Daigstudio.version={version}"
if needle not in content:
    raise SystemExit(f"STUDIO_DESKTOP_VERSION_FAIL|EXPECTED={needle}|NO_DEV_FALLBACK")
print(f"STUDIO_DESKTOP_VERSION_PASS|VERSION={version}|NO_DEV_FALLBACK")

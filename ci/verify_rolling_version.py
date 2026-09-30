#!/usr/bin/env python3
import re, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
current=(ROOT/"release-version.properties").read_text(encoding="utf-8").strip()

def parse(line):
    m=re.fullmatch(r"versionName=(\d+)\.(\d+)\.(\d+)",line.strip())
    if not m:
        raise SystemExit("ROLLING_VERSION_FORMAT_BLOCKED: "+line.strip())
    return tuple(int(x) for x in m.groups())

new=parse(current)
try:
    old_text=subprocess.check_output(
        ["git","-C",str(ROOT),"show","HEAD^:release-version.properties"],
        text=True
    ).strip()
except subprocess.CalledProcessError as e:
    raise SystemExit("ROLLING_VERSION_PARENT_UNAVAILABLE") from e
old=parse(old_text)
if new <= old:
    raise SystemExit(f"ROLLING_VERSION_DOWNGRADE_BLOCKED|OLD={old}|NEW={new}")
print(f"STUDIO_ROLLING_VERSION_GATE_PASS|OLD={old[0]}.{old[1]}.{old[2]}|NEW={new[0]}.{new[1]}.{new[2]}|FORWARD_ONLY")

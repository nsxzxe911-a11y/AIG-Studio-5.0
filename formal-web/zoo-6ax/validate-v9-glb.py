#!/usr/bin/env python3
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GLB = ROOT / "local-glb" / "aig_6ax_machine_v9.glb"
MANIFEST = ROOT / "local-glb" / "aig_6ax_machine_v9.manifest.json"

required_nodes = {
    "C_GROUP", "B_GROUP", "A_GROUP", "SPINDLE_GROUP",
    "STATIC_BED", "STATIC_LEFT_COLUMN", "STATIC_RIGHT_COLUMN", "STATIC_BRIDGE",
    "STATIC_LEFT_SHELL", "STATIC_RIGHT_SHELL",
    "SPINDLE_CARRIAGE", "SPINDLE_HEAD", "SPINDLE_NOSE", "TOOL_HOLDER", "TOOL",
    "C_AXIS_BASE", "C_AXIS_TABLE", "C_AXIS_RING",
    "B_SUPPORT_FRONT", "B_SUPPORT_REAR", "B_BEARING_FRONT", "B_BEARING_REAR",
    "B_JOURNAL_FRONT", "B_JOURNAL_REAR", "B_CRADLE", "B_CRADLE_LEFT_ARM", "B_CRADLE_RIGHT_ARM",
    "A_SUPPORT_LEFT", "A_SUPPORT_RIGHT", "A_BEARING_LEFT", "A_BEARING_RIGHT",
    "A_SHAFT_LEFT", "A_SHAFT_RIGHT", "A_BODY", "CHUCK", "WORKPIECE"
}

if not GLB.is_file() or GLB.stat().st_size < 1024:
    raise SystemExit("FAIL: V9 GLB missing or too small")

raw = GLB.read_bytes()
magic, version, total_len = struct.unpack_from("<4sII", raw, 0)
if magic != b"glTF" or version != 2 or total_len != len(raw):
    raise SystemExit("FAIL: invalid GLB header")

json_len, json_type = struct.unpack_from("<II", raw, 12)
if json_type != 0x4E4F534A:
    raise SystemExit("FAIL: first GLB chunk is not JSON")

doc = json.loads(raw[20:20 + json_len].decode("utf-8").rstrip(" \t\r\n\x00"))
nodes = doc.get("nodes", [])
names = {n.get("name") for n in nodes}
missing = sorted(required_nodes - names)
if missing:
    raise SystemExit("FAIL: missing nodes: " + ", ".join(missing))

by_name = {n.get("name"): (i, n) for i, n in enumerate(nodes) if n.get("name")}
ci, c = by_name["C_GROUP"]
bi, b = by_name["B_GROUP"]
ai, a = by_name["A_GROUP"]
if bi not in c.get("children", []):
    raise SystemExit("FAIL: C_GROUP does not parent B_GROUP")
if ai not in b.get("children", []):
    raise SystemExit("FAIL: B_GROUP does not parent A_GROUP")

for group_name, expected_axis in (("C_GROUP", "+Z"), ("B_GROUP", "+Y"), ("A_GROUP", "+X")):
    extras = by_name[group_name][1].get("extras", {})
    if extras.get("axis") != expected_axis:
        raise SystemExit(f"FAIL: {group_name} axis metadata wrong")

if not MANIFEST.is_file():
    raise SystemExit("FAIL: manifest missing")
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
if manifest.get("hierarchy") != ["C_GROUP", "B_GROUP", "A_GROUP"]:
    raise SystemExit("FAIL: manifest hierarchy wrong")
if manifest.get("units") != "mm":
    raise SystemExit("FAIL: manifest units wrong")

print(f"AIG_V9_LOCAL_GLB_PASS nodes={len(nodes)} bytes={len(raw)}")

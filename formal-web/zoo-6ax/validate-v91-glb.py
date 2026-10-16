#!/usr/bin/env python3
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GLB = ROOT / "local-glb" / "aig_6ax_machine_v9.glb"
MANIFEST = ROOT / "local-glb" / "aig_6ax_machine_v9.manifest.json"

raw = GLB.read_bytes()
magic, version, total_len = struct.unpack_from("<4sII", raw, 0)
if magic != b"glTF" or version != 2 or total_len != len(raw):
    raise SystemExit("FAIL: invalid GLB header")
json_len, json_type = struct.unpack_from("<II", raw, 12)
if json_type != 0x4E4F534A:
    raise SystemExit("FAIL: missing JSON chunk")
doc = json.loads(raw[20:20 + json_len].decode("utf-8").rstrip(" \t\r\n\x00"))
nodes = doc.get("nodes", [])
by_name = {n.get("name"): n for n in nodes if n.get("name")}

required = {
    "C_GROUP", "B_GROUP", "A_GROUP",
    "A_DRIVE_COVER_LEFT", "A_DRIVE_COVER_RIGHT", "A_BEARING_CAP_LEFT", "A_BEARING_CAP_RIGHT",
    "B_DRIVE_COVER_FRONT", "B_DRIVE_COVER_REAR", "B_BEARING_CAP_FRONT", "B_BEARING_CAP_REAR",
}
for side in ("L", "R"):
    required.update({f"A_BOLT_{side}_{i:02d}" for i in range(8)})
for side in ("F", "R"):
    required.update({f"B_BOLT_{side}_{i:02d}" for i in range(6)})
missing = sorted(required - set(by_name))
if missing:
    raise SystemExit("FAIL: missing V9.1 detail nodes: " + ", ".join(missing))

def od(name):
    return float(by_name[name]["scale"][0])

if not (od("A_DRIVE_COVER_LEFT") > od("A_SUPPORT_LEFT") > od("A_BEARING_LEFT") > od("A_SHAFT_LEFT")):
    raise SystemExit("FAIL: A hierarchy must be drive cover > support > bearing > shaft")
if not (od("B_DRIVE_COVER_FRONT") > od("B_SUPPORT_FRONT") > od("B_BEARING_FRONT") > od("B_JOURNAL_FRONT")):
    raise SystemExit("FAIL: B hierarchy must be drive cover > support > bearing > shaft")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
if manifest.get("authority") != "Visual V9.1":
    raise SystemExit("FAIL: authority is not Visual V9.1")
if manifest.get("mechanicalHierarchyMM", {}).get("A", {}).get("supportOD") != 300:
    raise SystemExit("FAIL: A supportOD contract missing")
if manifest.get("mechanicalHierarchyMM", {}).get("B", {}).get("supportOD") != 270:
    raise SystemExit("FAIL: B supportOD contract missing")
if len(nodes) < 85:
    raise SystemExit(f"FAIL: V9.1 detail node count too small: {len(nodes)}")

extras = doc.get("asset", {}).get("extras", {})
if extras.get("visualAuthority") != "Visual V9.1":
    raise SystemExit("FAIL: GLB visualAuthority metadata missing")
if extras.get("mechanicalRule") != "support_housing > bearing > shaft":
    raise SystemExit("FAIL: GLB mechanical rule missing")

print(f"AIG_V91_LOCAL_GLB_PASS nodes={len(nodes)} bytes={len(raw)}")

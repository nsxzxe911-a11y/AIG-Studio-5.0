#!/usr/bin/env python3
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GLB = ROOT / "local-glb" / "aig_6ax_machine_v9.glb"
MANIFEST = ROOT / "local-glb" / "aig_6ax_machine_v9.manifest.json"


def fail(msg):
    raise SystemExit("FAIL: " + msg)


def read_doc():
    raw = GLB.read_bytes()
    magic, version, total = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or total != len(raw):
        fail("invalid GLB header")
    json_len, json_type = struct.unpack_from("<II", raw, 12)
    if json_type != 0x4E4F534A:
        fail("missing JSON chunk")
    return json.loads(raw[20:20 + json_len].decode("utf-8").rstrip(" \t\r\n\x00"))


def close3(actual, expected, eps=1e-6):
    return len(actual) == 3 and all(abs(float(a)-float(b)) <= eps for a,b in zip(actual, expected))


doc = read_doc()
nodes = {n.get("name"): n for n in doc.get("nodes", []) if n.get("name")}
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

if manifest.get("authority") != "Visual V9.2":
    fail(f"authority is {manifest.get('authority')!r}, expected Visual V9.2")

hier = manifest.get("mechanicalHierarchyMM", {})
a = hier.get("A", {})
b = hier.get("B", {})
expected_a = {"driveCoverOD": 268, "supportOD": 236, "bearingOD": 170, "shaftOD": 48}
expected_b = {"driveCoverOD": 302, "supportOD": 270, "bearingOD": 190, "shaftOD": 68}
if a != expected_a:
    fail(f"A hierarchy {a} != {expected_a}")
if b != expected_b:
    fail(f"B lower hierarchy changed: {b} != {expected_b}")
if not (a["driveCoverOD"] > a["supportOD"] > a["bearingOD"] > a["shaftOD"]):
    fail("A hierarchy is not cover > support > bearing > shaft")
if not (a["supportOD"] < b["supportOD"] and a["shaftOD"] < b["shaftOD"]):
    fail("upper A assembly is not visibly lighter than lower B assembly")

expected_nodes = {
    "A_SUPPORT_LEFT": ([-280,0,55], [236,236,102]),
    "A_SUPPORT_RIGHT": ([280,0,55], [236,236,102]),
    "A_BEARING_LEFT": ([-280,0,55], [170,170,108]),
    "A_BEARING_RIGHT": ([280,0,55], [170,170,108]),
    "A_SHAFT_LEFT": ([-280,0,0], [48,48,128]),
    "A_SHAFT_RIGHT": ([280,0,0], [48,48,128]),
    "A_DRIVE_COVER_LEFT": ([-326,0,55], [268,268,30]),
    "A_DRIVE_COVER_RIGHT": ([326,0,55], [268,268,30]),
    "A_BEARING_CAP_LEFT": ([-312,0,55], [188,188,28]),
    "A_BEARING_CAP_RIGHT": ([312,0,55], [188,188,28]),
    "A_BODY": (None, [72,72,310]),
    "CHUCK": (None, [160,160,154]),
    "WORKPIECE_HUB": (None, [112,112,122]),
    "WORKPIECE": (None, [138,138,118]),
}
for name,(translation, scale) in expected_nodes.items():
    n = nodes.get(name)
    if not n:
        fail(f"missing {name}")
    if translation is not None and not close3(n.get("translation", []), translation):
        fail(f"{name} translation {n.get('translation')} != {translation}")
    if not close3(n.get("scale", []), scale):
        fail(f"{name} scale {n.get('scale')} != {scale}")

# User explicitly requested: lower half stays as V9.1.
lower_exact = {
    "B_CRADLE": ([0,0,-60], [690,260,48]),
    "B_CRADLE_LEFT_ARM": ([-315,0,74], [78,260,290]),
    "B_CRADLE_RIGHT_ARM": ([315,0,74], [78,260,290]),
    "B_CRADLE_LEFT_FOOT": ([-315,0,-67], [145,280,82]),
    "B_CRADLE_RIGHT_FOOT": ([315,0,-67], [145,280,82]),
    "B_SUPPORT_FRONT": ([0,-178,140], [270,270,82]),
    "B_SUPPORT_REAR": ([0,178,140], [270,270,82]),
    "B_BEARING_FRONT": ([0,-178,140], [190,190,88]),
    "B_BEARING_REAR": ([0,178,140], [190,190,88]),
    "B_JOURNAL_FRONT": ([0,-178,0], [68,68,108]),
    "B_JOURNAL_REAR": ([0,178,0], [68,68,108]),
}
for name,(translation, scale) in lower_exact.items():
    n = nodes.get(name)
    if not n:
        fail(f"missing lower node {name}")
    if not close3(n.get("translation", []), translation) or not close3(n.get("scale", []), scale):
        fail(f"lower assembly changed at {name}")

if manifest.get("designIntent") != "upper_light_lower_heavy_bottom_unchanged":
    fail("designIntent missing")

print("AIG_V92_TOP_LIGHT_LOWER_HEAVY_PASS")

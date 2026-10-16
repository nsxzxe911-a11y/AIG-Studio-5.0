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

if manifest.get("authority") != "Visual V9.3":
    fail(f"authority is {manifest.get('authority')!r}, expected Visual V9.3")

expected = {
    "A_SUPPORT_LEFT": ([-220,0,55], [236,236,86]),
    "A_SUPPORT_RIGHT": ([220,0,55], [236,236,86]),
    "A_BEARING_LEFT": ([-220,0,55], [170,170,92]),
    "A_BEARING_RIGHT": ([220,0,55], [170,170,92]),
    "A_SHAFT_LEFT": ([-220,0,0], [48,48,100]),
    "A_SHAFT_RIGHT": ([220,0,0], [48,48,100]),
    "A_DRIVE_COVER_LEFT": ([-255,0,55], [268,268,24]),
    "A_DRIVE_COVER_RIGHT": ([255,0,55], [268,268,24]),
    "A_BEARING_CAP_LEFT": ([-245,0,55], [188,188,24]),
    "A_BEARING_CAP_RIGHT": ([245,0,55], [188,188,24]),
}
for name,(translation, scale) in expected.items():
    n = nodes.get(name)
    if not n:
        fail(f"missing {name}")
    if not close3(n.get("translation", []), translation):
        fail(f"{name} translation {n.get('translation')} != {translation}")
    if not close3(n.get("scale", []), scale):
        fail(f"{name} scale {n.get('scale')} != {scale}")

checks = [
    ("A_SUPPORT_LEFT", 220, 86), ("A_SUPPORT_RIGHT", 220, 86),
    ("A_BEARING_LEFT", 220, 92), ("A_BEARING_RIGHT", 220, 92),
    ("A_SHAFT_LEFT", 220, 100), ("A_SHAFT_RIGHT", 220, 100),
    ("A_DRIVE_COVER_LEFT", 255, 24), ("A_DRIVE_COVER_RIGHT", 255, 24),
    ("A_BEARING_CAP_LEFT", 245, 24), ("A_BEARING_CAP_RIGHT", 245, 24),
]
for name, center, axial in checks:
    envelope = center + axial/2
    if envelope > 290:
        fail(f"{name} axial envelope {envelope} exceeds 290 mm")

centers = manifest.get("aAxisCentersMM", {})
expected_centers = {
    "support":220,"bearing":220,"shaft":220,"driveCover":255,
    "bearingCap":245,"boltRing":270,"maxAxialEnvelope":290,
}
if centers != expected_centers:
    fail(f"A-axis center contract {centers} != {expected_centers}")

lower_exact = {
    "B_CRADLE": ([0,0,-60], [690,260,48]),
    "B_CRADLE_LEFT_ARM": ([-315,0,74], [78,260,290]),
    "B_CRADLE_RIGHT_ARM": ([315,0,74], [78,260,290]),
    "B_CRADLE_LEFT_FOOT": ([-315,0,-67], [145,280,82]),
    "B_CRADLE_RIGHT_FOOT": ([315,0,-67], [145,280,82]),
}
for name,(translation, scale) in lower_exact.items():
    n=nodes.get(name)
    if not n or not close3(n.get("translation",[]),translation) or not close3(n.get("scale",[]),scale):
        fail(f"lower assembly changed at {name}")

if manifest.get("designIntent") != "a_axis_span_reduced_shell_clearance_lower_unchanged":
    fail("V9.3 designIntent missing")

print("AIG_V93_A_SPAN_CLEARANCE_PASS")

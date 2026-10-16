#!/usr/bin/env python3
"""Upgrade deterministic Visual V9 GLB to the V9.1 professional machine proportion pass.

This is a visual/runtime asset pass, not manufacturing-certified geometry.
It keeps the C -> B -> A hierarchy and only changes visible machine proportions,
adds stepped bearing housings and fastener rings, and preserves the original BIN.
"""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GLB = ROOT / "local-glb" / "aig_6ax_machine_v9.glb"
MANIFEST = ROOT / "local-glb" / "aig_6ax_machine_v9.manifest.json"


def pad4(data: bytes, fill: bytes = b"\x00") -> bytes:
    return data + fill * ((4 - len(data) % 4) % 4)


def parse_glb(raw: bytes):
    magic, version, total = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or total != len(raw):
        raise SystemExit("FAIL: invalid V9 GLB header")
    json_len, json_type = struct.unpack_from("<II", raw, 12)
    if json_type != 0x4E4F534A:
        raise SystemExit("FAIL: missing JSON chunk")
    json_start = 20
    json_end = json_start + json_len
    doc = json.loads(raw[json_start:json_end].decode("utf-8").rstrip(" \t\r\n\x00"))
    bin_len, bin_type = struct.unpack_from("<II", raw, json_end)
    if bin_type != 0x004E4942:
        raise SystemExit("FAIL: missing BIN chunk")
    bin_data = raw[json_end + 8:json_end + 8 + bin_len]
    return doc, bin_data


def build_glb(doc, bin_data: bytes) -> bytes:
    json_bytes = pad4(json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode("utf-8"), b" ")
    bin_bytes = pad4(bin_data, b"\x00")
    total = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
    return (
        struct.pack("<4sII", b"glTF", 2, total)
        + struct.pack("<II", len(json_bytes), 0x4E4F534A)
        + json_bytes
        + struct.pack("<II", len(bin_bytes), 0x004E4942)
        + bin_bytes
    )


raw = GLB.read_bytes()
doc, bin_data = parse_glb(raw)
nodes = doc["nodes"]
by_name = {n.get("name"): (i, n) for i, n in enumerate(nodes) if n.get("name")}


def node(name: str):
    if name not in by_name:
        raise SystemExit(f"FAIL: missing node {name}")
    return by_name[name][1]


def set_scale(name, xyz):
    node(name)["scale"] = list(xyz)


def set_translation(name, xyz):
    node(name)["translation"] = list(xyz)


def clone_node(source_name, name, translation, scale, parent_name):
    source = node(source_name)
    clone = {
        "name": name,
        "mesh": source["mesh"],
        "translation": list(translation),
        "scale": list(scale),
        "extras": {"aigRole": "housing-detail", "units": "mm", "visualAuthority": "V9.1"},
    }
    if "rotation" in source:
        clone["rotation"] = list(source["rotation"])
    idx = len(nodes)
    nodes.append(clone)
    node(parent_name).setdefault("children", []).append(idx)
    by_name[name] = (idx, clone)
    return idx


# A-axis: housing > bearing > shaft, with a visibly stepped industrial drive package.
for name, x in (("A_SUPPORT_LEFT", -320), ("A_SUPPORT_RIGHT", 320)):
    set_translation(name, [x, 0, 55])
    set_scale(name, [300, 300, 120])
for name, x in (("A_BEARING_LEFT", -320), ("A_BEARING_RIGHT", 320)):
    set_translation(name, [x, 0, 55])
    set_scale(name, [210, 210, 132])
for name, x in (("A_SHAFT_LEFT", -320), ("A_SHAFT_RIGHT", 320)):
    set_translation(name, [x, 0, 0])
    set_scale(name, [70, 70, 150])

# Wider, lower cradle with heavier feet but a more open center machining zone.
set_translation("B_CRADLE", [0, 0, -60])
set_scale("B_CRADLE", [690, 260, 48])
for name, x in (("B_CRADLE_LEFT_ARM", -315), ("B_CRADLE_RIGHT_ARM", 315)):
    set_translation(name, [x, 0, 74])
    set_scale(name, [78, 260, 290])
for name, x in (("B_CRADLE_LEFT_FOOT", -315), ("B_CRADLE_RIGHT_FOOT", 315)):
    set_translation(name, [x, 0, -67])
    set_scale(name, [145, 280, 82])

# B-axis: same mechanical hierarchy, visibly stronger support than bearing/shaft.
for name, y in (("B_SUPPORT_FRONT", -178), ("B_SUPPORT_REAR", 178)):
    set_translation(name, [0, y, 140])
    set_scale(name, [270, 270, 82])
for name, y in (("B_BEARING_FRONT", -178), ("B_BEARING_REAR", 178)):
    set_translation(name, [0, y, 140])
    set_scale(name, [190, 190, 88])
for name, y in (("B_JOURNAL_FRONT", -178), ("B_JOURNAL_REAR", 178)):
    set_translation(name, [0, y, 0])
    set_scale(name, [68, 68, 108])

# Central A spindle/work package: larger chuck face, shorter body, compact workpiece.
set_scale("A_BODY", [86, 86, 360])
set_scale("CHUCK", [182, 182, 172])
set_scale("WORKPIECE_HUB", [126, 126, 140])
set_scale("WORKPIECE", [150, 150, 132])

# Spindle body reads as a vertical machining-center head rather than a thin tool stick.
set_scale("SPINDLE_GUARD", [174, 174, 214])
set_scale("SPINDLE_NOSE", [92, 92, 88])
set_scale("TOOL_HOLDER", [54, 54, 72])
set_scale("TOOL", [13, 13, 96])

# Stepped A drive covers / bearing caps on both outer faces.
clone_node("A_SUPPORT_LEFT", "A_DRIVE_COVER_LEFT", [-383, 0, 55], [332, 332, 38], "B_GROUP")
clone_node("A_SUPPORT_RIGHT", "A_DRIVE_COVER_RIGHT", [383, 0, 55], [332, 332, 38], "B_GROUP")
clone_node("A_BEARING_LEFT", "A_BEARING_CAP_LEFT", [-365, 0, 55], [232, 232, 36], "B_GROUP")
clone_node("A_BEARING_RIGHT", "A_BEARING_CAP_RIGHT", [365, 0, 55], [232, 232, 36], "B_GROUP")

# Stepped B drive covers on front/rear faces.
clone_node("B_SUPPORT_FRONT", "B_DRIVE_COVER_FRONT", [0, -226, 140], [302, 302, 34], "C_GROUP")
clone_node("B_SUPPORT_REAR", "B_DRIVE_COVER_REAR", [0, 226, 140], [302, 302, 34], "C_GROUP")
clone_node("B_BEARING_FRONT", "B_BEARING_CAP_FRONT", [0, -209, 140], [212, 212, 30], "C_GROUP")
clone_node("B_BEARING_REAR", "B_BEARING_CAP_REAR", [0, 209, 140], [212, 212, 30], "C_GROUP")

# A-axis bolt rings: eight fasteners per side around the support face.
for side, x in (("L", -404), ("R", 404)):
    for i in range(8):
        a = 2 * math.pi * i / 8
        y = 126 * math.cos(a)
        z = 55 + 126 * math.sin(a)
        clone_node("A_SHAFT_LEFT", f"A_BOLT_{side}_{i:02d}", [x, y, z], [14, 14, 18], "B_GROUP")

# B-axis bolt rings: six fasteners per face around the B housing.
for side, y in (("F", -244), ("R", 244)):
    for i in range(6):
        a = 2 * math.pi * i / 6
        x = 112 * math.cos(a)
        z = 140 + 112 * math.sin(a)
        clone_node("B_JOURNAL_FRONT", f"B_BOLT_{side}_{i:02d}", [x, y, z], [14, 14, 18], "C_GROUP")

asset = doc.setdefault("asset", {})
asset["generator"] = "AIG-II Visual V9.1 professional proportion postprocessor"
asset.setdefault("extras", {})["visualAuthority"] = "Visual V9.1"
asset["extras"]["mechanicalRule"] = "support_housing > bearing > shaft"

GLB.write_bytes(build_glb(doc, bin_data))
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
manifest.update({
    "authority": "Visual V9.1",
    "source": "Visual V9 deterministic GLB + professional housing proportion pass",
    "nodeCount": len(nodes),
    "mechanicalHierarchyMM": {
        "A": {"driveCoverOD": 332, "supportOD": 300, "bearingOD": 210, "shaftOD": 70},
        "B": {"driveCoverOD": 302, "supportOD": 270, "bearingOD": 190, "shaftOD": 68},
    },
    "detail": {"A_bolts": 16, "B_bolts": 12, "steppedHousing": True},
    "status": "VISUAL_RUNTIME_ASSET_NOT_MANUFACTURING_CERTIFIED",
})
MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"AIG_V91_PROPORTION_PASS nodes={len(nodes)} bytes={GLB.stat().st_size}")

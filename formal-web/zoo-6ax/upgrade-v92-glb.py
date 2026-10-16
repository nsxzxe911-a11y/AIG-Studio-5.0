#!/usr/bin/env python3
"""Visual V9.2: make the upper A-axis package lighter while preserving the V9.1 lower B/C structure."""
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
        raise SystemExit("FAIL: invalid V9.1 GLB header")
    json_len, json_type = struct.unpack_from("<II", raw, 12)
    if json_type != 0x4E4F534A:
        raise SystemExit("FAIL: missing JSON chunk")
    json_start = 20
    json_end = json_start + json_len
    doc = json.loads(raw[json_start:json_end].decode("utf-8").rstrip(" \t\r\n\x00"))
    bin_len, bin_type = struct.unpack_from("<II", raw, json_end)
    if bin_type != 0x004E4942:
        raise SystemExit("FAIL: missing BIN chunk")
    return doc, raw[json_end + 8:json_end + 8 + bin_len]


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
by_name = {n.get("name"): n for n in nodes if n.get("name")}


def node(name: str):
    try:
        return by_name[name]
    except KeyError:
        raise SystemExit(f"FAIL: missing V9.1 node {name}")


def set_node(name, translation=None, scale=None):
    n = node(name)
    if translation is not None:
        n["translation"] = list(translation)
    if scale is not None:
        n["scale"] = list(scale)
    n.setdefault("extras", {})["visualAuthority"] = "V9.2"


# Upper A package only: narrower centers and smaller diameters.
for name, x in (("A_SUPPORT_LEFT", -280), ("A_SUPPORT_RIGHT", 280)):
    set_node(name, [x, 0, 55], [236, 236, 102])
for name, x in (("A_BEARING_LEFT", -280), ("A_BEARING_RIGHT", 280)):
    set_node(name, [x, 0, 55], [170, 170, 108])
for name, x in (("A_SHAFT_LEFT", -280), ("A_SHAFT_RIGHT", 280)):
    set_node(name, [x, 0, 0], [48, 48, 128])

for name, x in (("A_DRIVE_COVER_LEFT", -326), ("A_DRIVE_COVER_RIGHT", 326)):
    set_node(name, [x, 0, 55], [268, 268, 30])
for name, x in (("A_BEARING_CAP_LEFT", -312), ("A_BEARING_CAP_RIGHT", 312)):
    set_node(name, [x, 0, 55], [188, 188, 28])

# Compact the rotating A work package so the top reads light while the lower cradle remains heavy.
set_node("A_BODY", scale=[72, 72, 310])
set_node("CHUCK", scale=[160, 160, 154])
set_node("WORKPIECE_HUB", scale=[112, 112, 122])
set_node("WORKPIECE", scale=[138, 138, 118])

# Pull the A fastener rings in with the smaller housings.
for side, x in (("L", -346), ("R", 346)):
    for i in range(8):
        a = 2 * math.pi * i / 8
        y = 98 * math.cos(a)
        z = 55 + 98 * math.sin(a)
        set_node(f"A_BOLT_{side}_{i:02d}", [x, y, z], [11, 11, 14])

asset = doc.setdefault("asset", {})
asset["generator"] = "AIG-II Visual V9.2 upper-light lower-heavy postprocessor"
asset.setdefault("extras", {})["visualAuthority"] = "Visual V9.2"
asset["extras"]["mechanicalRule"] = "upper_A_light; lower_BC_unchanged"

GLB.write_bytes(build_glb(doc, bin_data))
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
manifest.update({
    "authority": "Visual V9.2",
    "source": "Visual V9.1 deterministic GLB + upper-light A-axis proportion pass",
    "nodeCount": len(nodes),
    "mechanicalHierarchyMM": {
        "A": {"driveCoverOD": 268, "supportOD": 236, "bearingOD": 170, "shaftOD": 48},
        "B": {"driveCoverOD": 302, "supportOD": 270, "bearingOD": 190, "shaftOD": 68},
    },
    "designIntent": "upper_light_lower_heavy_bottom_unchanged",
    "status": "VISUAL_RUNTIME_ASSET_NOT_MANUFACTURING_CERTIFIED",
})
MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"AIG_V92_TOP_LIGHT_PASS nodes={len(nodes)} bytes={GLB.stat().st_size}")

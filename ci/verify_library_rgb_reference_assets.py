#!/usr/bin/env python3
import argparse
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "design" / "theme" / "library_rgb_reference_v1"
MANIFEST = THEME / "theme-manifest.json"
RAW = THEME / "raw"

def png_size(path: Path):
    with path.open("rb") as f:
        sig = f.read(24)
    if len(sig) < 24 or sig[:8] != b"\x89PNG\r\n\x1a\n" or sig[12:16] != b"IHDR":
        raise SystemExit(f"NOT_PNG:{path}")
    return struct.unpack(">II", sig[16:24])

def sha256(path: Path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--require-binaries", action="store_true")
    args = ap.parse_args()

    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert data["theme_id"] == "library-rgb-reference-v1"
    assert data["runtime_activation"] is False
    assert data["derivative_policy"]["static_image_is_not_function"] is True
    assert data["derivative_policy"]["runtime_state_drives_xyzab_tool_material_removal"] is True
    assert data["derivative_policy"]["geometry_truth_must_not_change"] is True
    assert data["derivative_policy"]["cam_sim_nc_truth_must_not_change"] is True
    assert data["derivative_policy"]["master_origin_preserved"] is True
    assert data["derivative_policy"]["display_precision_mm"] == 0.001
    assert data["derivative_policy"]["machine_space_order"] == "A_THEN_B"

    assets = data["assets"]
    assert len(assets) == 7
    assert len({a["id"] for a in assets}) == len(assets)
    assert len({a["sha256"] for a in assets}) == len(assets)
    assert all(len(a["sha256"]) == 64 for a in assets)
    assert all(a["width"] > 0 and a["height"] > 0 and a["size_bytes"] > 0 for a in assets)
    print("LIBRARY_RGB_REFERENCE_CATALOG_GATE_PASS|7_ASSETS|PROVENANCE_LOCKED|RUNTIME_INACTIVE")

    missing = []
    for asset in assets:
        path = RAW / asset["target_file"]
        if not path.exists():
            missing.append(asset["target_file"])
            continue
        if path.stat().st_size != asset["size_bytes"]:
            raise SystemExit(f"SIZE_MISMATCH:{asset['id']}")
        if sha256(path) != asset["sha256"]:
            raise SystemExit(f"SHA256_MISMATCH:{asset['id']}")
        w, h = png_size(path)
        if (w, h) != (asset["width"], asset["height"]):
            raise SystemExit(f"DIMENSION_MISMATCH:{asset['id']}:{w}x{h}")

    if missing:
        print(f"LIBRARY_RGB_REFERENCE_BINARY_IMPORT_PENDING|{len(missing)}|RUNTIME_NOT_ACTIVATED")
        if args.require_binaries:
            raise SystemExit("BINARY_IMPORT_REQUIRED:" + ",".join(missing))
    else:
        print("LIBRARY_RGB_REFERENCE_BINARY_GATE_PASS|7_ASSETS|SHA256|PNG_DIMENSIONS|SOURCE_EXACT")

if __name__ == "__main__":
    main()

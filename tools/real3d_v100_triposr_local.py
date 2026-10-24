#!/usr/bin/env python3
"""AIG Real3D V100: real OFFLINE pretrained TripoSR inference -> glTF GLB.

This is NOT a simulated AI model and never fabricates a GLB on failure.
Requires the actual locally-installed TripoSR upstream run.py and verified
trained weights at model-dir/{config.yaml,model.ckpt}. No auto-download,
no remote service, no prompt-to-3D substitute.

Upstream: https://github.com/VAST-AI-Research/TripoSR (MIT).
Its default mesh algorithm may reconstruct missing surface: mark inferred,
not scanned. A single image does not establish hidden surfaces or identity.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import time

SCHEMA = "AIG_REAL3D_V100_ACTUAL_OFFLINE_TRIPOSR_INFERENCE_V1"
HEX = set("0123456789abcdef")
VALID_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


class InferenceBlocked(RuntimeError):
    pass


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def checked_file(path: Path, min_bytes: int, max_bytes: int, tag: str) -> Path:
    if not path.is_file() or path.is_symlink():
        raise InferenceBlocked(f"{tag}_FILE_MISSING_OR_SYMLINK_BLOCK")
    size = path.stat().st_size
    if size < min_bytes or size > max_bytes:
        raise InferenceBlocked(f"{tag}_FILE_BYTE_BUDGET_BLOCK")
    return path.resolve(strict=True)


def sha_literal(s: str) -> str:
    s = s.lower()
    if len(s) != 64 or set(s) - HEX:
        raise InferenceBlocked("EXPECTED_SHA256_FORMAT_BLOCK")
    return s


def parse_glb_mesh(path: Path) -> dict:
    """Metadata-only parser: output MUST be real GLB2 indexed 3D triangles."""
    raw = path.read_bytes()
    if not 128 <= len(raw) <= 500_000_000:
        raise InferenceBlocked("GENERATED_GLB_SIZE_BLOCK")
    if struct.unpack_from("<III", raw, 0) != (0x46546C67, 2, len(raw)):
        raise InferenceBlocked("OUTPUT_NOT_GENUINE_GLB2")
    offset = 12
    meta = None
    bin_len = 0
    while offset + 8 <= len(raw):
        length, kind = struct.unpack_from("<II", raw, offset)
        offset += 8
        if length % 4 or offset + length > len(raw):
            raise InferenceBlocked("GENERATED_GLB_CHUNK_INVALID")
        if kind == 0x4E4F534A:
            if meta is not None:
                raise InferenceBlocked("DUPLICATE_GLB_JSON")
            meta = json.loads(raw[offset:offset + length].decode("utf-8"))
        elif kind == 0x004E4942:
            bin_len = length
        else:
            raise InferenceBlocked("UNSUPPORTED_GLB_CHUNK")
        offset += length
    if offset != len(raw) or not meta or not bin_len:
        raise InferenceBlocked("INVALID_REAL_GLB_CONTENT")
    if meta.get("asset", {}).get("version") != "2.0":
        raise InferenceBlocked("INVALID_GLTF_VERSION")
    accessors = meta.get("accessors", [])
    faces = vertices = 0
    for mesh in meta.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            if primitive.get("mode", 4) != 4:
                raise InferenceBlocked("NATIVE_TRIANGLES_REQUIRED")
            pos_id = primitive.get("attributes", {}).get("POSITION")
            idx_id = primitive.get("indices")
            if pos_id is None or idx_id is None:
                raise InferenceBlocked("REAL_INDEXED_XYZ_REQUIRED")
            try:
                pos, idx = accessors[pos_id], accessors[idx_id]
                if pos["type"] != "VEC3" or idx["type"] != "SCALAR":
                    raise InferenceBlocked("REAL_GLB_POSITION_OR_FACE_INVALID")
                if pos["componentType"] != 5126 or idx["componentType"] not in (5123, 5125):
                    raise InferenceBlocked("UNSUPPORTED_INDEXED_GEOMETRY_TYPE")
                vertex_count, index_count = int(pos["count"]), int(idx["count"])
            except (IndexError, KeyError, TypeError, ValueError) as exc:
                raise InferenceBlocked("UNREADABLE_NATIVE_GLTF_ACCESSORS") from exc
            if vertex_count < 3 or index_count < 3 or index_count % 3:
                raise InferenceBlocked("NO_VALID_TRIANGLES")
            faces += index_count // 3
            vertices += vertex_count
    if faces < 12 or vertices < 4:
        raise InferenceBlocked("GENERATED_MODEL_GEOMETRY_EMPTY")
    return {"nativeGLBVertices": vertices, "nativeGLBTriangles": faces,
            "originalTriangleTopologyPresent": True,
            "V99WebGLLimitCurrentlyAllowsImport": faces <= 200000,
            "V99MeshPerPrimitiveVertexLimitMayBlock": vertices > 120000}


def preflight(args: argparse.Namespace) -> dict:
    image = checked_file(args.image, 32, 12_000_000, "IMAGE")
    if image.suffix.lower() not in VALID_EXTS:
        raise InferenceBlocked("PHOTO_EXTENSION_BLOCK")
    model_dir = args.model_dir.resolve(strict=False)
    if not model_dir.is_dir() or model_dir.is_symlink():
        raise InferenceBlocked("LOCAL_TRAINED_MODEL_DIRECTORY_MISSING")
    weights = checked_file(model_dir / "model.ckpt", 1_000_000, 10_000_000_000, "TRAINED_WEIGHTS")
    config = checked_file(model_dir / "config.yaml", 100, 1_000_000, "MODEL_CONFIG")
    upstream = checked_file(args.upstream_dir / "run.py", 1000, 150_000, "UPSTREAM_REAL_INFERENCE")
    input_hash = sha256(image)
    model_hash = sha256(weights)
    config_hash = sha256(config)
    source_hash = sha256(upstream)
    if input_hash != sha_literal(args.image_sha):
        raise InferenceBlocked("ORIGINAL_IMAGE_SHA_MISMATCH")
    if model_hash != sha_literal(args.weights_sha):
        raise InferenceBlocked("TRAINED_WEIGHT_FILE_SHA_MISMATCH")
    if source_hash != sha_literal(args.run_py_sha):
        raise InferenceBlocked("UPSTREAM_RUNNER_CODE_SHA_MISMATCH")
    if args.device not in {"cpu", "cuda:0"} or not 64 <= args.mc_resolution <= 512:
        raise InferenceBlocked("GPU_DEVICE_OR_MODEL_RESOLUTION_INVALID")
    return {
        "schema": SCHEMA, "originalImageSHA256": input_hash,
        "actualTrainedWeightsSHA256": model_hash,
        "modelConfigSHA256": config_hash,
        "upstreamRunnerSHA256": source_hash,
        "upstreamRunnerSourcePresent": True,
        "trainedWeightFormatAndArchitectureVerified": False,
        "modelFileBytesActuallyVerified": True,
        "upstreamModelSource": "VAST-AI-Research/TripoSR (MIT, user-installed local)",
        "inferenceActuallyExecuted": False,
        "neuralInferenceResultsVerified": False,
        "actualTrainedWeightsLearningQualityAudited": False,
        "sourcePhotoFaceIdentityCertified": False,
        "inferredBackFromSinglePhotoNotObserved": True,
        "originalReferencePersonAuthorityOverwritten": False,
        "releasePASS": False
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument("--image-sha", required=True)
    parser.add_argument("--model-dir", required=True, type=Path)
    parser.add_argument("--weights-sha", required=True)
    parser.add_argument("--upstream-dir", required=True, type=Path)
    parser.add_argument("--run-py-sha", required=True)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--device", choices=("cuda:0", "cpu"), default="cuda:0")
    parser.add_argument("--mc-resolution", type=int, default=256)
    parser.add_argument("--timeout-sec", type=int, default=1500)
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--no-remove-bg", action="store_true")
    args = parser.parse_args()
    try:
        report = preflight(args)
        if args.probe:
            print(json.dumps({**report, "status": "SOURCE_MODEL_PRESENT_BUT_NO_INFERENCE"}, indent=2))
            return 0
        if not 30 <= args.timeout_sec <= 3600:
            raise InferenceBlocked("MODEL_RUNTIME_TIMEOUT_BUDGET")
        if args.output_dir.exists() and any(args.output_dir.iterdir()):
            raise InferenceBlocked("OUTPUT_DIRECTORY_MUST_BE_EMPTY_TO_PREVENT_STALE_GLB")
        args.output_dir.mkdir(parents=True, exist_ok=True)
        start = time.monotonic()
        env = os.environ.copy()
        env.update({"HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1",
                    "HF_DATASETS_OFFLINE": "1", "PIP_NO_INDEX": "1",
                    "AIG_REAL3D_SOURCE_SHA256": report["originalImageSHA256"]})
        # This actually runs the official pretrained PyTorch LRM,
        # never a fabricated callback. Requires user-supplied verified weights.
        command = [sys.executable, str(args.upstream_dir.resolve() / "run.py"),
                   str(args.image.resolve()), "--device", args.device,
                   "--pretrained-model-name-or-path", str(args.model_dir.resolve()),
                   "--mc-resolution", str(args.mc_resolution),
                   "--model-save-format", "glb",
                   "--output-dir", str(args.output_dir.resolve())]
        if args.no_remove_bg:
            command.append("--no-remove-bg")
        result = subprocess.run(
            command, cwd=args.upstream_dir.resolve(), env=env,
            text=True, capture_output=True, timeout=args.timeout_sec,
            check=False)
        if result.returncode != 0:
            raise InferenceBlocked("REAL_TRIPOSR_INFERENCE_EXIT_NONZERO_" +
                                   str(result.returncode) + " " + result.stderr[-600:])
        glb_path = args.output_dir / "0" / "mesh.glb"
        if not glb_path.is_file():
            raise InferenceBlocked("OFFICIAL_MODEL_DID_NOT_PRODUCE_ACTUAL_GLB")
        mesh = parse_glb_mesh(glb_path)
        # A source GLB is only useful to AIG if the REAL V99 binary importer
        # accepts its exact original triangles and V98 SHA contract.
        node = shutil.which("node")
        handoff_js = Path(__file__).resolve().with_name(
            "real3d_v100_native_handoff.mjs")
        if not node or not handoff_js.is_file():
            raise InferenceBlocked("V99_ACTUAL_HANDOFF_NODE_RUNTIME_MISSING")
        handoff = subprocess.run(
            [node, str(handoff_js), "--image", str(args.image.resolve()),
             "--glb", str(glb_path.resolve())],
            text=True, capture_output=True, timeout=120, check=False)
        if handoff.returncode != 0:
            raise InferenceBlocked("REAL_GLTF_FAILED_ACTUAL_AIG_V99_IMPORT: " +
                                   handoff.stderr[-500:])
        try:
            handoff_info = json.loads(handoff.stdout)
        except json.JSONDecodeError as exc:
            raise InferenceBlocked("V99_3D_GEOMETRY_RECEIPT_INVALID") from exc
        if handoff_info.get("status") != (
            "V99_NATIVE_INDEXED_GEOMETRY_AND_V98_SHARED_SOURCE_PASS"):
            raise InferenceBlocked("V99_NATIVE_GEOMETRY_HANDOFF_NOT_VERIFIED")
        proof = {
            **report, "status": "REAL_LOCAL_MODEL_EXECUTED_AND_V99_IMPORTED",
            "inferenceActuallyExecuted": True,
            "neuralInferenceResultsVerified": True,
            "durationWallSeconds": round(time.monotonic() - start, 3),
            "modelInferenceDeviceRequested": args.device,
            "sourceModelGLBSHA256": sha256(glb_path),
            "outputGLB": str(glb_path),
            "actualNativeV99GLBImportPASS": True,
            "originalV99IndexedTriangles": handoff_info["originalIndexedTriangles"],
            "V98SharedSourceSHAProven": handoff_info["sourceAssetSharedWithV98"],
            **mesh,
            "movieReady": False, "releasePASS": False
        }
        (args.output_dir / "v100-inference-evidence.json").write_text(
            json.dumps(proof, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(proof, ensure_ascii=False, indent=2))
        return 0
    except (InferenceBlocked, FileNotFoundError, PermissionError,
            subprocess.TimeoutExpired) as exc:
        print(json.dumps({
            "schema": SCHEMA, "status": "BLOCK",
            "reason": str(exc), "inferenceActuallyExecuted": False,
            "realModelOutputReleasePASS": False, "releasePASS": False
        }, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

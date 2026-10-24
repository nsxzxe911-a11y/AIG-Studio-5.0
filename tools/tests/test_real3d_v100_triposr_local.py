"""V100 offline source contract checks; these tests NEVER claim ML PASS.

The positive test is a SOURCE-PROBE of fake weight bytes only (not inference).
Actual real pretrained model inference has a different, non-mocked GPU Gate.
"""
from __future__ import annotations

import importlib.util
import json
import pathlib
import struct
import subprocess
import sys
import tempfile
import unittest

RUNNER = pathlib.Path(__file__).resolve().parents[1] / "real3d_v100_triposr_local.py"
spec = importlib.util.spec_from_file_location("aig_v100", RUNNER)
v100 = importlib.util.module_from_spec(spec)
sys.modules["aig_v100"] = v100
spec.loader.exec_module(v100)


def small_indexed_glb():
    # This deliberately simple 12-triangle cube tests HEADER/INDEX handling.
    vertices = [
        [-.5, -.5, -.5], [.5, -.5, -.5], [.5, .5, -.5], [-.5, .5, -.5],
        [-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]
    ]
    faces = [(0, 2, 1), (0, 3, 2), (4, 5, 6), (4, 6, 7),
             (0, 1, 5), (0, 5, 4), (2, 3, 7), (2, 7, 6),
             (1, 2, 6), (1, 6, 5), (0, 4, 7), (0, 7, 3)]
    binary = b"".join(struct.pack("<fff", *v) for v in vertices)
    binary += b"".join(struct.pack("<H", n) for face in faces for n in face)
    meta = {
        "asset": {"version": "2.0"},
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(vertices) * 12},
            {"buffer": 0, "byteOffset": len(vertices)*12,
             "byteLength": len(faces)*3*2}
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "type": "VEC3",
             "count": len(vertices)},
            {"bufferView": 1, "componentType": 5123, "type": "SCALAR",
             "count": len(faces)*3}
        ],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0},
                                     "indices": 1}]}]
    }
    j = json.dumps(meta).encode("utf-8")
    j += b" " * ((-len(j)) % 4)
    binary += b"\x00" * ((-len(binary)) % 4)
    length = 12 + 8 + len(j) + 8 + len(binary)
    return (
        struct.pack("<III", 0x46546c67, 2, length) +
        struct.pack("<II", len(j), 0x4E4F534A) + j +
        struct.pack("<II", len(binary), 0x004E4942) + binary
    )


class V100NativeModelContract(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.upstream = self.root / "upstream"
        self.model = self.root / "weights"
        self.upstream.mkdir()
        self.model.mkdir()
        self.image = self.root / "input.png"
        # Dummy pixels / dummy weights intentionally cannot count as trained inference.
        self.image.write_bytes(b"\x89PNG\r\n\x1a\n" + bytes(range(128)))
        (self.upstream / "run.py").write_text(
            "# source contract probe placeholder; NOT real TripoSR run.py\n"
            + ("# source test only\n" * 50), encoding="utf8")
        (self.model / "model.ckpt").write_bytes(b"x" * 1_000_128)
        (self.model / "config.yaml").write_bytes(b"# test model config, not trained\n" * 10)

    def args(self, *extra):
        return [sys.executable, str(RUNNER), "--image", str(self.image),
                "--image-sha", v100.sha256(self.image),
                "--model-dir", str(self.model),
                "--weights-sha", v100.sha256(self.model / "model.ckpt"),
                "--upstream-dir", str(self.upstream),
                "--run-py-sha", v100.sha256(self.upstream / "run.py"),
                "--output-dir", str(self.root / "result"), *extra]

    def test_cube_valid_glb_source_metadata_not_neural_inference(self):
        path = self.root / "cube.glb"
        path.write_bytes(small_indexed_glb())
        meta = v100.parse_glb_mesh(path)
        self.assertEqual(meta["nativeGLBTriangles"], 12)
        self.assertEqual(meta["nativeGLBVertices"], 8)
        self.assertTrue(meta["V99WebGLLimitCurrentlyAllowsImport"])

    def test_truncated_glb_cannot_fake_success(self):
        path = self.root / "bad.glb"
        path.write_bytes(small_indexed_glb()[:-13])
        with self.assertRaisesRegex(v100.InferenceBlocked,
                                    "OUTPUT_NOT_GENUINE_GLB2"):
            v100.parse_glb_mesh(path)

    def test_missing_weights_blocks_with_explicit_json(self):
        (self.model / "model.ckpt").unlink()
        result = subprocess.run(self.args("--probe"),
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stderr)["status"], "BLOCK")
        self.assertFalse(json.loads(result.stderr)["inferenceActuallyExecuted"])

    def test_bad_image_hash_blocks_before_model_invocation(self):
        args = self.args("--probe")
        args[args.index("--image-sha") + 1] = "0" * 64
        result = subprocess.run(args, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("ORIGINAL_IMAGE_SHA_MISMATCH", result.stderr)

    def test_preflight_does_not_claim_inference_or_quality(self):
        result = subprocess.run(self.args("--probe"),
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        proof = json.loads(result.stdout)
        self.assertEqual(proof["status"], "SOURCE_MODEL_PRESENT_BUT_NO_INFERENCE")
        self.assertFalse(proof["inferenceActuallyExecuted"])
        self.assertFalse(proof["neuralInferenceResultsVerified"])
        self.assertFalse(proof["actualTrainedWeightsLearningQualityAudited"])
        self.assertFalse(proof["sourcePhotoFaceIdentityCertified"])
        self.assertFalse(proof["releasePASS"])

    def test_no_untrained_mock_worker_can_be_reported_as_real_inference(self):
        result = subprocess.run(self.args("--timeout-sec", "35"),
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertFalse((self.root / "result" / "v100-inference-evidence.json").exists())
        self.assertIn('"status": "BLOCK"', result.stderr)


if __name__ == "__main__":
    unittest.main()

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / "app/src/main/java/com/aigstudio/app/AigStudioApplication.kt").read_text(encoding="utf-8")
feature_path = ROOT / "app/src/main/java/com/aigstudio/app/CadPrecisionAuxInstaller.kt"
version = (ROOT / "release-version.properties").read_text(encoding="utf-8")

assert feature_path.is_file(), "CAD_PRECISION_AUX_363_RED: CadPrecisionAuxInstaller.kt missing"
feature = feature_path.read_text(encoding="utf-8")

required = [
    "object CadPrecisionAuxInstaller",
    "class CadAux3DView",
    "cad.snapshot()",
    "THREE_D_360",
    "TOP",
    "FRONT",
    "RIGHT",
    "ISO",
    "FIT",
    "ScaleGestureDetector",
    "AddEntitiesCommand",
    "runGeometryCommand",
    "LINE_XY",
    "LINE_LENGTH_ANGLE",
    "RECT_XY_WH",
    "CIRCLE_R",
    "CIRCLE_D",
    "ARC_CENTER_R_ANGLES",
    "HOLE_D",
    "CNC_RESOLUTION_MM",
    "0.001",
]
for token in required:
    assert token in feature, f"CAD_PRECISION_AUX_363_RED: missing {token}"

assert "CadPrecisionAuxInstaller.install(activity)" in app, "CAD_PRECISION_AUX_363_RED: application wiring missing"
assert "versionName=363.0.0" in version, "CAD_PRECISION_AUX_363_RED: release version is not 363.0.0"

# Viewing must be read-only. Geometry mutation is limited to explicit precision-create commands.
assert "cad.snapshot()" in feature
assert "applyPortableProject(" not in feature, "3D auxiliary view must not replace project state"
assert "CamPath" not in feature and "ManualCamPoint" not in feature, "CAD auxiliary feature must not mutate CAM"

print("CAD_PRECISION_AUX_363_GATE_PASS|EXACT_INPUT|2D_3D_360|TOP_FRONT_RIGHT_ISO_FIT|UNDO_HISTORY_CALLBACK|NO_CAM_MUTATION")

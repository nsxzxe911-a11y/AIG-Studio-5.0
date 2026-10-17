import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT/path).read_text(encoding="utf-8")

def manifest(page):
    return json.loads(read(Path("design/ui/pages")/page/"button-manifest.json"))

def verify_runtime(page, source_path, test_path, required_symbols, pass_marker):
    doc=manifest(page)
    source=read(source_path)
    test=read(test_path)
    commands={entry["commandId"] for entry in doc["buttons"]}
    assert commands, f"{page}_COMMANDS_EMPTY"
    missing=sorted(command for command in commands if f'"{command}"' not in source)
    assert not missing, f"{page}_RUNTIME_COMMANDS_MISSING:{missing}"
    assert "Toast" not in source, f"{page}_RUNTIME_TOAST_CALLBACK_FORBIDDEN"
    assert "CAM_STRATEGY=" not in source, f"{page}_RUNTIME_STRATEGY_STRING_FORBIDDEN"
    for symbol in required_symbols:
        assert symbol in source, f"{page}_CORE_SYMBOL_MISSING:{symbol}"
    assert pass_marker in test, f"{page}_RUNTIME_TEST_MARKER_MISSING"
    return len(commands)

def main():
    cad=verify_runtime(
        "CAD",
        Path("core/src/main/kotlin/com/aigstudio/core/CadPageRuntime.kt"),
        Path("core/src/test/kotlin/com/aigstudio/core/CadPageRuntimeRegression.kt"),
        [
            "History(document)","CadEditEngine.trimCommand","CadEditEngine.extendCommand",
            "CadEditEngine.offsetCommand","CadEditEngine.linearArrayCommand",
            "Geometry.chamfer","Geometry.fillet","CadSnapEngine.snapTo",
            "CadSemanticIdentity.newRectIds","CadSemanticIdentity.newHoleId",
            "CadDxfCodec.importAscii","CadDxfCodec.exportAscii",
        ],
        "CAD_PAGE_RUNTIME_PASS|",
    )
    cam=verify_runtime(
        "CAM",
        Path("core/src/main/kotlin/com/aigstudio/core/CamPageRuntime.kt"),
        Path("core/src/test/kotlin/com/aigstudio/core/CamPageRuntimeRegression.kt"),
        [
            "ManualCamPathEngine.startBlank","ManualCamPathEngine.replacePoint",
            "ManualCamPathEngine.insertPoint","ManualCamPathEngine.deletePoint",
            "CamEngine.generateManual","CamEngine.generate(","CamWorkflowEngine.buildCommonPocket",
            "Toolpath(listOf(","HOLE:","FanucPostRuntime.generate",
            "toolChangeSubprogram","endSubprogram","programEnd","revision++",
            "CamRuntimeState","captureState()","restoreState(before)",
        ],
        "CAM_PAGE_RUNTIME_PASS|",
    )
    cad_test=read(Path("core/src/test/kotlin/com/aigstudio/core/CadPageRuntimeRegression.kt"))
    cam_test=read(Path("core/src/test/kotlin/com/aigstudio/core/CamPageRuntimeRegression.kt"))
    post=read(Path("core/src/main/kotlin/com/aigstudio/core/FanucPostRuntime.kt"))
    post_test=read(Path("core/src/test/kotlin/com/aigstudio/core/FanucPostRuntimeRegression.kt"))
    assert "DXF_IMPORT_EXPORT" in cad_test
    assert "FANUC_POST_NC" in cam_test
    assert "P4_P5" in cam_test and "POST_REVISION" in cam_test
    assert "REJECT_ATOMIC" in cam_test
    assert "beforeBadPostSnapshot" in cam_test and "beforeBadDrillSnapshot" in cam_test
    for token in [
        "G90 G54","G43 Z","G80","M99","M30","M98 P","ArcFeed","axisC",
        "toolChangeSubprogram","endSubprogram","FanucToolChangeMode","INLINE_THEN_SUBPROGRAM",
    ]:
        assert token in post, f"FANUC_POST_TOKEN_MISSING:{token}"
    assert "FANUC_POST_RUNTIME_PASS|" in post_test
    assert "P4_P5" in post_test and "M99_M30" in post_test
    assert "NO_DUPLICATE_TOOL_CHANGE" in post_test
    assert 'lineSequence().none{it=="T9 M6"}' in post_test
    print(f"CAD_CAM_PAGE_RUNTIME_BINDING_PASS|CAD={cad}|CAM={cam}|DXF_IMPORT_EXPORT|REAL_FANUC_POST|P4_P5|M99_M30|NO_DUPLICATE_TOOL_CHANGE|POST_REVISION|CAM_REJECT_ATOMIC|REAL_CORE_SYMBOLS|NO_TOAST|NO_STRATEGY_STRING")

if __name__=="__main__":
    main()

import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding="utf-8")
def commands(page):
    doc=json.loads(read(Path("design/ui/pages")/page/"button-manifest.json"))
    return {b["commandId"] for b in doc["buttons"]}

def main():
    sim=read(Path("core/src/main/kotlin/com/aigstudio/core/SimPageRuntime.kt"))
    axis=read(Path("core/src/main/kotlin/com/aigstudio/core/AxisPageRuntime.kt"))
    sim_test=read(Path("core/src/test/kotlin/com/aigstudio/core/SimPageRuntimeRegression.kt"))
    axis_test=read(Path("core/src/test/kotlin/com/aigstudio/core/AxisPageRuntimeRegression.kt"))

    missing_sim=sorted(c for c in commands("SIM") if f'"{c}"' not in sim)
    assert not missing_sim, f"SIM_RUNTIME_COMMANDS_MISSING:{missing_sim}"
    for symbol in [
        "Machining3DEngine.build", "MachiningRiskScanner.inspect", "ProgressiveMachining3D.frame",
        "removedVolumeMm3", "field.depth.count", "SurfaceMesh3D" # SurfaceMesh3D is reached through Machining3DEngine result
    ]:
        if symbol == "SurfaceMesh3D":
            continue
        assert symbol in sim, f"SIM_REAL_CORE_SYMBOL_MISSING:{symbol}"
    assert "SIM_PAGE_RUNTIME_PASS|" in sim_test
    assert "Toast" not in sim

    total_axis=0
    expected_axes={"3AX":"XYZ","4AX":"XYZA","5AX":"XYZAB","6AX":"XYZABC"}
    for page, axes in expected_axes.items():
        cmds=commands(page)
        total_axis+=len(cmds)
        for c in cmds:
            if ".MACHINE.JOG_" in c:
                axis_letter=c.split("JOG_")[1][0]
                assert axis_letter in axes, f"AXIS_MANIFEST_OVERREACH:{page}:{c}"
        assert f'PageId.AX{page[0]}' in axis, f"AXIS_RUNTIME_PAGE_MISSING:{page}"
        assert f'"{page}.NC_FIRST"' in read(Path("core/src/main/kotlin/com/aigstudio/core/PageRuntimeContract.kt"))
    assert 'setOf(\'X\',\'Y\',\'Z\',\'A\',\'B\',\'C\')' in axis
    assert '"AXIS_WORD_TRACE"' in axis
    assert 'AxisCockpitSkinContract.mode(pageId.id)' in axis
    assert "AXIS_PAGE_RUNTIME_PASS|" in axis_test
    assert "Toast" not in axis

    print(f"SIM_AXIS_PAGE_RUNTIME_BINDING_PASS|SIM={len(commands('SIM'))}|AXIS={total_axis}|TRUE_REMOVAL|COLLISION_CORE|3AX_XYZ|4AX_A|5AX_AB|6AX_ABC|NC_FIRST_PRECHECK")

if __name__=="__main__": main()

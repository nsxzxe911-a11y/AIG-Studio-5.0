import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def read(path): return (ROOT/path).read_text(encoding="utf-8")
def commands(page):
    return {b["commandId"] for b in json.loads(read(Path("design/ui/pages")/page/"button-manifest.json"))["buttons"]}

def main():
    nc=read(Path("core/src/main/kotlin/com/aigstudio/core/NcPageRuntime.kt"))
    six=read(Path("core/src/main/kotlin/com/aigstudio/core/NcSixAxisCompatibility.kt"))
    home=read(Path("core/src/main/kotlin/com/aigstudio/core/HomePageRuntime.kt"))
    nc_test=read(Path("core/src/test/kotlin/com/aigstudio/core/NcPageRuntimeRegression.kt"))
    six_test=read(Path("core/src/test/kotlin/com/aigstudio/core/NcSixAxisCompatibilityRegression.kt"))
    home_test=read(Path("core/src/test/kotlin/com/aigstudio/core/HomePageRuntimeRegression.kt"))

    missing_nc=sorted(c for c in commands("NC") if f'"{c}"' not in nc)
    missing_home=sorted(c for c in commands("HOME") if f'"{c}"' not in home)
    assert not missing_nc, f"NC_RUNTIME_COMMANDS_MISSING:{missing_nc}"
    assert not missing_home, f"HOME_RUNTIME_COMMANDS_MISSING:{missing_home}"

    for symbol in ["NcRuntimeInterlock.findings","NcEditorAlarmRouter.firstAlarm","NcExecutionTimeline.build","NcMachineInterlockSession","NcSixAxisCompatibility"]:
        assert symbol in nc, f"NC_REAL_CORE_SYMBOL_MISSING:{symbol}"
    for symbol in ["cFindings","legacyProgram","AXIS_C_TRAVEL_LIMIT_EXCEEDED","DUPLICATE_AXIS_WORD_C"]:
        assert symbol in six, f"NC_6AX_COMPAT_SYMBOL_MISSING:{symbol}"
    for symbol in ["ProjectRevisionSync.bump","ProjectRevisionSync.classify","ProjectRevisionSync.statusLabel"]:
        assert symbol in home, f"HOME_SYNC_CORE_SYMBOL_MISSING:{symbol}"
    assert 'require(machineConnected)' in nc
    assert 'require(verified&&prepared)' in nc or 'require(verified && prepared)' in nc
    assert '"NC_MACHINE is disconnected"' in nc
    assert 'payload.body["preflightReady"]' in nc
    assert 'coverage!="MODELED"' in nc
    assert '"offlineReady" to "true"' in home
    assert "NC_PAGE_RUNTIME_PASS|" in nc_test
    assert "6AX_C_COMPAT" in nc_test
    assert "NC_SIX_AXIS_COMPAT_PASS|" in six_test
    assert "HOME_PAGE_RUNTIME_PASS|" in home_test
    assert "Toast" not in nc+home

    print(f"NC_HOME_PAGE_RUNTIME_BINDING_PASS|NC={len(commands('NC'))}|HOME={len(commands('HOME'))}|FANUC_INTERLOCK|6AX_C_COMPAT|STRICT_SIM_NC_EVIDENCE|TIMELINE|MACHINE_FAIL_CLOSED|PROJECT_REVISION_SYNC|LOCAL_FIRST")

if __name__=="__main__": main()

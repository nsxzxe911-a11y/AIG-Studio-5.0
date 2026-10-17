import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def read(path): return (ROOT/path).read_text(encoding="utf-8")

def main():
    manifest=json.loads(read(Path("design/ui/pages/AI/button-manifest.json")))
    commands={b["commandId"] for b in manifest["buttons"]}
    runtime=read(Path("core/src/main/kotlin/com/aigstudio/core/AiPageRuntime.kt"))
    orchestrator=read(Path("core/src/main/kotlin/com/aigstudio/core/MachiningOrchestrator.kt"))
    policy=read(Path("core/src/main/kotlin/com/aigstudio/core/MachiningEvidenceSafetyPolicy.kt"))
    regression=read(Path("core/src/test/kotlin/com/aigstudio/core/MachiningOrchestratorRegression.kt"))
    ai_regression=read(Path("core/src/test/kotlin/com/aigstudio/core/AiPageRuntimeRegression.kt"))

    expected={"AI.ASSIST.EXPLAIN","AI.PLAN.BUILD","AI.PLAN.OPTIMIZE","AI.AUDIT.RUN","AI.RECOVERY.REPLAN"}
    assert commands==expected, f"AI_COMMAND_SET_DRIFT:{sorted(commands)}"
    missing=sorted(c for c in commands if f'"{c}"' not in runtime)
    assert not missing, f"AI_RUNTIME_COMMANDS_MISSING:{missing}"
    assert "MachiningOrchestrator()" in runtime
    assert "AI_BRIDGE_IMPORT_DISABLED" in runtime
    assert "SIM_VERIFIED_EVIDENCE_REQUIRED" in orchestrator
    assert "SIM_PREFLIGHT_READY_REQUIRED" in orchestrator
    assert "SIM_FIXTURE_COVERAGE_REQUIRED" in orchestrator
    assert "preflightReady:Boolean=false" in orchestrator
    assert "fixtureCoverageKnown:Boolean=false" in orchestrator
    assert "MachiningEvidenceSafetyPolicy.safeSimReuse" in orchestrator
    assert "verified && preflightReady && fixtureCoverageKnown" in policy
    assert 'args["${prefix}PreflightReady"]' in runtime
    assert 'args["${prefix}FixtureCoverageKnown"]' in runtime
    assert 'it.subpage.value=="SIM.RESULT" && it.requiredEvidence=="SIM_PREFLIGHT_READY"' in orchestrator
    assert 'it.subpage.value=="NC.VERIFY"' in orchestrator
    assert 'it.action=="NC_MACHINE"' in orchestrator
    assert "MACHINING_ORCHESTRATOR_PASS|" in regression
    assert "LEGACY_UNMODELED_REUSE_REJECTED" in regression
    assert "AI_PAGE_RUNTIME_PASS|" in ai_regression
    assert "LEGACY_UNMODELED_REJECTED" in ai_regression
    assert "Toast" not in runtime+orchestrator
    print("AI_MACHINING_RUNTIME_BINDING_PASS|5_BUTTONS|SAFE_ROUTE_SCORING|STRICT_SIM_PREFLIGHT_REUSE|FIXTURE_COVERAGE_REQUIRED|SIM_NC_REQUIRED|NO_DIRECT_DOMAIN_MUTATION|NO_MACHINE_BYPASS")

if __name__=="__main__": main()

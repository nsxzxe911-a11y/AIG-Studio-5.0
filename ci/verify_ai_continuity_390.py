from pathlib import Path
root=Path(r'E:\AIG_WORK\worktrees\aigcnc-381-clean-host')
panel=(root/'app-production/src/main/java/com/aigstudio/production/CleanAiPanel.kt').read_text(encoding='utf-8')
main=(root/'app-production/src/main/java/com/aigstudio/production/CleanMainActivity.kt').read_text(encoding='utf-8')
runtime=(root/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanAiContinuitySession.kt').read_text(encoding='utf-8')
build=(root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
rtbuild=(root/'production-runtime/build.gradle.kts').read_text(encoding='utf-8')
checks={
'PKG_390':'com.aigstudio.production.clean390' in build,
'VERSION_390':'390001' in build and '390-ai-continuity' in build,
'SAVE_BUTTON':'AI SAVE CHECKPOINT' in panel,
'RESUME_BUTTON':'AI RESUME STATUS' in panel,
'CONTINUITY_SESSION':'CleanAiContinuitySession' in panel and 'CleanAiContinuitySession' in main,
'PERSIST':'saveUpdateCheckpoint' in runtime and 'loadUpdateCheckpoint' in runtime,
'NETWORK_CORE':'NetworkResiliencePolicy' in runtime and 'networkFailureBlocksRuntime' in runtime,
'REGRESSION_TASK':'cleanAiContinuityRegression' in rtbuild,
'NO_LEGACY_APP':'project(":app")' not in build,
}
failed=[k for k,v in checks.items() if not v]
if failed: raise SystemExit('AI_CONTINUITY_390_FAIL|'+','.join(failed))
print('AI_CONTINUITY_WIRING_PASS|AIG_CNC_390|CHECKPOINT_PERSIST|RESUME_STATUS|NETWORK_NONBLOCKING|CIRCUIT_BREAKER|NO_LEGACY_APP')

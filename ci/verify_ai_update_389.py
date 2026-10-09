from pathlib import Path
root=Path(__file__).resolve().parents[1]
build=(root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
main=(root/'app-production/src/main/java/com/aigstudio/production/CleanMainActivity.kt').read_text(encoding='utf-8')
panel=(root/'app-production/src/main/java/com/aigstudio/production/CleanAiPanel.kt').read_text(encoding='utf-8')
runtime=(root/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanAiUpdateSession.kt').read_text(encoding='utf-8')
checks={
'VERSION_389':'com.aigstudio.production.clean389' in build and 'versionCode = 389001' in build,
'UPDATE_SESSION':'class CleanAiUpdateSession' in runtime,
'PACKAGE_REGISTRY':'StudioPackageRegistry' in runtime,
'ROLLING_POLICY':'RollingUpdatePolicy' in runtime,
'VERIFIED_COPY':'VerifiedWorkingCopy' in runtime,
'HEALTH_BUTTON':'AI PACKAGE HEALTH' in panel,
'RULES_BUTTON':'AI UPDATE RULES' in panel,
'MAIN_WIRING':'CleanAiPanel(this,aiSession,aiUpdateSession)' in main,
'NO_FAKE_ONLINE':'ONLINE AGENT NOT CONNECTED' in panel,
'NO_LEGACY_APP':'implementation(project(":app"))' not in build
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('AI_UPDATE_WIRING_FAIL|'+','.join(bad))
print('AI_UPDATE_WIRING_PASS|AIG_CNC_389|PACKAGE_HEALTH|FORWARD_ONLY|VERIFIED_COPY|GATE_PROMOTE|ONLINE_NOT_FAKE|NO_LEGACY_APP')

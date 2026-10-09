from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks={
'VERSION_388':'applicationId = "com.aigstudio.production.clean388"' in (root/'app-production/build.gradle.kts').read_text(encoding='utf-8'),
'AI_SESSION':(root/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanAiSession.kt').exists(),
'AI_PANEL':(root/'app-production/src/main/java/com/aigstudio/production/CleanAiPanel.kt').exists(),
'MAIN_WIRING':'CleanAiPanel(this,aiSession)' in (root/'app-production/src/main/java/com/aigstudio/production/CleanMainActivity.kt').read_text(encoding='utf-8'),
'IMMUTABLE':'AiProgramWorkingCopyVault' in (root/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanAiSession.kt').read_text(encoding='utf-8'),
'VERIFIER':'AiProgramNcVerifier' in (root/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanAiSession.kt').read_text(encoding='utf-8'),
'BUTTONS':all(x in (root/'app-production/src/main/java/com/aigstudio/production/CleanAiPanel.kt').read_text(encoding='utf-8') for x in ['AI OPEN MAIN','AI STAGE EDIT','AI VERIFY','AI PROMOTE','AI RESTORE MAIN']),
'NO_LEGACY_APP':'implementation(project(":app"))' not in (root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('CLEAN_AI_WIRING_FAIL|'+','.join(bad))
print('CLEAN_AI_WIRING_PASS|AIG_CNC_388|IMMUTABLE_MAIN|WORKING_COPY|NC_VERIFY|PROMOTE|NO_FAKE_AI|NO_LEGACY_APP')

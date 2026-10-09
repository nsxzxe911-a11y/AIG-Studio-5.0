from pathlib import Path
r=Path(__file__).resolve().parents[1]
main=(r/'app-production/src/main/java/com/aigstudio/production/CleanMainActivity.kt').read_text(encoding='utf-8')
panel=(r/'app-production/src/main/java/com/aigstudio/production/CleanNcPanel.kt').read_text(encoding='utf-8')
sess=(r/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanNcSession.kt').read_text(encoding='utf-8')
grad=(r/'app-production/build.gradle.kts').read_text(encoding='utf-8')
prod=(r/'production-runtime/build.gradle.kts').read_text(encoding='utf-8')
checks=[
 'com.aigstudio.production.clean387' in grad and '387001' in grad and '387-clean-nc' in grad,
 'private val ncSession = CleanNcSession()' in main and '"NC" -> { contentHost.addView(CleanNcPanel' in main,
 'setOf("CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC")' in main,
 'contentDescription="NC EDITOR"' in panel and '"VERIFY"' in panel and '"G41"' in panel and '"G42"' in panel,
 'G34 J0. I30. K6 G83 R3. Z-20. Q2. F150.' in panel and '"M98 P4"' in panel and '"M98 P5"' in panel,
 'CncControllerProfile.FANUC' in sess and 'NcSemanticAuthority.programSummary' in sess and 'NcExecutionTimeline.programSummary' in sess and 'NcEditorAlarmRouter.firstAlarm' in sess,
 'project(":app")' not in grad and 'project(":app")' not in prod,
]
if not all(checks):
 print('CLEAN_NC_WIRING_FAIL|AIG_CNC_387|'+','.join(str(i) for i,v in enumerate(checks) if not v)); raise SystemExit(1)
print('CLEAN_NC_WIRING_PASS|AIG_CNC_387|FANUC_EDITOR|VERIFY|ALARM_ROUTER|G41_G42|G34_G83|M98_P4_P5|NO_LEGACY_APP')

from pathlib import Path
root=Path(r'E:\AIG_WORK\worktrees\aigcnc-381-clean-host')
panel=(root/'app-production/src/main/java/com/aigstudio/production/CleanCadPanel.kt').read_text(encoding='utf-8')
session=(root/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanCadSession.kt').read_text(encoding='utf-8')
build=(root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
rtbuild=(root/'production-runtime/build.gradle.kts').read_text(encoding='utf-8')
checks={
'PKG':'com.aigstudio.production.clean391' in build,
'VERSION':'391001' in build and '391-cad-tools' in build,
'SELECT_UI':'CAD TOOL SELECT' in panel,
'TRIM_UI':'CAD TRIM' in panel,
'EXTEND_UI':'CAD EXTEND' in panel,
'OFFSET_UI':'CAD OFFSET 5MM' in panel,
'ARRAY_UI':'CAD ARRAY 3X' in panel,
'SELECT_CORE':'selectNearest' in session and 'selectedCount' in session,
'TRIM_CORE':'CadEditEngine.trimCommand' in session,
'EXTEND_CORE':'CadEditEngine.extendCommand' in session,
'OFFSET_CORE':'CadEditEngine.offsetCommand' in session,
'ARRAY_CORE':'CadEditEngine.linearArrayCommand' in session,
'REGRESSION':'cleanCadAdvancedRegression' in rtbuild,
'NO_LEGACY':'project(":app")' not in build,
}
failed=[k for k,v in checks.items() if not v]
if failed: raise SystemExit('CAD_TOOLS_391_FAIL|'+','.join(failed))
print('CAD_TOOLS_WIRING_PASS|AIG_CNC_391|SELECT|TRIM|EXTEND|OFFSET|ARRAY|NO_LEGACY_APP')

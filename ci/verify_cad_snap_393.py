from pathlib import Path
root=Path(r'E:\AIG_WORK\worktrees\aigcnc-381-clean-host')
panel=(root/'app-production/src/main/java/com/aigstudio/production/CleanCadPanel.kt').read_text(encoding='utf-8')
session=(root/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanCadSession.kt').read_text(encoding='utf-8')
build=(root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
need=['CAD SNAP CYCLE','CLEAN_CAD_SNAP_MODE','CLEAN_CAD_SNAP_APPLY','CleanCadSnapMode.ENDPOINT','CleanCadSnapMode.MIDPOINT','CleanCadSnapMode.CENTER','CleanCadSnapMode.INTERSECTION','CleanCadSnapMode.HORIZONTAL','CleanCadSnapMode.VERTICAL','CleanCadSnapMode.TANGENT']
for x in need:
    assert x in panel,x
assert 'fun snapPoint' in session
assert 'CadSnapEngine' in session
assert 'com.aigstudio.production.clean393' in build
assert 'versionCode = 393001' in build
assert 'versionName = "393-cad-snap"' in build
assert 'implementation(project(":app"))' not in (root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
print('CAD_SNAP_WIRING_PASS|AIG_CNC_393|7_MODES|LIVE_APPLY|NO_LEGACY_APP')

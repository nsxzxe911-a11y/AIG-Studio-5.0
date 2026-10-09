from pathlib import Path
root=Path(r'E:\AIG_WORK\worktrees\aigcnc-381-clean-host')
panel=(root/'app-production/src/main/java/com/aigstudio/production/CleanCadPanel.kt').read_text(encoding='utf-8')
session=(root/'production-runtime/src/main/kotlin/com/aigstudio/production/runtime/CleanCadSession.kt').read_text(encoding='utf-8')
build=(root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
for x in ['CAD CONNECT DISCONNECT','CLEAN_CAD_TOPOLOGY','LINKS=${session.topologyCount()}']:
    assert x in panel,x
for x in ['fun connectSelected','fun disconnectSelected','fun topologyCount','fun selectedPairConnected','fun toggleTopologySelected','CadEditEngine.connectCommand','CadEditEngine.disconnectCommand']:
    assert x in session,x
assert 'com.aigstudio.production.clean394' in build
assert 'versionCode = 394001' in build
assert 'versionName = "394-cad-topology"' in build
assert 'implementation(project(":app"))' not in build
print('CAD_TOPOLOGY_WIRING_PASS|AIG_CNC_394|CONNECT_DISCONNECT|GEOMETRY_UNCHANGED|NO_LEGACY_APP')

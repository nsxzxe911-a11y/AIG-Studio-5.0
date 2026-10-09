from pathlib import Path
r=Path(__file__).resolve().parents[1]
main=(r/'app-production/src/main/java/com/aigstudio/production/CleanMainActivity.kt').read_text(encoding='utf-8')
panel=(r/'app-production/src/main/java/com/aigstudio/production/CleanAxisPanel.kt').read_text(encoding='utf-8')
gradle=(r/'app-production/build.gradle.kts').read_text(encoding='utf-8')
checks={
 'MOUNT_4':'CleanAxisPanel(this,axis4)' in main,
 'MOUNT_5':'CleanAxisPanel(this,axis5)' in main,
 'MOUNT_6':'CleanAxisPanel(this,axis6)' in main,
 'ONE_RENDERER':'GLSurfaceView' in panel and 'ONE_SCENE_ONE_RENDERER' in panel,
 'A':'AXIS $mode $label' in panel and 'rotateA' in panel,
 'B':'rotateB' in panel,
 'C':'rotateC' in panel,
 'GEOMETRY':'draw4' in panel and 'draw5' in panel and 'draw6' in panel and 'GL_TRIANGLES' in panel,
 'VERSION':'clean386' in gradle and '386001' in gradle,
 'NO_LEGACY':':app"' not in gradle and 'StartupActivity' not in main,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('CLEAN_456AX_RED|'+','.join(bad))
print('CLEAN_456AX_WIRING_PASS|AIG_CNC_386|4AX_A|5AX_AB|6AX_ABC|ONE_SCENE_ONE_RENDERER|NO_LEGACY_APP')

from pathlib import Path
r=Path(__file__).resolve().parents[1]
main=(r/'app-production/src/main/java/com/aigstudio/production/CleanMainActivity.kt').read_text(encoding='utf-8')
sim=(r/'app-production/src/main/java/com/aigstudio/production/CleanSimPanel.kt').read_text(encoding='utf-8')
ax=(r/'app-production/src/main/java/com/aigstudio/production/Clean3AxPanel.kt').read_text(encoding='utf-8')
gradle=(r/'app-production/build.gradle.kts').read_text(encoding='utf-8')
checks={
'SIM_PANEL':'CleanSimPanel(this,simSession)' in main,
'SIM_TRUE':'TRUE_MATERIAL_REMOVAL' in main and 'SIM RUN TRUE MATERIAL REMOVAL' in sim,
'3AX_PANEL':'Clean3AxPanel(this)' in main,
'GPU_SURFACE':'GLSurfaceView' in ax and 'CLEAN_3AX_GPU_FIRST_FRAME|PASS' in ax,
'3D_GEOMETRY':'BASE_COLUMN_TABLE' in ax and 'GL_TRIANGLES' in ax,
'VERSION':'clean385' in gradle and '385001' in gradle,
'NO_LEGACY':':app"' not in gradle and 'StartupActivity' not in main and 'maintenanceStrip' not in main,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('CLEAN_SIM3AX_RED|'+','.join(bad))
print('CLEAN_SIM3AX_WIRING_PASS|AIG_CNC_385|TRUE_REMOVAL|OPENGL_ES|FIRST_FRAME|NO_LEGACY_APP')

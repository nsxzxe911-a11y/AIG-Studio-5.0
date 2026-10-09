from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
errors=[]
manifest=(root/'app/src/main/AndroidManifest.xml').read_text(encoding='utf-8')
main=(root/'app/src/main/java/com/aigstudio/app/MainActivity.kt').read_text(encoding='utf-8')
startup=root/'app/src/main/java/com/aigstudio/app/StartupActivity.kt'
nox=root/'ci/verify_nox_runtime_pages.ps1'
if 'StartupActivity' in manifest: errors.append('MANIFEST_STARTUP_ACTIVITY_PRESENT')
if startup.exists(): errors.append('STARTUP_ACTIVITY_SOURCE_PRESENT')
for token in ('productionUiSwitch','visibleModeTitle','visibleModeActions','maintenanceStrip','refreshVisibleMode(','selectProductionUi(','masterRootBar','brandBar','machineRail','workstationFooter'):
    if token in main: errors.append('LEGACY_HIDDEN_UI_'+token.replace('(','').upper())
if not nox.exists(): errors.append('NOX_GATE_MISSING')
else:
    t=nox.read_text(encoding='utf-8',errors='ignore')
    marker='function Capture([string]$page'
    capture=t.split(marker,1)[1] if marker in t else ''
    if 'force-stop' in capture: errors.append('NOX_CAPTURE_FORCE_STOPS_APP')
    if t.lower().count('force-stop')!=1: errors.append('NOX_GATE_NOT_SINGLE_COLD_START')
    if '$script:initialPid' not in t or 'PID_CHANGED' not in t: errors.append('NOX_GATE_DOES_NOT_ENFORCE_SAME_PID')
    if '$bestArea' not in t or 'GetWindowRect' not in t: errors.append('NOX_GATE_DOES_NOT_SELECT_MAIN_WINDOW')
    if 'SINGLE_COLD_START' not in t: errors.append('NOX_GATE_MARKER_MISSING')
if errors:
    print('NO_ENGINEERING_SHELL_380_RED|'+'|'.join(errors)); sys.exit(1)
print('NO_ENGINEERING_SHELL_380_PASS|ANDROID_MAIN_ONLY|NO_LEGACY_HIDDEN_UI|NOX_SINGLE_COLD_START|SAME_PID|MAIN_NOX_WINDOW')

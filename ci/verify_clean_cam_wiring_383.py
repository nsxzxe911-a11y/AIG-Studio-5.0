from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
activity=next((root/'app-production/src/main/java').rglob('CleanMainActivity.kt')).read_text(encoding='utf-8')
panels=list((root/'app-production/src/main/java').rglob('CleanCamPanel.kt'))
build=(root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
errors=[]
if 'project(":production-runtime")' not in build: errors.append('RUNTIME_DEP_MISSING')
if not panels: errors.append('CLEAN_CAM_PANEL_MISSING')
else:
    text=panels[0].read_text(encoding='utf-8')
    for token in ['CleanCamSession','CAM AUTO','CAM MANUAL','CAM SAFE-Z','CAM G0','CAM G1','CAM SIDE','CAM DIR','CAM AVOID','CAM EDIT','CLEAN_CAM_ACTION']:
        if token not in text: errors.append('CAM_UI_MISSING_'+token.replace(' ','_'))
if 'CleanCamPanel' not in activity: errors.append('CAM_PANEL_NOT_MOUNTED')
if 'implementation(project(":app"))' in build: errors.append('LEGACY_APP_DEP_FORBIDDEN')
if errors:
    print('CLEAN_CAM_WIRING_RED|'+'|'.join(errors)); sys.exit(1)
print('CLEAN_CAM_WIRING_PASS|PRODUCTION_RUNTIME|AUTO_MANUAL|SAFE_Z|G0_G1|SIDE_DIR|EDIT|AVOID|NO_LEGACY_APP')

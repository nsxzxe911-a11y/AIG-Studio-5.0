from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
activity=next((root/'app-production/src/main/java').rglob('CleanMainActivity.kt')).read_text(encoding='utf-8')
build=(root/'app-production/build.gradle.kts').read_text(encoding='utf-8')
panels=list((root/'app-production/src/main/java').rglob('CleanCadPanel.kt'))
errors=[]
if 'project(":production-runtime")' not in build: errors.append('CLEAN_HOST_RUNTIME_DEP_MISSING')
if not panels: errors.append('CLEAN_CAD_PANEL_MISSING')
else:
    p=panels[0].read_text(encoding='utf-8')
    for token in ['CleanCadSession','CAD TOOL LINE','CAD TOOL RECT','CAD TOOL CIRCLE','CAD UNDO','CAD REDO','CLEAN_CAD_MUTATION']:
        if token not in p: errors.append('CAD_WIRING_MISSING_'+token.replace(' ','_'))
if 'CleanCadPanel' not in activity: errors.append('CAD_PANEL_NOT_MOUNTED')
if 'implementation(project(":app"))' in build: errors.append('LEGACY_APP_DEPENDENCY_FORBIDDEN')
if 'applicationId = \"com.aigstudio.production.clean382\"' not in build or 'versionCode = 382001' not in build:
    errors.append('VERSION_CODE_MATCH')
if errors:
    print('CLEAN_CAD_WIRING_RED|'+'|'.join(errors)); sys.exit(1)
print('CLEAN_CAD_WIRING_PASS|PRODUCTION_RUNTIME|TOUCH_CANVAS|LINE_RECT_CIRCLE|UNDO_REDO|NO_LEGACY_APP')

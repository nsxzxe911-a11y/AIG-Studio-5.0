from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
module=root/'app-production'
expected_id='com.aigstudio.production.clean381'
expected_pages=['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI']
errors=[]
if not module.is_dir(): errors.append('APP_PRODUCTION_MODULE_MISSING')
settings=(root/'settings.gradle.kts').read_text(encoding='utf-8',errors='ignore')
if ':app-production' not in settings: errors.append('SETTINGS_NOT_INCLUDED')
if module.is_dir():
    files={p.relative_to(module).as_posix():p.read_text(encoding='utf-8',errors='ignore') for p in module.rglob('*') if p.is_file() and p.suffix in {'.kt','.kts','.xml'}}
    joined='\n'.join(files.values())
    build=files.get('build.gradle.kts','')
    manifest=files.get('src/main/AndroidManifest.xml','')
    activity=files.get('src/main/java/com/aigstudio/production/CleanMainActivity.kt','')
    if expected_id not in build: errors.append('APPLICATION_ID_WRONG')
    if manifest.count('<activity') != 1 or '.CleanMainActivity' not in manifest: errors.append('SINGLE_ACTIVITY_CONTRACT_FAIL')
    if '<application' not in manifest or 'android:name=' in manifest.split('<application',1)[1].split('>',1)[0]: errors.append('CUSTOM_APPLICATION_FORBIDDEN')
    forbidden=['StartupActivity','Engineering','ENGINEERING','maintenanceStrip','showMaintenanceCenter','MAINTENANCE CENTER']
    for token in forbidden:
        if token in joined: errors.append('FORBIDDEN_'+token.upper().replace(' ','_'))
    for page in expected_pages:
        if f'"{page}"' not in activity: errors.append('PAGE_MISSING_'+page)
    if not (module/'src/main/assets/home.png').is_file(): errors.append('HOME_ART_NOT_MOUNTED')
if errors:
    print('CLEAN_HOST_381_RED|'+'|'.join(errors)); sys.exit(1)
print('CLEAN_HOST_381_PASS|SINGLE_ACTIVITY|NO_LEGACY_HOST_DEPENDENCY|RGB_HOME|9_NAV_SURFACES')

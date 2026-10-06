from pathlib import Path
import json,re

ROOT=Path(__file__).resolve().parents[1]

def fail(code):
    raise SystemExit('PRO_RGB_RUNTIME_FAIL|'+code)

def need(ok,code):
    if not ok: fail(code)

def read(path):
    p=ROOT/path
    need(p.exists(),'MISSING_'+str(path).replace('/','_'))
    return p.read_text(encoding='utf-8',errors='replace')

version=read('release-version.properties').strip()
need(version=='versionName=372.0.0','VERSION_372')

app_gradle=read('app/build.gradle.kts')
desktop_gradle=read('desktop/build.gradle.kts')
need('uiux/assets' in app_gradle,'ANDROID_CANONICAL_ASSETS_NOT_PACKAGED')
need('uiux/assets' in desktop_gradle,'WINDOWS_CANONICAL_ASSETS_NOT_PACKAGED')

mapping_path=ROOT/'uiux/professional-surface-map.json'
need(mapping_path.exists(),'SURFACE_MAP_MISSING')
data=json.loads(mapping_path.read_text(encoding='utf-8'))
need(data.get('authority')=='MORNING_APPROVED_RGB_2026_10_05','AUTHORITY')
need(data.get('skin_only') is True,'SKIN_ONLY')
required=['STARTUP','HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI','LINK']
entries=data.get('surfaces',{})
for sid in required:
    need(sid in entries,'SURFACE_'+sid)
    item=entries[sid]
    need(item.get('callback_policy')=='LIVE_RUNTIME','CALLBACK_'+sid)
    need(item.get('model_policy') in ('LIVE_RUNTIME','NONE'),'MODEL_'+sid)

need(entries['6AX'].get('visual') in (None,'PROCEDURAL_RGB_GLASS'),'6AX_FAKE_RASTER')
need(entries['6AX'].get('model_policy')=='LIVE_RUNTIME','6AX_MODEL')

assets={
 'STARTUP':'startup.png','HOME':'home.png','CAD':'cad.png','CAM':'cam.jpg','SIM':'sim.jpg',
 '3AX':'axis3.jpg','4AX':'axis4.png','5AX':'axis5.jpg'
}
for sid,name in assets.items():
    need((ROOT/'uiux/assets'/name).exists(),'ASSET_'+sid)
    need(entries[sid].get('visual')==name,'MAP_'+sid)

contract=read('core/src/main/kotlin/com/aigstudio/core/UiAssetContract.kt')
for token in ('CANONICAL_UI_ROOT','STARTUP_VISUAL','HOME_VISUAL','CAD_VISUAL','CAM_VISUAL','SIM_VISUAL','AXIS3_VISUAL','AXIS4_VISUAL','AXIS5_VISUAL'):
    need(token in contract,'CONTRACT_'+token)

print('PRO_RGB_RUNTIME_PASS|STUDIO_372|MORNING_AUTHORITY|CANONICAL_ASSETS|LIVE_CALLBACKS|LIVE_MODELS|NO_FAKE_6AX')

#!/usr/bin/env python3
import hashlib,json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ANDROID=ROOT/'app/src/main/assets/aig-generated-rgb/approved/416'
WINDOWS=ROOT/'desktop/src/main/resources/aig-generated-rgb/approved/416'
EXPECTED={
 'home_desktop.jpg':'9b0d4c983d8b69d9e1735036842567e5082101976bd17335cd9c3ec7c4494a80',
 'home_mobile.jpg':'8c55956f9ea6693b34d78395d6336ea7bf1a0ec4eeece824c22396b18bb854af',
}
def need(ok,code):
    if not ok: raise SystemExit('STUDIO_HOME_416_FAIL|'+code)
def text(p): return (ROOT/p).read_text(encoding='utf-8')
need('versionName=362.0.0' in text('release-version.properties'),'VERSION_362')
contract=text('core/src/main/kotlin/com/aigstudio/core/UiAssetContract.kt')
need('RGB_PACK_VERSION = "184"' in contract,'BUTTON_PACK_184_CHANGED')
need('HOME_PACK_VERSION = "416"' in contract,'HOME_CONTRACT_416')
android=text('app/src/main/java/com/aigstudio/app/AigStudioApplication.kt')
main=text('app/src/main/java/com/aigstudio/app/MainActivity.kt')
desktop=text('desktop/src/main/kotlin/com/aigstudio/desktop/HomeRgbDesktop.kt')
desktop_main=text('desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt')
manifest=text('app/src/main/AndroidManifest.xml')
build=text('desktop/build.gradle.kts')
need('AigStudioApplication' in manifest,'ANDROID_APP_BINDING')
need('AIG CNC FORMAL RGB HOME' in android,'ANDROID_FORMAL_HOME_TARGET')
need(EXPECTED['home_mobile.jpg'] in android,'ANDROID_SHA_CALLBACK')
for token in ('homeAction("CAD"','homeAction("CAM"','homeAction("SIM"','homeAction("多功能"','HOME USER SETTINGS CENTER','HOME LINK MANAGER TOGGLE','runtimeLinkStore.observe'):
    need(token in main,'ANDROID_HOME_CALLBACK_'+token)
need('HOME_CARD' in desktop,'WINDOWS_FORMAL_HOME_TARGET')
need(EXPECTED['home_desktop.jpg'] in desktop,'WINDOWS_SHA_CALLBACK')
for token in ('AIG HOME CAD','AIG HOME CAM','AIG HOME SIM','HOME LINK MANAGER','runtimeLinkStore.observe'):
    need(token in desktop_main,'WINDOWS_HOME_CALLBACK_'+token)
need('com.aigstudio.bootstrap.DesktopBootstrapKt' in build,'WINDOWS_BOOTSTRAP')
for root in (ANDROID,WINDOWS):
    need((root/'manifest.json').is_file(),f'MANIFEST_MISSING_{root.name}')
    data=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
    need(data.get('official_original_overwritten') is False,'OFFICIAL_OVERWRITE')
    need(data.get('runtime_binding')=={'android':'home_mobile.jpg','windows':'home_desktop.jpg'},'RUNTIME_BINDING')
    for name,sha in EXPECTED.items():
        p=root/name
        need(p.is_file(),f'BINARY_MISSING_{name}_{root}')
        need(hashlib.sha256(p.read_bytes()).hexdigest()==sha,f'SHA_{name}_{root}')
need((ROOT/'app/src/main/assets/aig-generated-rgb/approved/184/manifest.json').is_file(),'ANDROID_184_MISSING')
need((ROOT/'desktop/src/main/resources/aig-generated-rgb/approved/184/manifest.json').is_file(),'WINDOWS_184_MISSING')
print('STUDIO_HOME_416_PASS|362|2_ASSETS|SHA256|ANDROID_MOBILE|WINDOWS_DESKTOP|184_PRESERVED|CAD_CAM_SIM_MULTI_SETTINGS_LINK_CALLBACKS')

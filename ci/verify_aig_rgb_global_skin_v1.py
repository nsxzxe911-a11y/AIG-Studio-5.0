#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def fail(code:str)->None:
    print('AIG_RGB_GLOBAL_SKIN_STATIC_FAIL|'+code)
    raise SystemExit(1)

def read(rel:str)->str:
    p=ROOT/rel
    if not p.is_file(): fail('MISSING|'+rel)
    return p.read_text(encoding='utf-8')

skin=read('core/src/main/kotlin/com/aigstudio/core/AigRgbGlobalSkin.kt')
expected=['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI','SETTINGS','VIEW','PHOTO','CORNER','EDIT','FILE','TOOL','WORK','ALARM','MONITOR','SYNC','LINK']
for value in expected:
    if f'"{value}"' not in skin: fail('SURFACE_'+value)
for token in ('BACKGROUND_RGB=0x020407','PANEL_RGB=0x07111B','MORNING_APPROVED_RGB_FIRST','MOBILE_DESKTOP_ASSET_SPLIT=true','ENGINEERING_SHELL_FALLBACK=false','RED_STATUS_ONLY=true','MULTI_AXIS_MODEL_MUTABLE=true','MODEL_BINDING_POLICY="EXTERNAL_TO_SKIN"','STATUS_ONLY_NO_VERSION_ACTION','versionControlActionAllowed'):
    if token not in skin: fail('TOKEN_'+token)
for token in ('rollback(', 'downgrade(', 'performClick(', 'AI_VERSION_CONTROL_WRITE_ENABLED = true', 'RED_CONTROL_CALLBACK_ENABLED = true'):
    if token in skin: fail('FORBIDDEN_'+token)

theme=read('app/src/main/java/com/aigstudio/app/StudioThemePackRuntime.kt')
for token in ('"aig_rgb_global_v1" to StudioThemePalette(','id="aig_rgb_global_v1"','background=Color.rgb(2,4,7)','panel=Color.rgb(7,17,27)','@Volatile private var currentId="aig_rgb_global_v1"'):
    if token not in theme: fail('ANDROID_THEME_'+token)

adapter=read('app/src/main/java/com/aigstudio/app/AigRgbAndroidSkinAdapter.kt')
for token in ('object AigRgbAndroidSkinAdapter','surfaceAccent','stateColor','buttonSpec','AigRgbGlobalSkinV1.surface'):
    if token not in adapter: fail('ANDROID_ADAPTER_'+token)
for token in ('performClick(', 'setOnClickListener(', 'rollback(', 'downgrade('):
    if token in adapter: fail('ANDROID_ADAPTER_FORBIDDEN_'+token)

styles=read('app/src/main/res/values/styles.xml')
for token in ('android:windowBackground">#020407','android:colorAccent">#27E9FF','android:navigationBarColor">#020407','android:statusBarColor">#020407','android:buttonStyle">@style/Widget.AIG.RgbButton','android:editTextStyle">@style/Widget.AIG.RgbInput','@drawable/aig_rgb_glass_button','@drawable/aig_rgb_glass_input'):
    if token not in styles: fail('ANDROID_STYLE_'+token)

resource_checks={
    'app/src/main/res/drawable/aig_rgb_glass_button.xml':('#020407','#07111B','#27E9FF','state_pressed','state_enabled'),
    'app/src/main/res/drawable/aig_rgb_glass_input.xml':('#07111B','#27E9FF','corners','padding'),
    'app/src/main/res/drawable/aig_rgb_glass_panel.xml':('#07111B','#27E9FF','corners','padding'),
}
for rel,tokens in resource_checks.items():
    text=read(rel)
    for token in tokens:
        if token not in text: fail('ANDROID_RESOURCE_'+rel+'|'+token)

desktop=read('desktop/src/main/kotlin/com/aigstudio/desktop/AigRgbDesktopSkinAdapter.kt')
for token in ('object AigRgbDesktopSkinAdapter','object AigRgbDesktopSkinRuntime','fun install()','UIManager.put','surfaceAccent','stateColor','panelSpec','buttonSpec','AigRgbGlobalSkinV1.surface'):
    if token not in desktop: fail('DESKTOP_ADAPTER_'+token)
for token in ('android.', 'performClick(', 'doClick(', 'rollback(', 'downgrade('):
    if token in desktop: fail('DESKTOP_ADAPTER_FORBIDDEN_'+token)
bootstrap=read('desktop/src/main/kotlin/com/aigstudio/desktop/DesktopBootstrap.kt')
if 'AigRgbDesktopSkinRuntime.install()' not in bootstrap: fail('DESKTOP_BOOTSTRAP_BINDING')

print('AIG_RGB_GLOBAL_SKIN_STATIC_PASS|22_SURFACES|NO_VERSION_CALLBACK|MORNING_ASSET_PRIORITY|MOBILE_WINDOWS_SPLIT|MULTI_AXIS_MODEL_MUTABLE|ANDROID_RGB_GLASS_RESOURCES|ANDROID_THEME_BOUND|DESKTOP_BOOTSTRAP_BOUND')

from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/src/main/java/com/aigstudio/app/MainActivity.kt'
s=p.read_text(encoding='utf-8',errors='replace')
if 'fun setGeneratedAssetEnabled(enabled:Boolean)' not in s:
    raise SystemExit('STUDIO_MOBILE_HOME_FAIL|ASSET_DISABLE_API_MISSING')
if 'Build.SUPPORTED_ABIS.firstOrNull()?.lowercase()' not in s or 'View.LAYER_TYPE_SOFTWARE' not in s:
    raise SystemExit('STUDIO_MOBILE_HOME_FAIL|NOX_X86_RENDER_POLICY_MISSING')
if 'homeAction("3AX"' in s or 'homeAction("4AX"' in s or 'homeAction("5AX"' in s or 'homeAction("6AX"' in s:
    raise SystemExit('STUDIO_MOBILE_HOME_FAIL|AXIS_BUTTONS_STILL_DIRECT')
if 'homeAction("NC"' in s or 'homeAction("AI"' in s:
    raise SystemExit('STUDIO_MOBILE_HOME_FAIL|NC_AI_BUTTONS_STILL_DIRECT')
if '3D / 3AX / 4AX / 5AX / 6AX / NC / AI' not in s:
    raise SystemExit('STUDIO_MOBILE_HOME_FAIL|MULTI_SCOPE_LABEL_MISSING')
if 'setGeneratedAssetEnabled(false)' in s:
    raise SystemExit('STUDIO_MOBILE_HOME_FAIL|FORCED_ASSET_DISABLE_REMAINS')
print('STUDIO_MOBILE_HOME_PASS|CAD_CAM_SIM_MULTI|NOX_SOFTWARE_RGB_BUTTONS|GENERATED_ASSETS_ON|AXIS_NC_AI_IN_MULTI')

import json
from pathlib import Path

# Fresh gate after Studio AIG Web updater policy patch.
ROOT=Path(__file__).resolve().parents[1]
policy=(ROOT/'core/src/main/kotlin/com/aigstudio/core/RollingUpdatePolicy.kt').read_text(encoding='utf-8')
page=ROOT/'web/updates/index.html'
channel=ROOT/'web/updates/channel.json'
button_manifest_contract=ROOT/'core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt'
button_manifest_file=ROOT/'design/ui/button-manifest-v1.json'
runtime_source=ROOT/'app/src/main/java/com/aigstudio/app/MainActivity.kt'
offline_evidence_script=ROOT/'ci/verify_android_offline_rgb_home.sh'

for marker in (
    'DESKTOP_COMMANDER_REQUIRED=false',
    'UPDATE_DELIVERY_CHANNEL="AIG_WEB"',
    'AIG_WEB_DOWNLOAD_URL="https://aig-studio-rgb-runtime.onrender.com/updates/"',
    'UPDATE_ERROR_RETAINS_STABLE=true',
    'DUAL_PROJECT_PROMOTION_REQUIRES_BOTH=true',
    'PROMOTION_FAIL_CLOSED=true',
):
    assert marker in policy, f'POLICY_MISSING:{marker}'

assert page.is_file(), 'WEB_UPDATE_PAGE_MISSING'
assert channel.is_file(), 'WEB_UPDATE_CHANNEL_MISSING'
html=page.read_text(encoding='utf-8')
for marker in ('AIG 雙專案 AI 更新','AIG-II','AIG Studio 5.0','VERIFIED ONLY','CURRENT STABLE RETAINED'):
    assert marker in html, f'WEB_PAGE_MARKER_MISSING:{marker}'
for forbidden in ('DESKTOP-6KOFHUK','Desktop Commander','NOX_START','WINDOWS_AI_UPDATE'):
    assert forbidden not in html, f'WEB_PAGE_FORBIDDEN:{forbidden}'

obj=json.loads(channel.read_text(encoding='utf-8'))
assert obj['schema']=='aig-dual-ai-web-update-v1'
assert obj['delivery']=='AIG_WEB'
assert obj['desktopCommanderRequired'] is False
assert obj['promotion']=='BOTH_PASS_ATOMIC_OR_RETAIN_STABLE'
for product in ('aigii','studio'):
    assert product in obj['products']
    p=obj['products'][product]
    assert p['verified'] is False
    assert p['downloadUrl'] is None

assert button_manifest_contract.is_file(), 'UI_BUTTON_MANIFEST_CONTRACT_MISSING'
button_contract=button_manifest_contract.read_text(encoding='utf-8')
for marker in (
    'SCHEMA="aig-ui-button-manifest-v1"',
    'AUTHORITY_RGB_TO_BUTTON_ID_TO_MANIFEST_TO_SHARED_COMMAND_TO_RUNTIME_CORE',
    'UNVERIFIED_BOUNDS_ALLOWED=true',
    'NAV_HOME',
    'NAV_CAD',
    'NAV_CAM',
    'NAV_SIM',
    'NAV_NC',
    'NAV_AI',
    'showRuntimeHome?.invoke()',
    'showCamWorkstation()',
    'showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM"))',
    'showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC"))',
    'showAiSystemSuiteDialog()',
):
    assert marker in button_contract, f'UI_BUTTON_MANIFEST_MARKER_MISSING:{marker}'

assert button_manifest_file.is_file(), 'UI_BUTTON_JSON_MANIFEST_MISSING'
manifest=json.loads(button_manifest_file.read_text(encoding='utf-8'))
assert manifest['schema']=='aig-ui-button-manifest-v1'
assert manifest['pipeline']=='AUTHORITY_RGB_TO_BUTTON_ID_TO_MANIFEST_TO_SHARED_COMMAND_TO_RUNTIME_CORE'
assert manifest['authority']['rgbButtonPack']=='184'
assert manifest['authority']['homePack']=='416'
assert manifest['boundsVerified'] is False
buttons=manifest['buttons']
expected={
    'NAV_HOME':('HOME','rgb_wallpaper','OPEN_HOME','showRuntimeHome?.invoke()'),
    'NAV_CAD':('CAD','cad','OPEN_CAD','Toast.makeText(this,"CAD • LIVE WORKSPACE",Toast.LENGTH_SHORT).show()'),
    'NAV_CAM':('CAM','cam','OPEN_CAM','showCamWorkstation()'),
    'NAV_SIM':('SIM','sim','OPEN_SIM','showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM"))'),
    'NAV_NC':('NC','nc','OPEN_NC','showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC"))'),
    'NAV_AI':('AI','ai','OPEN_AI','showAiSystemSuiteDialog()'),
}
assert len(buttons)==len(expected), 'UI_BUTTON_JSON_COUNT_MISMATCH'
assert len({b['buttonId'] for b in buttons})==len(buttons), 'UI_BUTTON_JSON_DUPLICATE_ID'
for button in buttons:
    button_id=button['buttonId']
    assert button_id in expected, f'UI_BUTTON_JSON_UNKNOWN_ID:{button_id}'
    surface,asset,command,callback=expected[button_id]
    assert button['surfaceId']==surface
    assert button['assetId']==asset
    assert button['sharedCommand']==command
    assert button['verifiedCallback']==callback
    assert button['bounds'] is None, f'UI_BUTTON_JSON_UNVERIFIED_BOUNDS_NOT_NULL:{button_id}'

assert runtime_source.is_file(), 'ANDROID_RUNTIME_SOURCE_MISSING'
runtime_text=runtime_source.read_text(encoding='utf-8')
for marker in (
    'contentDescription="AIG CNC PRODUCTION RUNTIME HOST"',
    'homeRoot.contentDescription="AIG CNC PRODUCTION HOME RUNTIME • FIRST FRAME"',
    'root.visibility=View.GONE',
    'homeRoot.visibility=View.VISIBLE',
):
    assert marker in runtime_text, f'ANDROID_FINAL_HOME_MARKER_MISSING:{marker}'

assert offline_evidence_script.is_file(), 'ANDROID_OFFLINE_EVIDENCE_SCRIPT_MISSING'
evidence_text=offline_evidence_script.read_text(encoding='utf-8')
assert "grep -F 'AIG CNC PRODUCTION HOME RUNTIME • FIRST FRAME'" in evidence_text, 'ANDROID_EVIDENCE_FINAL_HOME_MARKER_MISMATCH'
assert "grep -F 'AIG CNC PRODUCTION RUNTIME HOST'" in evidence_text, 'ANDROID_EVIDENCE_RUNTIME_HOST_MARKER_MISSING'
assert "grep -F 'AIG CNC FORMAL RGB HOME'" not in evidence_text, 'ANDROID_EVIDENCE_STALE_HOME_MARKER_PRESENT'

print('AIG_STUDIO_DUAL_AI_WEB_UPDATE_PASS|WEB_DOWNLOAD_SURFACE|NO_DESKTOP_COMMANDER|VERIFIED_ONLY')
print('UI_BUTTON_MANIFEST_CONTRACT_PASS|AUTHORITY_RGB|BUTTON_ID|SHARED_COMMAND|VERIFIED_CALLBACKS|NULL_BOUNDS_ALLOWED')
print('UI_BUTTON_JSON_MANIFEST_PASS|PACK_184|HOME_416|6_VERIFIED_NAV|NULL_BOUNDS')
print('ANDROID_OFFLINE_RGB_HOME_EVIDENCE_CONTRACT_PASS|FINAL_FIRST_FRAME_MARKER|RUNTIME_HOST')

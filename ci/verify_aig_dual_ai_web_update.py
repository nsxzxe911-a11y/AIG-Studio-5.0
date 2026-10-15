import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
policy=(ROOT/'core/src/main/kotlin/com/aigstudio/core/RollingUpdatePolicy.kt').read_text(encoding='utf-8')
page=ROOT/'web/updates/index.html'
channel=ROOT/'web/updates/channel.json'

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

print('AIG_STUDIO_DUAL_AI_WEB_UPDATE_PASS|WEB_DOWNLOAD_SURFACE|NO_DESKTOP_COMMANDER|VERIFIED_ONLY')

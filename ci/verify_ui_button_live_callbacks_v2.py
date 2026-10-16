import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'design/ui/button-manifest-v1.json').read_text(encoding='utf-8'))
runtime=(ROOT/'app/src/main/java/com/aigstudio/app/MainActivity.kt').read_text(encoding='utf-8')
contract=(ROOT/'core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt').read_text(encoding='utf-8')

entries={e['buttonId']:e for e in manifest['buttons']}
assert len(entries)==10, f'PRODUCTION_NAV_COUNT_INVALID:{len(entries)}'

for button_id,entry in entries.items():
    callback=entry['verifiedCallback'].strip()
    assert callback, f'EMPTY_CALLBACK:{button_id}'
    assert 'Toast.makeText' not in callback, f'DISPLAY_ONLY_CALLBACK_FORBIDDEN:{button_id}'
    assert callback in runtime, f'RUNTIME_CALLBACK_MISSING:{button_id}:{callback}'
    assert callback in contract, f'CONTRACT_CALLBACK_MISSING:{button_id}:{callback}'

cad=entries['NAV_CAD']['verifiedCallback']
assert 'selectTool(Tool.SELECT)' in cad, 'CAD_NAV_MUST_BIND_REAL_CAD_STATE'
assert 'refreshVisibleMode("CAD")' in cad, 'CAD_NAV_MUST_REFRESH_FORMAL_CAD_MODE'

print('UI_BUTTON_LIVE_CALLBACK_V2_PASS|10_NAV|NO_TOAST_ONLY|CAD_REAL_STATE|JSON_KOTLIN_RUNTIME')

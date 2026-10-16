#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
runtime_path=ROOT/'app/src/main/java/com/aigstudio/app/MainActivity.kt'
contract_path=ROOT/'core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt'
manifest_path=ROOT/'design/ui/button-manifest-v1.json'

runtime=runtime_path.read_text(encoding='utf-8')
old='''        addProductionUi("CAD") {\n            Toast.makeText(this,"CAD • LIVE WORKSPACE",Toast.LENGTH_SHORT).show()\n        }'''
new='''        addProductionUi("CAD") {\n            selectTool(Tool.SELECT)\n        }'''
if old in runtime:
    runtime=runtime.replace(old,new,1)
assert new in runtime, 'CAD_RUNTIME_NAV_PATCH_FAILED'
runtime_path.write_text(runtime,encoding='utf-8')

contract=contract_path.read_text(encoding='utf-8')
old_callback='verifiedCallback = """Toast.makeText(this,"CAD • LIVE WORKSPACE",Toast.LENGTH_SHORT).show()""",'
new_callback='verifiedCallback = "selectTool(Tool.SELECT)",'
if old_callback in contract:
    contract=contract.replace(old_callback,new_callback,1)
assert new_callback in contract, 'CAD_CONTRACT_CALLBACK_PATCH_FAILED'
contract_path.write_text(contract,encoding='utf-8')

manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
matched=False
for entry in manifest['buttons']:
    if entry['buttonId']=='NAV_CAD':
        entry['verifiedCallback']='selectTool(Tool.SELECT)'
        matched=True
assert matched, 'NAV_CAD_MANIFEST_MISSING'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('UI_BUTTON_LIVE_CALLBACK_PATCH_APPLIED|NAV_CAD|SELECT_TOOL_CORE_STATE|NO_TOAST_ONLY')

#!/usr/bin/env python3
import json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ROUTER=ROOT/'web/runtime/page-runtime-router.js'
EXPECTED=['HOME','CAD','CAM','SIM','3AX','NC','AI']
FORBIDDEN=['4AX','5AX','6AX']

def fail(errors):
    print('WEB_AUTHORITY_CONTROLS_FAIL')
    for e in errors: print(' -',e)
    return 1

def main():
    e=[]
    if not ROUTER.is_file(): return fail(['missing page-runtime-router.js'])
    source=ROUTER.read_text(encoding='utf-8')
    for token in ['decorateProductControl','sanitizeProductScreen','AIG_PRODUCT_DECORATE_CONTROL','AIG_PRODUCT_SANITIZE_SCREEN','AIG_RUNTIME_MESSAGE_SPEC']:
        if token not in source: e.append('missing product-native-control token '+token)
    script=f"""
global.document={{getElementById:()=>null}};
require({json.dumps(str(ROUTER))});
const out={{pages:global.AIG_PRODUCT_PAGE_IDS,nav:global.AIG_PRODUCT_PAGE_NAVIGATION}};
const nav={{tagName:'BUTTON',dataset:{{page:'CAD'}}}};
out.navDecorated=global.AIG_PRODUCT_DECORATE_CONTROL?global.AIG_PRODUCT_DECORATE_CONTROL(nav, 'NAV'):null;
out.navDataset=nav.dataset;
const card={{tagName:'BUTTON',dataset:{{openPage:'CAD'}}}};
out.cardDecorated=global.AIG_PRODUCT_DECORATE_CONTROL?global.AIG_PRODUCT_DECORATE_CONTROL(card, 'HOME'):null;
out.cardDataset=card.dataset;
const blocked={{tagName:'BUTTON',dataset:{{openPage:'6AX'}}}};
out.blocked=global.AIG_PRODUCT_DECORATE_CONTROL?global.AIG_PRODUCT_DECORATE_CONTROL(blocked, 'HOME'):null;
out.message=global.AIG_RUNTIME_MESSAGE_SPEC?global.AIG_RUNTIME_MESSAGE_SPEC('HOME.SYSTEM_MESSAGES'):null;
console.log(JSON.stringify(out));
"""
    try:
        out=subprocess.run(['node','-e',script],text=True,capture_output=True,check=True).stdout.strip()
        d=json.loads(out)
    except Exception as ex:
        e.append('node contract execution failed '+str(ex)); d={}
    if d.get('pages')!=EXPECTED: e.append('AIG product pages are not exact seven-page order')
    if any(x in (d.get('nav') or {}).values() for x in FORBIDDEN): e.append('product navigation exposes multi-axis pages')
    nd=d.get('navDataset') or {}
    if nd.get('buttonId')!='NAV_CAD' or nd.get('commandId')!='OPEN_CAD' or nd.get('viewId')!='VIEW.NAV.CAD': e.append('native nav dual-ID decoration mismatch')
    cd=d.get('cardDataset') or {}
    if cd.get('buttonId')!='BTN.HOME.CARD.CAD' or cd.get('commandId')!='OPEN_CAD' or cd.get('viewId')!='VIEW.HOME.CARD.CAD': e.append('HOME CAD card dual-ID decoration mismatch')
    if d.get('blocked') is not False: e.append('6AX HOME control must be rejected by AIG product decorator')
    msg=d.get('message') or {}
    if msg.get('messageId')!='HOME.SYSTEM_MESSAGES' or msg.get('role')!='status' or msg.get('ariaLive')!='polite' or msg.get('runtimeTextRequired') is not True: e.append('runtime message spec mismatch')
    if msg.get('defaultText') not in (None,''): e.append('runtime message must not bake Authority text')
    if e: return fail(e)
    print('WEB_AUTHORITY_CONTROLS_PASS|AIG_7_PAGE|NATIVE_BUTTON|BUTTON_ID|COMMAND_ID|VIEW_ID|NO_4AX_5AX_6AX_UI|RUNTIME_MESSAGE_NO_BAKED_TEXT')
    return 0
if __name__=='__main__': sys.exit(main())

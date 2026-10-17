#!/usr/bin/env python3
import json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PRODUCT=ROOT/'design/ui/aig-product-contract-v1.json'
CORE=ROOT/'core/src/main/kotlin/com/aigstudio/core/AigProductUiContract.kt'
SHARED=ROOT/'core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt'
ANDROID=ROOT/'app/src/main/java/com/aigstudio/app/PageRuntimeRouter.kt'
DESKTOP=ROOT/'desktop/src/main/kotlin/com/aigstudio/desktop/PageRuntimeRouter.kt'
WEB=ROOT/'web/runtime/page-runtime-router.js'
EXPECTED=['HOME','CAD','CAM','SIM','3AX','NC','AI']
FORBIDDEN=['4AX','5AX','6AX']

def fail(errors):
    print('REVERSE_UI_CROSS_PLATFORM_FAIL')
    for e in errors: print(' -',e)
    return 1

def main():
    e=[]
    if not PRODUCT.is_file(): return fail(['missing AIG product JSON contract'])
    d=json.loads(PRODUCT.read_text(encoding='utf-8'))
    nav=d.get('navigation') or []
    if d.get('productionPages')!=EXPECTED: e.append('JSON productionPages drift')
    expected_tuples=[(x['pageId'],x['viewId'],x['buttonId'],x['commandId']) for x in nav]
    if expected_tuples != [(p,'VIEW.NAV.'+p,'NAV_'+p,'OPEN_'+p) for p in EXPECTED]: e.append('JSON semantic nav tuple drift')

    if not CORE.is_file():
        e.append('missing core AigProductUiContract.kt')
        core=''
    else:
        core=CORE.read_text(encoding='utf-8')
        for token in ['object AigProductUiContract','PRODUCTION_PAGES','NAVIGATION','navigationPageMap','navigationCommandMap','UiButtonManifestContract.byButtonId']:
            if token not in core: e.append('Core product contract missing '+token)
        for p in EXPECTED:
            page_expr={'HOME':'PageId.HOME','CAD':'PageId.CAD','CAM':'PageId.CAM','SIM':'PageId.SIM','3AX':'PageId.AX3','NC':'PageId.NC','AI':'PageId.AI'}[p]
            if page_expr not in core: e.append('Core product contract missing '+page_expr)
            if '"NAV_'+p+'"' not in core: e.append('Core product contract missing NAV_'+p)
            if '"OPEN_'+p+'"' not in core: e.append('Core product contract missing OPEN_'+p)
        for p in FORBIDDEN:
            if re.search(r'PageId\.AX'+p[0]+r'\b',core): e.append('Core AIG product contract exposes '+p)
            if '"NAV_'+p+'"' in core: e.append('Core AIG product contract contains NAV_'+p)

    shared=SHARED.read_text(encoding='utf-8') if SHARED.is_file() else ''
    for p in FORBIDDEN:
        if 'nav("'+p+'"' not in shared: e.append('shared multi-axis capability was removed: '+p)

    platform_files={'ANDROID':ANDROID,'WINDOWS':DESKTOP}
    for platform,path in platform_files.items():
        if not path.is_file(): e.append(platform+' router missing'); continue
        s=path.read_text(encoding='utf-8')
        if 'import com.aigstudio.core.AigProductUiContract' not in s: e.append(platform+' router does not import Core AIG product contract')
        if 'PRODUCT_NAVIGATION' not in s or 'AigProductUiContract.navigationPageMap()' not in s: e.append(platform+' router missing product navigation binding')
        if not re.search(r'val\s+NAVIGATION\s*:\s*Map<String,PageId>\s*=\s*PRODUCT_NAVIGATION',s): e.append(platform+' production NAVIGATION is not product-only')
        if 'SHARED_NAVIGATION' not in s: e.append(platform+' router must preserve shared navigation inventory separately')
        for p in FORBIDDEN:
            if '"NAV_'+p+'" to PageId.AX'+p[0] not in s: e.append(platform+' shared navigation lost '+p)

    if not WEB.is_file(): e.append('WEB router missing')
    else:
        s=WEB.read_text(encoding='utf-8')
        for token in ["const PRODUCT_PAGE_IDS=Object.freeze(['HOME','CAD','CAM','SIM','3AX','NC','AI'])",'AIG_PRODUCT_PAGE_NAVIGATION','AIG_PRODUCT_NAV_COMMAND_ID']:
            if token not in s: e.append('WEB product semantic binding missing '+token)
        for p in FORBIDDEN:
            if "addAxis('"+p+"'" not in s: e.append('WEB shared route lost '+p)

    if e: return fail(e)
    print('REVERSE_UI_CROSS_PLATFORM_PASS|AIG_7_PAGE|CORE_SINGLE_SOURCE|ANDROID|WINDOWS|WEB|VIEW_ID|BUTTON_ID|COMMAND_ID|SHARED_4AX_5AX_6AX_PRESERVED')
    return 0
if __name__=='__main__': sys.exit(main())

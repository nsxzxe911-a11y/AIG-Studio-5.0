#!/usr/bin/env python3
import json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'design/ui/aig-product-contract-v1.json'
BUTTON=ROOT/'design/ui/button-manifest-v1.json'
KOTLIN=ROOT/'core/src/main/kotlin/com/aigstudio/core/UiButtonManifestContract.kt'
DUAL=ROOT/'core/src/main/kotlin/com/aigstudio/core/UiDualIdContract.kt'
WEB=ROOT/'web/runtime/page-runtime-router.js'
EXPECTED=['HOME','CAD','CAM','SIM','3AX','NC','AI']
FORBIDDEN=('4AX','5AX','6AX')

def fail(msgs):
 print('AIG_PRODUCT_CONTRACT_V1_FAIL')
 for m in msgs: print(' -',m)
 return 1

def main():
 e=[]
 if not P.is_file(): return fail(['missing design/ui/aig-product-contract-v1.json'])
 d=json.loads(P.read_text(encoding='utf-8'))
 if d.get('schema')!='aig-product-contract-v1': e.append('schema mismatch')
 if d.get('productionPages')!=EXPECTED: e.append('productionPages mismatch')
 nav=d.get('navigation') or []
 if len(nav)!=7: e.append(f'navigation count {len(nav)} != 7')
 for i,(page,n) in enumerate(zip(EXPECTED,nav)):
  if n.get('pageId')!=page: e.append(f'nav[{i}] pageId mismatch')
  if n.get('buttonId')!='NAV_'+page: e.append(f'nav[{i}] buttonId mismatch')
  if n.get('commandId')!='OPEN_'+page: e.append(f'nav[{i}] commandId mismatch')
  if n.get('buttonId')==n.get('commandId'): e.append(f'nav[{i}] Button/Command IDs must be distinct')
  if n.get('viewId')!='VIEW.NAV.'+page: e.append(f'nav[{i}] viewId mismatch')
 for f in FORBIDDEN:
  if f in json.dumps(d): e.append(f'forbidden page in product contract: {f}')
 if not BUTTON.is_file(): e.append('button manifest missing')
 else:
  b=json.loads(BUTTON.read_text(encoding='utf-8')); ids=[x.get('buttonId') for x in b.get('buttons',[])]
  if ids != ['NAV_'+x for x in EXPECTED]: e.append('button manifest is not AIG 7-page order')
  for x in b.get('buttons',[]):
   if x.get('sharedCommand')=='NAV_'+x.get('surfaceId',''): e.append('button/command semantic collision')
 for path,label in ((KOTLIN,'UiButtonManifestContract'),(DUAL,'UiDualIdContract'),(WEB,'WebRouter')):
  if not path.is_file(): e.append(label+' missing'); continue
  s=path.read_text(encoding='utf-8')
  for f in FORBIDDEN:
   tokens=[f'NAV_{f}',f'VIEW.NAV.{f}']
   if any(t in s for t in tokens): e.append(f'{label} exposes {f} production navigation')
 if WEB.is_file():
  s=WEB.read_text(encoding='utf-8')
  m=re.search(r"const PAGE_IDS=Object\.freeze\(\[([^\]]+)\]\)",s)
  if not m: e.append('WebRouter PAGE_IDS missing')
  else:
   pages=re.findall(r"'([^']+)'",m.group(1))
   if pages!=EXPECTED: e.append(f'WebRouter PAGE_IDS mismatch {pages}')
  for f in FORBIDDEN:
   if f"addAxis('{f}'" in s: e.append(f'WebRouter exposes {f} command routes')
 if e: return fail(e)
 print('AIG_PRODUCT_CONTRACT_V1_PASS|7_PAGES|DUAL_ID|NO_4AX_5AX_6AX_PRODUCT_EXPOSURE|SHARED_CORE_PRESERVED')
 return 0
if __name__=='__main__': sys.exit(main())

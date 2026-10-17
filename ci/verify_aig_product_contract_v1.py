#!/usr/bin/env python3
import json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'design/ui/aig-product-contract-v1.json'
WEB=ROOT/'web/runtime/page-runtime-router.js'
AIWEB=ROOT/'web/runtime/ai-page-runtime.js'
EXPECTED=['HOME','CAD','CAM','SIM','3AX','NC','AI']
SHARED=['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI']

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
 for f in ('4AX','5AX','6AX'):
  if f in json.dumps(d): e.append(f'forbidden page in AIG product contract: {f}')
 if not WEB.is_file(): e.append('WebRouter missing')
 else:
  s=WEB.read_text(encoding='utf-8')
  for token in ['AIG_PRODUCT_PAGE_IDS','AIG_PRODUCT_PAGE_NAVIGATION','installProductDomGuard','AIG_PRODUCT_NAV_COMMAND_ID']:
   if token not in s:e.append('Web product overlay missing '+token)
  code="global.document={getElementById:()=>null};require("+json.dumps(str(WEB))+ ");console.log(JSON.stringify({shared:global.AIG_PAGE_IDS,product:global.AIG_PRODUCT_PAGE_IDS,nav:global.AIG_PRODUCT_PAGE_NAVIGATION,has6:!!global.AIG_PAGE_COMMAND_ROUTES['6AX.NC_FIRST.PREVIEW']}));"
  try:
   out=subprocess.run(['node','-e',code],text=True,capture_output=True,check=True).stdout.strip(); w=json.loads(out)
   if w['shared']!=SHARED:e.append(f'shared pages drift {w["shared"]}')
   if w['product']!=EXPECTED:e.append(f'product pages drift {w["product"]}')
   if list(w['nav'].values())!=EXPECTED:e.append(f'product nav drift {w["nav"]}')
   if not w['has6']:e.append('shared 6AX route was removed')
  except Exception as ex:e.append('Web runtime inventory failed '+str(ex))
 if AIWEB.is_file():
  ai=AIWEB.read_text(encoding='utf-8')
  if "const AIG_ALLOWED_AXES=Object.freeze(['3AX'])" not in ai:e.append('Web AI missing AIG 3AX-only product guard')
 else:e.append('Web AI runtime missing')
 if e:return fail(e)
 print('AIG_PRODUCT_CONTRACT_V1_PASS|7_PRODUCT_PAGES|10_SHARED_PAGES|DUAL_NAV_ID|3AX_AI_GUARD|SHARED_6AX_PRESERVED')
 return 0
if __name__=='__main__':sys.exit(main())

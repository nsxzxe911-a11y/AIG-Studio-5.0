#!/usr/bin/env python3
from pathlib import Path
import struct, sys

ROOT=Path(__file__).resolve().parents[1]
CSS=ROOT/'web/authority/aig-home-authority-v1.css'
ROUTER=ROOT/'web/runtime/page-runtime-router.js'
ASSET_DIR=ROOT/'generated/ui-regions/HOME/nineslice'
FILES=[
 'HOME_NAV_HOME.png','HOME_NAV_CAD.png','HOME_NAV_CAM.png','HOME_NAV_SIM.png','HOME_NAV_3AX.png','HOME_NAV_NC.png','HOME_NAV_AI.png',
 'HOME_START.png','HOME_OPEN_PROJECT.png','HOME_NEW_PROJECT.png','HOME_IMPORT.png','HOME_TEMPLATE.png',
 'HOME_CARD_CAD.png','HOME_CARD_CAM.png','HOME_CARD_SIM.png','HOME_CARD_NC.png','HOME_MESSAGE_FRAME.png']

def png_size(path):
 b=path.read_bytes()[:24]
 if len(b)<24 or b[:8]!=b'\x89PNG\r\n\x1a\n' or b[12:16]!=b'IHDR': raise ValueError('not PNG')
 return struct.unpack('>II',b[16:24])

def fail(errors):
 print('WEB_AUTHORITY_VISUAL_SKIN_FAIL')
 for e in errors: print(' -',e)
 return 1

def main():
 e=[]
 if not CSS.is_file(): e.append('missing web/authority/aig-home-authority-v1.css')
 else:
  css=CSS.read_text(encoding='utf-8')
  for token in ['border-image-slice:8 fill','data-button-id="NAV_HOME"','data-button-id="NAV_AI"','data-message-id="HOME.SYSTEM_MESSAGES"']:
   if token not in css:e.append('missing CSS token '+token)
  for forbidden in ['NAV_4AX','NAV_5AX','NAV_6AX']:
   if forbidden in css:e.append('forbidden AIG CSS token '+forbidden)
 if not ROUTER.is_file(): e.append('missing page-runtime-router.js')
 else:
  router=ROUTER.read_text(encoding='utf-8')
  for token in ['installAuthoritySkinV1','aig-home-authority-v1.css','AIG Authority RGB Runtime']:
   if token not in router:e.append('router does not install Authority skin: '+token)
 for name in FILES:
  p=ASSET_DIR/name
  if not p.is_file(): e.append('missing Nine-Slice asset '+name); continue
  try:
   if png_size(p)!=(17,17): e.append('Nine-Slice asset must be 17x17: '+name)
  except Exception as ex:e.append(f'invalid Nine-Slice asset {name}: {ex}')
 if e:return fail(e)
 print('WEB_AUTHORITY_VISUAL_SKIN_PASS|17_NINE_SLICE_ASSETS|17X17|SLICE8|RUNTIME_LABELS|AIG_7_PAGE|NO_MULTIAX')
 return 0
if __name__=='__main__':sys.exit(main())

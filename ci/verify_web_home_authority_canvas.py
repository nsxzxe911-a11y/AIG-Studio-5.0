#!/usr/bin/env python3
from pathlib import Path
import struct, sys

ROOT=Path(__file__).resolve().parents[1]
ROUTER=ROOT/'web/runtime/page-runtime-router.js'
CSS=ROOT/'web/authority/aig-home-authority-v1.css'
TILE_DIR=ROOT/'generated/ui-regions/HOME/static'
TILES={
 'HOME_BODY_R1C1.png':(418,430),'HOME_BODY_R1C2.png':(418,430),'HOME_BODY_R1C3.png':(418,430),'HOME_BODY_R1C4.png':(418,430),
 'HOME_BODY_R2C1.png':(418,429),'HOME_BODY_R2C2.png':(418,429),'HOME_BODY_R2C3.png':(418,429),'HOME_BODY_R2C4.png':(418,429),
}

def png_size(path):
 b=path.read_bytes()[:24]
 if len(b)<24 or b[:8]!=b'\x89PNG\r\n\x1a\n' or b[12:16]!=b'IHDR': raise ValueError('not PNG')
 return struct.unpack('>II',b[16:24])

def fail(errors):
 print('WEB_HOME_AUTHORITY_CANVAS_FAIL')
 for e in errors: print(' -',e)
 return 1

def main():
 e=[]
 if not ROUTER.is_file(): e.append('missing page-runtime-router.js')
 else:
  s=ROUTER.read_text(encoding='utf-8')
  for token in [
   'installHomeAuthorityCanvasV1','AIG_HOME_AUTHORITY_SOURCE_WIDTH=1672','AIG_HOME_AUTHORITY_BODY_HEIGHT=859','Math.min(1,',
   'dataAuthorityCanvas','AIG_HOME_RUNTIME_AXIS_MASK','AIG_HOME_RUNTIME_OVERVIEW','HOME.SYSTEM_MESSAGES',
   'AIG_HOME_SOURCE_SCOPE_CONTAMINATION','SOURCE_SCOPE_CONTAMINATION_MASKED','dataScopeMask','aigHomeAuthorityLegacyShell'
  ]:
   if token not in s:e.append('router missing HOME Authority canvas token '+token)
  marker='function installHomeAuthorityCanvasV1'
  start=s.find(marker)
  end=s.find('function installProductDomGuard',start)
  segment=s[start:end if end!=-1 else len(s)] if start!=-1 else ''
  for forbidden in ["'4AX'","'5AX'","'6AX'"]:
   if forbidden in segment:e.append('HOME Authority canvas exposes forbidden axis '+forbidden)
 if not CSS.is_file(): e.append('missing Authority CSS')
 else:
  css=CSS.read_text(encoding='utf-8')
  for token in [
   '.aigHomeAuthorityCanvas','width:1672px','height:859px','transform-origin:top center','pointer-events:none',
   '.aigHomeAuthorityInteractiveLayer','pointer-events:auto','.aigHomeScopeMask','.aigHomeRuntimeOverview',
   '.aigHomeAuthorityLegacyShell','display:none!important'
  ]:
   if token not in css:e.append('CSS missing canvas token '+token)
 for name,size in TILES.items():
  p=TILE_DIR/name
  if not p.is_file(): e.append('missing static Authority tile '+name); continue
  try:
   if png_size(p)!=size:e.append(f'static tile size drift {name}: {png_size(p)} != {size}')
  except Exception as ex:e.append(f'invalid static tile {name}: {ex}')
 if e:return fail(e)
 print('WEB_HOME_AUTHORITY_CANVAS_PASS|8_STATIC_TILES|1672X859|SCALE_MAX_1|NATIVE_OVERLAY|3AX_SCOPE_MASK|RUNTIME_OVERVIEW|RUNTIME_MESSAGES|LEGACY_SHELL_HIDDEN|NO_UPSCALE')
 return 0
if __name__=='__main__':sys.exit(main())

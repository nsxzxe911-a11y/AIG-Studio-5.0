#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, sys

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'design/ui/home-runtime-derivative-v1.json'
CSS=ROOT/'web/authority/aig-home-authority-v1.css'
INDEX=ROOT/'web/index.html'
EXPECTED_SOURCE_SHA='ded539a2238c84a675a89995125e9d1fe0e3111d8dc68fe6e09372c1c4408466'
EXPECTED_SAFE_SHA='5e248fb00e27cac6107f31bc080b283ed4922797605aeb7d31581cb48607ddbd'
EXPECTED_SAFE_ASSET='generated/ui-regions/HOME/static/AIG_HOME_BODY_SAFE_Q90_V1.webp'

def webp_size(path: Path):
    b=path.read_bytes()
    if len(b)<30 or b[:4]!=b'RIFF' or b[8:12]!=b'WEBP': raise ValueError('not WEBP')
    off=12
    while off+8<=len(b):
        typ=b[off:off+4]; n=int.from_bytes(b[off+4:off+8],'little'); data=b[off+8:off+8+n]
        if typ==b'VP8X' and len(data)>=10:
            return 1+int.from_bytes(data[4:7],'little'),1+int.from_bytes(data[7:10],'little')
        if typ==b'VP8 ':
            sig=data.find(b'\x9d\x01\x2a')
            if sig>=0 and sig+7<=len(data):
                return int.from_bytes(data[sig+3:sig+5],'little')&0x3fff,int.from_bytes(data[sig+5:sig+7],'little')&0x3fff
        if typ==b'VP8L' and len(data)>=5 and data[0]==0x2f:
            bits=int.from_bytes(data[1:5],'little'); return (bits&0x3fff)+1,((bits>>14)&0x3fff)+1
        off += 8+n+(n&1)
    raise ValueError('WEBP dimensions unavailable')

def fail(errors):
    print('WEB_HOME_AUTHORITY_CANVAS_FAIL')
    for e in errors: print(' -',e)
    return 1

def main():
    e=[]
    if not MANIFEST.is_file(): return fail(['missing derivative manifest'])
    try: m=json.loads(MANIFEST.read_text(encoding='utf-8'))
    except Exception as ex: return fail([f'invalid derivative manifest: {ex}'])
    src=m.get('sourceAuthority',{}); der=m.get('runtimeDerivative',{}); mask=der.get('safeMaskPolicy',{})
    if m.get('project')!='AIG' or m.get('pageId')!='HOME': e.append('manifest product/page drift')
    if src.get('sha256')!=EXPECTED_SOURCE_SHA: e.append('source Authority SHA drift')
    if (src.get('width'),src.get('height'))!=(1672,941): e.append('source Authority dimensions drift')
    if src.get('bodyCrop')!={'x':0,'y':82,'width':1672,'height':859}: e.append('body crop contract drift')
    if src.get('scopeStatus')!='SOURCE_SCOPE_CONTAMINATION': e.append('source contamination must remain explicit')
    if der.get('asset')!=EXPECTED_SAFE_ASSET: e.append('safe derivative asset path drift')
    if der.get('sha256')!=EXPECTED_SAFE_SHA: e.append('safe derivative SHA drift')
    if (der.get('width'),der.get('height'))!=(1672,859): e.append('runtime derivative dimensions drift')
    if der.get('role')!='RUNTIME_DERIVATIVE_NOT_SOURCE_AUTHORITY': e.append('derivative/source distinction missing')
    if der.get('runtimeScopeStatus')!='SOURCE_SCOPE_CONTAMINATION_MASKED': e.append('runtime masking status missing')
    if der.get('noUpscale') is not True or der.get('maxScale')!=1.0: e.append('no-upscale contract missing')
    if mask.get('dynamicValuesAllowedInRaster') is not False: e.append('safe raster must forbid dynamic values')
    required_masks={'PROJECT_CONTROLS','5AX_LABEL_AND_CHECKLIST','ROTARY_A_C_HUD','BAKED_KPI_AND_SYSTEM_MESSAGES','BAKED_BOTTOM_CARDS','BAKED_RECENT_PROJECTS'}
    if not required_masks.issubset(set(mask.get('maskedBakedRegions',[]))): e.append('safe-mask coverage incomplete')
    if m.get('finalAuthorityStatus')!='BLOCKED_UNTIL_SOURCE_SCOPE_CONTAMINATION_IS_REPLACED_OR_EXPLICITLY_REAPPROVED': e.append('final Authority must remain blocked')

    p=ROOT/EXPECTED_SAFE_ASSET
    if not p.is_file(): e.append('missing runtime derivative asset '+EXPECTED_SAFE_ASSET)
    else:
        b=p.read_bytes()
        if hashlib.sha256(b).hexdigest()!=EXPECTED_SAFE_SHA: e.append('safe derivative SHA mismatch')
        try:
            if webp_size(p)!=(1672,859): e.append('safe derivative dimension mismatch')
        except Exception as ex: e.append(f'invalid safe derivative WEBP: {ex}')

    if not CSS.is_file(): e.append('missing Authority CSS')
    else:
        css=CSS.read_text(encoding='utf-8')
        for token in [
            'AIG_HOME_BODY_SAFE_Q90_V1.webp','max-width:1672px','aspect-ratio:1672/859',
            'SOURCE_SCOPE_CONTAMINATION_MASKED','AIG_HOME_RUNTIME_SCOPE_ACTION','AIG_HOME_RUNTIME_AXIS_MASK',
            'AIG_HOME_RUNTIME_OVERVIEW','HOME.SYSTEM_MESSAGES','pointer-events:auto','pointer-events:none',
            'BTN.HOME.CARD.CAD','BTN.HOME.CARD.CAM','BTN.HOME.CARD.SIM','BTN.HOME.CARD.NC','BTN.HOME.QUICK.3AX'
        ]:
            if token not in css: e.append('CSS missing result contract '+token)
        for forbidden in ['HOME_BODY_R1C1.webp','HOME_BODY_R2C4.webp']:
            if forbidden in css: e.append('obsolete tiled derivative still referenced '+forbidden)

    if not INDEX.is_file(): e.append('missing web/index.html')
    else:
        html=INDEX.read_text(encoding='utf-8')
        for token in ['data-home-runtime','data-home-cad','data-home-cam','data-home-nc','data-open-page="3AX"']:
            if token not in html: e.append('HOME Runtime missing native state/control '+token)
    if e:return fail(e)
    print('WEB_HOME_AUTHORITY_CANVAS_PASS|SAFE_SINGLE_WEBP|1672X859|NO_UPSCALE|NO_BAKED_DYNAMIC_VALUES|REAL_NATIVE_OVERLAY|3AX_SCOPE_MASK|RUNTIME_OVERVIEW|RUNTIME_MESSAGES|SOURCE_CONTAMINATION_EXPLICIT|FINAL_AUTHORITY_BLOCKED')
    return 0

if __name__=='__main__': sys.exit(main())

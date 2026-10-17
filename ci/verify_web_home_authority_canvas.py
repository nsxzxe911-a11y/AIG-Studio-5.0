#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, struct, sys

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'design/ui/home-runtime-derivative-v1.json'
CSS=ROOT/'web/authority/aig-home-authority-v1.css'
INDEX=ROOT/'web/index.html'

EXPECTED_SOURCE_SHA='ded539a2238c84a675a89995125e9d1fe0e3111d8dc68fe6e09372c1c4408466'

def webp_size(path: Path):
    b=path.read_bytes()
    if len(b)<30 or b[:4]!=b'RIFF' or b[8:12]!=b'WEBP':
        raise ValueError('not WEBP')
    off=12
    while off+8<=len(b):
        typ=b[off:off+4]; n=int.from_bytes(b[off+4:off+8],'little'); data=b[off+8:off+8+n]
        if typ==b'VP8X' and len(data)>=10:
            w=1+int.from_bytes(data[4:7],'little'); h=1+int.from_bytes(data[7:10],'little'); return w,h
        if typ==b'VP8 ' and len(data)>=10:
            sig=data.find(b'\x9d\x01\x2a')
            if sig>=0 and sig+7<=len(data):
                w=int.from_bytes(data[sig+3:sig+5],'little')&0x3fff
                h=int.from_bytes(data[sig+5:sig+7],'little')&0x3fff
                return w,h
        if typ==b'VP8L' and len(data)>=5 and data[0]==0x2f:
            bits=int.from_bytes(data[1:5],'little')
            return (bits & 0x3fff)+1, ((bits>>14)&0x3fff)+1
        off += 8+n+(n&1)
    raise ValueError('WEBP dimensions unavailable')

def fail(errors):
    print('WEB_HOME_AUTHORITY_CANVAS_FAIL')
    for e in errors: print(' -',e)
    return 1

def main():
    e=[]
    if not MANIFEST.is_file():
        return fail(['missing design/ui/home-runtime-derivative-v1.json'])
    try: m=json.loads(MANIFEST.read_text(encoding='utf-8'))
    except Exception as ex: return fail([f'invalid derivative manifest: {ex}'])

    src=m.get('sourceAuthority',{})
    der=m.get('runtimeDerivative',{})
    if m.get('project')!='AIG' or m.get('pageId')!='HOME': e.append('manifest product/page drift')
    if src.get('sha256')!=EXPECTED_SOURCE_SHA: e.append('source Authority SHA drift')
    if (src.get('width'),src.get('height'))!=(1672,941): e.append('source Authority dimensions drift')
    crop=src.get('bodyCrop',{})
    if (crop.get('x'),crop.get('y'),crop.get('width'),crop.get('height'))!=(0,82,1672,859): e.append('body crop contract drift')
    if src.get('scopeStatus')!='SOURCE_SCOPE_CONTAMINATION': e.append('source contamination must remain explicit')
    if der.get('runtimeScopeStatus')!='SOURCE_SCOPE_CONTAMINATION_MASKED': e.append('runtime masking status missing')
    if der.get('noUpscale') is not True or der.get('maxScale')!=1.0: e.append('no-upscale contract missing')
    if (der.get('width'),der.get('height'))!=(1672,859): e.append('runtime derivative dimensions drift')
    if m.get('finalAuthorityStatus')!='BLOCKED_UNTIL_SOURCE_SCOPE_CONTAMINATION_IS_REPLACED_OR_EXPLICITLY_REAPPROVED': e.append('final Authority must remain blocked while source is contaminated')

    tiles=der.get('tiles',[])
    if len(tiles)!=8: e.append(f'expected 8 runtime tiles, got {len(tiles)}')
    for t in tiles:
        rel=t.get('path',''); p=ROOT/rel
        if not rel.startswith('generated/ui-regions/HOME/static/') or not rel.endswith('.webp'):
            e.append('invalid runtime tile path '+rel); continue
        if not p.is_file(): e.append('missing runtime derivative tile '+rel); continue
        b=p.read_bytes(); sha=hashlib.sha256(b).hexdigest()
        if sha!=t.get('sha256'): e.append('tile SHA drift '+rel)
        try: size=webp_size(p)
        except Exception as ex: e.append(f'invalid WEBP {rel}: {ex}'); continue
        expected=(t.get('width'),t.get('height'))
        if size!=expected: e.append(f'tile size drift {rel}: {size} != {expected}')

    if not CSS.is_file(): e.append('missing Authority CSS')
    else:
        css=CSS.read_text(encoding='utf-8')
        required=[
            '[data-home-runtime]','max-width:1672px','aspect-ratio:1672/859',
            'SOURCE_SCOPE_CONTAMINATION_MASKED','AIG_HOME_RUNTIME_SCOPE_ACTION','AIG_HOME_RUNTIME_AXIS_MASK',
            'AIG_HOME_RUNTIME_OVERVIEW','HOME.SYSTEM_MESSAGES','pointer-events:auto','pointer-events:none',
            'BTN.HOME.CARD.CAD','BTN.HOME.CARD.CAM','BTN.HOME.CARD.SIM','BTN.HOME.CARD.NC','BTN.HOME.QUICK.3AX'
        ]
        for token in required:
            if token not in css: e.append('CSS missing result contract '+token)
        for t in tiles:
            if t.get('path','').replace('generated/','../../generated/') not in css:
                e.append('CSS does not reference derivative tile '+t.get('path',''))

    if not INDEX.is_file(): e.append('missing web/index.html')
    else:
        html=INDEX.read_text(encoding='utf-8')
        for token in ['data-home-runtime','data-home-cad','data-home-cam','data-home-nc','data-open-page="3AX"']:
            if token not in html: e.append('HOME Runtime missing required native state/control '+token)

    if e:return fail(e)
    print('WEB_HOME_AUTHORITY_CANVAS_PASS|RESULT_BASED|8_WEBP_TILES|1672X859|NO_UPSCALE|REAL_NATIVE_OVERLAY|3AX_SCOPE_MASK|RUNTIME_OVERVIEW|RUNTIME_MESSAGES|SOURCE_CONTAMINATION_EXPLICIT|FINAL_AUTHORITY_BLOCKED')
    return 0

if __name__=='__main__': sys.exit(main())

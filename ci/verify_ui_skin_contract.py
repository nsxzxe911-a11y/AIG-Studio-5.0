#!/usr/bin/env python3
import hashlib, json, pathlib, struct, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
SKINS=ROOT/'design/ui/skin-manifest-v1.json'
REGIONS=ROOT/'design/ui/region-manifest-v1.json'
FORBIDDEN=('4AX','5AX','6AX')

def sha256(p): return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def png_size(p):
    b=pathlib.Path(p).read_bytes()[:24]
    if len(b)<24 or b[:8]!=b'\x89PNG\r\n\x1a\n' or b[12:16]!=b'IHDR': raise ValueError('not PNG')
    return struct.unpack('>II',b[16:24])
def fail(errs):
    print('AIG_UI_SKIN_CONTRACT_FAIL')
    for e in errs: print(' -',e)
    return 1

def main():
    e=[]
    if not SKINS.is_file(): return fail(['missing design/ui/skin-manifest-v1.json'])
    if not REGIONS.is_file(): return fail(['missing design/ui/region-manifest-v1.json'])
    m=json.loads(SKINS.read_text(encoding='utf-8')); rdata=json.loads(REGIONS.read_text(encoding='utf-8'))
    if m.get('schema')!='aig-ui-skin-manifest-v1': e.append('schema mismatch')
    if m.get('project')!='AIG': e.append('project must be AIG')
    if m.get('platform')!='DESKTOP': e.append('platform must be DESKTOP')
    text=json.dumps(m,ensure_ascii=False)
    for x in FORBIDDEN:
        if x in text: e.append(f'forbidden AIG multi-axis token in skin manifest: {x}')
    regions={r['regionId']:r for r in rdata.get('regions',[])}
    skins=m.get('skins') or []
    if len(skins)!=len(regions): e.append(f'skin count {len(skins)} != region count {len(regions)}')
    seen=set(); covered=set()
    for i,s in enumerate(skins):
        p=f'skins[{i}]'; sid=s.get('skinId'); rid=s.get('regionId')
        if not sid: e.append(f'{p}: missing skinId')
        elif sid in seen: e.append(f'{p}: duplicate skinId {sid}')
        else: seen.add(sid)
        if rid not in regions: e.append(f'{p}: unknown regionId {rid}'); continue
        covered.add(rid); r=regions[rid]
        if s.get('sourceAuthoritySha256')!=r.get('sourceSha256'): e.append(f'{p}: source Authority SHA drift')
        asset=s.get('asset'); fp=ROOT/asset if asset else None
        b=r.get('boundsPx') or {}
        if asset and fp.is_file():
            try: w,h=png_size(fp)
            except Exception as ex: e.append(f'{p}: invalid PNG {ex}'); continue
            if [w,h]!=[b.get('width'),b.get('height')]: e.append(f'{p}: skin dimensions {w}x{h} != region {b.get("width")}x{b.get("height")}')
            if s.get('sha256')!=sha256(fp): e.append(f'{p}: asset sha mismatch')
        else:
            if s.get('ingestState')!='APPROVED_ASSET_PENDING_INGEST': e.append(f'{p}: missing repo asset without pending-ingest state')
            if not s.get('libraryPath'): e.append(f'{p}: pending skin requires libraryPath')
            if not isinstance(s.get('sha256'),str) or len(s['sha256'])!=64: e.append(f'{p}: pending skin requires sha256')
            if [s.get('width'),s.get('height')]!=[b.get('width'),b.get('height')]: e.append(f'{p}: pending skin dimensions drift')
        if r.get('type')=='BUTTON':
            if s.get('type')!='BUTTON': e.append(f'{p}: BUTTON region requires BUTTON skin')
            if s.get('scalePolicy')!='ASPECT_FIT_NO_STRETCH': e.append(f'{p}: BUTTON must preserve authority aspect')
            if s.get('contentPolicy')!='AUTHORITY_PIXEL_SKIN': e.append(f'{p}: invalid button content policy')
            if s.get('runtimeStatePolicy')!='NATIVE_CONTROL_STATE_OVERLAY': e.append(f'{p}: native pressed/selected/disabled state policy missing')
            if (s.get('runtimeStates') or [])!=['NORMAL','PRESSED','SELECTED','DISABLED']: e.append(f'{p}: runtime state set mismatch')
        elif r.get('type') in {'MESSAGE','VALUE'}:
            if s.get('type')!='MESSAGE_FRAME': e.append(f'{p}: message/value region requires MESSAGE_FRAME')
            if s.get('contentPolicy')!='FRAME_ONLY_NO_BAKED_TEXT': e.append(f'{p}: message frame may not contain baked runtime text')
            if s.get('runtimeTextRequired') is not True: e.append(f'{p}: runtime text required')
            if s.get('scalePolicy')!='NINE_SLICE': e.append(f'{p}: message frame must use NINE_SLICE')
            ns=s.get('nineSlice') or {}
            if any(not isinstance(ns.get(k),int) or ns.get(k)<=0 for k in ('left','top','right','bottom')): e.append(f'{p}: invalid nineSlice')
            if s.get('messageId')!=r.get('messageId'): e.append(f'{p}: messageId drift')
        else: e.append(f'{p}: unsupported Stage2 region type {r.get("type")}')
    missing=set(regions)-covered
    if missing: e.append('regions without skin: '+','.join(sorted(missing)))
    if e: return fail(e)
    pending=sum(1 for s in skins if not (ROOT/s.get('asset','')).is_file())
    print(f'AIG_UI_SKIN_CONTRACT_PASS|SKINS={len(skins)}|BUTTONS={sum(1 for s in skins if s.get("type")=="BUTTON")}|MESSAGE_FRAME=1|NINE_SLICE|NO_BAKED_TEXT|NATIVE_STATES|NO_MULTIAX|PENDING_INGEST={pending}')
    return 0
if __name__=='__main__': raise SystemExit(main())

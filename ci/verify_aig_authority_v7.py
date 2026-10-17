#!/usr/bin/env python3
import hashlib, json, pathlib, struct, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'design/ui/authority/aig-authority-v7.json'
ALLOWED_PRODUCTION = ['HOME','CAD','CAM','SIM','3AX','NC','AI']
FORBIDDEN = {'4AX','5AX','6AX'}

def sha256(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

def png_size(path):
    data=path.read_bytes()[:24]
    if len(data)<24 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise ValueError('not PNG')
    return struct.unpack('>II', data[16:24])

def fail(msgs):
    print('AIG_AUTHORITY_V7_FAIL')
    for m in msgs: print(' -',m)
    return 1

def main():
    errors=[]
    if not CATALOG.is_file():
        return fail(['missing catalog design/ui/authority/aig-authority-v7.json'])
    try: data=json.loads(CATALOG.read_text(encoding='utf-8'))
    except Exception as e: return fail([f'catalog parse error: {e}'])
    if data.get('schema')!='aig-authority-catalog-v7': errors.append('schema mismatch')
    if data.get('project')!='AIG': errors.append('project must be AIG')
    if data.get('platform')!='DESKTOP': errors.append('platform must be DESKTOP')
    if data.get('productionPages')!=ALLOWED_PRODUCTION: errors.append('productionPages must be HOME/CAD/CAM/SIM/3AX/NC/AI in order')
    assets=data.get('assets') or []
    if len(assets)<31: errors.append(f'expected at least 31 authority assets, got {len(assets)}')
    seen=set()
    for i,a in enumerate(assets):
        p=f'assets[{i}]'
        vid=a.get('visualId'); page=a.get('pageId'); rel=a.get('asset')
        if not vid: errors.append(f'{p}: missing visualId')
        elif vid in seen: errors.append(f'{p}: duplicate visualId {vid}')
        else: seen.add(vid)
        if page in FORBIDDEN: errors.append(f'{p}: forbidden AIG page {page}')
        if page not in set(ALLOWED_PRODUCTION+['BOOT','SETTINGS','PROJECT']): errors.append(f'{p}: unsupported pageId {page}')
        state=a.get('ingestState')
        if state not in {'INGESTED','APPROVED_ASSET_PENDING_INGEST'}: errors.append(f'{p}: invalid ingestState {state}')
        if state=='INGESTED':
            if not rel: errors.append(f'{p}: INGESTED asset missing repo path'); continue
            fp=ROOT/rel
            if not fp.is_file(): errors.append(f'{p}: missing asset file {rel}'); continue
            actual_sha=sha256(fp)
            if actual_sha.lower()!=str(a.get('sha256','')).lower(): errors.append(f'{p}: sha mismatch {vid}')
            try: w,h=png_size(fp)
            except Exception as e: errors.append(f'{p}: png parse error {e}'); continue
            if [w,h] != [a.get('sourceWidth'),a.get('sourceHeight')]: errors.append(f'{p}: dimension mismatch {vid}: {w}x{h}')
        else:
            if not a.get('libraryPath'): errors.append(f'{p}: pending ingest requires libraryPath')
            if len(str(a.get('sha256',''))) != 64: errors.append(f'{p}: pending ingest requires sha256')
            w,h=a.get('sourceWidth'),a.get('sourceHeight')
        native=(w,h)==(3840,2160)
        if bool(a.get('native4K')) != native: errors.append(f'{p}: native4K flag mismatch {vid}')
        if not native and a.get('targetRuntime')!='3840x2160': errors.append(f'{p}: non-4K source missing targetRuntime {vid}')
    if errors: return fail(errors)
    pending=sum(1 for a in assets if a.get('ingestState')=='APPROVED_ASSET_PENDING_INGEST')
    print(f'AIG_AUTHORITY_V7_PASS|ASSETS={len(assets)}|PAGES=7|NO_4AX_5AX_6AX|SHA_DIMENSIONS_LOCKED|PENDING_INGEST={pending}')
    return 0

if __name__=='__main__': sys.exit(main())

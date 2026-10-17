#!/usr/bin/env python3
import json, math, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'design/ui/region-manifest-v1.json'
AUTH=ROOT/'design/ui/authority/aig-authority-v7.json'
ALLOWED_TYPES={'STATIC','BUTTON','MESSAGE','VALUE','ICON','VIEWPORT'}


def fail(errors):
    print('UI_REGION_MANIFEST_FAIL')
    for e in errors: print(' -',e)
    return 1


def main():
    errors=[]
    if not MANIFEST.is_file(): return fail(['missing design/ui/region-manifest-v1.json'])
    if not AUTH.is_file(): return fail(['missing AIG Authority V7 catalog'])
    m=json.loads(MANIFEST.read_text(encoding='utf-8'))
    a=json.loads(AUTH.read_text(encoding='utf-8'))
    auth={x['visualId']:x for x in a['assets']}
    if m.get('schema')!='aig-ui-region-manifest-v1': errors.append('schema mismatch')
    if m.get('project')!='AIG': errors.append('project must be AIG')
    regions=m.get('regions') or []
    if len(regions)<17: errors.append(f'expected >=17 verified HOME regions, got {len(regions)}')
    seen=set()
    for i,r in enumerate(regions):
        p=f'regions[{i}]'; rid=r.get('regionId'); vid=r.get('visualId')
        if not rid: errors.append(f'{p}: missing regionId')
        elif rid in seen: errors.append(f'{p}: duplicate regionId {rid}')
        else: seen.add(rid)
        if vid not in auth: errors.append(f'{p}: unknown visualId {vid}'); continue
        src=auth[vid]
        if r.get('sourceSha256')!=src.get('sha256'): errors.append(f'{p}: source SHA drift')
        if r.get('sourceWidth')!=src.get('sourceWidth') or r.get('sourceHeight')!=src.get('sourceHeight'): errors.append(f'{p}: source dimensions drift')
        if r.get('type') not in ALLOWED_TYPES: errors.append(f'{p}: invalid type {r.get("type")}')
        b=r.get('boundsPx') or {}; n=r.get('boundsNorm') or {}
        vals=[b.get(k) for k in ('x','y','width','height')]
        if any(not isinstance(v,int) for v in vals): errors.append(f'{p}: boundsPx must be integer'); continue
        x,y,w,h=vals; sw,sh=src['sourceWidth'],src['sourceHeight']
        if min(x,y,w,h)<0 or w<=0 or h<=0 or x+w>sw or y+h>sh: errors.append(f'{p}: bounds outside source'); continue
        expected={'x':x/sw,'y':y/sh,'width':w/sw,'height':h/sh}
        for k,v in expected.items():
            if not isinstance(n.get(k),(int,float)) or not math.isclose(float(n[k]),v,abs_tol=1e-6): errors.append(f'{p}: normalized {k} drift')
        if r.get('type')=='BUTTON':
            if not r.get('buttonId'): errors.append(f'{p}: BUTTON missing buttonId')
            if r.get('buttonId')==r.get('commandId') and r.get('commandId') is not None: errors.append(f'{p}: Button ID and Command ID must be distinct')
            if r.get('bindingState') not in {'BOUND','PENDING_RUNTIME'}: errors.append(f'{p}: invalid bindingState')
        if r.get('type') in {'MESSAGE','VALUE'}:
            if not r.get('messageId'): errors.append(f'{p}: runtime text region missing messageId')
            if r.get('runtimeTextPolicy')!='RUNTIME_TEXT_REQUIRED_NO_BAKED_CONTENT': errors.append(f'{p}: runtime text policy missing')
    home=[r for r in regions if r.get('visualId')=='AIG-AUTH-DESKTOP-HOME-V1']
    nav=[r for r in home if r.get('buttonId','').startswith('NAV_')]
    if [r.get('buttonId') for r in nav] != ['NAV_HOME','NAV_CAD','NAV_CAM','NAV_SIM','NAV_3AX','NAV_NC','NAV_AI']:
        errors.append('HOME navigation region order must be seven-page AIG product order')
    if any(x in json.dumps(m) for x in ['NAV_4AX','NAV_5AX','NAV_6AX']): errors.append('AIG region manifest contains multi-axis navigation')
    if errors: return fail(errors)
    print(f'UI_REGION_MANIFEST_PASS|REGIONS={len(regions)}|HOME_NAV=7|DUAL_ID|PIXEL_NORMALIZED_BOUNDS|NO_MULTIAX_NAV')
    return 0

if __name__=='__main__': sys.exit(main())

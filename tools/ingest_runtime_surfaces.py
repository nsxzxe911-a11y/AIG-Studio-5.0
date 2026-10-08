#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, shutil, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ANDROID=ROOT/'app/src/main/assets/aig-generated-rgb/approved/184/runtime-surfaces'
DESKTOP=ROOT/'desktop/src/main/resources/aig-generated-rgb/approved/184/runtime-surfaces'
HOME_ANDROID=ROOT/'app/src/main/assets/aig-generated-rgb/approved/416'
HOME_DESKTOP=ROOT/'desktop/src/main/resources/aig-generated-rgb/approved/416'
SURFACES=('home','cad','cam','sim','3ax','4ax','5ax','6ax','nc','ai')

def sha256(p:Path)->str:
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def png_size(p:Path):
    b=p.read_bytes()[:24]
    if len(b)>=24 and b[:8]==b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II',b[16:24])
    return None

def validate_surface(p:Path):
    if not p.is_file(): raise ValueError(f'missing {p}')
    if p.stat().st_size<50_000: raise ValueError(f'icon-sized/suspicious surface {p.name}: {p.stat().st_size} bytes')
    if p.suffix.lower()=='.png':
        size=png_size(p)
        if not size or min(size)<360 or max(size)<640: raise ValueError(f'surface too small {p.name}: {size}')

def write_pack(dest:Path, mapping:dict[str,Path]):
    dest.mkdir(parents=True,exist_ok=True)
    hashes=[]
    for surface,src in mapping.items():
        validate_surface(src)
        out=dest/f'{surface}.png'
        shutil.copy2(src,out)
        hashes.append(f'{surface}={sha256(out)}')
    (dest/'sha256.properties').write_text('\n'.join(sorted(hashes))+'\n',encoding='ascii')

def exact_home_ingest(source:Path, target:Path, expected_sha:str, name:str):
    candidate=source/name
    if not candidate.is_file(): return 'NOT_PROVIDED'
    actual=sha256(candidate)
    if actual.lower()!=expected_sha.lower(): return 'SHA_MISMATCH_NOT_INGESTED'
    target.mkdir(parents=True,exist_ok=True)
    shutil.copy2(candidate,target/name)
    return 'INGESTED_EXACT'

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--source-dir',required=True)
    ap.add_argument('--android-cam-name',default='AIG_CNC_CAM_RGB_BILINGUAL_MOBILE_APPROVED.png')
    ap.add_argument('--desktop-cam-name',default='AIG_II_CAM_RGB_BILINGUAL_DESKTOP_APPROVED.png')
    a=ap.parse_args()
    src=Path(a.source_dir)
    if not src.is_dir(): raise SystemExit('RGB_INGEST_FAIL|SOURCE_DIR_MISSING')

    # Generic canonical names are optional. AIG CNC CAM mobile is the only explicitly approved
    # page in the current Library inventory; missing pages remain procedural, never faked by icons.
    android={}
    desktop={}
    for surface in SURFACES:
        generic=src/f'{surface}.png'
        if generic.is_file():
            android[surface]=generic
            desktop[surface]=generic
    mobile_cam=src/a.android_cam_name
    if mobile_cam.is_file(): android['cam']=mobile_cam
    desktop_cam=src/a.desktop_cam_name
    if desktop_cam.is_file(): desktop['cam']=desktop_cam

    write_pack(ANDROID,android)
    write_pack(DESKTOP,desktop)

    home_mobile=exact_home_ingest(src,HOME_ANDROID,'8c55956f9ea6693b34d78395d6336ea7bf1a0ec4eeece824c22396b18bb854af','home_mobile.jpg')
    home_desktop=exact_home_ingest(src,HOME_DESKTOP,'9b0d4c983d8b69d9e1735036842567e5082101976bd17335cd9c3ec7c4494a80','home_desktop.jpg')

    report={
        'android_surfaces':sorted(android),
        'desktop_surfaces':sorted(desktop),
        'home_mobile':home_mobile,
        'home_desktop':home_desktop,
        'rule':'FULL_PAGE_ONLY_NO_ICON_STRETCH_NO_FAKE_APPROVAL'
    }
    out=ROOT/'evidence/runtime-surface-ingest.json'
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('RGB_RUNTIME_SURFACE_INGEST_DONE|'+json.dumps(report,ensure_ascii=False))

if __name__=='__main__': main()

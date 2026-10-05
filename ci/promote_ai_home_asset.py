#!/usr/bin/env python3
import argparse,hashlib,json,os,shutil,struct,tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def jpeg_size(path:Path):
    data=path.read_bytes()
    if len(data)<4 or data[:2]!=b'\xff\xd8': raise ValueError(f'not JPEG: {path}')
    i=2
    while i+4<=len(data):
        if data[i]!=0xFF: i+=1; continue
        while i<len(data) and data[i]==0xFF: i+=1
        if i>=len(data): break
        marker=data[i];i+=1
        if marker in (0xD8,0xD9): continue
        if i+2>len(data): break
        length=struct.unpack('>H',data[i:i+2])[0]
        if length<2 or i+length>len(data): break
        if marker in {0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF}:
            h,w=struct.unpack('>HH',data[i+3:i+7]);return w,h
        i+=length
    raise ValueError(f'JPEG dimensions missing: {path}')

def sha(path:Path): return hashlib.sha256(path.read_bytes()).hexdigest()
def atomic_copy(src:Path,dst:Path):
    dst.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=dst.name+'.',suffix='.tmp',dir=dst.parent);os.close(fd)
    try: shutil.copyfile(src,tmp);os.replace(tmp,dst)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

def main():
    ap=argparse.ArgumentParser(description='Promote validated AI RGB HOME art without touching the 184 button pack.')
    ap.add_argument('--desktop',required=True,type=Path);ap.add_argument('--mobile',required=True,type=Path)
    ap.add_argument('--version',default='416')
    a=ap.parse_args()
    if jpeg_size(a.desktop)!=(1280,720): raise SystemExit('AI_HOME_PROMOTE_FAIL|DESKTOP_DIMENSIONS')
    if jpeg_size(a.mobile)!=(720,1280): raise SystemExit('AI_HOME_PROMOTE_FAIL|MOBILE_DIMENSIONS')
    dsha,msha=sha(a.desktop),sha(a.mobile)
    roots=[ROOT/f'app/src/main/assets/aig-generated-rgb/approved/{a.version}',ROOT/f'desktop/src/main/resources/aig-generated-rgb/approved/{a.version}']
    manifest={
      'schema':1,'pack_id':f'AIG_RGB_HOME_{a.version}','version':f'{a.version}.0.0','approval_state':'VALIDATED_DERIVED',
      'source':'AI_RGB_ASSET','theme_family':'aigii_rgb_neon','runtime_layer':'home_background','logic_binding_authority':'runtime_callback',
      'official_original_overwritten':False,'disconnect_policy':'DATA_FLOW_ONLY_PRESERVE_RUNTIME_DATA',
      'runtime_binding':{'android':'home_mobile.jpg','windows':'home_desktop.jpg'},
      'assets':[
        {'id':'home_desktop','file':'home_desktop.jpg','sha256':dsha,'width':1280,'height':720,'target':'windows','orientation':'landscape'},
        {'id':'home_mobile','file':'home_mobile.jpg','sha256':msha,'width':720,'height':1280,'target':'android','orientation':'portrait'}]
    }
    for root in roots:
        atomic_copy(a.desktop,root/'home_desktop.jpg');atomic_copy(a.mobile,root/'home_mobile.jpg')
        (root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (root/'sha256.properties').write_text(f'home_desktop={dsha}\nhome_mobile={msha}\n',encoding='ascii')
    print(f'AI_HOME_PROMOTE_PASS|{a.version}|DESKTOP={dsha}|MOBILE={msha}|ANDROID_WINDOWS|184_UNTOUCHED')
if __name__=='__main__': main()

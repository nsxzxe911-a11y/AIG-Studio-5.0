#!/usr/bin/env python3
from pathlib import Path
import hashlib, struct

ROOT=Path(__file__).resolve().parents[1]
DESKTOP=ROOT/'desktop/src/main/resources/aig-generated-rgb/approved/184/runtime-surfaces/desktop'
MOBILE=ROOT/'app/src/main/assets/aig-generated-rgb/approved/184/runtime-surfaces/mobile'
ANDROID=(ROOT/'app/src/main/java/com/aigstudio/app/RuntimeSurfaceAndroidInstaller.kt').read_text(encoding='utf-8')
APP=(ROOT/'app/src/main/java/com/aigstudio/app/AigStudioApplication.kt').read_text(encoding='utf-8')

def need(ok,code):
    if not ok: raise SystemExit('RUNTIME_FULL_SURFACE_ART_FAIL|'+code)
def props(path):
    out={}
    for raw in path.read_text(encoding='utf-8').splitlines():
        s=raw.strip()
        if s and not s.startswith('#') and '=' in s:
            k,v=s.split('=',1);out[k.strip()]=v.strip().lower()
    return out
def png_size(path):
    data=path.read_bytes()[:24]
    need(data[:8]==b'\x89PNG\r\n\x1a\n' and data[12:16]==b'IHDR','PNG_HEADER_'+path.name)
    return struct.unpack('>II',data[16:24])
def verify_png(root,name,w,h,hashes):
    p=root/name;need(p.is_file(),'MISSING_'+name.upper());need(name in hashes,'HASH_ENTRY_'+name.upper())
    need(hashlib.sha256(p.read_bytes()).hexdigest()==hashes[name],'SHA_'+name.upper())
    need(png_size(p)==(w,h),'DIM_'+name.upper())

need('bitmap.height>bitmap.width' in ANDROID,'ANDROID_PORTRAIT_GUARD')
need('RGB_PAGE_MOUNT|' in ANDROID,'ANDROID_RUNTIME_MOUNT_LOG')
need('loadExact(activity)?.let' in APP and APP.index('loadExact(activity)?.let') < APP.index('loadRuntimeSurfaceFallback(activity)?.let'),'HOME_EXACT_FIRST')
need('runtime-surfaces/mobile' in APP,'HOME_MOBILE_RUNTIME_ROOT')
need('bitmap.width==720 && bitmap.height==1280' in APP,'HOME_PORTRAIT_ONLY')
need('BitmapFactory.decodeByteArray' in ANDROID,'ANDROID_RAW_BITMAP_PIXEL_GUARD')
need('bitmap.width==720 && bitmap.height==1280' in ANDROID,'ANDROID_RAW_BITMAP_DIMENSIONS')
need('intrinsicWidth==720' not in ANDROID,'ANDROID_NO_DENSITY_SCALED_INTRINSIC_GUARD')
dh=props(DESKTOP/'sha256.properties'); mh=props(MOBILE/'sha256.properties')
for name in ('nc.png','ai.png'): verify_png(DESKTOP,name,1280,720,dh)
for name in ('home.png','cad.png','cam.png','sim.png','3ax.png','4ax.png','5ax.png','6ax.png','nc.png','ai.png'):
    verify_png(MOBILE,name,720,1280,mh)
print('RUNTIME_FULL_SURFACE_ART_PASS|AIG_CNC_379|DESKTOP_NC_AI|MOBILE_HOME_PLUS_9|PORTRAIT_720X1280|SHA256|NO_ICON_STRETCH')

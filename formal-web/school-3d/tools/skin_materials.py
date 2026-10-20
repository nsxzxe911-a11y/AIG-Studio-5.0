"""Deterministic prototype PBR texture generator. Materials lab only; not an approved face/character."""
import math, os, hashlib, json, argparse
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image

COLORS = {
  'skin':(219,163,143),
  'hair':(48,31,28),
  'fabric':(29,39,66),
}

def normal_map(height, strength):
    dy, dx = np.gradient(height.astype('float32'))
    nx, ny, nz = -dx*strength, -dy*strength, np.ones_like(dx)
    norm=np.maximum(np.sqrt(nx*nx+ny*ny+nz*nz),1e-7)
    return np.stack([(nx/norm*.5+.5)*255,(ny/norm*.5+.5)*255,(nz/norm*.5+.5)*255],axis=-1).astype('uint8')

def maps(kind, size=512):
    rng=np.random.default_rng(20261020 + {'skin':1,'hair':2,'fabric':3}[kind])
    y,x=np.mgrid[0:size,0:size].astype('float32')
    a=rng.normal(0,1,(size,size)).astype('float32')
    b=rng.normal(0,1,(size,size)).astype('float32')
    c=rng.normal(0,1,(size,size)).astype('float32')
    if kind=='skin':
        # Small, nondirectional pore field, mid/large-scale subtly uneven melanin.
        pore=gaussian_filter(a,0.7)
        macro=gaussian_filter(b,16)
        macro=macro / max(0.001,macro.std())
        freckles=(gaussian_filter(c,1.0)>1.35).astype('float32')
        freckles=gaussian_filter(freckles,0.7)
        base=np.array(COLORS[kind],dtype='float32')[None,None,:]
        albedo=np.clip(base+macro[:,:,None]*2.2 - freckles[:,:,None]*5.0 + pore[:,:,None]*1.2,0,255).astype('uint8')
        rough=np.clip(172 + macro*7.0 + pore*4.0,0,255).astype('uint8')
        height=pore*0.05+gaussian_filter(a,2)*0.015
        normal=normal_map(height,38)
    elif kind=='hair':
        # Directional fine fiber cards: variation must run along hair axis, no stripe balls.
        strands=gaussian_filter(a, (7.0,0.55))
        strands/=max(strands.std(),0.001)
        broad=gaussian_filter(b,(27.0,8.0));broad/=max(broad.std(),0.001)
        shine=(np.sin(x*0.41 + np.sin(y*0.015)*1.5)+1)/2
        albedo=np.clip(np.array(COLORS[kind])[None,None,:]+strands[:,:,None]*5.2+broad[:,:,None]*2.2+shine[:,:,None]*3.0,0,255).astype('uint8')
        rough=np.clip(91 + broad*7+strands*3,0,255).astype('uint8')
        normal=normal_map(strands*0.05+shine*.03,25)
    else:
        # Perpendicular warp/weft cotton weave: detailed but not a flat plastic panel.
        warp=(np.sin(x*math.pi/3.2)**10).clip(0,1)
        weft=(np.sin(y*math.pi/3.2)**10).clip(0,1)
        pattern=(warp-weft)*.5
        macro=gaussian_filter(a,10); macro/=max(macro.std(),0.001)
        base=np.array(COLORS[kind],dtype='float32')[None,None,:]
        albedo=np.clip(base+pattern[:,:,None]*5.0+macro[:,:,None]*1.2,0,255).astype('uint8')
        rough=np.clip(207+pattern*11+macro*4,0,255).astype('uint8')
        normal=normal_map(pattern*0.045 + gaussian_filter(b,1.5)*0.018,75)
    mr=np.zeros((size,size,3),dtype='uint8');mr[:,:,0]=0;mr[:,:,1]=rough;mr[:,:,2]=0
    return {'basecolor':albedo,'normal':normal,'metallicroughness':mr}

def generate(outdir,size):
    outdir=Path(outdir);outdir.mkdir(parents=True,exist_ok=True)
    manifest={'schemaVersion':1,'classification':'PROTOTYPE_MATERIAL_MAPS_NOT_CHARACTER_AUTHORITY',
        'generator':'skin_materials.py','size':[size,size],'assets':{}}
    for kind in COLORS:
        for key, arr in maps(kind,size).items():
            name=f'{kind}_{key}.png';path=outdir/name
            Image.fromarray(arr,'RGB').save(path,compress_level=8)
            manifest['assets'][name]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,
             'material':kind,'channel':key}
    (outdir/'material-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',default='generated-materials');p.add_argument('--size',type=int,default=512)
    args=p.parse_args();assert 128<=args.size<=2048 and args.size&(args.size-1)==0
    m=generate(args.out,args.size)
    print('Generated',len(m['assets']),'PBR textures at',args.out)